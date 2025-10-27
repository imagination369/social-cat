import OpenAI from 'openai';
import { createOpenAICircuitBreaker } from './resilience';
import { openaiRateLimiter, withRateLimit } from './rate-limiter';
import { logger } from './logger';

/**
 * OpenAI API Client with Reliability Infrastructure
 *
 * Features:
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting (500 req/min)
 * - Structured logging
 * - 60s timeout for AI generation
 */

if (!process.env.OPENAI_API_KEY) {
  logger.warn('⚠️  OPENAI_API_KEY is not set. OpenAI features will not work.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: 60000, // 60 second timeout
});

async function generateTweetInternal(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  logger.info({ promptLength: prompt.length, hasSystemPrompt: !!systemPrompt }, 'Generating tweet with AI');

  const defaultSystemPrompt = `You are a social media expert who creates engaging, concise tweets.

Guidelines:
- Keep tweets under 280 characters (this is critical!)
- Be authentic and conversational
- Use clear, direct language
- Focus on value and engagement
- Avoid excessive hashtags or emojis unless specifically requested
- For threads: Create a cohesive narrative that flows naturally across multiple tweets

If asked to create a thread, write the full content as continuous text - it will be automatically split into tweets.`;

  const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: finalSystemPrompt,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 500, // Increased for thread support
    temperature: 0.8,
  });

  const result = completion.choices[0]?.message?.content || '';
  logger.info({ resultLength: result.length }, 'Tweet generated successfully');
  return result;
}

/**
 * Generate tweet (protected with circuit breaker + rate limiting)
 *
 * @param prompt - The user's prompt describing what to tweet about
 * @param systemPrompt - Optional custom system prompt to control tone/style
 */
const generateTweetWithBreaker = createOpenAICircuitBreaker(generateTweetInternal);
export const generateTweet = withRateLimit(
  (prompt: string, systemPrompt?: string) => generateTweetWithBreaker.fire(prompt, systemPrompt),
  openaiRateLimiter
);

/**
 * Generate a thread of tweets (internal, unprotected)
 *
 * @param prompt - The user's prompt describing what the thread should be about
 * @param threadLength - Number of tweets in the thread (2-10)
 * @param systemPrompt - Optional custom system prompt
 * @returns Array of tweet strings, each under 280 characters
 */
