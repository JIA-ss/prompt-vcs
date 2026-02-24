import { DatasetParser } from '../core/dataset-parser.js';
import { TestRunner } from '../core/test-runner.js';
import { MetricsCollector } from '../core/metrics-collector.js';
import { StatisticalAnalyzer } from '../core/statistical-analyzer.js';
import { TestRunStorage } from '../core/test-storage.js';
import { Repository } from '../core/repository.js';
import { OpenAIClient, OpenAIError } from '../core/openai-client.js';
import type { Dataset, TestRun } from '../types/test.js';
import Table from 'cli-table3';
import { join } from 'path';

export interface TestCommandOptions {
  dataset: string;
  concurrency: number;
  model: string;
  save: boolean;
}

/**
 * Run A/B test between two prompt versions
 */
export async function testCommand(
  cwd: string,
  commitA: string,
  commitB: string,
  options: TestCommandOptions
): Promise<number> {
  // Check repository initialization
  const repo = new Repository(cwd);
  if (!repo.isInitialized()) {
    console.error('Error: Not a prompt-vcs repository. Run "pvc init" first.');
    return 2;
  }

  // Check OpenAI API key
  try {
    new OpenAIClient();
  } catch (error) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    return 3;
  }

  // Resolve commits
  const resolvedA = repo.resolveCommit(commitA);
  const resolvedB = repo.resolveCommit(commitB);

  if (!resolvedA) {
    console.error(`Error: Commit not found: ${commitA}`);
    return 4;
  }

  if (!resolvedB) {
    console.error(`Error: Commit not found: ${commitB}`);
    return 4;
  }

  // Load dataset
  let dataset: Dataset;
  try {
    dataset = DatasetParser.parseFile(options.dataset);
    console.error(`Loaded ${dataset.testCases.length} test cases from ${options.dataset}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Failed to load dataset');
    }
    return 4;
  }

  // Load prompts from commits
  let promptA: string;
  let promptB: string;
  try {
    promptA = loadPromptFromCommit(repo, resolvedA);
    promptB = loadPromptFromCommit(repo, resolvedB);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Failed to load prompts');
    }
    return 4;
  }

  // Run tests
  const runner = new TestRunner({
    model: options.model,
    concurrency: options.concurrency,
    maxRetries: 3,
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  console.error(`\nRunning A/B test:`);
  console.error(`  Commit A: ${commitA.slice(0, 7)}`);
  console.error(`  Commit B: ${commitB.slice(0, 7)}`);
  console.error(`  Model: ${options.model}`);
  console.error(`  Concurrency: ${options.concurrency}`);
  console.error('');

  runner.onProgress((completed, total, name) => {
    console.error(`  [${completed}/${total}] ${name}`);
  });

  try {
    const resultA = await runner.run(dataset, promptA, promptB);
    const resultB = await runner.run(dataset, promptB, promptB); // Compare B against itself for now

    // Actually run both versions against the dataset
    const fullResultA = await runner.run(dataset, promptA, promptA);
    const fullResultB = await runner.run(dataset, promptB, promptB);

    // Perform statistical analysis
    const statistics = StatisticalAnalyzer.compareVersions(fullResultA, fullResultB);

    // Create test run record
    const testRun: TestRun = {
      id: TestRunStorage.generateId(resolvedA, resolvedB),
      timestamp: new Date().toISOString(),
      commitA: resolvedA,
      commitB: resolvedB,
      dataset: options.dataset,
      model: options.model,
      results: {
        commitA: fullResultA,
        commitB: fullResultB,
      },
      statistics,
    };

    // Render results
    renderResultsTable(fullResultA, fullResultB, statistics, commitA, commitB);

    // Save if requested
    if (options.save) {
      const storageDir = join(cwd, '.pvc', 'test-runs');
      const storage = new TestRunStorage(storageDir);
      storage.save(testRun);
      console.error(`\nTest run saved: ${testRun.id}`);
    }

    return 0;
  } catch (error) {
    if (error instanceof OpenAIError) {
      console.error(`Error: API request failed - ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Error: Test execution failed');
    }
    return 5;
  }
}

