export const DRIFT_QUEUE = 'contract-drift';

export interface DriftJobData {
  deliveryId: string;
  repo: string;
  ref: string;
  before: string;
  after: string;
  // Best-effort file list from the push payload; may be truncated. The worker
  // re-derives the authoritative changed-file set via compareCommits.
  changedFiles: string[];
}
