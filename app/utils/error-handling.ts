// Error handling utilities

/**
 * Format error message for API responses
 */
export const formatErrorResponse = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};

/**
 * Check if the OpenAI API key is configured properly
 */
export const isOpenAIKeyConfigured = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey !== 'your_openai_api_key_here';
};

/**
 * Custom error classes
 */
export class ApiKeyMissingError extends Error {
  constructor() {
    super('OpenAI API key is not configured. Please add your API key to the .env.local file.');
    this.name = 'ApiKeyMissingError';
  }
}

export class FileProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export class VideoGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoGenerationError';
  }
} 