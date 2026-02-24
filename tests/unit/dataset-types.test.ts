import { describe, it, expect } from 'vitest';
import type { TestCase, Dataset } from '../../src/types/test';
import { DatasetParseError } from '../../src/types/test';

describe('Dataset Types', () => {
  describe('TestCase interface', () => {
    it('should accept valid test case with all fields', () => {
      const testCase: TestCase = {
        name: 'Test 1',
        inputs: { query: 'hello', context: 'world' },
        expectedOutput: 'hello world'
      };
      expect(testCase.name).toBe('Test 1');
      expect(testCase.inputs).toEqual({ query: 'hello', context: 'world' });
      expect(testCase.expectedOutput).toBe('hello world');
    });

    it('should accept test case without expectedOutput (optional field)', () => {
      const testCase: TestCase = {
        name: 'Test 2',
        inputs: { query: 'test' }
      };
      expect(testCase.name).toBe('Test 2');
      expect(testCase.inputs).toEqual({ query: 'test' });
      expect(testCase.expectedOutput).toBeUndefined();
    });

    it('should accept empty inputs object', () => {
      const testCase: TestCase = {
        name: 'Test 3',
        inputs: {}
      };
      expect(testCase.inputs).toEqual({});
    });
  });

  describe('Dataset interface', () => {
    it('should accept valid dataset with test cases', () => {
      const dataset: Dataset = {
        testCases: [
          { name: 'Case 1', inputs: { q: 'a' } },
          { name: 'Case 2', inputs: { q: 'b' } }
        ]
      };
      expect(dataset.testCases).toHaveLength(2);
    });

    it('should accept empty dataset', () => {
      const dataset: Dataset = {
        testCases: []
      };
      expect(dataset.testCases).toHaveLength(0);
    });
  });

  describe('DatasetParseError', () => {
    it('should create error with message', () => {
      const error = new DatasetParseError('Invalid format');
      expect(error.message).toBe('Invalid format');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DatasetParseError);
    });

    it('should capture stack trace', () => {
      const error = new DatasetParseError('Test error');
      expect(error.stack).toBeDefined();
    });
  });
});
