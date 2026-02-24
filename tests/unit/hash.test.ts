import { describe, it, expect } from 'vitest';
import { hashContent, truncateHash } from '../../src/core/hash';

describe('hash', () => {
  describe('hashContent', () => {
    it('should return consistent SHA-256 hash for same content', () => {
      const content = 'Hello, World!';
      const hash1 = hashContent(content);
      const hash2 = hashContent(content);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 is 64 hex chars
    });

    it('should return different hashes for different content', () => {
      const hash1 = hashContent('Hello');
      const hash2 = hashContent('World');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashContent('');
      expect(hash).toHaveLength(64);
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  describe('truncateHash', () => {
    it('should return first 7 characters', () => {
      const fullHash = 'abc123def456789';
      const truncated = truncateHash(fullHash);
      expect(truncated).toBe('abc123d');
    });

    it('should handle exactly 7 chars', () => {
      const hash = 'abcdefg';
      expect(truncateHash(hash)).toBe('abcdefg');
    });
  });
});