import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { Dataset, DatasetParseError, TestCase } from '../types/test.js';

/**
 * Dataset parser for JSON and CSV formats
 */
export class DatasetParser {
  /**
   * Parse JSON format dataset
   */
  static parseJSON(content: string): Dataset {
    let parsed: unknown;
    
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new DatasetParseError(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.validateDataset(parsed);
    return parsed as Dataset;
  }

  /**
   * Parse CSV format dataset
   * Expected format: name,inputs,expected_output (expected_output optional)
   * inputs column should be valid JSON string
   */
  static parseCSV(content: string): Dataset {
    if (!content.trim()) {
      throw new DatasetParseError('CSV content is empty');
    }

    let records: Record<string, string>[];
    
    try {
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch (error) {
      throw new DatasetParseError(`Invalid CSV format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!records || records.length === 0) {
      throw new DatasetParseError('CSV file contains no data rows');
    }

    // Validate required columns
    const firstRecord = records[0];
    if (!('name' in firstRecord) || !('inputs' in firstRecord)) {
      throw new DatasetParseError('CSV must have "name" and "inputs" columns');
    }

    const testCases: TestCase[] = [];

    for (const record of records) {
      let inputs: Record<string, string>;
      
      try {
        inputs = JSON.parse(record.inputs);
        if (typeof inputs !== 'object' || inputs === null || Array.isArray(inputs)) {
          throw new Error('Inputs must be an object');
        }
      } catch (error) {
        throw new DatasetParseError(`Invalid JSON in inputs column for "${record.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const testCase: TestCase = {
        name: record.name,
        inputs,
      };

      if (record.expected_output) {
        testCase.expectedOutput = record.expected_output;
      }

      testCases.push(testCase);
    }

    return { testCases };
  }

  /**
   * Parse a dataset file based on its extension
   */
  static parseFile(filePath: string): Dataset {
    let content: string;
    
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new DatasetParseError(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (filePath.endsWith('.json')) {
      return this.parseJSON(content);
    } else if (filePath.endsWith('.csv')) {
      return this.parseCSV(content);
    } else {
      throw new DatasetParseError(`Unsupported file format: ${filePath}. Use .json or .csv`);
    }
  }

  /**
   * Validate dataset structure
   */
  static validateDataset(dataset: unknown): asserts dataset is Dataset {
    if (dataset === null || typeof dataset !== 'object') {
      throw new DatasetParseError('Dataset must be an object');
    }

    const d = dataset as Record<string, unknown>;

    if (!('testCases' in d)) {
      throw new DatasetParseError('Dataset must have a "testCases" property');
    }

    if (!Array.isArray(d.testCases)) {
      throw new DatasetParseError('testCases must be an array');
    }

    for (const tc of d.testCases) {
      this.validateTestCase(tc);
    }
  }

  /**
   * Validate a single test case
   */
  private static validateTestCase(testCase: unknown): asserts testCase is TestCase {
    if (testCase === null || typeof testCase !== 'object') {
      throw new DatasetParseError('Test case must be an object');
    }

    const tc = testCase as Record<string, unknown>;

    if (!('name' in tc) || typeof tc.name !== 'string') {
      throw new DatasetParseError('Each test case must have a "name" string property');
    }

    if (!('inputs' in tc) || tc.inputs === null || typeof tc.inputs !== 'object' || Array.isArray(tc.inputs)) {
      throw new DatasetParseError('Each test case must have an "inputs" object property');
    }
  }
}
