import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestRunner } from '../../src/core/test-runner';
import { OpenAIClient } from '../../src/core/openai-client';
import type { Dataset, TestCase, TestRunnerOptions } from '../../src/types/test';

// Mock OpenAIClient
vi.mock('../../src/core/openai-client', () => ({
  OpenAIClient: vi.fn().mockImplementation(() => ({
    createChatCompletion: vi.fn(),
    getApiKey: () => 'sk-test',
    getMaskedKey: () => 'sk-t...est',
  })),
  OpenAIError: class OpenAIError extends Error {},
}));

describe('TestRunner', () => {
  let options: TestRunnerOptions;
  let mockCreateChatCompletion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    options = {
      model: 'gpt-4',
      concurrency: 2,
      maxRetries: 1,
      apiKey: 'sk-test',
    };
    mockCreateChatCompletion = vi.fn();
    (OpenAIClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      createChatCompletion: mockCreateChatCompletion,
      getApiKey: () => 'sk-test',
      getMaskedKey: () => 'sk-t...est',
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with options', () => {
      const runner = new TestRunner(options);
      expect(runner).toBeDefined();
    });
  });

  describe('run', () => {
    it('should run test with single test case', async () => {
      mockCreateChatCompletion.mockResolvedValue({
        id: 'resp-1',
        choices: [{ message: { content: 'Response 1' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      const runner = new TestRunner(options);
      const dataset: Dataset = {
        testCases: [{ name: 'Test 1', inputs: { query: 'hello' } }]
      };

      const result = await runner.run(dataset, 'Hello {{query}}', 'Hi {{query}}');

      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].name).toBe('Test 1');
      expect(result.testCases[0].success).toBe(true);
      expect(result.testCases[0].output).toBe('Response 1');
    });

    it('should run test with multiple test cases', async () => {
      mockCreateChatCompletion
        .mockResolvedValueOnce({
          id: 'resp-1',
          choices: [{ message: { content: 'Response 1' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })
        .mockResolvedValueOnce({
          id: 'resp-2',
          choices: [{ message: { content: 'Response 2' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 }
        });

      const runner = new TestRunner(options);
      const dataset: Dataset = {
        testCases: [
          { name: 'Test 1', inputs: { query: 'hello' } },
          { name: 'Test 2', inputs: { query: 'world' } }
        ]
      };

      const result = await runner.run(dataset, 'Prompt {{query}}', 'Prompt {{query}}');

      expect(result.testCases).toHaveLength(2);
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(2);
    });

    it('should respect concurrency limit', async () => {
      const callTimes: number[] = [];
      mockCreateChatCompletion.mockImplementation(async () => {
        callTimes.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          id: 'resp',
          choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        };
      });

      const runner = new TestRunner({ ...options, concurrency: 1 });
      const dataset: Dataset = {
        testCases: [
          { name: 'Test 1', inputs: { q: '1' } },
          { name: 'Test 2', inputs: { q: '2' } },
          { name: 'Test 3', inputs: { q: '3' } }
        ]
      };

      await runner.run(dataset, '{{q}}', '{{q}}');

      // With concurrency 1, calls should be sequential
      expect(callTimes.length).toBe(3);
      // At least 50ms between first and second call
      expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(45);
    });

    it('should handle API errors gracefully', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('API Error'));

      const runner = new TestRunner(options);
      const dataset: Dataset = {
        testCases: [{ name: 'Test 1', inputs: { query: 'hello' } }]
      };

      const result = await runner.run(dataset, '{{query}}', '{{query}}');

      expect(result.testCases[0].success).toBe(false);
      expect(result.testCases[0].error).toContain('API Error');
    });

    it('should calculate metrics correctly', async () => {
      mockCreateChatCompletion.mockResolvedValue({
        id: 'resp-1',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });

      const runner = new TestRunner(options);
      const dataset: Dataset = {
        testCases: [{ name: 'Test 1', inputs: { query: 'hello' } }]
      };

      const result = await runner.run(dataset, '{{query}}', '{{query}}');

      expect(result.summary.totalCount).toBe(1);
      expect(result.summary.successCount).toBe(1);
      expect(result.summary.successRate).toBe(1);
      expect(result.summary.avgInputTokens).toBe(100);
      expect(result.summary.avgOutputTokens).toBe(50);
      expect(result.testCases[0].cost).toBeGreaterThan(0);
    });

    it('should track progress', async () => {
      mockCreateChatCompletion.mockResolvedValue({
        id: 'resp',
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
      });

      const runner = new TestRunner(options);
      const progressCallback = vi.fn();
      runner.onProgress(progressCallback);

      const dataset: Dataset = {
        testCases: [
          { name: 'Test 1', inputs: { q: '1' } },
          { name: 'Test 2', inputs: { q: '2' } }
        ]
      };

      await runner.run(dataset, '{{q}}', '{{q}}');

      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenCalledWith(1, 2, 'Test 1');
      expect(progressCallback).toHaveBeenCalledWith(2, 2, 'Test 2');
    });
  });

  describe('replaceVariables', () => {
    it('should replace variables in template', () => {
      const runner = new TestRunner(options);
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const inputs = { name: 'Alice', place: 'Wonderland' };
      
      const result = (runner as any).replaceVariables(template, inputs);
      expect(result).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('should handle missing variables', () => {
      const runner = new TestRunner(options);
      const template = 'Hello {{name}}!';
      const inputs = {};
      
      const result = (runner as any).replaceVariables(template, inputs);
      expect(result).toBe('Hello !');
    });

    it('should handle empty template', () => {
      const runner = new TestRunner(options);
      const result = (runner as any).replaceVariables('', { name: 'Alice' });
      expect(result).toBe('');
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      mockCreateChatCompletion
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          id: 'resp',
          choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        });

      const runner = new TestRunner({ ...options, maxRetries: 2 });
      const dataset: Dataset = {
        testCases: [{ name: 'Test 1', inputs: { query: 'hello' } }]
      };

      const result = await runner.run(dataset, '{{query}}', '{{query}}');

      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(2);
      expect(result.testCases[0].success).toBe(true);
    });

    it('should fail after max retries', async () => {
      mockCreateChatCompletion.mockRejectedValue(new Error('Persistent Error'));

      const runner = new TestRunner({ ...options, maxRetries: 2 });
      const dataset: Dataset = {
        testCases: [{ name: 'Test 1', inputs: { query: 'hello' } }]
      };

      const result = await runner.run(dataset, '{{query}}', '{{query}}');

      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.testCases[0].success).toBe(false);
    });
  });
});
