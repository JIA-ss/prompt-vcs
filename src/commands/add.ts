import { existsSync, statSync, readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { Repository } from '../core/repository.js';
import { hashContent } from '../core/hash.js';
import type { Blob } from '../types/index.js';

/**
 * Add file(s) to staging area
 */
export function addCommand(cwd: string, filePath: string): number {
  const repo = new Repository(cwd);
  
  if (!repo.isInitialized()) {
    console.error('Error: not a prompt-vcs repository (.pvc not found)');
    return 2;
  }
  
  const fullPath = join(cwd, filePath);
  
  if (!existsSync(fullPath)) {
    console.error(`Error: file not found: ${filePath}`);
    return 4;
  }
  
  const stat = statSync(fullPath);
  const index = repo.readIndex();
  let count = 0;
  
  if (stat.isDirectory()) {
    // Add all files in directory
    const files = readdirSync(fullPath);
    for (const file of files) {
      const fileFullPath = join(fullPath, file);
      if (statSync(fileFullPath).isFile()) {
        addSingleFile(repo, cwd, fileFullPath, index);
        count++;
      }
    }
    console.log(`Staged ${count} files from ${filePath}`);
  } else {
    // Add single file
    addSingleFile(repo, cwd, fullPath, index);
    console.log(`Staged ${filePath}`);
  }
  
  repo.writeIndex(index);
  return 0;
}

function addSingleFile(repo: Repository, cwd: string, fullPath: string, index: any): void {
  const content = readFileSync(fullPath, 'utf-8');
  const hash = hashContent(content);
  
  // Write blob object
  const blob: Blob = { type: 'blob', content };
  const blobContent = JSON.stringify(blob);
  repo.storage.writeObject(hash, Buffer.from(blobContent));
  
  // Update index
  const relativePath = relative(cwd, fullPath);
  index.staged[relativePath] = { hash, path: relativePath };
}