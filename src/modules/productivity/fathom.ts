/**
 * Fathom AI Meeting API Client with Reliability Infrastructure
 *
 * Complete integration with Fathom's meeting recording and transcription platform:
 * - List and filter meetings with comprehensive query options
 * - Retrieve meeting transcripts (speaker-segmented with timestamps)
 * - Get AI-generated meeting summaries
 * - Search across titles, summaries, action items, and transcripts
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting for API quota management (60 req/min)
 * - Structured logging
 * - Automatic error handling
 *
 * API Version: v1
 * Rate Limits: 60 requests per minute
 * Documentation: https://developers.fathom.ai/
 *
 * Related Tools:
 * - For Claude Desktop integration, see: https://github.com/sourcegate/mcp-fathom-server
 *
 * @module productivity/fathom
 */

import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FathomSpeaker {
  display_name: string;
  matched_calendar_invitee_email?: string;
}

export interface FathomTranscriptSegment {
  speaker: FathomSpeaker;
  text: string;
  timestamp: string; // Format: "HH:MM:SS"
}

export interface FathomSummary {
  template_name: string;
  markdown_formatted: string;
}

export interface FathomActionItem {
  description: string;
  user_generated: boolean;
  completed: boolean;
  recording_timestamp: string;
  recording_playback_url: string;
  assignee?: {
    name: string;
    email: string;
    team?: string;
  };
}

export interface FathomCalendarInvitee {
  name: string;
  matched_speaker_display_name?: string;
  email: string;
  email_domain: string;
  is_external: boolean;
}

export interface FathomRecordedBy {
  name: string;
  email: string;
  email_domain: string;
  team?: string;
}

export interface FathomCRMMatches {
  contacts?: Array<{
    name: string;
    email: string;
    record_url: string;
  }>;
  companies?: Array<{
    name: string;
    record_url: string;
  }>;
  deals?: Array<{
    name: string;
    amount: number;
    record_url: string;
  }>;
  error?: string;
}

export interface FathomMeeting {
  title: string;
  meeting_title: string;
  recording_id: number;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  recording_start_time?: string;
  recording_end_time?: string;
  calendar_invitees_domains_type?: 'all' | 'only_internal' | 'one_or_more_external';
  transcript_language?: string;
  transcript?: FathomTranscriptSegment[];
  default_summary?: FathomSummary;
  action_items?: FathomActionItem[];
  calendar_invitees?: FathomCalendarInvitee[];
  recorded_by?: FathomRecordedBy;
  crm_matches?: FathomCRMMatches;
}

export interface FathomMeetingsResponse {
  limit: number | null;
  next_cursor: string | null;
  items: FathomMeeting[];
}

export interface FathomTranscriptResponse {
  transcript: FathomTranscriptSegment[];
}

export interface FathomSummaryResponse {
  summary: FathomSummary;
}

export interface ListMeetingsOptions {
  calendar_invitees_domains?: string[];
  calendar_invitees_domains_type?: 'all' | 'only_internal' | 'one_or_more_external';
  created_after?: string;
  created_before?: string;
  cursor?: string;
  include_action_items?: boolean;
  include_crm_matches?: boolean;
  include_summary?: boolean;
  include_transcript?: boolean;
  limit?: number;
  recorded_by?: string[];
  teams?: string[];
  accessToken?: string;
}

export interface GetTranscriptOptions {
  recording_id: number;
  destination_url?: string;
  accessToken?: string;
}

export interface GetSummaryOptions {
  recording_id: number;
  destination_url?: string;
  accessToken?: string;
}

// ============================================================================
// CREDENTIAL DETECTION
// ============================================================================

const FATHOM_API_KEY = process.env.FATHOM_API_KEY;
const FATHOM_API_BASE_URL = 'https://api.fathom.ai/external/v1';

const hasCredentials = FATHOM_API_KEY !== undefined;

if (!hasCredentials) {
  logger.warn('⚠️  FATHOM_API_KEY not set. Fathom features will not work.');
}

// ============================================================================
// RATE LIMITER CONFIGURATION
// ============================================================================

