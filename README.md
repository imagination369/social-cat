# b0t

**Workflow automation, but you just describe what you want and it happens.**

No drag-and-drop builders. No wiring nodes together. No watching tutorial videos to figure out where the "Add Filter" button is. Just chat with AI, and boom—your automation is running.

---

## What is this?

b0t is a workflow automation platform where you create automations by talking to an AI. You know how Zapier makes you click through 47 dropdown menus to connect your apps? Or how n8n has that visual editor that looks cool in screenshots but turns into spaghetti after your 8th node?

Yeah, we skip all that.

**You:** "Hey, can you check Reddit's r/singularity every morning and send me the top posts?"

**AI:** "Done. Want me to filter by engagement score?"

**You:** "Sure."

**AI:** "Cool, it's scheduled for 9am daily."

That's it. That's the entire UX.

---

## Why should you care?

If you've used Zapier, n8n, or Make.com, you know the pain:

**The Zapier problem:** Easy to start, but you're clicking through endless menus, the pricing gets absurd (looking at you, "tasks"), and god forbid you need to do something complex like a loop.

**The n8n problem:** Powerful and self-hostable, which is great. But the learning curve is steep, you need to understand APIs and JavaScript, and setting it up feels like configuring a server in 2005.

**The Make problem:** The visual editor is pretty, but you're still manually wiring things together. And good luck explaining your workflow to someone else when it looks like a bowl of spaghetti.

**b0t's approach:** Chat interface. That's it. The AI figures out the technical details. You get n8n's power with Zapier's ease of use, minus the part where either company holds your wallet hostage.

---

## Okay, but how does it actually work?

You describe what you want in plain English. The AI (Claude) reads through 900+ available functions across 140 modules, generates a workflow JSON, validates it, and saves it to your dashboard.

Then you can:
- Run it manually (click a button)
- Schedule it (cron jobs)
- Trigger it via webhook (external services)
- Connect it to a Telegram/Discord bot (because why not)
- Have it respond to chat messages (conversational automations)

**Example workflow created via chat:**

```
User: "I want to monitor GitHub trending repos and post the top JavaScript ones to Slack daily"

AI generates this behind the scenes:
1. Fetch trending repos from GitHub
2. Filter by language = JavaScript
3. Rank by stars
4. Select top 5
5. Format as message
6. Post to Slack #tech-news channel
7. Schedule for 9am daily
```

**You see:** "Workflow created! Want to test it now?"

**What you don't see:** The AI choosing the right modules, mapping data between steps, setting up rate limiting, adding error handling, configuring the cron schedule.

---

## Features (the stuff that actually matters)

### Chat-Based Creation
Describe your automation in natural language. The AI handles module discovery, parameter mapping, error handling, scheduling—all of it. You review and approve.

### 900+ Functions Across 140 Modules
Not "integrations with apps." Actual functions you can compose:

- **Communication:** Slack, Discord, Telegram, Email, WhatsApp, Twilio, Intercom, Zendesk
- **Social Media:** Twitter, YouTube, Reddit, Instagram, GitHub, TikTok
- **AI:** OpenAI (GPT-4), Anthropic (Claude), Cohere, HuggingFace, vector databases
- **Data:** PostgreSQL, MongoDB, MySQL, Google Sheets, Airtable, Notion
- **E-commerce:** Shopify, WooCommerce, Amazon Seller Partner, Etsy, eBay, Square
- **Business Tools:** Salesforce, HubSpot, QuickBooks, Stripe, DocuSign
- **Developer Tools:** GitHub Actions, Vercel, Netlify, Sentry, Datadog
- **Video/Audio:** ElevenLabs, HeyGen, Runway, Synthesia, Cloudinary, Vimeo
- **Lead Generation:** Apollo, Clearbit, Hunter, ZoomInfo
- **Utilities:** HTTP, web scraping, RSS, CSV, JSON transforms, image processing, PDF generation, encryption, compression, date/time, validation, scoring, batching... (250+ utility functions)

And here's the kicker: if we don't have a specific integration, you can use the HTTP module to call any API. The AI knows how to do it.

