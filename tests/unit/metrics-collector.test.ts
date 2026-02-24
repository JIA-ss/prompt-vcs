import { describe, it, expect } from 'vitest';
import { MetricsCollector } from '../../src/core/metrics-collector';
import type { TestCaseResult } from '../../src/types/test';

describe('MetricsCollector', () => {
  describe('countTokens', () => {
    it('should calculate tokens for text', () => {
      const text = 'Hello world';
      const tokens = MetricsCollector.countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(Number.isInteger(tokens)).toBe(true);
    });

    it('should return 0 for empty string', () => {
      const tokens = MetricsCollector.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle long text', () => {
      const text = 'This is a longer piece of text. '.repeat(100);
      const tokens = MetricsCollector.countTokens(text);
      expect(tokens).toBeGreaterThan(100);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for GPT-4', () => {
      const cost = MetricsCollector.calculateCost('gpt-4', 1000, 500);
      // GPT-4: $0.03 per 1K input, $0.06 per 1K output
      // 1000 input = $0.03, 500 output = $0.03
      expect(cost).toBeCloseTo(0.06, 5);
    });

    it('should calculate cost for GPT-3.5-turbo', () => {
      const cost = MetricsCollector.calculateCost('gpt-3.5-turbo', 2000, 1000);
      // GPT-3.5: $0.0015 per 1K input, $0.002 per 1K output
      // 2000 input = $0.003, 1000 output = $0.002
      expect(cost).toBeCloseTo(0.005, 5);
    });

    it('should calculate cost for GPT-4o', () => {
      const cost = MetricsCollector.calculateCost('gpt-4o', 1000, 500);
      // GPT-4o: $0.005 per 1K input, $0.015 per 1K output
      expect(cost).toBeCloseTo(0.0125, 5);
    });

    it('should handle unknown model (defaults to gpt-4)', () => {
      const cost = MetricsCollector.calculateCost('unknown-model', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for zero tokens', () => {
      const cost = MetricsCollector.calculateCost('gpt-4', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('collectSummary', () => {
    it('should calculate summary for successful results', () => {
      const results: TestCaseResult[] = [
        { name: 'Test 1', success: true, latency: 100, inputTokens: 10, outputTokens: 20, cost: 0.001 },
        { name: 'Test 2', success: true, latency: 200, inputTokens: 20, outputTokens: 40, cost: 0.002 },
      ];

      const summary = MetricsCollector.collectSummary(results);

      expect(summary.totalCount).toBe(2);
      expect(summary.successCount).toBe(2);
      expect(summary.successRate).toBe(1);
      expect(summary.avgLatency).toBe(150);
      expect(summary.avgInputTokens).toBe(15);
      expect(summary.avgOutputTokens).toBe(30);
      expect(summary.avgCost).toBe(0.0015);
    });

    it('should exclude failed results from averages', () => {
      const results: TestCaseResult[] = [
        { name: 'Test 1', success: true, latency: 100, inputTokens: 10, outputTokens: 20, cost: 0.001 },
        { name: 'Test 2', success: false, latency: 0, inputTokens: 0, outputTokens: 0, cost: 0, error: 'Failed' },
      ];

      const summary = MetricsCollector.collectSummary(results);

      expect(summary.totalCount).toBe(2);
      expect(summary.successCount).toBe(1);
      expect(summary.successRate).toBe(0.5);
      // Averages should only include successful test
      expect(summary.avgLatency).toBe(100);
      expect(summary.avgInputTokens).toBe(10);
    });

    it('should handle empty results', () => {
      const summary = MetricsCollector.collectSummary([]);

      expect(summary.totalCount).toBe(0);
      expect(summary.successCount).toBe(0);
      expect(summary.successRate).toBe(0);
      expect(summary.avgLatency).toBe(0);
    });

    it('should handle all failed results', () => {
      const results: TestCaseResult[] = [
        { name: 'Test 1', success: false, latency: 0, inputTokens: 0, outputTokens: 0, cost: 0, error: 'Failed' },
      ];

      const summary = MetricsCollector.collectSummary(results);

      expect(summary.totalCount).toBe(1);
      expect(summary.successCount).toBe(0);
      expect(summary.successRate).toBe(0);
      expect(summary.avgLatency).toBe(0);
    });
  });
});
