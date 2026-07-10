export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  previousFilename?: string;
  patch?: string;
}

export interface CompareResult {
  files: ChangedFile[];
  htmlUrl: string;
  commitShas: string[];
}

export interface OpenedPr {
  number: number;
  htmlUrl: string;
}

export function parseRepo(fullName: string): { owner: string; repo: string } {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) {
    throw new Error(`invalid repo slug: expected owner/repo`);
  }
  return { owner, repo };
}