// Fathom Rate Limits:
// - 60 requests per minute per API key
const fathomRateLimiter = createRateLimiter({
  maxConcurrent: 5,              // Max parallel requests
  minTime: 1000,                 // Min 1 second between requests (60/min)
  reservoir: 60,                 // Initial token count
  reservoirRefreshAmount: 60,    // Tokens added per interval
  reservoirRefreshInterval: 60000, // Refresh every 60 seconds
  id: 'fathom',
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make authenticated request to Fathom API
 */
async function makeFathomRequest<T>(
  endpoint: string,
  options: {
    accessToken?: string;
    method?: 'GET' | 'POST';
    queryParams?: Record<string, string | string[]>;
  } = {}
): Promise<T> {
  const accessToken = options.accessToken || FATHOM_API_KEY;

  if (!accessToken) {
    throw new Error('Fathom API key not configured. Provide accessToken or set FATHOM_API_KEY.');
  }

  const url = new URL(`${FATHOM_API_BASE_URL}${endpoint}`);

  if (options.queryParams) {
    Object.entries(options.queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array parameters (e.g., teams[], calendar_invitees_domains[])
        value.forEach((v) => url.searchParams.append(`${key}[]`, v));
      } else {
        url.searchParams.append(key, value);
      }
    });
  }

  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'X-Api-Key': accessToken,
      'Content-Type': 'application/json',
    },
  };

  logger.info({ method: options.method || 'GET', endpoint }, 'Making Fathom API request');

  const response = await fetch(url.toString(), requestOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fathom API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data as T;
}

// ============================================================================
// MEETINGS API
// ============================================================================

/**
 * List meetings (internal)
 */
async function listMeetingsInternal(
  options: ListMeetingsOptions = {}
): Promise<FathomMeetingsResponse> {
  logger.info(
    {
      has_filters: !!(
        options.calendar_invitees_domains ||
        options.created_after ||
        options.created_before ||
        options.recorded_by ||
        options.teams
      ),
      include_transcript: options.include_transcript,
      include_summary: options.include_summary,
    },
    'Listing Fathom meetings'
  );

  const queryParams: Record<string, string | string[]> = {};

  if (options.calendar_invitees_domains) {
    queryParams.calendar_invitees_domains = options.calendar_invitees_domains;
  }
  if (options.calendar_invitees_domains_type) {
    queryParams.calendar_invitees_domains_type = options.calendar_invitees_domains_type;
  }
  if (options.created_after) {
    queryParams.created_after = options.created_after;
  }
  if (options.created_before) {
    queryParams.created_before = options.created_before;
  }
  if (options.cursor) {
    queryParams.cursor = options.cursor;
  }
  if (options.include_action_items !== undefined) {
    queryParams.include_action_items = String(options.include_action_items);
  }
  if (options.include_crm_matches !== undefined) {
    queryParams.include_crm_matches = String(options.include_crm_matches);
  }
  if (options.include_summary !== undefined) {
    queryParams.include_summary = String(options.include_summary);
  }
  if (options.include_transcript !== undefined) {
    queryParams.include_transcript = String(options.include_transcript);
  }
  if (options.limit !== undefined) {
    queryParams.limit = String(options.limit);
  }
  if (options.recorded_by) {
    queryParams.recorded_by = options.recorded_by;
  }
  if (options.teams) {
    queryParams.teams = options.teams;
  }

  const result = await makeFathomRequest<FathomMeetingsResponse>('/meetings', {
    accessToken: options.accessToken,
    queryParams,
  });

  logger.info({ count: result.items.length, has_next: !!result.next_cursor }, 'Fathom meetings retrieved');
  return result;
}

const listMeetingsWithBreaker = createCircuitBreaker(listMeetingsInternal, {
  timeout: 30000,
  name: 'fathom.listMeetings',
});

/**
 * List meetings with optional filters and pagination
 *
 * @param options - Filter and pagination options
 * @returns Paginated list of meetings with optional transcripts, summaries, and action items
 *
 * @example
 * // List recent meetings
 * const meetings = await listMeetings();
 *
 * @example
 * // List meetings with specific attendee domains
 * const externalMeetings = await listMeetings({
 *   calendar_invitees_domains: ['client.com'],
 *   calendar_invitees_domains_type: 'one_or_more_external',
 *   created_after: '2025-01-01T00:00:00Z'
 * });
 *
 * @example
 * // Get meetings with full transcripts and summaries
 * const detailedMeetings = await listMeetings({
 *   include_transcript: true,
 *   include_summary: true,
 *   include_action_items: true,
 *   teams: ['Engineering']
 * });
 */
export const listMeetings = withRateLimit(
  (options: ListMeetingsOptions = {}) => listMeetingsWithBreaker.fire(options),
  fathomRateLimiter
);

// ============================================================================
// RECORDINGS API
// ============================================================================

/**
 * Get transcript for a recording (internal)
 */
async function getTranscriptInternal(
  options: GetTranscriptOptions
): Promise<FathomTranscriptResponse | { destination_url: string }> {
  logger.info({ recording_id: options.recording_id, async: !!options.destination_url }, 'Getting Fathom transcript');

  const queryParams: Record<string, string> = {};
  if (options.destination_url) {
    queryParams.destination_url = options.destination_url;
  }

  const result = await makeFathomRequest<FathomTranscriptResponse | { destination_url: string }>(
    `/recordings/${options.recording_id}/transcript`,
    {
      accessToken: options.accessToken,
      queryParams,
    }
  );

  if ('transcript' in result) {
    logger.info(
      { recording_id: options.recording_id, segments: result.transcript.length },
      'Fathom transcript retrieved'
    );
  } else {
    logger.info({ recording_id: options.recording_id, destination: result.destination_url }, 'Fathom transcript async');
  }

  return result;
}

