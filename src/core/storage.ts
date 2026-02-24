import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Content-addressable object storage with 2-level directory structure
 * Similar to Git's objects/ directory
 */
export class ObjectStorage {
  constructor(private objectsDir: string) {}

  /**
   * Get the full path for a hash
   * Uses 2-level structure: ab/cdef123... (first 2 chars / remaining chars)
   */
  private getObjectPath(hash: string): string {
    const dir = hash.slice(0, 2);
    const file = hash.slice(2);
    return join(this.objectsDir, dir, file);
  }

  /**
   * Write an object to storage
   */
  writeObject(hash: string, content: Buffer): void {
    const objectPath = this.getObjectPath(hash);
    const dir = dirname(objectPath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(objectPath, content);
  }

  /**
   * Read an object from storage
   */
  readObject(hash: string): Buffer {
    const objectPath = this.getObjectPath(hash);
    if (!existsSync(objectPath)) {
      throw new Error(`Object not found: ${hash}`);
    }
    return readFileSync(objectPath);
  }

  /**
   * Check if an object exists
   */
  exists(hash: string): boolean {
    const objectPath = this.getObjectPath(hash);
    return existsSync(objectPath);
  }
}