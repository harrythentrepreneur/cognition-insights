import { WhatsAppMessage } from '../parsers/whatsapp-parser';
import { apiSemaphore } from '../utils/semaphore';
import { apiCounter } from '../utils/api-counter';
import { rateLimitManager } from '../utils/rate-limit-manager';
import { logger } from '../utils/logger';
import { extractJSON } from '../utils/json-parser';

interface TokenCache {
  token: string;
  expiresAt: number;
  type?: 'ephemeral' | 'api_key';
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export class GeminiClient {
  private tokenCache: TokenCache | null = null;
  private tokenPromise: Promise<TokenCache> | null = null;
  private readonly maxRetries = 5;
  private readonly retryDelays = [2000, 4000, 8000, 16000, 32000]; // Enhanced exponential backoff
  private rateLimitBackoffMs = 0; // Track rate limit backoff
  private lastRateLimitTime = 0;

  constructor() {
    logger.debug('GeminiClient initialized - using secure token endpoint');
  }

  async generateContent(prompt: string, retryCount = 0, schema?: any): Promise<string> {
    // Use semaphore to limit concurrent API calls
    return apiSemaphore.withPermit(async () => {
      // Track API calls - this will show "📊 API Call #X: prompt preview..."
      apiCounter.increment(prompt);

      // Log retry attempts only (not initial calls)
      if (retryCount > 0) {
        logger.debug(`Retry attempt ${retryCount} for API call`);
      }

      const tokenData = await this.getToken();

      // Use different URL and auth header based on token type
      const isApiKey = tokenData.type === 'api_key';
      const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17';
      const url = isApiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${tokenData.token}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (!isApiKey) {
        headers['Authorization'] = `Bearer ${tokenData.token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192, // Increased to handle larger responses
            topK: 40,
            topP: 0.95,
            ...(schema && {
              response_mime_type: "application/json",
              response_schema: schema
            })
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        }),
      }
      );

      if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting and overload errors with retry
        if ((response.status === 503 || response.status === 429) && retryCount < this.maxRetries) {
          logger.warn(`Gemini API overloaded (${response.status}), retrying in ${this.retryDelays[retryCount]}ms...`);

          // If rate limited, implement intelligent backoff
          if (response.status === 429) {
            logger.debug('Rate limited, implementing intelligent backoff...');
            rateLimitManager.recordRateLimit();
            this.lastRateLimitTime = Date.now();
            this.rateLimitBackoffMs = Math.min(this.rateLimitBackoffMs + 5000, 60000); // Increase backoff up to 60s
            this.tokenCache = null; // Clear cache to force new token

            // Extract retry-after header if available
            const retryAfter = response.headers.get('retry-after');
            const backoffTime = retryAfter
              ? parseInt(retryAfter) * 1000
              : Math.max(this.retryDelays[retryCount], this.rateLimitBackoffMs);

            logger.debug(`Backing off for ${backoffTime}ms (retry ${retryCount + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          } else {
            await new Promise(resolve => setTimeout(resolve, this.retryDelays[retryCount]));
          }

          return this.generateContent(prompt, retryCount + 1);
        }

        // Handle token expiration by refreshing (only for ephemeral tokens)
        if (response.status === 401 && retryCount === 0 && this.tokenCache?.type === 'ephemeral') {
          logger.warn('Token expired, refreshing...');
          this.tokenCache = null;
          return this.generateContent(prompt, retryCount + 1);
        }

        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();
      const result = data.candidates[0]?.content?.parts[0]?.text || '';
      logger.debug('Gemini response received:', {
        responseLength: result.length,
        hasContent: !!result
      });

      // Successfully got response, reduce backoff
      rateLimitManager.recordSuccess();
      if (this.rateLimitBackoffMs > 0) {
        this.rateLimitBackoffMs = Math.max(0, this.rateLimitBackoffMs - 2000);
        logger.debug(`Success! Reducing rate limit backoff to ${this.rateLimitBackoffMs}ms`);
      }

      return result;
    });
  }

  async generateStructuredContent<T = any>(prompt: string, schema: any, retryCount = 0): Promise<T> {
    // Ensure the prompt explicitly requests JSON output
    const structuredPrompt = `${prompt}\n\nIMPORTANT: You MUST respond with ONLY valid JSON that matches the provided schema. Do not include any explanatory text, markdown formatting, or additional content outside the JSON structure.`;

    const response = await this.generateContent(structuredPrompt, retryCount, schema);

    try {
      // First try to parse as-is
      return JSON.parse(response) as T;
    } catch (error) {
      logger.error('Failed to parse structured response:', error);
      logger.debug('Raw response:', response);

      // Try to extract JSON if the response contains extra text
      try {
        const extracted = extractJSON(response);
        return extracted as T;
      } catch (extractError) {
        logger.error('Failed to extract JSON from structured response:', extractError);
        throw new Error(`Invalid JSON response from structured output. Raw response: ${response.substring(0, 200)}...`);
      }
    }
  }

  private async getToken(): Promise<TokenCache> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60000) {
      return this.tokenCache;
    }

    // If there's already a token request in progress, wait for it
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Create a new token request
    this.tokenPromise = this.fetchNewToken();

    try {
      const tokenData = await this.tokenPromise;
      return tokenData;
    } finally {
      this.tokenPromise = null;
    }
  }

