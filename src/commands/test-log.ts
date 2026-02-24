import { TestRunStorage } from '../core/test-storage.js';
import Table from 'cli-table3';
import { join } from 'path';

export interface TestLogOptions {
  limit: number;
}

/**
 * List test run history
 */
export async function testLogCommand(cwd: string, options: TestLogOptions): Promise<number> {
  const storageDir = join(cwd, '.pvc', 'test-runs');
  const storage = new TestRunStorage(storageDir);

  const testRuns = storage.list();

  if (testRuns.length === 0) {
    console.log('No test runs found.');
    return 0;
  }

  const limited = testRuns.slice(0, options.limit);

  console.log('\n=== Test Run History ===\n');

  const table = new Table({
    head: ['Run ID', 'Timestamp', 'Commits', 'Model', 'Status'],
    style: { head: ['cyan'] },
    colWidths: [25, 25, 20, 15, 10],
  });

  for (const run of limited) {
    const date = new Date(run.timestamp).toLocaleString();
    const shortA = run.commitA.slice(0, 7);
    const shortB = run.commitB.slice(0, 7);
    const hasSignificant = run.statistics.latency.significant || 
                           run.statistics.cost.significant || 
                           run.statistics.tokens.significant;
    const status = hasSignificant ? '✓ Diff' : '~ Same';

    table.push([
      run.id.slice(0, 22),
      date,
      `${shortA} vs ${shortB}`,
      run.model,
      status,
    ]);
  }

  console.log(table.toString());
  console.log(`\nShowing ${limited.length} of ${testRuns.length} test runs`);
  console.log('');

  return 0;
}