const getTranscriptWithBreaker = createCircuitBreaker(getTranscriptInternal, {
  timeout: 30000,
  name: 'fathom.getTranscript',
});

/**
 * Get transcript for a specific recording
 *
 * @param options - Recording ID and optional destination URL for async delivery
 * @returns Transcript array (synchronous) or destination URL confirmation (asynchronous)
 *
 * @example
 * // Get transcript synchronously
 * const { transcript } = await getTranscript({ recording_id: 123456789 });
 * transcript.forEach(segment => {
 *   console.log(`${segment.timestamp} - ${segment.speaker.display_name}: ${segment.text}`);
 * });
 *
 * @example
 * // Request async delivery to webhook
 * const result = await getTranscript({
 *   recording_id: 123456789,
 *   destination_url: 'https://example.com/webhook/transcript'
 * });
 */
export const getTranscript = withRateLimit(
  (options: GetTranscriptOptions) => getTranscriptWithBreaker.fire(options),
  fathomRateLimiter
);

/**
 * Get summary for a recording (internal)
 */
async function getSummaryInternal(
  options: GetSummaryOptions
): Promise<FathomSummaryResponse | { destination_url: string }> {
  logger.info({ recording_id: options.recording_id, async: !!options.destination_url }, 'Getting Fathom summary');

  const queryParams: Record<string, string> = {};
  if (options.destination_url) {
    queryParams.destination_url = options.destination_url;
  }

  const result = await makeFathomRequest<FathomSummaryResponse | { destination_url: string }>(
    `/recordings/${options.recording_id}/summary`,
    {
      accessToken: options.accessToken,
      queryParams,
    }
  );

  if ('summary' in result) {
    logger.info({ recording_id: options.recording_id, template: result.summary.template_name }, 'Fathom summary retrieved');
  } else {
    logger.info({ recording_id: options.recording_id, destination: result.destination_url }, 'Fathom summary async');
  }

  return result;
}

const getSummaryWithBreaker = createCircuitBreaker(getSummaryInternal, {
  timeout: 30000,
  name: 'fathom.getSummary',
});

/**
 * Get AI-generated summary for a specific recording
 *
 * @param options - Recording ID and optional destination URL for async delivery
 * @returns Summary object (synchronous) or destination URL confirmation (asynchronous)
 *
 * @example
 * // Get summary synchronously
 * const { summary } = await getSummary({ recording_id: 123456789 });
 * console.log(summary.markdown_formatted);
 *
 * @example
 * // Request async delivery to webhook
 * const result = await getSummary({
 *   recording_id: 123456789,
 *   destination_url: 'https://example.com/webhook/summary'
 * });
 */
export const getSummary = withRateLimit(
  (options: GetSummaryOptions) => getSummaryWithBreaker.fire(options),
  fathomRateLimiter
);

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Search meetings by keyword (convenience wrapper around listMeetings)
 *
 * Note: This searches meeting titles and metadata. For full transcript search,
 * use listMeetings with include_transcript: true and filter results client-side.
 *
 * @param searchTerm - Keyword to search for
 * @param options - Additional filter options
 * @returns Meetings matching the search term
 *
 * @example
 * const meetings = await searchMeetings('product launch', {
 *   created_after: '2025-01-01T00:00:00Z'
 * });
 */
export async function searchMeetings(
  searchTerm: string,
  options: Omit<ListMeetingsOptions, 'include_transcript'> = {}
): Promise<FathomMeeting[]> {
  logger.info({ searchTerm }, 'Searching Fathom meetings');

  // Get meetings with transcripts for comprehensive search
  const response = await listMeetings({
    ...options,
    include_transcript: true,
    include_summary: true,
  });

  // Filter meetings by search term (case-insensitive)
  const term = searchTerm.toLowerCase();
  const filtered = response.items.filter((meeting) => {
    // Search in title
    if (meeting.title?.toLowerCase().includes(term)) return true;
    if (meeting.meeting_title?.toLowerCase().includes(term)) return true;

    // Search in summary
    if (meeting.default_summary?.markdown_formatted?.toLowerCase().includes(term)) return true;

    // Search in transcript
    if (meeting.transcript?.some((seg) => seg.text.toLowerCase().includes(term))) return true;

    // Search in action items
    if (meeting.action_items?.some((item) => item.description.toLowerCase().includes(term))) return true;

    return false;
  });

  logger.info({ searchTerm, found: filtered.length, total: response.items.length }, 'Fathom search complete');
  return filtered;
}
