import { describe, it, expect } from 'vitest';
import { StatisticalAnalyzer } from '../../src/core/statistical-analyzer';
import type { TestCaseResult, VersionResult } from '../../src/types/test';

describe('StatisticalAnalyzer', () => {
  describe('tTest', () => {
    it('should calculate t-test for two samples', () => {
      const sampleA = [100, 110, 105, 115, 100];
      const sampleB = [120, 125, 130, 128, 122];

      const result = StatisticalAnalyzer.tTest(sampleA, sampleB);

      expect(result.meanA).toBeCloseTo(106, 0);
      expect(result.meanB).toBeCloseTo(125, 0);
      expect(result.difference).toBeCloseTo(19, 0);
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.significant).toBe(true);
      expect(result.sampleSizeA).toBe(5);
      expect(result.sampleSizeB).toBe(5);
    });

    it('should detect non-significant difference', () => {
      const sampleA = [100, 101, 99, 100, 102];
      const sampleB = [100, 102, 98, 101, 99];

      const result = StatisticalAnalyzer.tTest(sampleA, sampleB);

      expect(result.pValue).toBeGreaterThan(0.05);
      expect(result.significant).toBe(false);
    });

    it('should handle small sample sizes', () => {
      const sampleA = [100];
      const sampleB = [110];

      const result = StatisticalAnalyzer.tTest(sampleA, sampleB);

      expect(result.sampleSizeA).toBe(1);
      expect(result.sampleSizeB).toBe(1);
      // With sample size of 1, can't really calculate p-value meaningfully
      expect(result.pValue).toBeDefined();
    });

    it('should handle equal samples', () => {
      const sampleA = [100, 100, 100];
      const sampleB = [100, 100, 100];

      const result = StatisticalAnalyzer.tTest(sampleA, sampleB);

      expect(result.meanA).toBe(100);
      expect(result.meanB).toBe(100);
      expect(result.difference).toBe(0);
      expect(result.pValue).toBe(1);
      expect(result.significant).toBe(false);
    });

    it('should calculate confidence interval', () => {
      const sampleA = [100, 110, 105, 115, 100];
      const sampleB = [120, 125, 130, 128, 122];

      const result = StatisticalAnalyzer.tTest(sampleA, sampleB);

      expect(result.confidenceInterval[0]).toBeLessThan(result.difference);
      expect(result.confidenceInterval[1]).toBeGreaterThan(result.difference);
    });
  });

  describe('compareVersions', () => {
    it('should compare two version results', () => {
      const resultA: VersionResult = {
        testCases: [
          { name: 'Test 1', success: true, latency: 100, inputTokens: 10, outputTokens: 20, cost: 0.001 },
          { name: 'Test 2', success: true, latency: 110, inputTokens: 12, outputTokens: 22, cost: 0.0012 },
        ],
        summary: {
          avgLatency: 105,
          avgInputTokens: 11,
          avgOutputTokens: 21,
          avgCost: 0.0011,
          successRate: 1,
          totalCount: 2,
          successCount: 2,
        }
      };

      const resultB: VersionResult = {
        testCases: [
          { name: 'Test 1', success: true, latency: 120, inputTokens: 15, outputTokens: 25, cost: 0.0015 },
          { name: 'Test 2', success: true, latency: 130, inputTokens: 17, outputTokens: 27, cost: 0.0017 },
        ],
        summary: {
          avgLatency: 125,
          avgInputTokens: 16,
          avgOutputTokens: 26,
          avgCost: 0.0016,
          successRate: 1,
          totalCount: 2,
          successCount: 2,
        }
      };

      const comparison = StatisticalAnalyzer.compareVersions(resultA, resultB);

      expect(comparison.latency.meanA).toBe(105);
      expect(comparison.latency.meanB).toBe(125);
      expect(comparison.cost.meanA).toBe(0.0011);
      expect(comparison.cost.meanB).toBe(0.0016);
      expect(comparison.tokens.meanA).toBe(32); // 11 + 21
      expect(comparison.tokens.meanB).toBe(42); // 16 + 26
    });

    it('should handle versions with failed test cases', () => {
      const resultA: VersionResult = {
        testCases: [
          { name: 'Test 1', success: true, latency: 100, inputTokens: 10, outputTokens: 20, cost: 0.001 },
          { name: 'Test 2', success: false, latency: 0, inputTokens: 0, outputTokens: 0, cost: 0, error: 'Failed' },
        ],
        summary: {
          avgLatency: 100,
          avgInputTokens: 10,
          avgOutputTokens: 20,
          avgCost: 0.001,
          successRate: 0.5,
          totalCount: 2,
          successCount: 1,
        }
      };

      const resultB: VersionResult = {
        testCases: [
          { name: 'Test 1', success: true, latency: 120, inputTokens: 15, outputTokens: 25, cost: 0.0015 },
          { name: 'Test 2', success: true, latency: 130, inputTokens: 17, outputTokens: 27, cost: 0.0017 },
        ],
        summary: {
          avgLatency: 125,
          avgInputTokens: 16,
          avgOutputTokens: 26,
          avgCost: 0.0016,
          successRate: 1,
          totalCount: 2,
          successCount: 2,
        }
      };

      const comparison = StatisticalAnalyzer.compareVersions(resultA, resultB);

      // Should only compare successful test cases
      // Version A has 1 success, Version B has 2 successes
      expect(comparison.latency.sampleSizeA).toBe(1);
      expect(comparison.latency.sampleSizeB).toBe(2);
    });
  });
});