async function generateThreadInternal(
  prompt: string,
  threadLength: number = 3,
  systemPrompt?: string
): Promise<string[]> {
  logger.info(
    { promptLength: prompt.length, threadLength, hasSystemPrompt: !!systemPrompt },
    'Generating thread with AI'
  );

  const defaultSystemPrompt = `You are a social media expert who creates engaging Twitter threads.

Guidelines:
- Generate EXACTLY ${threadLength} tweets that form a cohesive thread
- Each tweet must be under 280 characters (critical!)
- Each tweet should be engaging and build on the previous one
- Create a natural narrative flow across all tweets
- First tweet should hook the reader
- Middle tweets should develop the idea with insights/details
- Last tweet should have a strong conclusion or call-to-action
- Be authentic, conversational, and thought-provoking
- Avoid excessive hashtags or emojis unless specifically requested`;

  // CRITICAL: Always append formatting instructions, even with custom system prompts
  const formattingInstructions = `

IMPORTANT FORMATTING RULES:
- You MUST generate EXACTLY ${threadLength} separate tweets
- Each tweet MUST be under 280 characters
- Return ONLY the tweets separated by "---" (three dashes on a new line)
- Do NOT return a single long tweet - split it into ${threadLength} distinct tweets

Example format:
First tweet text here (under 280 chars)

---

Second tweet text here (under 280 chars)

---

Third tweet text here (under 280 chars)`;

  const finalSystemPrompt = systemPrompt
    ? `${systemPrompt}\n${formattingInstructions}`
    : `${defaultSystemPrompt}\n${formattingInstructions}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: finalSystemPrompt,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1000, // More tokens for multiple tweets
    temperature: 0.8,
  });

  const result = completion.choices[0]?.message?.content || '';

  // Log raw AI response for debugging
  logger.info({ rawResponse: result.substring(0, 500) }, 'Raw AI thread response (first 500 chars)');

  // Split the result by "---" separator (handle various formats)
  // Try multiple parsing strategies:
  let tweets: string[] = [];

  // Strategy 1: Split by "---" with flexible whitespace
  if (result.includes('---')) {
    tweets = result
      .split(/\s*---\s*/)
      .map(tweet => tweet.trim())
      .filter(tweet => tweet.length > 0 && tweet.length <= 280);
  }

  // Strategy 2: If no separator found, try splitting by double newlines
  if (tweets.length === 0 && result.includes('\n\n')) {
    tweets = result
      .split(/\n\n+/)
      .map(tweet => tweet.trim())
      .filter(tweet => tweet.length > 0 && tweet.length <= 280);
  }

  // Strategy 3: If still no tweets, try splitting by numbered list (1., 2., 3.)
  if (tweets.length === 0 && /^\d+\.\s/.test(result)) {
    tweets = result
      .split(/\n\d+\.\s/)
      .map(tweet => tweet.trim())
      .filter(tweet => tweet.length > 0 && tweet.length <= 280);
    // Remove potential leading number from first tweet
    if (tweets.length > 0 && /^\d+\.\s/.test(tweets[0])) {
      tweets[0] = tweets[0].replace(/^\d+\.\s/, '').trim();
    }
  }

  // Strategy 4: Last resort - treat entire response as single tweet if it's valid
  if (tweets.length === 0 && result.trim().length > 0 && result.trim().length <= 280) {
    tweets = [result.trim()];
  }

  // Log parsed tweets for debugging
  logger.info({ parsedCount: tweets.length, tweets: tweets.slice(0, 3) }, 'Parsed tweets from AI response');

  // Validate we got the right number of tweets
  if (tweets.length < threadLength) {
    logger.warn(
      { expected: threadLength, received: tweets.length },
      'Generated fewer tweets than requested, padding with available tweets'
    );
  }

  // Take exactly threadLength tweets (or all if fewer were generated)
  const finalTweets = tweets.slice(0, threadLength);

  logger.info(
    { tweetCount: finalTweets.length, lengths: finalTweets.map(t => t.length) },
    'Thread generated successfully'
  );

  return finalTweets;
}

/**
 * Generate a thread of tweets (protected with circuit breaker + rate limiting)
 *
 * @param prompt - The user's prompt describing what the thread should be about
 * @param threadLength - Number of tweets in the thread (2-10)
 * @param systemPrompt - Optional custom system prompt
 * @returns Array of tweet strings
 */
const generateThreadWithBreaker = createOpenAICircuitBreaker(generateThreadInternal);
export const generateThread = withRateLimit(
  (prompt: string, threadLength?: number, systemPrompt?: string) =>
    generateThreadWithBreaker.fire(prompt, threadLength, systemPrompt),
  openaiRateLimiter
);

async function generateTweetReplyInternal(
  originalTweet: string,
  systemPrompt?: string,
  useDefaultPrompt: boolean = true
): Promise<string> {
  logger.info(
    { originalTweetLength: originalTweet.length, hasSystemPrompt: !!systemPrompt },
    'Generating tweet reply with AI'
  );

  const defaultSystemPrompt = `You are a thoughtful Twitter user who engages authentically with interesting content. Reply naturally as if you're having a genuine conversation with someone interesting.

Style:
- Write like a real person, not a bot or brand account
- Be conversational and casual (contractions are good!)
- Keep it under 280 characters
- Match the energy and tone of the original tweet

Content:
- Add genuine insight, a follow-up question, or personal perspective
- Share a related thought or build on their idea
- If they're asking something, give a helpful answer
- Avoid generic praise like "Great post!" or "Thanks for sharing!"

Don't:
- Sound promotional, salesy, or overly enthusiastic
- Use hashtags or emoji unless the original tweet does
- Make it about yourself unless contextually relevant
- Be controversial, political, or offensive

Goal: Have a real conversation, not broadcast content.`;

  // Determine which prompt to use
  let finalPrompt: string;
  if (systemPrompt !== undefined && systemPrompt !== null) {
    // Use provided prompt (even if empty string)
    finalPrompt = systemPrompt;
  } else if (useDefaultPrompt) {
    // Use default only if explicitly allowed and no prompt provided
    finalPrompt = defaultSystemPrompt;
  } else {
    // No prompt at all
    finalPrompt = '';
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Only add system message if there's a prompt
  if (finalPrompt) {
    messages.push({
      role: 'system',
      content: finalPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: `Generate a reply to this tweet:\n\n"${originalTweet}"`,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 100,
    temperature: 0.7,
  });

  const result = completion.choices[0]?.message?.content || '';
  logger.info({ replyLength: result.length }, 'Tweet reply generated successfully');
  return result;
}

/**
 * Generate tweet reply (protected with circuit breaker + rate limiting)
 */
const generateTweetReplyWithBreaker = createOpenAICircuitBreaker(generateTweetReplyInternal);
export const generateTweetReply = withRateLimit(
  (originalTweet: string, systemPrompt?: string, useDefaultPrompt?: boolean) =>
    generateTweetReplyWithBreaker.fire(originalTweet, systemPrompt, useDefaultPrompt),
  openaiRateLimiter
);
