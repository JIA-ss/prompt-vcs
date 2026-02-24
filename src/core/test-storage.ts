import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { TestRun } from '../types/test.js';

/**
 * Storage for test run results
 */
export class TestRunStorage {
  constructor(private storageDir: string) {}

  /**
   * Generate a unique ID for a test run
   */
  static generateId(commitA: string, commitB: string): string {
    const timestamp = Date.now();
    const shortA = commitA.slice(0, 7);
    const shortB = commitB.slice(0, 7);
    return `${shortA}-${shortB}-${timestamp}`;
  }

  /**
   * Save a test run to storage
   */
  save(testRun: TestRun): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }

    const filePath = this.getFilePath(testRun.id);
    writeFileSync(filePath, JSON.stringify(testRun, null, 2));
  }

  /**
   * Load a test run by ID
   */
  load(id: string): TestRun {
    const filePath = this.getFilePath(id);
    
    if (!existsSync(filePath)) {
      throw new Error(`Test run not found: ${id}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as TestRun;
  }

  /**
   * List all test runs, sorted by timestamp (newest first)
   */
  list(): TestRun[] {
    if (!existsSync(this.storageDir)) {
      return [];
    }

    const files = readdirSync(this.storageDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = join(this.storageDir, file);
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as TestRun;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return files;
  }

  /**
   * Check if a test run exists
   */
  exists(id: string): boolean {
    return existsSync(this.getFilePath(id));
  }

  /**
   * Get the file path for a test run ID
   */
  private getFilePath(id: string): string {
    return join(this.storageDir, `${id}.json`);
  }
}
