import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/services/ai.service';
import { DriftAgent, DriftAgentInput } from '../interfaces/drift-agent.port';
import {
  DriftReport,
  ProposedEdit,
  StageAResult,
  StageBResult,
  StageCResult,
  Unresolved,
  stageAResultSchema,
  stageBResultSchema,
  stageCResultSchema,
} from '../dtos/drift.schemas';
import { RepoAccess, makeReadBudget } from './repo-access.service';
import { buildDriftTools, DriftTools } from '../tools/repo-tools';
import { verifyZodEdit } from '../tools/verify-zod-edit';
import {
  buildStageASystem,
  buildStageBSystem,
  buildStageCSystem,
  stageAUserPrompt,
  stageBUserPrompt,
  stageCUserPrompt,
} from '../prompts/drift.prompt';

const MAX_STEPS = 12;
const READS_PER_REPO = 25;

@Injectable()
export class DriftDetectorService implements DriftAgent {
  private readonly logger = new Logger(DriftDetectorService.name);

  constructor(private readonly ai: AiService) {}

  async analyze(input: DriftAgentInput): Promise<DriftReport> {
    const backend = new RepoAccess(
      'backend',
      input.backendDir,
      makeReadBudget(READS_PER_REPO),
    );
    const frontend = new RepoAccess(
      'frontend',
      input.frontendDir,
      makeReadBudget(READS_PER_REPO),
    );
    const tools = buildDriftTools({
      backend,
      frontend,
      backendDiff: input.backendDiff,
      verify: (filePath, newContent) =>
        verifyZodEdit(input.frontendDir, filePath, newContent),
    });

    // Stage A — characterize the backend delta.
    const a = await this.runStage<StageAResult>({
      tools,
      system: buildStageASystem(),
      prompt: stageAUserPrompt(input.changedFiles),
      schema: stageAResultSchema,
      activeTools: ['get_backend_diff', 'read_backend_file', 'grep_backend'],
    });
    if (!a.driftLikely || a.affectedEndpoints.length === 0) {
      return this.noDrift(
        a,
        'no response-shape change in a serialization view',
      );
    }

    // Stage B — map endpoints to frontend Zod schemas.
    const b = await this.runStage<StageBResult>({
      tools,
      system: buildStageBSystem(),
      prompt: stageBUserPrompt(a),
      schema: stageBResultSchema,
      activeTools: [
        'read_frontend_file',
        'grep_frontend',
        'list_frontend_schemas',
      ],
    });

    // Deterministic backstop: additive-only backend change + all non-strict
    // schemas tolerate extra keys — not drift.
    const allAdditive = a.affectedEndpoints.every((e) =>
      e.keyDeltas.every((d) => d.kind === 'added'),
    );
    const anyStrict = b.mappings.some((m) => m.isStrict);
    if (
      a.affectedEndpoints.length > 0 &&
      allAdditive &&
      b.mappings.length > 0 &&
      !anyStrict
    ) {
      return this.noDrift(
        a,
        'additive keys only; mapped schemas are non-strict and tolerate extra fields',
        b.unresolved,
      );
    }

    if (b.mappings.length === 0) {
      return this.buildReport(
        a,
        [],
        b.unresolved,
        'low',
        'drift likely but no schema could be mapped',
      );
    }

    // Stage C — compute + validate edits.
    const c = await this.runStage<StageCResult>({
      tools,
      system: buildStageCSystem(),
      prompt: stageCUserPrompt(a, b),
      schema: stageCResultSchema,
      activeTools: [
        'read_frontend_file',
        'grep_frontend',
        'validate_zod_schema',
      ],
    });

    const { edits, demoted } = await this.postProcessEdits(
      input.frontendDir,
      c.proposedEdits,
    );
    const unresolved = [...c.unresolved, ...b.unresolved, ...demoted];
    const confidence = this.scoreConfidence(edits);
    const summary =
      edits.length > 0
        ? `Detected contract drift on ${a.affectedEndpoints.length} endpoint(s); ${edits.length} schema edit(s) proposed.`
        : 'Drift likely but no proposable edit survived validation.';
    return this.buildReport(a, edits, unresolved, confidence, summary);
  }

  private async runStage<OUT>(args: {
    tools: DriftTools;
    system: string;
    prompt: string;
    schema: import('zod').ZodType<OUT>;
    activeTools: (keyof DriftTools)[];
  }): Promise<OUT> {
    const res = await this.ai.runAgent<DriftTools, OUT>({
      system: args.system,
      prompt: args.prompt,
      tools: args.tools,
      output: args.schema,
      maxSteps: MAX_STEPS,
      activeTools: args.activeTools,
    });
    this.logger.debug(
      `stage done: steps=${res.steps} tools=${res.toolCalls.length} tokens=${res.usage.inputTokens}/${res.usage.outputTokens}`,
    );
    return res.output;
  }

  // Re-run the authoritative verifier and enforce >=2 mapping signals.
  private async postProcessEdits(
    frontendDir: string,
    proposed: ProposedEdit[],
  ): Promise<{ edits: ProposedEdit[]; demoted: Unresolved[] }> {
    const edits: ProposedEdit[] = [];
    const demoted: Unresolved[] = [];
    for (const edit of proposed) {
      if (edit.mappingEvidence.length < 2) {
        demoted.push({
          endpointPath: edit.filePath,
          reason: `insufficient mapping evidence (${edit.mappingEvidence.length} < 2)`,
        });
        continue;
      }
      const verdict = await verifyZodEdit(
        frontendDir,
        edit.filePath,
        edit.newContent,
      );
      edits.push({ ...edit, validated: verdict.valid });
    }
    return { edits, demoted };
  }

  private scoreConfidence(edits: ProposedEdit[]): 'low' | 'medium' | 'high' {
    if (edits.length === 0) return 'low';
    return edits.every((e) => e.validated) ? 'high' : 'medium';
  }

  private noDrift(
    a: StageAResult,
    reason: string,
    unresolved: Unresolved[] = [],
  ): DriftReport {
    return {
      driftDetected: false,
      summary: `No contract drift: ${reason}.`,
      confidence: 'high',
      affectedEndpoints: a.affectedEndpoints,
      proposedEdits: [],
      unresolved,
    };
  }

  private buildReport(
    a: StageAResult,
    edits: ProposedEdit[],
    unresolved: Unresolved[],
    confidence: 'low' | 'medium' | 'high',
    summary: string,
  ): DriftReport {
    return {
      driftDetected: true,
      summary,
      confidence,
      affectedEndpoints: a.affectedEndpoints,
      proposedEdits: edits,
      unresolved,
    };
  }
}
