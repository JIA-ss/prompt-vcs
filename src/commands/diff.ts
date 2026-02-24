import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createTwoFilesPatch } from 'diff';
import { Repository } from '../core/repository.js';
import type { Commit, Blob } from '../types/index.js';

/**
 * Show differences between versions
 */
export function diffCommand(cwd: string, commitA?: string, commitB?: string): number {
  const repo = new Repository(cwd);
  
  if (!repo.isInitialized()) {
    console.error('Error: not a prompt-vcs repository (.pvc not found)');
    return 2;
  }
  
  const headHash = repo.getHead();
  
  if (!headHash) {
    console.log('No differences found (no commits yet)');
    return 0;
  }
  
  try {
    let fromTree: { [path: string]: string } = {};
    let toTree: { [path: string]: string } = {};
    let fromLabel: string;
    let toLabel: string;
    
    if (!commitA && !commitB) {
      // Working directory vs HEAD
      fromTree = getCommitTree(repo, headHash);
      toTree = getWorkingTree(cwd);
      fromLabel = headHash.slice(0, 7);
      toLabel = 'working';
    } else if (commitA && !commitB) {
      // Working directory vs specific commit
      fromTree = getCommitTree(repo, resolveCommit(repo, commitA));
      toTree = getWorkingTree(cwd);
      fromLabel = commitA;
      toLabel = 'working';
    } else if (commitA && commitB) {
      // Commit A vs Commit B
      fromTree = getCommitTree(repo, resolveCommit(repo, commitA));
      toTree = getCommitTree(repo, resolveCommit(repo, commitB));
      fromLabel = commitA;
      toLabel = commitB;
    }
    
    const diff = generateDiff(repo, cwd, fromTree, toTree, fromLabel!, toLabel!);
    
    if (diff === '') {
      console.log('No differences found');
    } else {
      console.log(diff);
    }
    
    return 0;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    return 5;
  }
}

function resolveCommit(repo: Repository, shortHash: string): string {
  // For simplicity, we check if shortHash matches the start of any commit hash
  // In a full implementation, we'd search through all objects
  const headHash = repo.getHead();
  if (!headHash) throw new Error('No commits found');
  
  // For now, only support HEAD and HEAD's ancestors
  let currentHash: string | null = headHash;
  
  while (currentHash) {
    if (currentHash.startsWith(shortHash)) {
      return currentHash;
    }
    
    const commit = getCommit(repo, currentHash);
    currentHash = commit.parent;
  }
  
  throw new Error(`Invalid commit: ${shortHash}`);
}

function getCommit(repo: Repository, hash: string): Commit {
  const content = repo.storage.readObject(hash).toString('utf-8');
  return JSON.parse(content) as Commit;
}

function getCommitTree(repo: Repository, commitHash: string): { [path: string]: string } {
  const commit = getCommit(repo, commitHash);
  return commit.tree;
}

function getWorkingTree(cwd: string): { [path: string]: string } {
  // For simplicity, scan all files in cwd
  // In a full implementation, this would use gitignore-like filtering
  const tree: { [path: string]: string } = {};
  
  function scanDir(dir: string, prefix: string = '') {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.pvc') continue;
      
      const fullPath = join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      
      if (entry.isDirectory()) {
        scanDir(fullPath, relPath);
      } else {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          tree[relPath] = content;
        } catch {
          // Skip binary or unreadable files
        }
      }
    }
  }
  
  scanDir(cwd);
  return tree;
}

function generateDiff(
  repo: Repository,
  cwd: string,
  fromTree: { [path: string]: string },
  toTree: { [path: string]: string },
  fromLabel: string,
  toLabel: string
): string {
  const diffs: string[] = [];
  const allPaths = new Set([...Object.keys(fromTree), ...Object.keys(toTree)]);
  
  for (const filePath of allPaths) {
    const fromContent = getFileContent(repo, cwd, fromTree, filePath);
    const toContent = getFileContent(repo, cwd, toTree, filePath);
    
    if (fromContent !== toContent) {
      const patch = createTwoFilesPatch(
        `a/${filePath}`,
        `b/${filePath}`,
        fromContent,
        toContent,
        fromLabel,
        toLabel
      );
      diffs.push(patch);
    }
  }
  
  return diffs.join('\n');
}

function getFileContent(
  repo: Repository,
  cwd: string,
  tree: { [path: string]: string },
  filePath: string
): string {
  if (filePath in tree) {
    const hashOrContent = tree[filePath];
    
    // Check if it's a hash (40+ hex chars) or raw content
    if (/^[a-f0-9]{40,64}$/i.test(hashOrContent)) {
      // It's a blob hash
      const blobContent = repo.storage.readObject(hashOrContent).toString('utf-8');
      const blob = JSON.parse(blobContent) as Blob;
      return blob.content;
    } else {
      // It's raw content from working tree
      return hashOrContent;
    }
  }
  return '';
}