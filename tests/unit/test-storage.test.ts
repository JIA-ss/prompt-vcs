import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TestRunStorage } from '../../src/core/test-storage';
import type { TestRun } from '../../src/types/test';

describe('TestRunStorage', () => {
  let tempDir: string;
  let storage: TestRunStorage;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-storage-test-'));
    storage = new TestRunStorage(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('save', () => {
    it('should save test run to file', () => {
      const testRun: TestRun = {
        id: 'test-123',
        timestamp: '2026-02-17T10:00:00Z',
        commitA: 'abc123',
        commitB: 'def456',
        dataset: 'dataset.json',
        model: 'gpt-4',
        results: {
          commitA: {
            testCases: [],
            summary: {
              avgLatency: 100,
              avgInputTokens: 10,
              avgOutputTokens: 20,
              avgCost: 0.001,
              successRate: 1,
              totalCount: 0,
              successCount: 0,
            }
          },
          commitB: {
            testCases: [],
            summary: {
              avgLatency: 120,
              avgInputTokens: 12,
              avgOutputTokens: 24,
              avgCost: 0.0012,
              successRate: 1,
              totalCount: 0,
              successCount: 0,
            }
          }
        },
        statistics: {
          latency: {
            meanA: 100,
            meanB: 120,
            difference: 20,
            pValue: 0.01,
            significant: true,
            confidenceInterval: [10, 30],
            sampleSizeA: 10,
            sampleSizeB: 10,
          },
          cost: {
            meanA: 0.001,
            meanB: 0.0012,
            difference: 0.0002,
            pValue: 0.05,
            significant: false,
            confidenceInterval: [-0.0001, 0.0005],
            sampleSizeA: 10,
            sampleSizeB: 10,
          },
          tokens: {
            meanA: 30,
            meanB: 36,
            difference: 6,
            pValue: 0.02,
            significant: true,
            confidenceInterval: [2, 10],
            sampleSizeA: 10,
            sampleSizeB: 10,
          }
        }
      };

      storage.save(testRun);

      const expectedPath = join(tempDir, 'test-123.json');
      expect(existsSync(expectedPath)).toBe(true);
      
      const content = readFileSync(expectedPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.id).toBe('test-123');
      expect(parsed.commitA).toBe('abc123');
    });

    it('should generate unique IDs', () => {
      const id1 = TestRunStorage.generateId('abc123', 'def456');
      const id2 = TestRunStorage.generateId('abc123', 'def789');
      const id3 = TestRunStorage.generateId('xyz789', 'def456');

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
      expect(id1).toContain('abc123');
      expect(id1).toContain('def456');
    });

    it('should create storage directory if needed', () => {
      const nestedDir = join(tempDir, 'nested', 'path');
      const nestedStorage = new TestRunStorage(nestedDir);
      
      const testRun: TestRun = {
        id: 'test-456',
        timestamp: new Date().toISOString(),
        commitA: 'a',
        commitB: 'b',
        dataset: 'd.json',
        model: 'gpt-4',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } },
          commitB: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } }
        },
        statistics: {
          latency: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          cost: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          tokens: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 }
        }
      };

      nestedStorage.save(testRun);
      expect(existsSync(join(nestedDir, 'test-456.json'))).toBe(true);
    });
  });

  describe('load', () => {
    it('should load test run from file', () => {
      const testRun: TestRun = {
        id: 'test-load',
        timestamp: '2026-02-17T10:00:00Z',
        commitA: 'abc',
        commitB: 'def',
        dataset: 'd.json',
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
      const loaded = storage.load('test-load');

      expect(loaded.id).toBe('test-load');
      expect(loaded.commitA).toBe('abc');
      expect(loaded.commitB).toBe('def');
    });

    it('should throw error for missing file', () => {
      expect(() => storage.load('nonexistent')).toThrow();
    });
  });

  describe('list', () => {
    it('should list all test runs', () => {
      const testRun1: TestRun = {
        id: 'test-1',
        timestamp: '2026-02-17T10:00:00Z',
        commitA: 'a',
        commitB: 'b',
        dataset: 'd.json',
        model: 'gpt-4',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } },
          commitB: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } }
        },
        statistics: {
          latency: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          cost: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          tokens: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 }
        }
      };

      const testRun2: TestRun = {
        id: 'test-2',
        timestamp: '2026-02-17T11:00:00Z',
        commitA: 'c',
        commitB: 'd',
        dataset: 'd2.json',
        model: 'gpt-3.5-turbo',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } },
          commitB: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } }
        },
        statistics: {
          latency: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          cost: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          tokens: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 }
        }
      };

      storage.save(testRun1);
      storage.save(testRun2);

      const list = storage.list();
      expect(list).toHaveLength(2);
      expect(list.map(r => r.id)).toContain('test-1');
      expect(list.map(r => r.id)).toContain('test-2');
    });

    it('should return empty array when no test runs', () => {
      const list = storage.list();
      expect(list).toEqual([]);
    });

    it('should sort by timestamp descending', () => {
      const testRun1: TestRun = {
        id: 'older',
        timestamp: '2026-02-17T10:00:00Z',
        commitA: 'a',
        commitB: 'b',
        dataset: 'd.json',
        model: 'gpt-4',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } },
          commitB: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } }
        },
        statistics: {
          latency: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          cost: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          tokens: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 }
        }
      };

      const testRun2: TestRun = {
        id: 'newer',
        timestamp: '2026-02-17T12:00:00Z',
        commitA: 'c',
        commitB: 'd',
        dataset: 'd2.json',
        model: 'gpt-4',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } },
          commitB: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } }
        },
        statistics: {
          latency: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          cost: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          tokens: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 }
        }
      };

      storage.save(testRun1);
      storage.save(testRun2);

      const list = storage.list();
      expect(list[0].id).toBe('newer');
      expect(list[1].id).toBe('older');
    });
  });

  describe('exists', () => {
    it('should return true for existing test run', () => {
      const testRun: TestRun = {
        id: 'exists-test',
        timestamp: new Date().toISOString(),
        commitA: 'a',
        commitB: 'b',
        dataset: 'd.json',
        model: 'gpt-4',
        results: {
          commitA: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } },
          commitB: { testCases: [], summary: { avgLatency: 0, avgInputTokens: 0, avgOutputTokens: 0, avgCost: 0, successRate: 0, totalCount: 0, successCount: 0 } }
        },
        statistics: {
          latency: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          cost: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 },
          tokens: { meanA: 0, meanB: 0, difference: 0, pValue: 1, significant: false, confidenceInterval: [0, 0], sampleSizeA: 0, sampleSizeB: 0 }
        }
      };

      storage.save(testRun);
      expect(storage.exists('exists-test')).toBe(true);
    });

    it('should return false for non-existing test run', () => {
      expect(storage.exists('does-not-exist')).toBe(false);
    });
  });
});