### Production-Ready (Not a Toy)
Every module includes:
- **Circuit breakers** - APIs go down. We handle it gracefully.
- **Rate limiting** - Respect API limits automatically (Twitter: 300/15min, OpenAI: 500/min, etc.)
- **Automatic retries** - Transient failures get 3 attempts with exponential backoff.
- **Structured logging** - Know exactly what happened and when.
- **Encryption** - All API keys/tokens encrypted with AES-256.

This isn't a weekend project. It's built like you'd build production infrastructure.

### Real-Time Execution Monitoring
See your workflows run in real-time with progress bars, step-by-step status, and formatted results. When something fails, you get actual error messages, not "Something went wrong."

![Activity Page](activitypage.png)
*Real-time execution monitoring with detailed history and error tracking*

### Smart Output Formatting
Results aren't just dumped as JSON. The AI formats them as tables, markdown, lists, or galleries depending on what makes sense. Trending GitHub repos? Table. YouTube video search? Gallery. Reddit posts? Markdown list with metadata.

### Self-Hosted or Cloud
Run it on your laptop, your server, or deploy to Railway/Vercel in 5 minutes. You own your data. No vendor lock-in. Export your workflows as JSON, commit them to git, share them with your team.

### Multi-Tenant Architecture
Built for agencies and teams. Manage automations for multiple clients/organizations with isolated credentials, execution history, and permissions. Role-based access control out of the box.

![Workflow Management](workflowpage.png)
*Workflow dashboard with status tracking, triggers, and execution controls*

![Client Management](clientpage.png)
*Multi-tenant client management with organization-level isolation*

![Credentials](credentialspage.png)
*Secure credential management with AES-256 encryption*

---

## The Comparison Table (because you're thinking it)

