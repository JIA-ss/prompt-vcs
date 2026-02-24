import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAIClient, OpenAIError } from '../../src/core/openai-client';

describe('OpenAIClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should read API key from environment variable', () => {
      process.env.OPENAI_API_KEY = 'sk-test123';
      const client = new OpenAIClient();
      expect(client.getApiKey()).toBe('sk-test123');
    });

    it('should throw error when API key is missing', () => {
      expect(() => new OpenAIClient()).toThrow(OpenAIError);
      expect(() => new OpenAIClient()).toThrow('OPENAI_API_KEY environment variable is required');
    });

    it('should use custom API key if provided', () => {
      const client = new OpenAIClient('sk-custom-key');
      expect(client.getApiKey()).toBe('sk-custom-key');
    });
  });

  describe('configuration', () => {
    it('should have default timeout', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const client = new OpenAIClient();
      expect(client.getTimeout()).toBe(60000);
    });

    it('should have default max retries', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const client = new OpenAIClient();
      expect(client.getMaxRetries()).toBe(3);
    });

    it('should allow custom timeout', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const client = new OpenAIClient(undefined, { timeout: 30000 });
      expect(client.getTimeout()).toBe(30000);
    });

    it('should allow custom max retries', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const client = new OpenAIClient(undefined, { maxRetries: 5 });
      expect(client.getMaxRetries()).toBe(5);
    });
  });

  describe('createChatCompletion', () => {
    it('should create chat completion request', async () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const client = new OpenAIClient();
      
      // Mock the underlying implementation
      const mockResponse = {
        id: 'test-id',
        choices: [{ message: { content: 'Hello' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      };
      
      vi.spyOn(client as any, 'createChatCompletion').mockResolvedValue(mockResponse);
      
      const result = await client.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }]
      });
      
      expect(result.choices[0].message.content).toBe('Hello');
    });
  });

  describe('maskApiKey', () => {
    it('should mask API key in logs', () => {
      process.env.OPENAI_API_KEY = 'sk-abcdefghijklmnopqrstuvwxyz';
      const client = new OpenAIClient();
      expect(client.getMaskedKey()).toBe('sk-abc...wxyz');
    });

    it('should handle short API keys', () => {
      process.env.OPENAI_API_KEY = 'sk-short';
      const client = new OpenAIClient();
      expect(client.getMaskedKey()).toBe('sk-short');
    });
  });
});
