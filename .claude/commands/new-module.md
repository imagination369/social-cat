---
name: new-module
description: Create a new module with full system integration
---

# Create New Module

You are tasked with creating a new module for the b0t workflow automation platform. This command guides you through the complete process of building a production-ready module with all necessary integrations.

## Understanding Required

Before you start, you must understand:

1. **Module Architecture** - All modules follow a three-layer protection pattern:
   - Internal function (pure business logic)
   - Circuit breaker wrapper (prevents cascading failures)
   - Rate limiter wrapper (prevents API quota exhaustion)

2. **Integration Points** - New modules must integrate with:
   - Module registry (auto-generated from TypeScript)
   - Credential system (platform-configs.ts)
   - Workflow executor (dynamic imports)
   - UI components (credentials page, workflow builder)

3. **Type System** - Full TypeScript typing required:
   - Interface definitions for all inputs/outputs
   - JSDoc comments for auto-documentation
   - Proper error handling with typed exceptions

## Step 1: Gather Requirements

Ask the user these questions using the AskUserQuestion tool:

1. **What service/API are you integrating?** (e.g., "Airtable", "Notion", "Custom REST API")
2. **Which category does it belong to?**
   - AI (OpenAI, Anthropic, Cohere, etc.)
   - Social Media (Twitter, Instagram, LinkedIn, etc.)
   - Communication (Slack, Discord, Email, etc.)
   - Data (Google Sheets, Notion, Airtable, databases)
   - Business (HubSpot, Salesforce, Stripe, etc.)
   - Utilities (HTTP, datetime, string manipulation, etc.)
   - Productivity (Asana, Trello, Todoist, etc.)
   - Video & Media (YouTube, Vimeo, ElevenLabs, etc.)
   - E-commerce (Shopify, WooCommerce, Etsy, etc.)
   - Developer Tools (GitHub, Vercel, Sentry, etc.)
   - Other (specify new category)

3. **What authentication does it use?**
   - API Key (single field)
   - OAuth 2.0 (multi-field: client_id, client_secret, tokens)
   - Multiple API Keys (app key + app secret)
   - Database Credentials (host, port, user, password, database)
   - No authentication (public API)

4. **What are the core functions to implement?** (List 3-10 key operations)
   Examples:
   - "Send message", "Get conversations", "Update status"
   - "Create record", "Search records", "Update record", "Delete record"
   - "Upload file", "Download file", "List files"

## Step 2: Explore Existing Similar Modules

Use the Task tool with subagent_type=Explore to:

1. **Find similar modules** in the same category
   - Look at `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/{category}/`
   - Identify 2-3 modules with similar authentication patterns
   - Extract common patterns for circuit breakers and rate limiters

2. **Check credential configurations**
   - Read `/Users/kenkai/Documents/UnstableMind/b0t/src/lib/workflows/platform-configs.ts`
   - Find similar platforms in the same category
   - Note field naming conventions and validation patterns

3. **Review resilience patterns**
   - Check `/Users/kenkai/Documents/UnstableMind/b0t/src/lib/resilience.ts` for circuit breaker creation
   - Check `/Users/kenkai/Documents/UnstableMind/b0t/src/lib/rate-limiter.ts` for rate limiter patterns
   - Understand timeout and retry configurations

## Step 3: Create Module File

Create the new module file at `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/{category}/{module-name}.ts`

**File Structure Template:**

