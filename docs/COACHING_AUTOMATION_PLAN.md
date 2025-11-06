# Coaching Business Automation Development Plan

## Executive Summary

This plan outlines the development of comprehensive automation workflows for a coaching business powered by GoHighLevel CRM, focusing on two core workflows:
1. **Post-Webinar Attendee Processing** - Zoom attendance → GHL pipeline updates
2. **EEPA Report Generation** - Fathom transcription → AI analysis → Client report delivery

## Current State Analysis

### ✅ Existing Modules We Can Use
- **AI**: OpenAI/Anthropic SDK for multi-step LLM processing
- **Communication**: Slack (notifications), Email (Resend), Twilio (SMS backup)
- **Data**: Google Sheets (data tracking), Notion (documentation)
- **Utilities**: PDF parsing, HTTP client, file system operations
- **Video**: Whisper (transcription backup if needed)

### ❌ Missing Modules We Need to Build

#### High Priority
1. **GoHighLevel (GHL) CRM** - Core business system
2. **Zoom** - Webinar attendance data
3. **Fathom** - Call transcription and webhooks
4. **Google Docs** - Report generation and sharing
5. **PDF Generation** - Beautifully formatted client reports

#### Medium Priority
6. **MCP (Model Context Protocol)** - Tool integration framework
7. **Workflow State Management** - Long-running multi-step workflows

---

## Phase 1: Core Module Development (Weeks 1-2)

### 1.1 GoHighLevel CRM Module
**Path**: `src/modules/business/gohighlevel.ts`

**API Documentation**: https://highlevel.stoplight.io/

**Required Functions**:
```typescript
// Opportunities Management
- getOpportunity(opportunityId: string)
- updateOpportunity(opportunityId: string, data: Partial<Opportunity>)
- listOpportunities(filters: OpportunityFilters)
- updateOpportunityStage(opportunityId: string, stageId: string)

// Contacts Management
- getContact(contactId: string)
- updateContact(contactId: string, data: Partial<Contact>)
- findContactByEmail(email: string)
- addTagToContact(contactId: string, tag: string)

// Communication
- sendSMS(contactId: string, message: string)
- sendEmail(contactId: string, subject: string, body: string, attachments?: Attachment[])

// Pipeline Management
- getPipeline(pipelineId: string)
- listPipelineStages(pipelineId: string)
```

**NPM Package**: `@gohighlevel/api-client` or direct REST API with `axios`

**Environment Variables**:
```bash
GHL_API_KEY=your_api_key
GHL_LOCATION_ID=your_location_id
```

**Implementation Pattern** (following existing module structure):
```typescript
import axios from 'axios';
import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

// Rate limiter: GHL allows 100 req/min
const ghlRateLimiter = createRateLimiter({
  maxConcurrent: 5,
  minTime: 600, // ~100 req/min
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000,
  id: 'gohighlevel',
});

// Circuit breaker for resilience
const breaker = createCircuitBreaker(async (fn: Function, ...args: any[]) => {
  return await fn(...args);
}, {
  timeout: 30000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
```

---

### 1.2 Zoom Module
**Path**: `src/modules/video/zoom.ts`

**API Documentation**: https://developers.zoom.us/docs/api/

**Required Functions**:
```typescript
// Meetings
- getMeeting(meetingId: string)
- listMeetings(userId: string)

// Reports
- getMeetingParticipants(meetingId: string)
- getParticipantReport(meetingId: string) // Detailed with join/leave times
- waitForReportAvailable(meetingId: string, pollIntervalMs?: number) // Poll until ready

// Recordings (future)
- getMeetingRecordings(meetingId: string)
- downloadRecording(recordingId: string)
```

**NPM Package**: `@zoom/meetingsdk` or direct REST API

