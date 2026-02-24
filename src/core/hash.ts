import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of content
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Truncate hash to 7 characters for display (like Git short hash)
 */
export function truncateHash(hash: string): string {
  return hash.slice(0, 7);
}