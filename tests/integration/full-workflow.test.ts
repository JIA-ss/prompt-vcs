import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { testCommand } from '../../src/commands/test';
import { testLogCommand } from '../../src/commands/test-log';
import { testShowCommand } from '../../src/commands/test-show';

// Mock OpenAI client
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
        if (hash.includes('abc')) {
          return Buffer.from(JSON.stringify({ type: 'blob', content: 'Say hello to {{name}}' }));
        }
        if (hash.includes('def')) {
          return Buffer.from(JSON.stringify({ type: 'blob', content: 'Greet {{name}} warmly' }));
        }
        throw new Error(`Object not found: ${hash}`);
      },
    }),
    getCommit: (hash: string) => {
      if (hash.includes('abc')) {
        return { type: 'commit', tree: { 'prompt.txt': 'abc123hash' }, parent: null, message: 'Version A', timestamp: '2026-01-01' };
      }
      if (hash.includes('def')) {
        return { type: 'commit', tree: { 'prompt.txt': 'def456hash' }, parent: null, message: 'Version B', timestamp: '2026-01-02' };
      }
      return null;
    },
    resolveCommit: (ref: string) => {
      if (ref.includes('abc')) return 'abc123hash789';
      if (ref.includes('def')) return 'def456hash012';
      return null;
    },
  })),
}));

describe('Full A/B Testing Workflow', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-workflow-test-'));
    mkdirSync(join(tempDir, '.pvc', 'test-runs'), { recursive: true });
    originalEnv = process.env;
    process.env = { ...originalEnv, OPENAI_API_KEY: 'sk-test' };

    // Create a comprehensive dataset
    const dataset = {
      testCases: [
        { name: 'Greet Alice', inputs: { name: 'Alice' } },
        { name: 'Greet Bob', inputs: { name: 'Bob' } },
        { name: 'Greet Charlie', inputs: { name: 'Charlie' } },
      ]
    };
    writeFileSync(join(tempDir, 'greetings.json'), JSON.stringify(dataset));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should run complete A/B test workflow', async () => {
    // Step 1: Run A/B test with save
    const testExitCode = await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'greetings.json'),
      concurrency: 2,
      model: 'gpt-4',
      save: true,
    });
    expect(testExitCode).toBe(0);

    // Step 2: List test runs
    const logExitCode = await testLogCommand(tempDir, { limit: 10 });
    expect(logExitCode).toBe(0);

    // Step 3: Show details of the latest run
    // Get the run ID from storage
    const { TestRunStorage } = await import('../../src/core/test-storage');
    const storage = new TestRunStorage(join(tempDir, '.pvc', 'test-runs'));
    const runs = storage.list();
    expect(runs.length).toBeGreaterThan(0);

    const showExitCode = await testShowCommand(tempDir, runs[0].id);
    expect(showExitCode).toBe(0);
  });

  it('should handle multiple test runs', async () => {
    // Run first test
    await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'greetings.json'),
      concurrency: 1,
      model: 'gpt-4',
      save: true,
    });

    // Run second test
    await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'greetings.json'),
      concurrency: 1,
      model: 'gpt-3.5-turbo',
      save: true,
    });

    // List should show both
    const { TestRunStorage } = await import('../../src/core/test-storage');
    const storage = new TestRunStorage(join(tempDir, '.pvc', 'test-runs'));
    const runs = storage.list();
    expect(runs.length).toBe(2);

    // Verify different models
    const models = runs.map(r => r.model);
    expect(models).toContain('gpt-4');
    expect(models).toContain('gpt-3.5-turbo');
  });

  it('should persist and load test results correctly', async () => {
    // Run test
    await testCommand(tempDir, 'abc123', 'def456', {
      dataset: join(tempDir, 'greetings.json'),
      concurrency: 1,
      model: 'gpt-4',
      save: true,
    });

    // Load from storage
    const { TestRunStorage } = await import('../../src/core/test-storage');
    const storage = new TestRunStorage(join(tempDir, '.pvc', 'test-runs'));
    const runs = storage.list();
    const run = runs[0];

    // Verify structure
    expect(run.id).toBeDefined();
    expect(run.timestamp).toBeDefined();
    expect(run.commitA).toBeDefined();
    expect(run.commitB).toBeDefined();
    expect(run.dataset).toBe(join(tempDir, 'greetings.json'));
    expect(run.model).toBe('gpt-4');
    expect(run.results.commitA.testCases).toHaveLength(3);
    expect(run.results.commitB.testCases).toHaveLength(3);
    expect(run.statistics.latency).toBeDefined();
    expect(run.statistics.cost).toBeDefined();
    expect(run.statistics.tokens).toBeDefined();
  });
});