**Environment Variables**:
```bash
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

**Key Implementation Details**:
- Attendance reports can take 1-4 hours after meeting ends to be available
- Need polling mechanism with exponential backoff
- Filter participants by duration: `participant.duration >= 2400` (40 mins in seconds)
- Handle multiple join/leave events per participant (aggregate total time)

---

### 1.3 Fathom Module
**Path**: `src/modules/video/fathom.ts`

**API Documentation**: https://docs.fathom.video/docs/api-overview

**Required Functions**:
```typescript
// Transcriptions
- getTranscription(callId: string)
- waitForTranscription(callId: string, pollIntervalMs?: number)
- downloadTranscript(callId: string, format: 'txt' | 'vtt' | 'srt')

// Webhooks (receive notifications)
- verifyWebhookSignature(payload: string, signature: string)
- parseWebhookEvent(payload: unknown): FathomWebhookEvent

// Calls
- getCall(callId: string)
- listCalls(filters?: CallFilters)
```

**NPM Package**: Direct REST API with `axios`

**Environment Variables**:
```bash
FATHOM_API_KEY=your_api_key
FATHOM_WEBHOOK_SECRET=your_webhook_secret
```

**Webhook Integration**:
- Create webhook endpoint: `src/app/api/webhooks/fathom/route.ts`
- Events: `transcription.completed`, `call.ended`
- Trigger workflow when transcription ready

---

### 1.4 Google Docs Module
**Path**: `src/modules/data/google-docs.ts`

**API Documentation**: https://developers.google.com/docs/api

**Required Functions**:
```typescript
// Document Management
- createDocument(title: string)
- getDocument(documentId: string)
- updateDocument(documentId: string, content: string | GoogleDocsContent)
- appendToDocument(documentId: string, content: string)

// Formatting
- applyFormatting(documentId: string, formatting: DocumentFormatting)
- insertTable(documentId: string, rows: number, cols: number)
- insertImage(documentId: string, imageUrl: string)

// Sharing
- shareDocument(documentId: string, email: string, role: 'reader' | 'writer' | 'commenter')
- getDocumentUrl(documentId: string)
- makePublic(documentId: string)
```

**NPM Package**: `googleapis` (already installed for Calendar)

**Environment Variables**:
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

**Implementation Notes**:
- Use same OAuth flow as Calendar module
- Google Docs API uses batch requests for formatting
- Store document templates in database for reusability

---

### 1.5 PDF Generation Module (Enhanced)
**Path**: `src/modules/utilities/pdf-generate.ts`

**Current**: We have PDF parsing (`pdf-parse`)
**Need**: PDF generation with beautiful formatting

**NPM Packages** (choose one):
1. **Puppeteer** (recommended) - HTML → PDF with full CSS control
   ```bash
   npm install puppeteer
   ```
2. **PDFKit** - Programmatic PDF generation
   ```bash
   npm install pdfkit
   ```

**Required Functions**:
```typescript
// HTML to PDF (Puppeteer approach - RECOMMENDED)
- generatePdfFromHtml(html: string, options?: PdfOptions): Promise<Buffer>
- generatePdfFromTemplate(templateName: string, data: object): Promise<Buffer>

// Direct PDF generation (PDFKit approach)
- createPdf(content: PdfContent): Promise<Buffer>
- addStylesToPdf(pdf: PDFDocument, styles: PdfStyles)

interface PdfOptions {
  format?: 'A4' | 'Letter';
  margin?: { top: string; right: string; bottom: string; left: string };
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
}
```

**Template Storage**:
- Store HTML templates in `src/templates/pdf/`
- Use handlebars or similar for variable substitution
- Include company branding, styles

**Example Template Structure**:
```
src/templates/pdf/
  ├── eepa-client-report.hbs
  ├── eepa-internal-report.hbs
  └── styles/
      ├── base.css
      └── eepa.css
