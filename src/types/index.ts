// Object types for content-addressable storage

export interface Blob {
  type: 'blob';
  content: string;
}

export interface CommitTree {
  [filepath: string]: string; // filepath -> hash
}

export interface Commit {
  type: 'commit';
  tree: CommitTree;
  parent: string | null;
  message: string;
  timestamp: string;
}

export interface StagedFile {
  hash: string;
  path: string;
}

export interface Index {
  staged: {
    [filepath: string]: StagedFile;
  };
}

export type RepositoryObject = Blob | Commit;