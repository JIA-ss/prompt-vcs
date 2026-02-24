import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initCommand } from '../../src/commands/init';
import { addCommand } from '../../src/commands/add';
import { commitCommand } from '../../src/commands/commit';
import { diffCommand } from '../../src/commands/diff';

describe('diff command', () => {
  let tempDir: string;
  let consoleError: typeof console.error;
  let consoleLog: typeof console.log;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-diff-'));
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

  it('should show no differences when files match HEAD', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'content');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'Initial');
    logs = [];
    
    const exitCode = diffCommand(tempDir);
    
    expect(exitCode).toBe(0);
    expect(logs[0]).toContain('No differences found');
  });

  it('should show differences between working directory and HEAD', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'original');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'Initial');
    
    writeFileSync(join(tempDir, 'test.txt'), 'modified');
    logs = [];
    
    const exitCode = diffCommand(tempDir);
    
    expect(exitCode).toBe(0);
    const output = logs.join('\n');
    expect(output).toContain('--- a/test.txt');
    expect(output).toContain('+++ b/test.txt');
    expect(output).toContain('-original');
    expect(output).toContain('+modified');
  });

  it('should show differences with specific commit', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'version 1');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'First');
    const firstHash = readFileSync(join(tempDir, '.pvc', 'HEAD'), 'utf-8').trim().slice(0, 7);
    
    writeFileSync(join(tempDir, 'test.txt'), 'version 2');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'Second');
    
    writeFileSync(join(tempDir, 'test.txt'), 'version 3');
    logs = [];
    
    const exitCode = diffCommand(tempDir, firstHash);
    
    expect(exitCode).toBe(0);
    const output = logs.join('\n');
    expect(output).toContain('-version 1');
    expect(output).toContain('+version 3');
  });

  it('should show differences between two commits', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'a');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'First');
    const firstHash = readFileSync(join(tempDir, '.pvc', 'HEAD'), 'utf-8').trim().slice(0, 7);
    
    writeFileSync(join(tempDir, 'test.txt'), 'b');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'Second');
    const secondHash = readFileSync(join(tempDir, '.pvc', 'HEAD'), 'utf-8').trim().slice(0, 7);
    logs = [];
    
    const exitCode = diffCommand(tempDir, firstHash, secondHash);
    
    expect(exitCode).toBe(0);
    const output = logs.join('\n');
    expect(output).toContain('-a');
    expect(output).toContain('+b');
  });

  it('should return error for invalid commit hash', () => {
    writeFileSync(join(tempDir, 'test.txt'), 'content');
    addCommand(tempDir, 'test.txt');
    commitCommand(tempDir, 'Initial');
    logs = [];
    
    const exitCode = diffCommand(tempDir, 'invalidhash');
    
    expect(exitCode).toBe(5);
    expect(errors[0]).toContain('Invalid commit');
  });

  it('should return error if not initialized', () => {
    const newDir = mkdtempSync(join(tmpdir(), 'pvc-not-init-'));
    
    const exitCode = diffCommand(newDir);
    
    expect(exitCode).toBe(2);
    rmSync(newDir, { recursive: true });
  });
});