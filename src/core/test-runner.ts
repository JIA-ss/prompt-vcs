import pLimit from 'p-limit';
import { OpenAIClient } from './openai-client.js';
import type { 
  Dataset, 
  TestCase, 
  TestRunnerOptions, 
  TestCaseResult, 
  VersionResult,
  MetricsSummary 
} from '../types/test.js';

/**
 * Cost per 1K tokens for different models (in USD)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-0613': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo-0125': { input: 0.0005, output: 0.0015 },
};

/**
 * Get pricing for a model (defaults to gpt-4 if unknown)
 */
function getModelPricing(model: string): { input: number; output: number } {
  // Try exact match first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  
  // Try prefix match for model variants
  if (model.startsWith('gpt-4o-mini')) {
    return MODEL_PRICING['gpt-4o-mini'];
  }
  if (model.startsWith('gpt-4o')) {
    return MODEL_PRICING['gpt-4o'];
  }
  if (model.startsWith('gpt-4-32k')) {
    return MODEL_PRICING['gpt-4-32k'];
  }
  if (model.startsWith('gpt-4')) {
    return MODEL_PRICING['gpt-4'];
  }
  if (model.startsWith('gpt-3.5-turbo-0125')) {
    return MODEL_PRICING['gpt-3.5-turbo-0125'];
  }
  if (model.startsWith('gpt-3.5-turbo')) {
    return MODEL_PRICING['gpt-3.5-turbo'];
  }
  
  // Default to gpt-4 pricing
  return MODEL_PRICING['gpt-4'];
}

/**
 * Calculate cost for a request
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(model);
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Progress callback type
 */
type ProgressCallback = (completed: number, total: number, testCaseName: string) => void;

/**
 * TestRunner executes A/B tests on prompts
 */
export class TestRunner {
  private client: OpenAIClient;
  private options: TestRunnerOptions;
  private progressCallback?: ProgressCallback;

  constructor(options: TestRunnerOptions) {
    this.options = options;
    this.client = new OpenAIClient(options.apiKey, {
      maxRetries: options.maxRetries,
    });
  }

  /**
   * Register a progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Run tests on a single prompt version
   */
  async run(dataset: Dataset, promptA: string, promptB: string): Promise<VersionResult> {
    const limit = pLimit(this.options.concurrency);
    const total = dataset.testCases.length;
    let completed = 0;

    const runTestCase = async (testCase: TestCase): Promise<TestCaseResult> => {
      const result = await this.executeTestCase(testCase, promptA);
      completed++;
      if (this.progressCallback) {
        this.progressCallback(completed, total, testCase.name);
      }
      return result;
    };

    const results = await Promise.all(
      dataset.testCases.map(tc => limit(() => runTestCase(tc)))
    );

    const summary = this.calculateSummary(results);

    return {
      testCases: results,
      summary,
    };
  }

  /**
   * Execute a single test case with retries
   */
  private async executeTestCase(testCase: TestCase, promptTemplate: string): Promise<TestCaseResult> {
    const prompt = this.replaceVariables(promptTemplate, testCase.inputs);
    const startTime = Date.now();

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const response = await this.client.createChatCompletion({
          model: this.options.model,
          messages: [{ role: 'user', content: prompt }],
        });

        const latency = Date.now() - startTime;
        const inputTokens = response.usage.prompt_tokens;
        const outputTokens = response.usage.completion_tokens;
        const cost = calculateCost(this.options.model, inputTokens, outputTokens);

        return {
          name: testCase.name,
          success: true,
          latency,
          inputTokens,
          outputTokens,
          cost,
          output: response.choices[0]?.message?.content || '',
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.options.maxRetries) {
          // Exponential backoff: 1000ms, 2000ms, 4000ms...
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    return {
      name: testCase.name,
      success: false,
      latency: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Replace template variables with inputs
   */
  private replaceVariables(template: string, inputs: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return inputs[key] !== undefined ? inputs[key] : '';
    });
  }

  /**
   * Calculate summary metrics from results
   */
  private calculateSummary(results: TestCaseResult[]): MetricsSummary {
    const totalCount = results.length;
    const successCount = results.filter(r => r.success).length;
    const successRate = totalCount > 0 ? successCount / totalCount : 0;

    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        avgLatency: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        avgCost: 0,
        successRate: 0,
        totalCount,
        successCount: 0,
      };
    }

    const avgLatency = this.average(successfulResults.map(r => r.latency));
    const avgInputTokens = this.average(successfulResults.map(r => r.inputTokens));
    const avgOutputTokens = this.average(successfulResults.map(r => r.outputTokens));
    const avgCost = this.average(successfulResults.map(r => r.cost));

    return {
      avgLatency: Number(avgLatency.toFixed(2)),
      avgInputTokens: Number(avgInputTokens.toFixed(2)),
      avgOutputTokens: Number(avgOutputTokens.toFixed(2)),
      avgCost: Number(avgCost.toFixed(6)),
      successRate: Number(successRate.toFixed(2)),
      totalCount,
      successCount,
    };
  }

  /**
   * Calculate average of an array of numbers
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