|  | b0t | Zapier | n8n | Make.com |
|---|-----|--------|-----|----------|
| **How you build** | Chat with AI | Click through forms | Drag-and-drop nodes | Visual flowchart |
| **Learning curve** | None (it's chat) | Low | High (technical) | Medium |
| **Time to first workflow** | 2 minutes | 5 minutes | 30-60 minutes | 10 minutes |
| **Complexity you can handle** | Very high | Low | Very high | High |
| **Self-hosting** | Yes (easy setup) | No | Yes (complex setup) | No |
| **Pricing model** | Per workflow execution | Per "task" (confusing) | Per execution OR self-host | Per operation |
| **Loops & conditionals** | Full programming logic | Basic filters | Advanced logic | Good routing |
| **Custom code** | TypeScript modules | No | JavaScript/Python | Limited |
| **Cost (100 workflows/day)** | ~$15/month self-hosted | $29-75/month | $20/month cloud OR self-host | $9-29/month |
| **Version control** | Git-friendly JSON | No | JSON exports | Limited |
| **Workflow modification** | Chat: "change X to Y" | Re-click everything | Edit nodes manually | Rewire visually |
| **AI integration** | Deep (Claude generates workflows) | Add-on | Manual setup | Manual setup |
| **Open source** | AGPL-3.0 | No | Fair-code | No |

**TL;DR:** If you want easy, go Zapier (but bring your credit card). If you want powerful, go n8n (but bring your DevOps skills). If you want both, you're in the right place.

---

## Real-World Examples (things people actually automate)

**Content Creator:**
> "Every morning, fetch trending YouTube videos in my niche, analyze them with AI, and send me a summary with which topics are hot."

**Developer:**
> "Monitor my GitHub repos for new issues, categorize them with AI, post to Discord, and create tasks in Notion."

**E-commerce:**
> "When a Shopify order comes in, send a personalized thank-you email, add customer to my CRM, and post the sale to our Slack #wins channel."

**Marketer:**
> "Scrape competitor blog posts weekly, summarize with AI, check if we've covered those topics, and email me gaps in our content."

**Community Manager:**
> "Watch Reddit/Twitter for brand mentions, filter out spam with AI, reply to questions automatically, and escalate complaints to human review."

---

## Quick Start

**Prerequisites:** Node.js 20+, Docker Desktop

```bash
git clone https://github.com/kenkai/b0t.git
cd b0t
npm run setup
```

That script handles everything: dependencies, Docker containers (PostgreSQL + Redis), database setup, environment config. When it's done:

```bash
npm run dev
```

Open http://localhost:3000, log in (admin@b0t.dev / admin), and start chatting.

**First workflow:** Try asking the AI to "fetch trending GitHub repos and show them in a table." Watch it generate, validate, and execute a multi-step workflow in seconds.

**Full setup guide:** [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

---

## Architecture (for the nerds)

**Stack:**
- Next.js 15 + React 19 (App Router, Server Actions, streaming UI)
- PostgreSQL 16 (workflows, credentials, execution history)
- Redis 7 (BullMQ job queue for concurrent execution)
- TypeScript (everything is typed)
- Drizzle ORM (type-safe queries, auto-migrations)
- Tailwind + shadcn/ui (modern, accessible components)
- Claude/GPT-4 (workflow generation via AI SDK)
- Opossum (circuit breakers) + Bottleneck (rate limiting)
- Pino (structured logging)
- NextAuth v5 (authentication)
- CASL (role-based permissions)

**Module Architecture:**

Every integration is a TypeScript module exporting pure functions. Example:

```typescript
// src/modules/social/reddit.ts
export async function getSubredditPosts(
  subreddit: string,
  sort: 'hot' | 'new' | 'top' = 'hot',
  limit: number = 25
): Promise<RedditPost[]> {
  // Wrapped with circuit breaker + rate limiter + logging
  // Returns typed, validated data
}
```

Modules are auto-discovered. The AI reads a 3,300-line registry documenting every function, its signature, parameters, and examples. When you ask for something, it knows exactly which functions to use.

**Execution Flow:**

```
Chat message → Claude → Workflow JSON → Validation → BullMQ Queue → Worker Pool (10 concurrent) → Step-by-step execution → Results
```

**Performance:**
- **Execution speed:** 100-500ms for simple workflows (3-5x faster than n8n)
- **Concurrency:** 10-40 workflows simultaneously (configurable)
- **Memory:** 300-500MB typical (vs 1-2GB for n8n)
- **Scaling:** Horizontal via Redis-backed queue

---

## Roadmap (what's coming)

This is a living project. Here's what's next:

- [ ] Workflow marketplace (share/discover community workflows)
- [ ] More integrations (Microsoft Suite, Monday.com, ClickUp, Google Analytics)
- [ ] Workflow templates (industry-specific starter packs)
- [ ] Visual workflow editor (for those who want it)
- [ ] Hosted version (cloud offering with managed infrastructure)
- [ ] Mobile app (manage workflows on the go)
- [ ] Workflow analytics (execution metrics, cost tracking, bottleneck detection)
- [ ] Team collaboration features (comments, approvals, shared workspaces)

---

## Contributing

This is an open-source project (AGPL-3.0). Contributions are welcome.

**Ways to contribute:**
- Build new modules (we need more integrations!)
- Improve documentation
- Report bugs or request features
- Share workflows you've created
- Help answer questions in Discussions

**Adding a module:**

1. Create `/src/modules/[category]/[service].ts`
2. Export typed functions with circuit breakers + rate limiting
3. Document in `/src/lib/workflows/module-registry.ts`
4. Add tests
5. Submit PR

Check out [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Who built this?

Made by **Ken Kai** ([Ken Kai does AI](https://x.com/kenkaidoesai)) - mostly because I was tired of clicking through Zapier menus and wanted to just tell a computer what to do.

Started as a weekend project. Turned into 60,000+ lines of production-grade automation infrastructure. Now it's yours.

---

## License

**AGPL-3.0**

Open source. Self-hostable. No vendor lock-in. Fork it, modify it, deploy it, sell services with it. Just keep it open source (that's the AGPL part).

---

## Support & Community

- **Docs:** [Full documentation](./docs/)
- **Issues:** [GitHub Issues](https://github.com/kenkai/b0t/issues)
- **Discussions:** [GitHub Discussions](https://github.com/kenkai/b0t/discussions)
- **Twitter:** [@kenkaidoesai](https://x.com/kenkaidoesai)

---

## One More Thing

If you've read this far, you're probably thinking "this sounds too good to be true."

Fair. Here's the catch: it's early. Bugs exist. Some integrations need polish. The AI sometimes generates workflows that need tweaking. It's not as plug-and-play as Zapier (yet).

But here's what it **is**: a fundamentally different way to think about automation. One where you describe intent and the computer figures out implementation. Where you don't need to learn a visual editor or memorize API docs.

Try it. Break it. Tell me what's wrong. Let's build something better than the status quo.

---

**Star this repo if you find it useful. Seriously, it helps.**
