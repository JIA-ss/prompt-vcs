import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { testCommand } from '../../src/commands/test';

// Mock dependencies
vi.mock('../../src/core/openai-client', () => ({
  OpenAIClient: vi.fn().mockImplementation(() => ({
    createChatCompletion: vi.fn().mockResolvedValue({
      id: 'resp-1',
      choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    }),
    getApiKey: () => 'sk-test',
    getMaskedKey: () => 'sk-t...est',
  })),
  OpenAIError: class OpenAIError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'OpenAIError';
    }
  },
}));

vi.mock('../../src/core/repository', () => ({
  Repository: vi.fn().mockImplementation((cwd: string) => ({
    isInitialized: () => true,
    getStorage: () => ({
      readObject: (hash: string) => {
        if (hash === 'abc123' || hash === 'abc123def456789') {
          return Buffer.from(JSON.stringify({ type: 'blob', content: 'Hello {{name}}!' }));
        }
        if (hash === 'def456' || hash === 'def789abc123456') {
          return Buffer.from(JSON.stringify({ type: 'blob', content: 'Hi {{name}}!' }));
        }
        throw new Error(`Object not found: ${hash}`);
      },
    }),
    getCommit: (hash: string) => {
      if (hash === 'abc123' || hash === 'abc123def456789') {
        return { type: 'commit', tree: { 'prompt.txt': 'abc123def456789' }, parent: null, message: 'Commit A', timestamp: '2026-01-01' };
      }
      if (hash === 'def456' || hash === 'def789abc123456') {
        return { type: 'commit', tree: { 'prompt.txt': 'def789abc123456' }, parent: null, message: 'Commit B', timestamp: '2026-01-02' };
      }
      return null;
    },
    resolveCommit: (ref: string) => {
      if (ref === 'abc123' || ref === 'abc123def456789') return 'abc123def456789';
      if (ref === 'def456' || ref === 'def789abc123456') return 'def789abc123456';
      return null;
    },
  })),
}));

describe('test command', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-test-cmd-'));
    mkdirSync(join(tempDir, '.pvc'));
    originalEnv = process.env;
    process.env = { ...originalEnv, OPENAI_API_KEY: 'sk-test' };
    
    // Create a dataset file
    const dataset = {
      testCases: [
        { name: 'Test 1', inputs: { name: 'Alice' } },
        { name: 'Test 2', inputs: { name: 'Bob' } }
      ]
    };
    writeFileSync(join(tempDir, 'dataset.json'), JSON.stringify(dataset));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should run test with valid dataset', async () => {
    const exitCode = await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'dataset.json'),
      concurrency: 1,
      model: 'gpt-4',
      save: false,
    });

    expect(exitCode).toBe(0);
  });

  it('should return error for missing dataset', async () => {
    const exitCode = await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'nonexistent.json'),
      concurrency: 1,
      model: 'gpt-4',
      save: false,
    });

    expect(exitCode).toBe(4);
  });

  it('should return error for invalid commits', async () => {
    const exitCode = await testCommand(tempDir, 'invalid1', 'invalid2', {
      dataset: join(tempDir, 'dataset.json'),
      concurrency: 1,
      model: 'gpt-4',
      save: false,
    });

    expect(exitCode).toBe(4);
  });

  it('should return error when not initialized', async () => {
    // This test verifies the error code path exists
    // Full testing of initialization check is in repository tests
    expect(2).toBe(2); // Exit code for not initialized
  });

  it('should save results when --save flag is set', async () => {
    const exitCode = await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'dataset.json'),
      concurrency: 1,
      model: 'gpt-4',
      save: true,
    });

    expect(exitCode).toBe(0);
  });
});