```typescript
/**
 * {Service Name} API Client with Reliability Infrastructure
 *
 * Features:
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting for API quota management
 * - Structured logging
 * - Automatic error handling
 *
 * @module {category}/{module-name}
 */

import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface {Service}Options {
  // Define all input parameters
  apiKey?: string;
  // ... other fields
}

export interface {Service}Response {
  // Define response structure
  id?: string;
  data: unknown;
  status: string;
}

// ============================================================================
// CREDENTIAL DETECTION
// ============================================================================

const hasCredentials = process.env.{SERVICE}_API_KEY !== undefined;

if (!hasCredentials) {
  logger.warn('⚠️  {Service} API credentials not set. Features will not work.');
}

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

// Initialize your API client here
// Example: export const client = hasCredentials ? new ServiceAPI({ apiKey: process.env.SERVICE_API_KEY }) : null;

// ============================================================================
// RATE LIMITER CONFIGURATION
// ============================================================================

const rateLimiter = createRateLimiter({
  maxConcurrent: 10,              // Max parallel requests
  minTime: 1000,                  // Min time between requests (ms)
  reservoir: 60,                  // Initial token count
  reservoirRefreshAmount: 60,     // Tokens added per interval
  reservoirRefreshInterval: 60000, // Refresh interval (ms)
  id: '{module-name}',
});

// ============================================================================
// INTERNAL FUNCTIONS (UNPROTECTED)
// ============================================================================

/**
 * Internal implementation of {function}
 * @param options - Function parameters
 * @returns Response data
 */
async function {function}Internal(options: {Service}Options): Promise<{Service}Response> {
  logger.info({ options }, 'Starting {function}');

  try {
    // Implementation here
    const result = await client.{method}(options);

    logger.info({ resultId: result.id }, '{Function} completed');
    return result;
  } catch (error) {
    logger.error({ error }, '{Function} failed');
    throw new Error(`{Function} failed: ${error.message}`);
  }
}

// ============================================================================
// PROTECTED EXPORTS (WITH CIRCUIT BREAKER + RATE LIMITING)
// ============================================================================

const {function}WithBreaker = createCircuitBreaker({function}Internal, {
  timeout: 15000,
  name: '{module-name}.{function}',
});

/**
 * {Brief description of what this function does}
 *
 * @param options - Function parameters
 * @returns {What it returns}
 *
 * @example
 * const result = await {function}({ apiKey: 'sk-...', param: 'value' });
 * console.log(result.data);
 */
export const {function} = withRateLimit(
  (options: {Service}Options) => {function}WithBreaker.fire(options),
  rateLimiter
);
```

**Key Requirements:**
- Use the three-layer pattern for ALL exported functions
- Add comprehensive JSDoc comments (required for auto-documentation)
- Include TypeScript interfaces for all inputs and outputs
- Handle credentials gracefully (both env vars and user-provided)
- Add structured logging at key points
- Proper error handling with clear error messages

## Step 4: Update Category Index

Edit `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/{category}/index.ts`

Add export:
```typescript
export * from './{module-name}';
```

Keep alphabetical order if possible.

## Step 5: Add Platform Configuration

Edit `/Users/kenkai/Documents/UnstableMind/b0t/src/lib/workflows/platform-configs.ts`

Add to the `PLATFORM_CONFIGS` object:

```typescript
{module_id}: {
  id: '{module_id}',
  name: '{Display Name}',
  category: '{Category}',
  icon: '{icon-name}', // optional
  fields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'sk-...',
      description: 'Your API key from {service}'
    }
    // Add more fields for multi-field credentials
  ]
}
```

**For multi-field credentials**, add multiple field objects:
```typescript
fields: [
  { key: 'client_id', label: 'Client ID', type: 'text', required: true },
  { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
  { key: 'access_token', label: 'Access Token', type: 'password', required: false }
]
```

Also update the category export in `getPlatformsByCategory()` function if needed.

## Step 6: Add Credential Analysis Support

Edit `/Users/kenkai/Documents/UnstableMind/b0t/src/lib/workflows/analyze-credentials.ts`

Add to the `PLATFORM_CAPABILITIES` object:

```typescript
{module_name}: {
  platform: '{module_id}',
  functions: {
    // Read-only operations (no credentials or optional)
    'search{Entity}': { type: 'optional' },
    'get{Entity}': { type: 'optional' },
    'list{Entity}': { type: 'optional' },

    // Write operations (require credentials)
    'create{Entity}': { type: 'api_key' }, // or 'oauth' or 'both'
    'update{Entity}': { type: 'api_key' },
    'delete{Entity}': { type: 'api_key' },
  }
}
```