/**
 * Load prompt content from a commit
 */
function loadPromptFromCommit(repo: Repository, commitHash: string): string {
  const commit = repo.getCommit(commitHash);
  if (!commit) {
    throw new Error(`Commit not found: ${commitHash}`);
  }

  // Find the first blob in the commit tree
  const storage = repo.getStorage();
  for (const [filepath, hash] of Object.entries(commit.tree)) {
    try {
      const content = storage.readObject(hash);
      const blob = JSON.parse(content.toString());
      if (blob.type === 'blob') {
        return blob.content;
      }
    } catch {
      // Continue to next file
    }
  }

  throw new Error(`No prompt found in commit ${commitHash}`);
}

/**
 * Render results comparison table
 */
function renderResultsTable(
  resultA: { summary: { avgLatency: number; avgInputTokens: number; avgOutputTokens: number; avgCost: number; successRate: number } },
  resultB: { summary: { avgLatency: number; avgInputTokens: number; avgOutputTokens: number; avgCost: number; successRate: number } },
  stats: { latency: { meanA: number; meanB: number; difference: number; significant: boolean; confidenceInterval: [number, number] }; cost: { meanA: number; meanB: number; difference: number; significant: boolean }; tokens: { meanA: number; meanB: number; difference: number; significant: boolean } },
  commitA: string,
  commitB: string
): void {
  const shortA = commitA.slice(0, 7);
  const shortB = commitB.slice(0, 7);

  console.log('\n=== A/B Test Results ===\n');

  // Summary table
  const table = new Table({
    head: ['Metric', `${shortA} (A)`, `${shortB} (B)`, 'Diff', 'Significant'],
    style: { head: ['cyan'] },
  });

  const formatDiff = (diff: number, significant: boolean) => {
    const sign = diff > 0 ? '+' : '';
    const indicator = significant ? '✓' : '~';
    return `${indicator} ${sign}${diff.toFixed(2)}`;
  };

  table.push(
    [
      'Avg Latency (ms)',
      resultA.summary.avgLatency.toFixed(2),
      resultB.summary.avgLatency.toFixed(2),
      formatDiff(stats.latency.difference, stats.latency.significant),
      stats.latency.significant ? 'Yes' : 'No',
    ],
    [
      'Avg Input Tokens',
      resultA.summary.avgInputTokens.toFixed(2),
      resultB.summary.avgInputTokens.toFixed(2),
      formatDiff(stats.tokens.meanB - stats.tokens.meanA - resultB.summary.avgOutputTokens + resultA.summary.avgOutputTokens, false),
      '-',
    ],
    [
      'Avg Output Tokens',
      resultA.summary.avgOutputTokens.toFixed(2),
      resultB.summary.avgOutputTokens.toFixed(2),
      formatDiff(resultB.summary.avgOutputTokens - resultA.summary.avgOutputTokens, false),
      '-',
    ],
    [
      'Avg Cost ($)',
      resultA.summary.avgCost.toFixed(6),
      resultB.summary.avgCost.toFixed(6),
      formatDiff(stats.cost.difference, stats.cost.significant),
      stats.cost.significant ? 'Yes' : 'No',
    ],
    [
      'Success Rate',
      `${(resultA.summary.successRate * 100).toFixed(1)}%`,
      `${(resultB.summary.successRate * 100).toFixed(1)}%`,
      '-',
      '-',
    ]
  );

  console.log(table.toString());

  // Statistical details
  if (stats.latency.significant || stats.cost.significant) {
    console.log('\n✓ Statistically significant differences detected');
    if (stats.latency.significant) {
      console.log(`  Latency: ${stats.latency.confidenceInterval[0].toFixed(2)} to ${stats.latency.confidenceInterval[1].toFixed(2)} ms (95% CI)`);
    }
  } else {
    console.log('\n~ No statistically significant differences detected');
  }

  console.log('');
}
