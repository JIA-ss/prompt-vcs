import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { testLogCommand } from '../../src/commands/test-log';
import { TestRunStorage } from '../../src/core/test-storage';
import type { TestRun } from '../../src/types/test';

describe('test-log command', () => {
  let tempDir: string;
  let storage: TestRunStorage;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-log-test-'));
    mkdirSync(join(tempDir, '.pvc', 'test-runs'), { recursive: true });
    storage = new TestRunStorage(join(tempDir, '.pvc', 'test-runs'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should list test runs', async () => {
    const testRun: TestRun = {
      id: 'test-1',
      timestamp: '2026-02-17T10:00:00Z',
      commitA: 'abc123',
      commitB: 'def456',
      dataset: 'dataset.json',
      model: 'gpt-4',
      results: {
        commitA: { testCases: [], summary: { avgLatency: 100, avgInputTokens: 10, avgOutputTokens: 20, avgCost: 0.001, successRate: 1, totalCount: 1, successCount: 1 } },
        commitB: { testCases: [], summary: { avgLatency: 120, avgInputTokens: 12, avgOutputTokens: 24, avgCost: 0.0012, successRate: 1, totalCount: 1, successCount: 1 } }
      },
      statistics: {
        latency: { meanA: 100, meanB: 120, difference: 20, pValue: 0.01, significant: true, confidenceInterval: [10, 30], sampleSizeA: 1, sampleSizeB: 1 },
        cost: { meanA: 0.001, meanB: 0.0012, difference: 0.0002, pValue: 0.05, significant: false, confidenceInterval: [-0.0001, 0.0005], sampleSizeA: 1, sampleSizeB: 1 },
        tokens: { meanA: 30, meanB: 36, difference: 6, pValue: 0.02, significant: true, confidenceInterval: [2, 10], sampleSizeA: 1, sampleSizeB: 1 }
      }
    };

    storage.save(testRun);

    const exitCode = await testLogCommand(tempDir, { limit: 10 });
    expect(exitCode).toBe(0);
  });

  it('should limit results', async () => {
    // Save multiple test runs
    for (let i = 0; i < 5; i++) {
      const testRun: TestRun = {
        id: `test-${i}`,
        timestamp: new Date(2026, 1, 17, 10 + i).toISOString(),
        commitA: 'abc123',
        commitB: 'def456',
        dataset: 'dataset.json',
        model: 'gpt-4',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 100, avgInputTokens: 10, avgOutputTokens: 20, avgCost: 0.001, successRate: 1, totalCount: 1, successCount: 1 } },
          commitB: { testCases: [], summary: { avgLatency: 120, avgInputTokens: 12, avgOutputTokens: 24, avgCost: 0.0012, successRate: 1, totalCount: 1, successCount: 1 } }
        },
        statistics: {
          latency: { meanA: 100, meanB: 120, difference: 20, pValue: 0.01, significant: true, confidenceInterval: [10, 30], sampleSizeA: 1, sampleSizeB: 1 },
          cost: { meanA: 0.001, meanB: 0.0012, difference: 0.0002, pValue: 0.05, significant: false, confidenceInterval: [-0.0001, 0.0005], sampleSizeA: 1, sampleSizeB: 1 },
          tokens: { meanA: 30, meanB: 36, difference: 6, pValue: 0.02, significant: true, confidenceInterval: [2, 10], sampleSizeA: 1, sampleSizeB: 1 }
        }
      };
      storage.save(testRun);
    }

    const exitCode = await testLogCommand(tempDir, { limit: 3 });
    expect(exitCode).toBe(0);
  });

  it('should show empty state', async () => {
    const exitCode = await testLogCommand(tempDir, { limit: 10 });
    expect(exitCode).toBe(0);
  });
});