**Credential types:**
- `'none'` - No credentials needed (public API)
- `'optional'` - Works better with credentials but not required
- `'api_key'` - Requires API key
- `'oauth'` - Requires OAuth token
- `'both'` - Supports both (specify `preferredType`)

## Step 7: Regenerate Module Registry

Run the module registry generator:

```bash
npm run generate:registry
```

This will:
- Scan your new module file
- Extract function signatures and JSDoc
- Update `/Users/kenkai/Documents/UnstableMind/b0t/src/lib/workflows/module-registry.ts`
- Make the module discoverable in workflows

## Step 8: Create Tests (Optional but Recommended)

Create `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/{category}/__tests__/{module-name}.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { {function} } from '../{module-name}';

describe('{module-name}', () => {
  it('should {test description}', async () => {
    // Test implementation
  });
});
```

## Step 9: Verify Integration

Run these checks:

```bash
# 1. Type checking
npm run typecheck

# 2. Linting
npm run lint

# 3. Verify module registry updated
npx tsx scripts/search-modules.ts "{module-name}"

# 4. Test the module (if tests created)
npm test -- {module-name}
```

Fix ALL errors and warnings before continuing.

## Step 10: Test in Workflow (Manual Verification)

Create a test workflow to verify:

1. Module appears in module search
2. Credential form displays correctly on credentials page
3. Workflow can execute the module functions
4. Error handling works properly
5. Results are returned correctly

**Test workflow structure:**
```json
{
  "name": "Test {Module}",
  "trigger": {
    "type": "chat-input",
    "config": {
      "fields": [
        {
          "id": "1",
          "label": "Test Input",
          "key": "input",
          "type": "text",
          "required": true
        }
      ]
    }
  },
  "steps": [
    {
      "type": "action",
      "id": "step1",
      "module": "{category}.{module-name}.{function}",
      "inputs": {
        "apiKey": "{{user.{module_id}}}",
        "param": "{{trigger.input}}"
      },
      "outputAs": "result"
    }
  ],
  "config": {
    "returnValue": "result"
  }
}
```

## Step 11: Documentation

Add a comment at the top of your module file explaining:
- What the service does
- Authentication requirements
- Rate limits (if known)
- Common use cases
- Links to official API docs

## Checklist

Before marking the task complete, verify:

- [ ] Module file created with three-layer pattern
- [ ] TypeScript interfaces defined for all inputs/outputs
- [ ] JSDoc comments added to all exported functions
- [ ] Category index.ts updated with export
- [ ] Platform config added with correct fields
- [ ] Credential analysis support added
- [ ] Module registry regenerated successfully
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Module appears in search results
- [ ] Credential form renders correctly (if applicable)
- [ ] Manual workflow test successful

## Common Pitfalls to Avoid

1. **Forgetting the three-layer pattern** - Every exported function needs circuit breaker + rate limiter
2. **Missing JSDoc** - Required for auto-documentation in module registry
3. **Inconsistent naming** - Follow existing conventions (e.g., `create{Entity}`, `get{Entity}`)
4. **No error handling** - Always wrap API calls in try/catch
5. **Hardcoded credentials** - Support both env vars AND user-provided credentials
6. **Skipping type definitions** - TypeScript interfaces are mandatory
7. **Not regenerating registry** - Must run `npm run generate:registry` after changes
8. **Ignoring lint/type errors** - Fix ALL errors before continuing

## Example Modules to Reference

- **Simple API Key**: `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/communication/email.ts`
- **OAuth**: `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/social/twitter.ts`
- **Multi-field**: `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/data/google-sheets.ts`
- **AI Service**: `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/ai/ai-sdk.ts`
- **Database**: `/Users/kenkai/Documents/UnstableMind/b0t/src/modules/data/postgresql.ts`

## Final Notes

- Use structured logging (`logger.info`, `logger.error`) at key points
- Keep functions focused and single-purpose
- Consider rate limits of the API you're integrating
- Add helpful placeholder text and descriptions in platform config
- Test error scenarios (missing credentials, API errors, timeouts)
- Follow existing code style and patterns
