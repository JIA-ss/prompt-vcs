/**
 * A/B Testing Types
 * Types for dataset, test runner, metrics, and statistical analysis
 */

// ============================================================================
// Dataset Types
// ============================================================================

/**
 * Individual test case in a dataset
 */
export interface TestCase {
  /** Unique name for the test case */
  name: string;
  /** Input variables to replace in the prompt template */
  inputs: Record<string, string>;
  /** Optional expected output for evaluation */
  expectedOutput?: string;
}

/**
 * Dataset containing multiple test cases
 */
export interface Dataset {
  /** Array of test cases */
  testCases: TestCase[];
}

/**
 * Error thrown when dataset parsing fails
 */
export class DatasetParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatasetParseError';
  }
}

// ============================================================================
// Test Runner Types
// ============================================================================

/**
 * Options for test runner execution
 */
export interface TestRunnerOptions {
  /** OpenAI model to use */
  model: string;
  /** Maximum concurrent requests */
  concurrency: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** OpenAI API key */
  apiKey: string;
}

/**
 * Result of a single test case execution
 */
export interface TestCaseResult {
  /** Name of the test case */
  name: string;
  /** Whether the request succeeded */
  success: boolean;
  /** Response latency in milliseconds */
  latency: number;
  /** Number of input tokens */
  inputTokens: number;
  /** Number of output tokens */
  outputTokens: number;
  /** Estimated cost in USD */
  cost: number;
  /** Error message if failed */
  error?: string;
  /** Raw response content */
  output?: string;
}

/**
 * Results for a single prompt version
 */
export interface VersionResult {
  /** Results for each test case */
  testCases: TestCaseResult[];
  /** Aggregated metrics summary */
  summary: MetricsSummary;
}

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Aggregated metrics summary for a test run
 */
export interface MetricsSummary {
  /** Average response latency in ms */
  avgLatency: number;
  /** Average input tokens per request */
  avgInputTokens: number;
  /** Average output tokens per request */
  avgOutputTokens: number;
  /** Average cost per request in USD */
  avgCost: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Total number of test cases */
  totalCount: number;
  /** Number of successful test cases */
  successCount: number;
}

/**
 * Complete test run record
 */
export interface TestRun {
  /** Unique identifier for the test run */
  id: string;
  /** ISO timestamp of the test run */
  timestamp: string;
  /** First commit hash */
  commitA: string;
  /** Second commit hash */
  commitB: string;
  /** Path to dataset file */
  dataset: string;
  /** Model used for testing */
  model: string;
  /** Results for both versions */
  results: {
    commitA: VersionResult;
    commitB: VersionResult;
  };
  /** Statistical comparison */
  statistics: StatisticalComparison;
}

// ============================================================================
// Statistical Types
// ============================================================================

/**
 * Result of a t-test statistical analysis
 */
export interface TTestResult {
  /** Mean of sample A */
  meanA: number;
  /** Mean of sample B */
  meanB: number;
  /** Difference (meanB - meanA) */
  difference: number;
  /** P-value for the test */
  pValue: number;
  /** Whether the difference is statistically significant */
  significant: boolean;
  /** 95% confidence interval for the difference */
  confidenceInterval: [number, number];
  /** Sample size of A */
  sampleSizeA: number;
  /** Sample size of B */
  sampleSizeB: number;
}

/**
 * Statistical comparison between two versions
 */
export interface StatisticalComparison {
  /** Latency comparison */
  latency: TTestResult;
  /** Cost comparison */
  cost: TTestResult;
  /** Total tokens comparison */
  tokens: TTestResult;
}

/**
 * Error thrown when statistical analysis fails
 */
export class StatisticalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatisticalError';
  }
}
