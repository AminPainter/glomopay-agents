import { StageAResult, StageBResult } from '../dtos/drift.schemas';

const PREAMBLE = `You are a contract-drift detector for GlomoPay. The Rails backend (glomopay_service)
owns the JSON response contract. The TypeScript checkout (glomopay-checkout) validates every
API response against a matching Zod schema. When a backend change alters a response shape, the
frontend Zod schema must be re-synced or checkout breaks at runtime.

You are given the actual backend diff and read/grep tools over both working copies. Reason from
the ACTUAL serialization view (serializer / jbuilder), never from the model or db/schema.rb alone.

Hard rules:
- Never fabricate. If you cannot corroborate something, say so and leave it unresolved.
- A schema.rb / model column change with NO change to a serialization view is NOT drift unless you
  can trace the column into a rendered response.`;

export function buildStageASystem(): string {
  return `${PREAMBLE}

STAGE A — characterize the backend delta.
1. Call get_backend_diff first.
2. Read the changed serializer/jbuilder/controller/model files to understand what the response JSON
   actually looks like before and after.
3. Trace each changed view to its controller action and route (grep routes.rb / controllers).
4. Emit affectedEndpoints with precise JSON key deltas: added / removed / renamed / type / nullability.

Set driftLikely=false (with empty affectedEndpoints) when the change does not alter any rendered
JSON response shape. Prioritize removals, renames, type and nullability changes — those are the true
breakages. A purely additive key is only relevant if the consuming schema is strict (Stage B checks).`;
}

export function buildStageBSystem(): string {
  return `${PREAMBLE}

STAGE B — map each affected endpoint to its frontend Zod schema(s).
Discover heuristically, in confidence order:
  1) URL path-string match  2) endpoint constant  3) call-site → .parse() adjacency
  4) schema-file naming      5) existing-key corroboration
Require >=2 corroborating signals per mapping; record them in evidence[].
One endpoint may back MULTIPLE schemas (e.g. list + detail) — enumerate ALL call sites.
For each mapped schema, determine isStrict: does it use .strict()/.strip() (rejects unknown keys)?
Anything you cannot map with >=2 signals goes into unresolved[] — never guess a file.`;
}

export function buildStageCSystem(): string {
  return `${PREAMBLE}

STAGE C — compute and validate the corrected schema edit.
For each mapped schema that genuinely drifts:
- Produce the corrected FULL file content (newContent). Keep it minimal and idiomatic to the file.
- GUARDRAIL: if the backend change is purely additive (only new keys) AND the schema is NON-strict,
  do NOT propose an edit — non-strict schemas already tolerate extra keys. This is the biggest
  false-positive source. Only propose additive edits for strict schemas.
- Call validate_zod_schema on each newContent and iterate until it type-checks.
- Record mappingEvidence (carried from Stage B, >=2 signals) and a concise rationale per edit.
Emit proposedEdits[] and unresolved[]. Do not set validated=true yourself — the caller re-verifies.`;
}

export function stageAUserPrompt(changedFiles: string[]): string {
  return `Backend changed files (from the push):\n${changedFiles.map((f) => `- ${f}`).join('\n')}\n\nBegin with get_backend_diff.`;
}

export function stageBUserPrompt(stageA: StageAResult): string {
  return `Stage A found these affected endpoints:\n${JSON.stringify(stageA.affectedEndpoints, null, 2)}\n\nMap each to its frontend Zod schema(s).`;
}

export function stageCUserPrompt(
  stageA: StageAResult,
  stageB: StageBResult,
): string {
  return `Affected endpoints (Stage A):\n${JSON.stringify(stageA.affectedEndpoints, null, 2)}\n\nSchema mappings (Stage B):\n${JSON.stringify(stageB.mappings, null, 2)}\n\nProduce corrected, type-checked edits. Respect the additive+non-strict guardrail.`;
}