```

---

## Phase 2: Workflow Implementation (Weeks 3-4)

### 2.1 Workflow 1: Post-Webinar Attendee Processing

**Trigger**: Manual or scheduled (poll Zoom daily)

**Workflow Steps**:
```json
{
  "name": "Post-Webinar Attendee Processing",
  "trigger": {
    "type": "cron",
    "schedule": "0 */6 * * *"  // Every 6 hours
  },
  "config": {
    "steps": [
      {
        "name": "List Recent Meetings",
        "module": "video.zoom.listMeetings",
        "params": {
          "userId": "me",
          "type": "past",
          "pageSize": 30
        },
        "outputAs": "meetings"
      },
      {
        "name": "Filter for Webinars (last 24 hours)",
        "module": "utilities.array.filter",
        "params": {
          "array": "{{meetings}}",
          "condition": "item.topic.includes('Webinar') && item.start_time > Date.now() - 86400000"
        },
        "outputAs": "webinars"
      },
      {
        "name": "Process Each Webinar",
        "module": "utilities.control.forEach",
        "params": {
          "array": "{{webinars}}",
          "workflow": "process-single-webinar"
        }
      }
    ]
  }
}
```

**Sub-Workflow: Process Single Webinar**
```json
{
  "name": "Process Single Webinar",
  "config": {
    "steps": [
      {
        "name": "Wait for Report Availability",
        "module": "video.zoom.waitForReportAvailable",
        "params": {
          "meetingId": "{{input.meetingId}}",
          "pollIntervalMs": 300000,  // 5 minutes
          "maxWaitMs": 14400000  // 4 hours
        }
      },
      {
        "name": "Get Attendance Report",
        "module": "video.zoom.getParticipantReport",
        "params": {
          "meetingId": "{{input.meetingId}}"
        },
        "outputAs": "participants"
      },
      {
        "name": "Filter 40+ Minute Attendees",
        "module": "utilities.array.filter",
        "params": {
          "array": "{{participants}}",
          "condition": "item.duration >= 2400"
        },
        "outputAs": "qualifiedAttendees"
      },
      {
        "name": "Process Each Attendee",
        "module": "utilities.control.forEach",
        "params": {
          "array": "{{qualifiedAttendees}}",
          "steps": [
            {
              "name": "Find Contact in GHL",
              "module": "business.gohighlevel.findContactByEmail",
              "params": {
                "email": "{{item.email}}"
              },
              "outputAs": "contact"
            },
            {
              "name": "Get Opportunity",
              "module": "business.gohighlevel.listOpportunities",
              "params": {
                "contactId": "{{contact.id}}",
                "status": "open"
              },
              "outputAs": "opportunities"
            },
            {
              "name": "Update Pipeline Stage",
              "module": "business.gohighlevel.updateOpportunityStage",
              "params": {
                "opportunityId": "{{opportunities[0].id}}",
                "stageId": "attended_webinar"
              }
            },
            {
              "name": "Add Tag",
              "module": "business.gohighlevel.addTagToContact",
              "params": {
                "contactId": "{{contact.id}}",
                "tag": "webinar-attended-40min"
              }
            }
          ]
        }
      },
      {
        "name": "Notify Team",
        "module": "communication.slack.postMessage",
        "params": {
          "channel": "#coaching-team",
          "text": "✅ Processed {{qualifiedAttendees.length}} qualified attendees from webinar '{{input.topic}}'"
        }
      }
    ]
  }
}
```

---

### 2.2 Workflow 2: EEPA Report Generation

**Trigger**: Fathom webhook (`transcription.completed`)

**Webhook Endpoint**: `src/app/api/webhooks/fathom/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflowConfig } from '@/lib/workflows/executor';
import { verifyWebhookSignature } from '@/modules/video/fathom';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('x-fathom-signature');

  // Verify webhook is from Fathom
  if (!verifyWebhookSignature(payload, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(payload);

  if (event.type === 'transcription.completed') {
    // Trigger EEPA workflow
    const workflow = await getWorkflowByName('EEPA Report Generation');
    await executeWorkflowConfig(workflow.config, 'system', {
      callId: event.data.callId,
      transcriptionUrl: event.data.transcriptionUrl
    });
  }

  return NextResponse.json({ received: true });
}
```

**Workflow Configuration**:
```json
{
  "name": "EEPA Report Generation",
  "trigger": {
    "type": "webhook",
    "source": "fathom"
  },
  "config": {
    "steps": [
      {
        "name": "Get Transcription",
        "module": "video.fathom.getTranscription",
        "params": {
          "callId": "{{input.callId}}"
        },
        "outputAs": "transcript"
      },
      {
        "name": "Extract Client Information",
        "module": "ai.aiSdk.chat",
        "params": {
          "model": "claude-3-5-sonnet-20241022",
          "systemPrompt": "You are an expert at extracting structured client information from coaching call transcripts. Extract: client name, key challenges, goals, current situation, and any action items mentioned.",
          "userPrompt": "Extract client information from this EEPA call transcript:\n\n{{transcript.text}}",
          "temperature": 0.3
        },
        "outputAs": "clientInfo"
      },
      {
        "name": "Generate Internal Report",
        "module": "ai.aiSdk.chat",
        "params": {
          "model": "claude-3-5-sonnet-20241022",
          "systemPrompt": "You are a coaching report specialist. Create a detailed internal report for the coaching team based on the extracted client information. Include: assessment summary, key insights, recommended next steps, potential red flags, and coaching opportunities.",
          "userPrompt": "Create an internal report based on:\n\n{{clientInfo}}",
          "temperature": 0.5
        },
        "outputAs": "internalReport"
      },
      {
        "name": "Create Internal Google Doc",
        "module": "data.googleDocs.createDocument",
        "params": {
          "title": "EEPA Internal - {{clientInfo.clientName}} - {{utilities.datetime.now}}"
        },
        "outputAs": "internalDoc"
      },
      {
        "name": "Write Internal Report Content",
        "module": "data.googleDocs.updateDocument",
        "params": {
          "documentId": "{{internalDoc.id}}",
          "content": "{{internalReport}}"
        }
      },
      {
        "name": "Share with Team",
        "module": "data.googleDocs.shareDocument",
        "params": {
          "documentId": "{{internalDoc.id}}",
          "email": "team@yourcompany.com",
          "role": "writer"
        }
      },
      {
        "name": "Notify Team - Review Needed",
        "module": "communication.slack.postMessage",
        "params": {
          "channel": "#eepa-reports",
          "text": "📋 Internal EEPA report ready for review: {{clientInfo.clientName}}",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "*EEPA Internal Report Ready*\n\n*Client:* {{clientInfo.clientName}}\n*Call Date:* {{transcript.callDate}}\n\n<{{internalDoc.url}}|View Report>"
              }
            },
            {
              "type": "actions",
              "elements": [
                {
                  "type": "button",
                  "text": { "type": "plain_text", "text": "Approve & Generate Client Report" },
                  "action_id": "approve_eepa_report",
                  "value": "{{internalDoc.id}}"
                }
              ]
            }
          ]
        }
      },
      {
        "name": "Wait for Approval",
        "module": "utilities.control.waitForEvent",
        "params": {
          "eventType": "slack_button_click",
          "eventId": "approve_eepa_report",
          "timeoutMs": 86400000  // 24 hours
        },
        "outputAs": "approval"
      },
      {
        "name": "Generate Client Report",
        "module": "ai.aiSdk.chat",
        "params": {
          "model": "claude-3-5-sonnet-20241022",
          "systemPrompt": "You are creating a client-facing EEPA report. The report should be professional, encouraging, and actionable. Focus on: their current situation, key insights from the session, personalized action plan, and next steps. Use a warm but professional tone.",
          "userPrompt": "Create a client-facing EEPA report based on the internal analysis:\n\nClient Info: {{clientInfo}}\nInternal Report: {{internalReport}}\n\nMake it personalized and motivating.",
          "temperature": 0.7
        },
        "outputAs": "clientReport"
      },
      {
        "name": "QA Check Against Transcript",
        "module": "ai.aiSdk.chat",
        "params": {
          "model": "claude-3-5-sonnet-20241022",
          "systemPrompt": "You are a quality assurance specialist. Compare the client report against the original transcript. Identify any factual errors, misrepresentations, or missing important points. If issues found, provide specific corrections. If no issues, respond with 'APPROVED'.",
          "userPrompt": "Original Transcript:\n{{transcript.text}}\n\nClient Report:\n{{clientReport}}\n\nPerform QA check.",
          "temperature": 0.2
        },
        "outputAs": "qaResults"
      },
      {
        "name": "Apply QA Fixes (if needed)",
        "module": "utilities.control.conditional",
        "params": {
          "condition": "{{qaResults}} !== 'APPROVED'",
          "then": [
            {
              "name": "Apply Corrections",
              "module": "ai.aiSdk.chat",
              "params": {
                "model": "claude-3-5-sonnet-20241022",
                "systemPrompt": "Apply the QA corrections to the client report while maintaining tone and structure.",
                "userPrompt": "Original Report:\n{{clientReport}}\n\nCorrections Needed:\n{{qaResults}}\n\nApply corrections.",
                "temperature": 0.3
              },
              "outputAs": "clientReport"
            }
          ]
        }
      },
      {
        "name": "Create Client Google Doc",
        "module": "data.googleDocs.createDocument",
        "params": {
          "title": "EEPA Report - {{clientInfo.clientName}}"
        },
        "outputAs": "clientDoc"
      },
      {
        "name": "Write Client Report Content",
        "module": "data.googleDocs.updateDocument",
        "params": {
          "documentId": "{{clientDoc.id}}",
          "content": "{{clientReport}}"
        }
      },
      {
        "name": "Notify Team - Client Report Ready",
        "module": "communication.slack.postMessage",
        "params": {
          "channel": "#eepa-reports",
          "text": "✅ Client EEPA report ready for final review: {{clientInfo.clientName}}\n<{{clientDoc.url}}|View Client Report>",
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "*Client EEPA Report Ready*\n\n*Client:* {{clientInfo.clientName}}\n\n<{{clientDoc.url}}|View Client Report>"
              }
            },
            {
              "type": "actions",
              "elements": [
                {
                  "type": "button",
                  "text": { "type": "plain_text", "text": "✅ Approve & Send to Client" },
                  "action_id": "approve_send_client_report",
                  "style": "primary",
                  "value": "{{clientDoc.id}}"
                }
              ]
            }
          ]
        }
      },
      {
        "name": "Wait for Final Approval",
        "module": "utilities.control.waitForEvent",
        "params": {
          "eventType": "slack_button_click",
          "eventId": "approve_send_client_report",
          "timeoutMs": 86400000
        }
      },
      {
        "name": "Generate Beautiful PDF",
        "module": "utilities.pdfGenerate.generatePdfFromTemplate",
        "params": {
          "templateName": "eepa-client-report",
          "data": {
            "clientName": "{{clientInfo.clientName}}",
            "reportDate": "{{utilities.datetime.now}}",
            "content": "{{clientReport}}",
            "coachName": "Your Coach Name",
            "companyLogo": "https://yourcompany.com/logo.png"
          }
        },
        "outputAs": "pdfBuffer"
      },
      {
        "name": "Upload PDF to GHL",
        "module": "business.gohighlevel.uploadFile",
        "params": {
          "file": "{{pdfBuffer}}",
          "filename": "EEPA-Report-{{clientInfo.clientName}}.pdf"
        },
        "outputAs": "uploadedFile"
      },
      {
        "name": "Get GHL Contact",
        "module": "business.gohighlevel.findContactByEmail",
        "params": {
          "email": "{{clientInfo.email}}"
        },
        "outputAs": "ghlContact"
      },
      {
        "name": "Send via GHL Email",
        "module": "business.gohighlevel.sendEmail",
        "params": {
          "contactId": "{{ghlContact.id}}",
          "subject": "Your EEPA Assessment Report",
          "body": "Hi {{clientInfo.clientName}},\n\nThank you for completing your EEPA assessment with us! Attached is your personalized report with insights and action steps.\n\nWe're excited to support you on this journey!\n\nBest regards,\nYour Coaching Team",
          "attachments": [
            {
              "url": "{{uploadedFile.url}}",
              "filename": "EEPA-Report.pdf"
            }
          ]
        }
      },
      {
        "name": "Send via GHL SMS",
        "module": "business.gohighlevel.sendSMS",
        "params": {
          "contactId": "{{ghlContact.id}}",
          "message": "Hi {{clientInfo.clientName}}! Your EEPA report is ready. Check your email for your personalized assessment and action plan. 🎯"
        }
      },
      {
        "name": "Final Team Notification",
        "module": "communication.slack.postMessage",
        "params": {
          "channel": "#eepa-reports",
          "text": "🎉 EEPA report sent to client: {{clientInfo.clientName}}\n\n✅ Email sent\n✅ SMS sent\n\n<{{clientDoc.url}}|View Report> | <{{internalDoc.url}}|View Internal Notes>"
        }
      }
    ]
  }
}
```

---

## Phase 3: Advanced Features (Weeks 5-6)

### 3.1 MCP (Model Context Protocol) Integration

**What is MCP?**
- Anthropic's protocol for LLM tool integration
- Allows Claude to use external tools dynamically
- More flexible than hardcoded modules

**Implementation**:
```typescript
// src/lib/mcp/server.ts
import { MCPServer } from '@anthropic/mcp';

