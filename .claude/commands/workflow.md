---
name: workflow
description: Generate and execute a custom workflow from natural language description
---

## Pre-Flight Checklist

**Before writing ANY code:**

1. **Identify trigger type from user's words:**
   - "chat"/"chatbot" → `chat` (use `ai.ai-sdk.chat` module)
   - "schedule"/"daily"/"cron" → `cron`
   - "webhook"/"API" → `webhook`
   - "telegram bot" → `telegram`
   - "discord bot" → `discord`
   - Default → `manual`

2. **Remember:** `trigger` goes at TOP LEVEL (same level as `config`, NOT inside it)

## Core Rules

1. **Match user request exactly** - Don't simplify or remove features
2. **Debug, don't simplify** - Fix errors, never create "simpler versions"
3. **Parse trigger first** - Identify trigger type BEFORE searching modules

## Scripts Reference

```bash
# Module search
npx tsx scripts/search-modules.ts "keyword"
npx tsx scripts/search-modules.ts --category ai

# Workflow lifecycle
npx tsx scripts/validate-workflow.ts /tmp/workflow.json
npx tsx scripts/test-workflow.ts /tmp/workflow.json [--dry-run]
npx tsx scripts/import-workflow.ts /tmp/workflow.json
npx tsx scripts/list-workflows.ts [--status active] [--trigger chat]
```

## JSON Structure

```json
{
  "version": "1.0",
  "name": "Workflow Name",
  "description": "What it does",
  "trigger": {                                    // ⚠️ TOP LEVEL!
    "type": "manual|chat|cron|webhook|telegram|discord",
    "config": {
      "inputVariable": "userMessage"             // Required for chat
    }
  },
  "config": {
    "steps": [{
      "id": "step1",
      "module": "category.module.function",      // e.g. "ai.ai-sdk.chat"
      "inputs": { /* params */ },
      "outputAs": "varName"                      // Optional
    }]
  },
  "metadata": {
    "requiresCredentials": ["openai", "telegram_bot_token"]
  }
}
```

**Key Points:**
- `trigger` at **top level** (NOT inside `config`)
- Module paths: lowercase `category.module.function`
- Variables: `{{varName}}` or `{{data.field[0].nested}}`
- Chat trigger: Use `ai.ai-sdk.chat` with `messages` array (see below)

## Chat Workflows (Special Case)

For chat triggers, use `ai.ai-sdk.chat` with `messages` array:

```json
{
  "trigger": {
    "type": "chat",
    "config": { "inputVariable": "userMessage" }
  },
  "config": {
    "steps": [{
      "id": "chat",
      "module": "ai.ai-sdk.chat",
      "inputs": {
        "messages": [
          { "role": "system", "content": "System prompt" },
          { "role": "user", "content": "{{trigger.userMessage}}" }
        ],
        "model": "gpt-4o-mini",
        "provider": "openai"
      }
    }]
  }
}
```

## Creation Steps

1. **Search modules:** `npx tsx scripts/search-modules.ts "keyword"`
2. **Write JSON** to `/tmp/workflow.json` with Write tool
3. **Validate:** `npx tsx scripts/validate-workflow.ts /tmp/workflow.json`
4. **Dry run:** `npx tsx scripts/test-workflow.ts /tmp/workflow.json --dry-run` (for complex workflows)
5. **Test:** `npx tsx scripts/test-workflow.ts /tmp/workflow.json`
6. **Import:** `npx tsx scripts/import-workflow.ts /tmp/workflow.json`

## Error Handling

- ✅ **Fix yourself:** Module paths, variable refs, type errors
- ⚠️ **User must fix:** Missing API keys → Tell them: http://localhost:3000/settings/credentials
- **Never simplify** - Debug the actual issue, don't remove features

## Function Parameters

**Some modules need `params` wrapper, others don't:**

```json
// With params wrapper
{ "module": "utilities.scoring.rankByField", "inputs": { "params": {...} }}
{ "module": "data.database.query", "inputs": { "params": {...} }}

// Without wrapper
{ "module": "utilities.array-utils.pluck", "inputs": { "arr": [...], "key": "id" }}
{ "module": "utilities.datetime.now", "inputs": {} }
```

**Check module search output** - signature `fn({ param })` = needs wrapper, `fn(arg1, arg2)` = no wrapper

## Output Display (Optional)

**Last step output MUST match display type:**

- `table` → Array of objects `[{name: "John"}, ...]`
- `list` → Array of primitives `["item1", "item2"]`
- `text`/`markdown` → String
- `json` → Any type (default)

**Common issue:** `average()` returns number → Use `type: "json"` not `"table"`
**Validation scripts will catch mismatches**
