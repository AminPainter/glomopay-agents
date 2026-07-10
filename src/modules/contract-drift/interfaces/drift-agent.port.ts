import { DriftReport } from '../dtos/drift.schemas';

export const DRIFT_AGENT = Symbol('DRIFT_AGENT');

export interface DriftAgentInput {
  backendDir: string;
  frontendDir: string;
  // Authoritative unified patch from compareCommits(before, after).
  backendDiff: string;
  changedFiles: string[];
  backendSha: string;
}

// Seam: DriftProcessorService depends on this token, never the concrete class.
export interface DriftAgent {
  analyze(input: DriftAgentInput): Promise<DriftReport>;
}
