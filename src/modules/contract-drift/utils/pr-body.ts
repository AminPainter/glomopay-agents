import { DriftReport } from '../dtos/drift.schemas';

export interface PrContentInput {
  backendRepo: string;
  backendSha: string;
  compareUrl: string;
  changedBackendFiles: string[];
  report: DriftReport;
}

export function buildPrTitle(sha: string): string {
  return `chore(contract-drift): re-sync Zod schemas for ${sha.slice(0, 12)}`;
}

// Audit-trail PR body. Draft-only; stamped for mandatory human review.
export function buildPrBody(input: PrContentInput): string {
  const { backendRepo, backendSha, compareUrl, changedBackendFiles, report } =
    input;
  const commitUrl = `https://github.com/${backendRepo}/commit/${backendSha}`;

  const edits = report.proposedEdits
    .map(
      (e) =>
        `- \`${e.filePath}\` (${e.schemaExport}) — ${e.rationale}${e.validated ? ' ✓ tsc' : ' ⚠ unverified'}`,
    )
    .join('\n');

  const unresolved = report.unresolved.length
    ? report.unresolved
        .map((u) => `- ${u.endpointPath}: ${u.reason}`)
        .join('\n')
    : '_none_';

  return [
    'Automated draft — requires human review before merge.',
    '',
    `**Backend commit:** ${commitUrl}`,
    `**Compare:** ${compareUrl}`,
    `**Confidence:** ${report.confidence}`,
    '',
    '### Summary',
    report.summary,
    '',
    '### Changed backend files',
    changedBackendFiles.map((f) => `- \`${f}\``).join('\n') || '_none_',
    '',
    '### Proposed schema edits',
    edits || '_none_',
    '',
    '### Unresolved',
    unresolved,
  ].join('\n');
}
