#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { commitCommand } from './commands/commit.js';
import { diffCommand } from './commands/diff.js';
import { testCommand } from './commands/test.js';
import { testLogCommand } from './commands/test-log.js';
import { testShowCommand } from './commands/test-show.js';

const program = new Command();

program
  .name('pvc')
  .description('Prompt Version Control System - Git-style VCS for LLM prompts')
  .version('0.2.0');

program
  .command('init')
  .description('Initialize a new prompt-vcs repository')
  .action(() => {
    process.exit(initCommand(process.cwd()));
  });

program
  .command('add')
  .description('Stage files for commit')
  .argument('<path>', 'File or directory to stage')
  .action((path: string) => {
    process.exit(addCommand(process.cwd(), path));
  });

program
  .command('commit')
  .description('Create a commit from staged files')
  .requiredOption('-m, --message <message>', 'Commit message')
  .action((options: { message: string }) => {
    process.exit(commitCommand(process.cwd(), options.message));
  });

program
  .command('diff')
  .description('Show differences between versions')
  .argument('[commit-a]', 'First commit (or HEAD if not specified)')
  .argument('[commit-b]', 'Second commit (or working directory if not specified)')
  .action((commitA?: string, commitB?: string) => {
    process.exit(diffCommand(process.cwd(), commitA, commitB));
  });

program
  .command('test')
  .description('Run A/B test between two prompt versions')
  .argument('<commit-a>', 'First commit hash')
  .argument('<commit-b>', 'Second commit hash')
  .requiredOption('-d, --dataset <path>', 'Path to dataset file (JSON or CSV)')
  .option('-c, --concurrency <n>', 'Concurrent requests', '5')
  .option('-m, --model <model>', 'OpenAI model to use', 'gpt-4')
  .option('--save', 'Save test results')
  .action(async (commitA: string, commitB: string, options: { dataset: string; concurrency: string; model: string; save?: boolean }) => {
    const exitCode = await testCommand(process.cwd(), commitA, commitB, {
      dataset: options.dataset,
      concurrency: parseInt(options.concurrency, 10),
      model: options.model,
      save: options.save || false,
    });
    process.exit(exitCode);
  });

program
  .command('test-log')
  .description('List test run history')
  .option('-n, --limit <n>', 'Number of results to show', '10')
  .action(async (options: { limit: string }) => {
    const exitCode = await testLogCommand(process.cwd(), {
      limit: parseInt(options.limit, 10),
    });
    process.exit(exitCode);
  });

program
  .command('test-show')
  .description('Show detailed test run results')
  .argument('<run-id>', 'Test run ID')
  .action(async (runId: string) => {
    const exitCode = await testShowCommand(process.cwd(), runId);
    process.exit(exitCode);
  });

program.parse();