import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DatasetParser, DatasetParseError } from '../../src/core/dataset-parser';

describe('DatasetParser', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-dataset-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON dataset', () => {
      const json = JSON.stringify({
        testCases: [
          { name: 'Test 1', inputs: { query: 'hello' } },
          { name: 'Test 2', inputs: { query: 'world' }, expectedOutput: 'result' }
        ]
      });

      const dataset = DatasetParser.parseJSON(json);
      expect(dataset.testCases).toHaveLength(2);
      expect(dataset.testCases[0].name).toBe('Test 1');
      expect(dataset.testCases[1].expectedOutput).toBe('result');
    });

    it('should parse JSON with empty test cases', () => {
      const json = JSON.stringify({ testCases: [] });
      const dataset = DatasetParser.parseJSON(json);
      expect(dataset.testCases).toHaveLength(0);
    });

    it('should reject invalid JSON format', () => {
      expect(() => DatasetParser.parseJSON('not valid json')).toThrow(DatasetParseError);
    });

    it('should reject JSON without testCases array', () => {
      const json = JSON.stringify({ data: [] });
      expect(() => DatasetParser.parseJSON(json)).toThrow(DatasetParseError);
    });

    it('should reject test case without name', () => {
      const json = JSON.stringify({
        testCases: [{ inputs: { query: 'test' } }]
      });
      expect(() => DatasetParser.parseJSON(json)).toThrow(DatasetParseError);
    });

    it('should reject test case without inputs', () => {
      const json = JSON.stringify({
        testCases: [{ name: 'Test' }]
      });
      expect(() => DatasetParser.parseJSON(json)).toThrow(DatasetParseError);
    });

    it('should handle 1000 rows efficiently', () => {
      const testCases = Array.from({ length: 1000 }, (_, i) => ({
        name: `Test ${i}`,
        inputs: { query: `query ${i}` }
      }));
      const json = JSON.stringify({ testCases });

      const start = Date.now();
      const dataset = DatasetParser.parseJSON(json);
      const elapsed = Date.now() - start;

      expect(dataset.testCases).toHaveLength(1000);
      expect(elapsed).toBeLessThan(100); // Should parse in less than 100ms
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV dataset', () => {
      const csv = `name,inputs,expected_output
Test 1,"{""query"": ""hello""}",result1
Test 2,"{""query"": ""world""}",result2`;

      const dataset = DatasetParser.parseCSV(csv);
      expect(dataset.testCases).toHaveLength(2);
      expect(dataset.testCases[0].name).toBe('Test 1');
      expect(dataset.testCases[0].inputs).toEqual({ query: 'hello' });
      expect(dataset.testCases[0].expectedOutput).toBe('result1');
    });

    it('should parse CSV without expected_output column', () => {
      const csv = `name,inputs
Test 1,"{""query"": ""hello""}"`;

      const dataset = DatasetParser.parseCSV(csv);
      expect(dataset.testCases).toHaveLength(1);
      expect(dataset.testCases[0].expectedOutput).toBeUndefined();
    });

    it('should reject invalid CSV format', () => {
      // Missing required columns
      const csv = `name,expected_output
Test 1,result`;
      expect(() => DatasetParser.parseCSV(csv)).toThrow(DatasetParseError);
    });

    it('should reject empty CSV', () => {
      expect(() => DatasetParser.parseCSV('')).toThrow(DatasetParseError);
    });

    it('should reject test case with invalid JSON in inputs', () => {
      const csv = `name,inputs
Test 1,not valid json`;
      expect(() => DatasetParser.parseCSV(csv)).toThrow(DatasetParseError);
    });

    it('should handle 1000 rows efficiently', () => {
      const rows = ['name,inputs'];
      for (let i = 0; i < 1000; i++) {
        rows.push(`Test ${i},"{\""query\"": \""${i}\""}"`);
      }
      const csv = rows.join('\n');

      const start = Date.now();
      const dataset = DatasetParser.parseCSV(csv);
      const elapsed = Date.now() - start;

      expect(dataset.testCases).toHaveLength(1000);
      expect(elapsed).toBeLessThan(500); // Should parse in less than 500ms
    });
  });

  describe('parseFile', () => {
    it('should parse JSON file', () => {
      const jsonPath = join(tempDir, 'dataset.json');
      writeFileSync(jsonPath, JSON.stringify({
        testCases: [{ name: 'Test', inputs: { q: 'test' } }]
      }));

      const dataset = DatasetParser.parseFile(jsonPath);
      expect(dataset.testCases).toHaveLength(1);
    });

    it('should parse CSV file', () => {
      const csvPath = join(tempDir, 'dataset.csv');
      writeFileSync(csvPath, 'name,inputs\nTest,"{""q"": ""test""}"');

      const dataset = DatasetParser.parseFile(csvPath);
      expect(dataset.testCases).toHaveLength(1);
    });

    it('should throw error for unsupported file extension', () => {
      const txtPath = join(tempDir, 'dataset.txt');
      writeFileSync(txtPath, 'content');

      expect(() => DatasetParser.parseFile(txtPath)).toThrow(DatasetParseError);
    });

    it('should throw error for non-existent file', () => {
      expect(() => DatasetParser.parseFile(join(tempDir, 'nonexistent.json'))).toThrow(DatasetParseError);
    });
  });

  describe('validateDataset', () => {
    it('should validate valid dataset', () => {
      const dataset = {
        testCases: [{ name: 'Test', inputs: {} }]
      };
      expect(() => DatasetParser.validateDataset(dataset)).not.toThrow();
    });

    it('should reject null dataset', () => {
      expect(() => DatasetParser.validateDataset(null)).toThrow(DatasetParseError);
    });

    it('should reject dataset without testCases', () => {
      expect(() => DatasetParser.validateDataset({})).toThrow(DatasetParseError);
    });

    it('should reject non-array testCases', () => {
      expect(() => DatasetParser.validateDataset({ testCases: 'not array' })).toThrow(DatasetParseError);
    });
  });
});