  private async fetchNewToken(): Promise<TokenCache> {
    // Always use token generation endpoint for security
    logger.debug('Fetching secure token from /api/token/generate...');

    // Use absolute URL in server-side context
    const url = typeof window === 'undefined'
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/token/generate`
      : '/api/token/generate';

    logger.debug('Token URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Token fetch failed:', errorText);
      throw new Error(`Failed to get token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logger.debug('Token received:', { type: data.type, expiresIn: Math.round((data.expiresAt - Date.now()) / 1000) + 's' });

    this.tokenCache = {
      token: data.token,
      expiresAt: data.expiresAt,
      type: data.type || 'ephemeral'
    };

    return this.tokenCache;
  }

  // Batch processing for multiple prompts with intelligent rate limiting
  async generateContentBatch(prompts: string[]): Promise<string[]> {
    // Dynamic batch size based on recent rate limits
    const timeSinceRateLimit = Date.now() - this.lastRateLimitTime;
    const batchSize = timeSinceRateLimit < 60000 ? 2 : 5; // Smaller batches if recently rate limited

    logger.debug(`Batch processing ${prompts.length} prompts with batch size ${batchSize}`);
    const results: string[] = [];

    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((prompt, index) =>
          // Add small stagger to avoid hitting rate limits
          new Promise(resolve => setTimeout(resolve, index * 500))
            .then(() => this.generateContent(prompt))
        )
      );

