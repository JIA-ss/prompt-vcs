import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Repository } from '../../src/core/repository';

describe('Repository', () => {
  let tempDir: string;
  let repo: Repository;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pvc-repo-'));
    repo = new Repository(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('isInitialized', () => {
    it('should return false when .pvc does not exist', () => {
      expect(repo.isInitialized()).toBe(false);
    });

    it('should return true when .pvc exists', () => {
      mkdirSync(join(tempDir, '.pvc'));
      expect(repo.isInitialized()).toBe(true);
    });
  });

  describe('init', () => {
    it('should create .pvc directory structure', () => {
      repo.init();
      
      expect(existsSync(join(tempDir, '.pvc'))).toBe(true);
      expect(existsSync(join(tempDir, '.pvc', 'objects'))).toBe(true);
      expect(existsSync(join(tempDir, '.pvc', 'index.json'))).toBe(true);
    });

    it('should create empty index.json', () => {
      repo.init();
      const indexContent = readFileSync(join(tempDir, '.pvc', 'index.json'), 'utf-8');
      const index = JSON.parse(indexContent);
      expect(index.staged).toEqual({});
    });

    it('should throw if already initialized', () => {
      repo.init();
      expect(() => repo.init()).toThrow('.pvc already exists');
    });
  });

  describe('readIndex / writeIndex', () => {
    beforeEach(() => {
      repo.init();
    });

    it('should read empty index', () => {
      const index = repo.readIndex();
      expect(index.staged).toEqual({});
    });

    it('should write and read index', () => {
      const newIndex = {
        staged: {
          'test.txt': { hash: 'abc123', path: 'test.txt' }
        }
      };
      repo.writeIndex(newIndex);
      const read = repo.readIndex();
      expect(read).toEqual(newIndex);
    });
  });

  describe('getHead / setHead', () => {
    beforeEach(() => {
      repo.init();
    });

    it('should return null when HEAD does not exist', () => {
      expect(repo.getHead()).toBeNull();
    });

    it('should write and read HEAD', () => {
      repo.setHead('abc1234');
      expect(repo.getHead()).toBe('abc1234');
    });
  });
});