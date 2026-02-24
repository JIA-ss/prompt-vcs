import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { testShowCommand } from '../../src/commands/test-show';
import { TestRunStorage } from '../../src/core/test-storage';
import type { TestRun } from '../../src/types/test';

describe('test-show command', () => {
  let tempDir: string;
  let storage: TestRunStorage;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-show-test-'));
    mkdirSync(join(tempDir, '.pvc', 'test-runs'), { recursive: true });
    storage = new TestRunStorage(join(tempDir, '.pvc', 'test-runs'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should show test run details', async () => {
    const testRun: TestRun = {
      id: 'test-abc',
      timestamp: '2026-02-17T10:00:00Z',
      commitA: 'abc123',
      commitB: 'def456',
      dataset: 'dataset.json',
      model: 'gpt-4',
      results: {
        commitA: { 
          testCases: [
            { name: 'Test 1', success: true, latency: 100, inputTokens: 10, outputTokens: 20, cost: 0.001 },
          ], 
          summary: { avgLatency: 100, avgInputTokens: 10, avgOutputTokens: 20, avgCost: 0.001, successRate: 1, totalCount: 1, successCount: 1 } 
        },
        commitB: { 
          testCases: [
            { name: 'Test 1', success: true, latency: 120, inputTokens: 12, outputTokens: 24, cost: 0.0012 },
          ], 
          summary: { avgLatency: 120, avgInputTokens: 12, avgOutputTokens: 24, avgCost: 0.0012, successRate: 1, totalCount: 1, successCount: 1 } 
        }
      },
      statistics: {
        latency: { meanA: 100, meanB: 120, difference: 20, pValue: 0.01, significant: true, confidenceInterval: [10, 30], sampleSizeA: 1, sampleSizeB: 1 },
        cost: { meanA: 0.001, meanB: 0.0012, difference: 0.0002, pValue: 0.05, significant: false, confidenceInterval: [-0.0001, 0.0005], sampleSizeA: 1, sampleSizeB: 1 },
        tokens: { meanA: 30, meanB: 36, difference: 6, pValue: 0.02, significant: true, confidenceInterval: [2, 10], sampleSizeA: 1, sampleSizeB: 1 }
      }
    };

    storage.save(testRun);

    const exitCode = await testShowCommand(tempDir, 'test-abc');
    expect(exitCode).toBe(0);
  });

  it('should handle missing run ID', async () => {
    const exitCode = await testShowCommand(tempDir, 'nonexistent');
    expect(exitCode).toBe(4);
  });
});