export const mcpServer = new MCPServer({
  tools: [
    {
      name: 'ghl_update_opportunity',
      description: 'Update a GoHighLevel opportunity',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: { type: 'string' },
          stageId: { type: 'string' }
        }
      },
      handler: async (params) => {
        // Call GHL module
        return await gohighlevel.updateOpportunityStage(params);
      }
    }
    // ... more tools
  ]
});
```

**Benefits**:
- Claude can choose tools dynamically based on context
- Easier to add new tools without workflow changes
- Natural language → tool calls

---

### 3.2 Workflow State Management

**Problem**: Long-running workflows need to persist state across restarts

**Solution**: Add workflow state table
```typescript
// src/lib/schema.ts
export const workflowState = pgTable('workflow_state', {
  id: text('id').primaryKey(),
  workflowRunId: text('workflow_run_id').references(() => workflowRuns.id),
  currentStep: integer('current_step'),
  state: jsonb('state'), // Store step outputs
  waitingFor: text('waiting_for'), // Event type waiting for
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

**Usage**:
- Save state after each step
- Resume workflows after server restart
- Enable "wait for event" steps (e.g., Slack button clicks)

---

### 3.3 Workflow Templates & Marketplace

**User-friendly workflow library**:
```typescript
// src/lib/workflows/templates/
export const eepaReportTemplate = {
  name: 'EEPA Report Generation',
  description: 'Generate client reports from coaching call transcriptions',
  category: 'coaching',
  requiredCredentials: ['fathom', 'gohighlevel', 'google', 'slack'],
  configurable: [
    { key: 'slack.channel', label: 'Slack Channel', type: 'text' },
    { key: 'ai.model', label: 'AI Model', type: 'select', options: ['claude-3-5-sonnet', 'gpt-4'] }
  ],
  config: { /* workflow config */ }
};
```

**UI**: Browse, preview, and install templates with one click

---

## Phase 4: Testing & Production (Week 7-8)

### 4.1 Module Testing

**Create test files for each module**:
```bash
src/modules/business/__tests__/gohighlevel.test.ts
src/modules/video/__tests__/zoom.test.ts
src/modules/video/__tests__/fathom.test.ts
src/modules/data/__tests__/google-docs.test.ts
```

**Test approach**:
- Unit tests with mocked API responses
- Integration tests with test accounts
- End-to-end workflow tests

**Run tests**:
```bash
npm run test:modules
```

---

### 4.2 Environment Setup

**Required API Keys**:
```bash
# GoHighLevel
GHL_API_KEY=
GHL_LOCATION_ID=

# Zoom
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# Fathom
FATHOM_API_KEY=
FATHOM_WEBHOOK_SECRET=

# Google (Docs, Drive)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Slack (already configured)
SLACK_BOT_TOKEN=

# OpenAI/Anthropic (already configured)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

---

### 4.3 Production Deployment

**Infrastructure Requirements**:
- PostgreSQL (already on Railway)
- Redis (already on Railway)
- File storage for PDFs (add Cloudinary or S3)
- Webhook endpoint accessible from internet

**Scaling Considerations**:
- BullMQ for long-running workflows
- Circuit breakers prevent cascade failures
- Rate limiters prevent API quota exhaustion
- Logging for debugging and monitoring

---

## Libraries & Dependencies Summary

### New NPM Packages to Install

```bash
# GoHighLevel (if SDK exists, otherwise use axios)
npm install axios  # Already installed

# Zoom
npm install @zoom/meetingsdk
# OR direct API with axios

# Google Docs (already have googleapis)
# Already installed for Calendar

# PDF Generation
npm install puppeteer
npm install handlebars  # For templates

# MCP (future)
npm install @anthropic/mcp

# Testing
npm install @testing-library/jest-dom vitest
```

---

## Development Roadmap

### Week 1: Foundation
- [ ] Create GoHighLevel module
- [ ] Create Zoom module
- [ ] Set up API credentials
- [ ] Test basic API calls

### Week 2: Core Modules
- [ ] Create Fathom module
- [ ] Create Google Docs module
- [ ] Enhance PDF generation module
- [ ] Set up Fathom webhook endpoint

### Week 3: Workflow 1
- [ ] Build post-webinar workflow
- [ ] Implement Zoom report polling
- [ ] Test GHL opportunity updates
- [ ] Add Slack notifications

### Week 4: Workflow 2 (Part 1)
- [ ] Build EEPA transcript ingestion
- [ ] Implement multi-step AI prompts
- [ ] Create Google Docs for reports
- [ ] Set up team review workflow

### Week 5: Workflow 2 (Part 2)
- [ ] Build QA check system
- [ ] Create PDF templates
- [ ] Implement GHL email/SMS delivery
- [ ] Add workflow state management

### Week 6: Polish & Testing
- [ ] Write comprehensive tests
- [ ] Add error handling
- [ ] Create workflow templates
- [ ] Document setup process

### Week 7: Production
- [ ] Deploy to production
- [ ] Set up monitoring
- [ ] Train team on workflows
- [ ] Create runbooks

### Week 8: Optimization
- [ ] Performance tuning
- [ ] Add analytics
- [ ] Gather feedback
- [ ] Iterate on improvements

---

## Success Metrics

**Workflow 1: Post-Webinar Processing**
- Time saved: ~2 hours per webinar → 5 minutes
- Accuracy: 100% (vs manual errors)
- Speed: Opportunities updated within 6 hours of webinar

**Workflow 2: EEPA Report Generation**
- Time saved: ~3-4 hours per report → 20 minutes
- Quality: AI-generated with QA check
- Delivery: Same-day report delivery to clients

**Overall**
- 10+ hours saved per week
- Faster client turnaround
- Consistent report quality
- Scalable automation infrastructure

---

## Next Steps

1. **Review this plan** with your team
2. **Prioritize** workflows (which one first?)
3. **Gather API credentials** for services
4. **Set up test accounts** for Zoom, GHL, Fathom
5. **Start with Week 1 tasks**

Ready to begin? Let me know which workflow you'd like to tackle first, and I'll start building the modules!
