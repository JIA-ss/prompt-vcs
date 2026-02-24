import { Repository } from '../core/repository.js';
import { hashContent } from '../core/hash.js';
import { truncateHash } from '../core/hash.js';
import type { Commit } from '../types/index.js';

/**
 * Create a commit from staged files
 */
export function commitCommand(cwd: string, message: string): number {
  const repo = new Repository(cwd);
  
  if (!repo.isInitialized()) {
    console.error('Error: not a prompt-vcs repository (.pvc not found)');
    return 2;
  }
  
  if (!message || message.trim() === '') {
    console.error('Error: commit message required (-m "message")');
    return 1;
  }
  
  const index = repo.readIndex();
  const stagedFiles = Object.keys(index.staged);
  
  if (stagedFiles.length === 0) {
    console.error('Error: nothing to commit (no staged files)');
    return 3;
  }
  
  // Build commit tree
  const tree: { [path: string]: string } = {};
  for (const path of stagedFiles) {
    tree[path] = index.staged[path].hash;
  }
  
  // Create commit object
  const commit: Commit = {
    type: 'commit',
    tree,
    parent: repo.getHead(),
    message: message.trim(),
    timestamp: new Date().toISOString()
  };
  
  const commitContent = JSON.stringify(commit);
  const commitHash = hashContent(commitContent);
  
  // Write commit object
  repo.storage.writeObject(commitHash, Buffer.from(commitContent));
  
  // Update HEAD
  repo.setHead(commitHash);
  
  // Clear staged
  index.staged = {};
  repo.writeIndex(index);
  
  console.log(`[${truncateHash(commitHash)}] ${message}`);
  return 0;
}