      // Process results and handle failures
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Batch item failed:', result.reason);
          results.push(''); // Add empty string for failed items
        }
      }

      // Only delay if we're being rate limited, otherwise process immediately
      if (i + batchSize < prompts.length && this.rateLimitBackoffMs > 0) {
        const delay = Math.min(this.rateLimitBackoffMs + (Math.random() * 500), 10000); // Add small jitter
        logger.debug(`Rate limited - waiting ${delay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      // No delay between batches when not rate limited - process as fast as possible
    }

    return results;
  }
}

// --- Batching Utility for WhatsApp Messages ---
// (import already exists at the top, so do not re-import WhatsAppMessage)

// Rough token estimate: 1 token ≈ 4 chars
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface MessageChunk {
  startTime: Date;
  endTime: Date;
  messages: WhatsAppMessage[];
}

/**
 * Adaptive time window: for small chats, use 24h; for large, use 1h or less.
 * Ensures each chunk stays under maxTokens.
 */
export function chunkMessagesByTimeAndTokens(
  messages: WhatsAppMessage[],
  maxTokens: number = 2000
): MessageChunk[] {
  if (!messages.length) return [];
  // Sort messages by timestamp
  const sorted = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Adaptive window: estimate average messages per day
  const first = new Date(sorted[0].timestamp);
  const last = new Date(sorted[sorted.length - 1].timestamp);
  const totalDays = Math.max(1, (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
  const avgPerDay = sorted.length / totalDays;

  // Heuristic: if > 1000/day, use 1h window; if > 200/day, use 6h; else 24h
  let windowMinutes = 1440;
  if (avgPerDay > 1000) windowMinutes = 60;
  else if (avgPerDay > 200) windowMinutes = 360;

  const chunks: MessageChunk[] = [];
  let currentChunk: WhatsAppMessage[] = [];
  let currentTokens = 0;
  let windowStart: Date = new Date(sorted[0].timestamp);
  let windowEnd: Date = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);

  for (const msg of sorted) {
    const msgTime = new Date(msg.timestamp);
    const msgTokens = estimateTokens(msg.content);

    // If message is outside the current window or would exceed token limit, start new chunk
    if (
      msgTime > windowEnd ||
      (currentTokens + msgTokens > maxTokens && currentChunk.length > 0)
    ) {
      chunks.push({
        startTime: windowStart,
        endTime: windowEnd,
        messages: currentChunk,
      });
      currentChunk = [];
      currentTokens = 0;
      windowStart = msgTime;
      windowEnd = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);
    }

    currentChunk.push(msg);
    currentTokens += msgTokens;
  }

  // Add last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      startTime: windowStart,
      endTime: windowEnd,
      messages: currentChunk,
    });
  }

  return chunks;
}

export function buildPromptForChunk(chunk: MessageChunk): string {
  const header = `Summarize the following WhatsApp conversation from ${chunk.startTime.toISOString()} to ${chunk.endTime.toISOString()} (total messages: ${chunk.messages.length}):\n\n`;
  const body = chunk.messages.map(m => `[${m.sender}] ${m.content}`).join('\n');
  return header + body;
}

/**
 * Given WhatsApp messages, returns an array of prompt strings for Gemini batch processing.
 */
export function buildPromptsForMessages(messages: WhatsAppMessage[], maxTokens: number = 2000): string[] {
  const chunks = chunkMessagesByTimeAndTokens(messages, maxTokens);
  return chunks.map(buildPromptForChunk);
}

/**
 * Returns every other message for basic analysis to reduce data size while maintaining timeframe.
 */
export function getMessagesForBasicAnalysis(messages: WhatsAppMessage[]): WhatsAppMessage[] {
  if (!messages.length) return [];

  const sorted = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // For very large chats (>2000 messages), use aggressive sampling
  if (sorted.length > 2000) {
    // Take max 200 messages evenly distributed across the timeline
    const maxSamples = 200;
    const interval = Math.floor(sorted.length / maxSamples);
    const sampledMessages = sorted.filter((_, index) => index % interval === 0).slice(0, maxSamples);
    logger.debug(`Quick analysis: Aggressively sampled ${messages.length} messages down to ${sampledMessages.length}`);
    return sampledMessages;
  }

  // For medium chats, keep every other message
  const reducedMessages = sorted.filter((_, index) => index % 2 === 0);
  logger.debug(`Basic analysis: Reduced messages from ${messages.length} to ${reducedMessages.length} (keeping every 2nd message)`);
  return reducedMessages;
}

/**
 * Returns all messages for full analysis.
 */
export function getMessagesForFullAnalysis(messages: WhatsAppMessage[]): WhatsAppMessage[] {
  return messages;
}

/**
 * Usage:
 *   // For basic analysis (last 3 months):
 *   const basicMsgs = getMessagesForBasicAnalysis(messages);
 *   const prompts = buildPromptsForMessages(basicMsgs);
 *   // For full analysis (all messages):
 *   const fullMsgs = getMessagesForFullAnalysis(messages);
 *   const prompts = buildPromptsForMessages(fullMsgs);
 */