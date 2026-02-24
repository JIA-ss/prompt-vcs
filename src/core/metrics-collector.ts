import { get_encoding } from 'tiktoken';
import type { TestCaseResult, MetricsSummary } from '../types/test.js';

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
  'gpt-3.5-turbo-1106': { input: 0.001, output: 0.002 },
  'gpt-3.5-turbo-instruct': { input: 0.0015, output: 0.002 },
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
  if (model.startsWith('gpt-3.5-turbo-1106')) {
    return MODEL_PRICING['gpt-3.5-turbo-1106'];
  }
  if (model.startsWith('gpt-3.5-turbo-instruct')) {
    return MODEL_PRICING['gpt-3.5-turbo-instruct'];
  }
  if (model.startsWith('gpt-3.5-turbo')) {
    return MODEL_PRICING['gpt-3.5-turbo'];
  }
  
  // Default to gpt-4 pricing
  return MODEL_PRICING['gpt-4'];
}

/**
 * MetricsCollector handles token counting and cost calculations
 */
export class MetricsCollector {
  /**
   * Count tokens in text using tiktoken
   */
  static countTokens(text: string): number {
    if (!text) return 0;
    
    try {
      // Use cl100k_base encoding (used by GPT-4 and GPT-3.5)
      const encoder = get_encoding('cl100k_base');
      const tokens = encoder.encode(text);
      encoder.free();
      return tokens.length;
    } catch {
      // Fallback to approximate token count (1 token ≈ 4 chars for English)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Calculate cost for a request
   */
  static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = getModelPricing(model);
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Collect summary metrics from test results
   */
  static collectSummary(results: TestCaseResult[]): MetricsSummary {
    const totalCount = results.length;
    const successResults = results.filter(r => r.success);
    const successCount = successResults.length;
    const successRate = totalCount > 0 ? successCount / totalCount : 0;

    if (successCount === 0) {
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

    const avgLatency = this.average(successResults.map(r => r.latency));
    const avgInputTokens = this.average(successResults.map(r => r.inputTokens));
    const avgOutputTokens = this.average(successResults.map(r => r.outputTokens));
    const avgCost = this.average(successResults.map(r => r.cost));

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
  private static average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
