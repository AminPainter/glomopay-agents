import { z } from 'zod';

export const keyChangeKind = z.enum([
  'added',
  'removed',
  'renamed',
  'type',
  'nullability',
]);

export const keyDeltaSchema = z.object({
  key: z.string().describe('JSON key path in the response, e.g. data.status'),
  kind: keyChangeKind,
  from: z.string().optional().describe('previous type/name where relevant'),
  to: z.string().optional().describe('new type/name where relevant'),
  note: z.string().optional(),
});

export const affectedEndpointSchema = z.object({
  method: z.string().describe('HTTP method, e.g. GET'),
  path: z.string().describe('route path, e.g. /api/v1/payments/:id'),
  controllerAction: z.string().optional(),
  serializationView: z
    .string()
    .optional()
    .describe('file that actually renders the JSON (serializer/jbuilder)'),
  keyDeltas: z.array(keyDeltaSchema),
});
export type AffectedEndpoint = z.infer<typeof affectedEndpointSchema>;

// ---- Stage A: characterize the backend delta -------------------------------
export const stageAResultSchema = z.object({
  driftLikely: z
    .boolean()
    .describe('true only if the JSON response shape actually changed'),
  affectedEndpoints: z.array(affectedEndpointSchema),
  reasoning: z.string(),
});
export type StageAResult = z.infer<typeof stageAResultSchema>;

// ---- Stage B: map endpoints to frontend Zod schemas ------------------------
export const schemaMappingSchema = z.object({
  endpointPath: z.string(),
  filePath: z.string().describe('frontend file, repo-relative'),
  schemaExport: z.string().describe('exported Zod schema name'),
  isStrict: z
    .boolean()
    .describe(
      'true if the schema uses .strict()/.strip() (rejects extra keys)',
    ),
  evidence: z
    .array(z.string())
    .describe('>=2 corroborating signals for this mapping'),
});
export type SchemaMapping = z.infer<typeof schemaMappingSchema>;

export const unresolvedSchema = z.object({
  endpointPath: z.string(),
  reason: z.string(),
});
export type Unresolved = z.infer<typeof unresolvedSchema>;

export const stageBResultSchema = z.object({
  mappings: z.array(schemaMappingSchema),
  unresolved: z.array(unresolvedSchema),
});
export type StageBResult = z.infer<typeof stageBResultSchema>;

// ---- Stage C: compute + validate the edit ----------------------------------
export const proposedEditSchema = z.object({
  filePath: z.string(),
  changeKind: z.enum(['modify', 'create']),
  schemaExport: z.string(),
  newContent: z.string().describe('full corrected file content'),
  rationale: z.string(),
  mappingEvidence: z.array(z.string()),
  validated: z
    .boolean()
    .describe('set by the non-LLM verifier; do not self-assert'),
});
export type ProposedEdit = z.infer<typeof proposedEditSchema>;

export const stageCResultSchema = z.object({
  proposedEdits: z.array(proposedEditSchema),
  unresolved: z.array(unresolvedSchema),
});
export type StageCResult = z.infer<typeof stageCResultSchema>;

// ---- Final report ----------------------------------------------------------
export const driftReportSchema = z.object({
  driftDetected: z.boolean(),
  summary: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  affectedEndpoints: z.array(affectedEndpointSchema).default([]),
  proposedEdits: z.array(proposedEditSchema).default([]),
  unresolved: z.array(unresolvedSchema).default([]),
});
export type DriftReport = z.infer<typeof driftReportSchema>;
