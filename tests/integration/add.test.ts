import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initCommand } from '../../src/commands/init';
import { addCommand } from '../../src/commands/add';

describe('add command', () => {
  let tempDir: string;
  let consoleError: typeof console.error;
  let consoleLog: typeof console.log;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-add-'));
    logs = [];
    errors = [];
    consoleLog = console.log;
    consoleError = console.error;
    console.log = (...args: any[]) => logs.push(args.join(' '));
    console.error = (...args: any[]) => errors.push(args.join(' '));
    
    // Initialize repo
    initCommand(tempDir);
    // Clear logs from init
    logs = [];
  });

  afterEach(() => {
    console.log = consoleLog;
    console.error = consoleError;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should add a single file', () => {
    const filePath = join(tempDir, 'prompt.txt');
    writeFileSync(filePath, 'Hello, LLM!');
    
    const exitCode = addCommand(tempDir, 'prompt.txt');
    
    expect(exitCode).toBe(0);
    expect(logs[0]).toContain('Staged prompt.txt');
  });

  it('should return error if file does not exist', () => {
    const exitCode = addCommand(tempDir, 'nonexistent.txt');
    
    expect(exitCode).toBe(4);
    expect(errors[0]).toContain('not found');
  });

  it('should return error if repository not initialized', () => {
    const newDir = mkdtempSync(join(tmpdir(), 'pvc-not-init-'));
    writeFileSync(join(newDir, 'test.txt'), 'test');
    
    const exitCode = addCommand(newDir, 'test.txt');
    
    expect(exitCode).toBe(2);
    rmSync(newDir, { recursive: true });
  });

  it('should add all files in a directory', () => {
    const subDir = join(tempDir, 'prompts');
    mkdirSync(subDir);
    writeFileSync(join(subDir, 'a.txt'), 'content a');
    writeFileSync(join(subDir, 'b.txt'), 'content b');
    
    const exitCode = addCommand(tempDir, 'prompts');
    
    expect(exitCode).toBe(0);
    expect(logs[0]).toContain('Staged 2 files');
  });

  it('should update existing staged file', () => {
    const filePath = join(tempDir, 'test.txt');
    writeFileSync(filePath, 'version 1');
    addCommand(tempDir, 'test.txt');
    logs = [];
    
    writeFileSync(filePath, 'version 2');
    const exitCode = addCommand(tempDir, 'test.txt');
    
    expect(exitCode).toBe(0);
    expect(logs[0]).toContain('Staged test.txt');
  });
});