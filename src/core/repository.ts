import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Index } from '../types/index.js';
import { ObjectStorage } from './storage.js';

/**
 * Repository manager - handles .pvc/ directory operations
 */
export class Repository {
  private pvcDir: string;
  private objectsDir: string;
  private indexPath: string;
  private headPath: string;
  public storage: ObjectStorage;

  constructor(private rootDir: string) {
    this.pvcDir = join(rootDir, '.pvc');
    this.objectsDir = join(this.pvcDir, 'objects');
    this.indexPath = join(this.pvcDir, 'index.json');
    this.headPath = join(this.pvcDir, 'HEAD');
    this.storage = new ObjectStorage(this.objectsDir);
  }

  /**
   * Check if repository is initialized
   */
  isInitialized(): boolean {
    return existsSync(this.pvcDir);
  }

  /**
   * Initialize repository
   */
  init(): void {
    if (this.isInitialized()) {
      throw new Error('.pvc already exists');
    }

    mkdirSync(this.pvcDir, { recursive: true });
    mkdirSync(this.objectsDir, { recursive: true });
    
    // Create empty index
    const emptyIndex: Index = { staged: {} };
    writeFileSync(this.indexPath, JSON.stringify(emptyIndex, null, 2));
  }

  /**
   * Read index file
   */
  readIndex(): Index {
    const content = readFileSync(this.indexPath, 'utf-8');
    return JSON.parse(content) as Index;
  }

  /**
   * Write index file
   */
  writeIndex(index: Index): void {
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Get current HEAD commit hash
   */
  getHead(): string | null {
    if (!existsSync(this.headPath)) {
      return null;
    }
    return readFileSync(this.headPath, 'utf-8').trim();
  }

  /**
   * Set HEAD to a commit hash
   */
  setHead(commitHash: string): void {
    writeFileSync(this.headPath, commitHash);
  }

  /**
   * Get storage for reading objects
   */
  getStorage(): ObjectStorage {
    return this.storage;
  }

  /**
   * Get a commit by its hash
   */
  getCommit(hash: string): import('../types/index.js').Commit | null {
    try {
      const content = this.storage.readObject(hash);
      const commit = JSON.parse(content.toString()) as import('../types/index.js').Commit;
      if (commit.type !== 'commit') {
        return null;
      }
      return commit;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a commit reference (short hash or full hash)
   */
  resolveCommit(ref: string): string | null {
    // For now, just return the ref if it looks like a hash
    // In a full implementation, this would also support refs/heads/main, HEAD~1, etc.
    if (ref.length >= 7) {
      // Try to find the commit by prefix
      try {
        const commit = this.getCommit(ref);
        if (commit) {
          return ref;
        }
      } catch {
        // Continue to check if it's a short hash
      }
    }

    // Check HEAD
    if (ref === 'HEAD') {
      return this.getHead();
    }

    return null;
  }
}