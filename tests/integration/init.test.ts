import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { initCommand } from '../../src/commands/init';

describe('init command', () => {
  let tempDir: string;
  let consoleLog: typeof console.log;
  let consoleError: typeof console.error;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-init-'));
    logs = [];
    errors = [];
    consoleLog = console.log;
    consoleError = console.error;
    console.log = (...args: any[]) => logs.push(args.join(' '));
    console.error = (...args: any[]) => errors.push(args.join(' '));
  });

  afterEach(() => {
    console.log = consoleLog;
    console.error = consoleError;
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should initialize repository', () => {
    const exitCode = initCommand(tempDir);
    
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, '.pvc'))).toBe(true);
    expect(existsSync(join(tempDir, '.pvc', 'objects'))).toBe(true);
    expect(existsSync(join(tempDir, '.pvc', 'index.json'))).toBe(true);
    expect(logs[0]).toContain('Initialized empty prompt-vcs repository');
  });

  it('should return error if already initialized', () => {
    initCommand(tempDir);
    logs = [];
    
    const exitCode = initCommand(tempDir);
    
    expect(exitCode).toBe(2);
    expect(errors[0]).toContain('already exists');
  });

  it('should create empty index', () => {
    initCommand(tempDir);
    
    const index = JSON.parse(readFileSync(join(tempDir, '.pvc', 'index.json'), 'utf-8'));
    expect(index.staged).toEqual({});
  });
});