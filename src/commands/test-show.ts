import { TestRunStorage } from '../core/test-storage.js';
import Table from 'cli-table3';
import { join } from 'path';

/**
 * Show detailed test run results
 */
export async function testShowCommand(cwd: string, runId: string): Promise<number> {
  const storageDir = join(cwd, '.pvc', 'test-runs');
  const storage = new TestRunStorage(storageDir);

  if (!storage.exists(runId)) {
    console.error(`Error: Test run not found: ${runId}`);
    return 4;
  }

  const run = storage.load(runId);

  console.log('\n=== Test Run Details ===\n');

  console.log(`Run ID:    ${run.id}`);
  console.log(`Timestamp: ${new Date(run.timestamp).toLocaleString()}`);
  console.log(`Commit A:  ${run.commitA}`);
  console.log(`Commit B:  ${run.commitB}`);
  console.log(`Dataset:   ${run.dataset}`);
  console.log(`Model:     ${run.model}`);
  console.log('');

  // Results table
  console.log('Results Summary:');
  const table = new Table({
    head: ['Metric', `Commit A (${run.commitA.slice(0, 7)})`, `Commit B (${run.commitB.slice(0, 7)})`, 'Difference', 'Significant'],
    style: { head: ['cyan'] },
  });

  const formatDiff = (diff: number, significant: boolean) => {
    const sign = diff > 0 ? '+' : '';
    const indicator = significant ? '✓' : '~';
    return `${indicator} ${sign}${diff.toFixed(4)}`;
  };

  table.push(
    [
      'Avg Latency (ms)',
      run.results.commitA.summary.avgLatency.toFixed(2),
      run.results.commitB.summary.avgLatency.toFixed(2),
      formatDiff(run.statistics.latency.difference, run.statistics.latency.significant),
      run.statistics.latency.significant ? 'Yes' : 'No',
    ],
    [
      'Avg Input Tokens',
      run.results.commitA.summary.avgInputTokens.toFixed(2),
      run.results.commitB.summary.avgInputTokens.toFixed(2),
      formatDiff(
        run.results.commitB.summary.avgInputTokens - run.results.commitA.summary.avgInputTokens,
        false
      ),
      '-',
    ],
    [
      'Avg Output Tokens',
      run.results.commitA.summary.avgOutputTokens.toFixed(2),
      run.results.commitB.summary.avgOutputTokens.toFixed(2),
      formatDiff(
        run.results.commitB.summary.avgOutputTokens - run.results.commitA.summary.avgOutputTokens,
        false
      ),
      '-',
    ],
    [
      'Avg Cost ($)',
      run.results.commitA.summary.avgCost.toFixed(6),
      run.results.commitB.summary.avgCost.toFixed(6),
      formatDiff(run.statistics.cost.difference, run.statistics.cost.significant),
      run.statistics.cost.significant ? 'Yes' : 'No',
    ],
    [
      'Success Rate',
      `${(run.results.commitA.summary.successRate * 100).toFixed(1)}%`,
      `${(run.results.commitB.summary.successRate * 100).toFixed(1)}%`,
      '-',
      '-',
    ]
  );

  console.log(table.toString());

  // Statistical details
  console.log('\nStatistical Analysis:');
  console.log(`  Latency p-value:     ${run.statistics.latency.pValue.toFixed(6)} ${run.statistics.latency.significant ? '(significant)' : '(not significant)'}`);
  console.log(`  Cost p-value:        ${run.statistics.cost.pValue.toFixed(6)} ${run.statistics.cost.significant ? '(significant)' : '(not significant)'}`);
  console.log(`  Tokens p-value:      ${run.statistics.tokens.pValue.toFixed(6)} ${run.statistics.tokens.significant ? '(significant)' : '(not significant)'}`);
  
  if (run.statistics.latency.significant) {
    console.log(`  Latency 95% CI:      [${run.statistics.latency.confidenceInterval[0].toFixed(2)}, ${run.statistics.latency.confidenceInterval[1].toFixed(2)}] ms`);
  }

  // Test case details
  console.log('\nTest Case Results:');
  const tcTable = new Table({
    head: ['Test Case', 'A Latency', 'B Latency', 'A Tokens', 'B Tokens', 'Status'],
    style: { head: ['cyan'] },
    colWidths: [20, 12, 12, 12, 12, 12],
  });

  const maxCases = Math.max(run.results.commitA.testCases.length, run.results.commitB.testCases.length);
  for (let i = 0; i < maxCases; i++) {
    const tcA = run.results.commitA.testCases[i];
    const tcB = run.results.commitB.testCases[i];
    
    if (tcA && tcB) {
      const status = tcA.success && tcB.success ? '✓' : '✗';
      tcTable.push([
        tcA.name.slice(0, 18),
        tcA.success ? `${tcA.latency}ms` : 'FAIL',
        tcB.success ? `${tcB.latency}ms` : 'FAIL',
        tcA.success ? `${tcA.inputTokens + tcA.outputTokens}` : '-',
        tcB.success ? `${tcB.inputTokens + tcB.outputTokens}` : '-',
        status,
      ]);
    }
  }

  console.log(tcTable.toString());
  console.log('');

  return 0;
}
