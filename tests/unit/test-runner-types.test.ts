import { describe, it, expect } from 'vitest';
import type { TestRunnerOptions, TestCaseResult, VersionResult } from '../../src/types/test';

describe('Test Runner Types', () => {
  describe('TestRunnerOptions', () => {
    it('should accept valid options', () => {
      const options: TestRunnerOptions = {
        model: 'gpt-4',
        concurrency: 5,
        maxRetries: 3,
        apiKey: 'sk-test123'
      };
      expect(options.model).toBe('gpt-4');
      expect(options.concurrency).toBe(5);
      expect(options.maxRetries).toBe(3);
    });

    it('should accept different models', () => {
      const options: TestRunnerOptions = {
        model: 'gpt-3.5-turbo',
        concurrency: 1,
        maxRetries: 0,
        apiKey: 'key'
      };
      expect(options.model).toBe('gpt-3.5-turbo');
    });
  });

  describe('TestCaseResult', () => {
    it('should accept successful result', () => {
      const result: TestCaseResult = {
        name: 'Test 1',
        success: true,
        latency: 150,
        inputTokens: 10,
        outputTokens: 20,
        cost: 0.001,
        output: 'response'
      };
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept failed result with error', () => {
      const result: TestCaseResult = {
        name: 'Test 2',
        success: false,
        latency: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        error: 'API Error'
      };
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
      expect(result.output).toBeUndefined();
    });

    it('should accept zero values for metrics', () => {
      const result: TestCaseResult = {
        name: 'Test 3',
        success: true,
        latency: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0
      };
      expect(result.latency).toBe(0);
      expect(result.cost).toBe(0);
    });
  });

  describe('VersionResult', () => {
    it('should accept version result with summary', () => {
      const versionResult: VersionResult = {
        testCases: [
          {
            name: 'Test 1',
            success: true,
            latency: 100,
            inputTokens: 10,
            outputTokens: 20,
            cost: 0.001
          }
        ],
        summary: {
          avgLatency: 100,
          avgInputTokens: 10,
          avgOutputTokens: 20,
          avgCost: 0.001,
          successRate: 1.0,
          totalCount: 1,
          successCount: 1
        }
      };
      expect(versionResult.testCases).toHaveLength(1);
      expect(versionResult.summary.successRate).toBe(1.0);
    });

    it('should accept empty test cases', () => {
      const versionResult: VersionResult = {
        testCases: [],
        summary: {
          avgLatency: 0,
          avgInputTokens: 0,
          avgOutputTokens: 0,
          avgCost: 0,
          successRate: 0,
          totalCount: 0,
          successCount: 0
        }
      };
      expect(versionResult.testCases).toHaveLength(0);
    });
  });
});
