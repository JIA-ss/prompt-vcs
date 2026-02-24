import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initCommand } from '../../src/commands/init';
import { addCommand } from '../../src/commands/add';
import { commitCommand } from '../../src/commands/commit';

describe('commit command', () => {
  let tempDir: string;
  let consoleError: typeof console.error;
  let consoleLog: typeof console.log;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-commit-'));
    logs = [];
    errors = [];
    consoleLog = console.log;
    consoleError = console.error;
    console.log = (...args: any[]) => logs.push(args.join(' '));
    console.error = (...args: any[]) => errors.push(args.join(' '));
    
    initCommand(tempDir);
  });

  afterEach(() => {
    console.log = consoleLog;
    console.error = consoleError;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should commit staged files', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'hello');
    addCommand(tempDir, 'test.txt');
    logs = [];
    
    const exitCode = commitCommand(tempDir, 'Initial commit');
    
    expect(exitCode).toBe(0);
    expect(logs[0]).toMatch(/\[\w{7}\] Initial commit/);
  });

  it('should return error if no message provided', () => {
    const exitCode = commitCommand(tempDir, '');
    
    expect(exitCode).toBe(1);
    expect(errors[0]).toContain('message required');
  });

  it('should return error if nothing staged', () => {
    const exitCode = commitCommand(tempDir, 'Empty commit');
    
    expect(exitCode).toBe(3);
    expect(errors[0]).toContain('nothing to commit');
  });

  it('should create commit object with correct structure', () => {
    writeFileSync(join(tempDir, 'a.txt'), 'content a');
    addCommand(tempDir, 'a.txt');
    logs = [];
    
    commitCommand(tempDir, 'Test commit');
    
    // Get commit hash from output
    const match = logs[0].match(/\[(\w{7})\]/);
    expect(match).toBeTruthy();
    const shortHash = match![1];
    
    // Read HEAD to get full commit hash
    const headHash = readFileSync(join(tempDir, '.pvc', 'HEAD'), 'utf-8').trim();
    expect(headHash.startsWith(shortHash)).toBe(true);
    
    // Read commit object
    const commitContent = readFileSync(
      join(tempDir, '.pvc', 'objects', headHash.slice(0, 2), headHash.slice(2)),
      'utf-8'
    );
    const commit = JSON.parse(commitContent);
    expect(commit.type).toBe('commit');
    expect(commit.message).toBe('Test commit');
    expect(commit.tree['a.txt']).toBeTruthy();
    expect(commit.parent).toBeNull();
  });

  it('should link to parent commit', () => {
    writeFileSync(join(tempDir, 'v1.txt'), 'version 1');
    addCommand(tempDir, 'v1.txt');
    commitCommand(tempDir, 'First');
    
    writeFileSync(join(tempDir, 'v2.txt'), 'version 2');
    addCommand(tempDir, 'v2.txt');
    logs = [];
    
    commitCommand(tempDir, 'Second');
    
    const headHash = readFileSync(join(tempDir, '.pvc', 'HEAD'), 'utf-8').trim();
    const commitContent = readFileSync(
      join(tempDir, '.pvc', 'objects', headHash.slice(0, 2), headHash.slice(2)),
      'utf-8'
    );
    const commit = JSON.parse(commitContent);
    expect(commit.parent).toBeTruthy();
  });

  it('should clear staged files after commit', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'hello');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'Test');
    
    const index = JSON.parse(readFileSync(join(tempDir, '.pvc', 'index.json'), 'utf-8'));
    expect(Object.keys(index.staged)).toHaveLength(0);
  });
});