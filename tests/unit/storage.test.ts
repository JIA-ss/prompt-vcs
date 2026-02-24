import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ObjectStorage } from '../../src/core/storage';

describe('ObjectStorage', () => {
  let tempDir: string;
  let storage: ObjectStorage;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-test-'));
    storage = new ObjectStorage(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('writeObject', () => {
    it('should write object to 2-level directory structure', () => {
      const hash = 'abc123def456789';
      const content = Buffer.from('test content');
      
      storage.writeObject(hash, content);
      
      const expectedPath = join(tempDir, 'ab', 'c123def456789');
      expect(existsSync(expectedPath)).toBe(true);
      expect(readFileSync(expectedPath)).toEqual(content);
    });

    it('should create parent directories if needed', () => {
      const hash = 'ffeebbccdd';
      const content = Buffer.from('another content');
      
      storage.writeObject(hash, content);
      
      expect(existsSync(join(tempDir, 'ff'))).toBe(true);
    });
  });

  describe('readObject', () => {
    it('should read previously written object', () => {
      const hash = 'aabbccdd';
      const content = Buffer.from('hello world');
      
      storage.writeObject(hash, content);
      const read = storage.readObject(hash);
      
      expect(read).toEqual(content);
    });

    it('should throw error for non-existent object', () => {
      expect(() => storage.readObject('nonexistent')).toThrow();
    });
  });

  describe('exists', () => {
    it('should return true for existing object', () => {
      const hash = 'test1234';
      storage.writeObject(hash, Buffer.from('data'));
      expect(storage.exists(hash)).toBe(true);
    });

    it('should return false for non-existent object', () => {
      expect(storage.exists('nothere')).toBe(false);
    });
  });
});