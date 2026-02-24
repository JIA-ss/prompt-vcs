import OpenAI from 'openai';

/**
 * Error thrown for OpenAI client issues
 */
export class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}

/**
 * Options for OpenAI client configuration
 */
export interface OpenAIClientOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
}

/**
 * Chat completion request parameters
 */
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API client wrapper with retry logic
 */
export class OpenAIClient {
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private client: OpenAI;

  constructor(apiKey?: string, options: OpenAIClientOptions = {}) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      throw new OpenAIError('OPENAI_API_KEY environment variable is required');
    }

    this.timeout = options.timeout || 60000;
    this.maxRetries = options.maxRetries || 3;

    this.client = new OpenAI({
      apiKey: this.apiKey,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Get the API key (for testing)
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Get timeout value
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Get max retries value
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }

  /**
   * Get masked API key for logging
   */
  getMaskedKey(): string {
    if (this.apiKey.length <= 8) {
      return this.apiKey;
    }
    return `${this.apiKey.slice(0, 6)}...${this.apiKey.slice(-4)}`;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens,
      });

      return {
        id: response.id,
        choices: response.choices.map(choice => ({
          message: {
            content: choice.message.content || '',
          },
          finish_reason: choice.finish_reason,
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
