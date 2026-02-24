import { Repository } from '../core/repository.js';

/**
 * Initialize a new prompt-vcs repository
 */
export function initCommand(cwd: string): number {
  const repo = new Repository(cwd);
  
  if (repo.isInitialized()) {
    console.error('Error: .pvc already exists');
    return 2;
  }
  
  repo.init();
  console.log('Initialized empty prompt-vcs repository in .pvc/');
  return 0;
}