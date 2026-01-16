# API Routes Documentation - Complete Reference

This document provides a comprehensive explanation of every folder and code file in the `app/api/` directory of the Next.js contact center application.

## Directory Structure Overview

```
app/api/
├── agent-flows/          # Agent Builder - visual flow creation
├── agents/               # Agent management and processing
├── automation/           # Automation system (events, inbox, dispatcher)
├── back-office/          # Back-office case management
├── calls/                # Call management and analysis
├── cases/                # Case management
├── connectivity/         # Connectivity status and verification
├── conversations/        # Conversation management
├── debug/                # Debug and diagnostic endpoints
├── email/                # Email handling (incoming, sending, webhooks)
├── integrations/         # External integrations management
├── knowledge/            # Knowledge base search
├── outbound/             # Outbound campaigns and jobs
└── twilio/               # Twilio integration (calls, SMS, WhatsApp)
└── vapi/                 # Vapi AI voice integration
```

---

## 1. `/api/agents/` - Agent Management

### 1.1 `agents/status/route.ts` ⚠️ **REMOVED**

**Status:** This route has been **permanently removed** as part of the FastAPI-only backend migration (Option 2).

**Reason for Removal:**
- Agent status functionality not required for chat demo
- Removes dependency on `SUPABASE_SERVICE_ROLE_KEY` in Next.js
- Aligns with FastAPI-only backend architecture
- UI now uses local state only (no persistence)

**Previous Functionality (for reference):**
- **GET** `/api/agents/status?agentId={id}` - Fetched agent info and queue counts
- **PATCH** `/api/agents/status` - Updated agent status in database

**Current Behavior:**
- Agent status is managed in local state only (UI-only)
- Status dropdown changes UI appearance but does not persist
- Queue counts are static demo values
- No network requests to this endpoint (route no longer exists)

**File:** `app/api/agents/status/route.ts` - **DELETED**

---

### 1.2 `agents/performance/route.ts`

**Purpose:** Calculates and returns comprehensive agent performance metrics.

**Endpoint:**

**GET `/api/agents/performance`**
- Requires: Automation admin permissions
- Fetches all agents and calculates performance metrics
- Returns array of agents with performance data

**Metrics Calculated:**
- **Core Metrics:**
  - Total conversations handled
  - Resolved conversations count
  - Resolution rate (percentage)
  - Average handle time (from calls)
  - Active conversations

- **Quality Metrics:**
  - Average quality score (from call analysis)
  - CSAT (Customer Satisfaction Score)
  - Average sentiment score

- **Operational Metrics:**
  - Escalation rate
  - Issue resolution rate
  - Customer frustration rate

- **Distribution:**
  - Channel distribution (voice, chat, email, whatsapp)
  - Priority distribution (urgent, high, medium, low)

- **Overall Score:**
  - Weighted performance score combining all metrics

**Data Sources:**
- `agents` table
- `conversations` and `cc_conversations` tables
- `calls` table
- `cc_call_analysis` table

**Code Flow:**
1. Fetches all agents
2. Fetches conversations assigned to each agent
3. Fetches calls for each agent
4. Fetches call analysis data
5. Calculates metrics for each agent
6. Sorts by performance score (descending)

---

### 1.3 `agents/process/route.ts`

**Purpose:** Processes messages through the LangGraph AI agent workflow.

**Endpoint:**

**POST `/api/agents/process`**
- Body: `{ conversationId, message, messageId?, customerInfo?, channel?, metadata? }`
- Processes message through LangGraph workflow
- **Idempotent:** Can be called multiple times with same messageId

**Code Flow:**
1. Validates required fields (conversationId, message)
2. Tries to fetch conversation from banking store, falls back to regular store
3. Extracts customer info from conversation if not provided
4. Calls `processMessage()` from LangGraph workflow
5. Returns:
   - `response`: AI-generated response
   - `intent`: Detected intent
   - `sentiment`: Customer sentiment
   - `requiresEscalation`: Whether escalation needed
   - `resolved`: Whether issue resolved

**Used By:**
- Email processing
- WhatsApp message processing
- Any system that needs AI agent processing

---

## 2. `/api/conversations/` - Conversation Management

### 2.1 `conversations/route.ts`

**Purpose:** Lists all conversations with optional industry filtering.

**Endpoint:**

**GET `/api/conversations?industry={banking|healthcare|ecommerce|saas}`**
- Fetches conversations from database
- Supports industry filtering
- Handles both Supabase and in-memory modes
- Serializes Date objects to ISO strings for JSON response

**Code Flow:**
1. Checks if using Supabase (`USE_SUPABASE` env var)
2. If banking industry + Supabase: uses `getAllBankingConversations()`
3. Otherwise: uses `getAllConversations(industry)`
4. Merges with demo data if NOT using Supabase
5. Sorts by last message time (most recent first)
6. Serializes all Date objects to ISO strings
7. Returns conversations array

**Response:**
```json
{
  "success": true,
  "conversations": [...],
  "count": 10,
  "storedCount": 8
}
```

---

### 2.2 `conversations/[id]/route.ts`

**Purpose:** Fetches a single conversation by ID with all messages.

**Endpoint:**

**GET `/api/conversations/{id}`**
- Fetches conversation details
- Supports both `cc_conversations` (banking) and `conversations` tables
- Returns full conversation object with messages

**Code Flow:**
1. Tries `getBankingConversation(id)` first (cc_conversations)
2. Falls back to `getConversation(id)` (conversations table)
3. If not found, checks both tables for debugging info
4. Returns conversation or 404

**Response:**
```json
{
  "conversation": {
    "id": "...",
    "customer": {...},
    "messages": [...],
    ...
  }
}
```

---

### 2.3 `conversations/[id]/automation/route.ts`

**Purpose:** Fetches automation events and inbox items related to a conversation.

**Endpoint:**

**GET `/api/conversations/{id}/automation`**
- Requires: Automation admin permissions
- Returns automation data for a conversation

**Code Flow:**
1. Fetches inbox items from `cc_admin_inbox_items` where `link_ref->>id` matches conversationId
2. Fetches automation events from `cc_automation_events` where `payload_json->>conversation_id` matches
3. Returns both arrays

**Response:**
```json
{
  "inboxItems": [...],
  "events": [...]
}
```

---

## 3. `/api/calls/` - Call Management

### 3.1 `calls/active/route.ts`

**Purpose:** Lists currently active calls for the Live Console.

**Endpoint:**

**GET `/api/calls/active`**
- Fetches active calls from store adapter
- Formats data for Live Console display
- Calculates call duration

**Code Flow:**
1. Gets active calls via `getActiveCalls()`
2. Gets all calls via `getAllCalls()`
3. Formats each call with:
   - Agent info (id, name, avatar, status)
   - Customer info (name, company, tier)
   - Duration (formatted as MM:SS)
   - Sentiment and sentiment score
   - Topic and risk flags
4. Returns formatted calls array

**Response:**
```json
{
  "success": true,
  "calls": [...],
  "count": 5,
  "totalCalls": 120
}
```

---

### 3.2 `calls/analysis/route.ts`

**Purpose:** Stores and retrieves post-call analysis results.

**Endpoints:**

**POST `/api/calls/analysis`**
- Requires: Automation admin permissions
- Stores call analysis results in `cc_call_analysis` table
- Body: CallAnalysisRow (without id, created_at, updated_at)
- Redacts sensitive data in `raw_analysis_json`
- Automatically processes automation (creates inbox items from flags)

**Fields Stored:**
- `conversation_id`, `provider`, `provider_call_id`, `vapi_call_id`
- `call_summary`, `issue_type`, `issue_severity`
- `issue_resolved`, `escalation_required`, `supervisor_review_needed`
- `compliance_verified`, `customer_sentiment`, `customer_frustrated`
- `quality_score`, `identity_verified`, `step_up_auth_required`
- `action_taken`, `next_best_action`, `raw_analysis_json`

**GET `/api/calls/analysis?conversation_id={id}&provider_call_id={id}&vapi_call_id={id}`**
- Requires: Automation admin permissions
- Queries call analysis by various IDs
- Returns array of analysis records

---

### 3.3 `calls/[callSid]/transcript/route.ts`

**Purpose:** Fetches voice transcript turns for a call.

**Endpoint:**

**GET `/api/calls/{callSid}/transcript?after={ISO}`**
- Source: `cc_call_transcripts` table (canonical source)
- Filters by `provider_call_id` (Twilio CallSid)
- Supports pagination via `after` parameter (ISO timestamp or milliseconds)
- Returns transcript with metadata

**Response:**
```json
{
  "success": true,
  "callSid": "...",
  "status": "completed",
  "ended": true,
  "transcript": [
    {
      "id": "...",
      "speaker": "customer|agent|ai|system",
      "text": "...",
      "occurredAt": "2024-01-01T12:00:00Z",
      "provider": "twilio|vapi",
      "isFinal": true,
      "confidence": 0.95,
      "startMs": 1000,
      "endMs": 2000
    }
  ]
}
```

**Code Flow:**
1. Queries `cc_call_transcripts` by `provider_call_id`
2. Orders by `occurred_at` ascending
3. Filters by `after` timestamp if provided
4. Checks call status from legacy `calls` store
5. Determines if call ended (by status or system event)
6. Returns formatted transcript

---

## 4. `/api/cases/` - Case Management

### 4.1 `cases/[id]/route.ts`

**Purpose:** Fetches a single case by ID.

**Endpoint:**

**GET `/api/cases/{id}`**
- Requires: Automation admin permissions
- Fetches case from `cc_cases` table
- Returns case details

**Response:**
```json
{
  "case": {
    "id": "...",
    "type": "...",
    "status": "...",
    "priority": "...",
    "bank_customer_id": "...",
    "conversation_id": "...",
    "case_number": "...",
    "description": "...",
    "amount": 100.00,
    "currency": "USD",
    "created_at": "...",
    "updated_at": "...",
    "resolved_at": "...",
    "resolved_by": "..."
  }
}
```

---

## 5. `/api/automation/` - Automation System

### 5.1 `automation/dispatch/route.ts`

**Purpose:** Runs the automation dispatcher to turn outbox events into admin inbox items.

**Endpoint:**

**POST `/api/automation/dispatch`**
- Requires: Automation admin permissions
- Body: `{ limit?: number }` (default: 50)
- Processes pending automation events
- Creates inbox items for supervisors/admins

**Code Flow:**
1. Calls `runAutomationDispatcher()` with limit
2. Processes events from `cc_automation_events` table
3. Creates items in `cc_admin_inbox_items` table
4. Returns processing results

**Used By:**
- Cron jobs (scheduled processing)
- Manual triggers from admin UI

---

### 5.2 `automation/events/route.ts`

**Purpose:** Lists automation events with filtering.

**Endpoint:**

**GET `/api/automation/events?status={pending|sent|failed|all}&event_type={type}&limit={50}`**
- Requires: Automation admin permissions
- Fetches events from `cc_automation_events` table
- Supports filtering by status and event_type
- Default limit: 50, max: 200

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "event_type": "...",
      "status": "pending|sent|failed",
      "payload_json": {...},
      "created_at": "...",
      ...
    }
  ]
}
```

---

### 5.3 `automation/inbox/route.ts`

**Purpose:** Lists admin inbox items (automation-generated alerts).

**Endpoint:**

**GET `/api/automation/inbox?status={new|acknowledged|resolved|dismissed}&severity={low|medium|high}&type={type}&limit={50}`**
- Requires: Automation admin permissions
- Fetches items from `cc_admin_inbox_items` table
- Supports filtering by status, severity, type
- Default limit: 50, max: 200

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "type": "fraud_alert|otp_stuck|call_analysis|...",
      "status": "new|acknowledged|resolved|dismissed",
      "severity": "low|medium|high",
      "link_ref": {"kind": "conversation", "id": "..."},
      "created_at": "...",
      ...
    }
  ]
}
```

---

### 5.4 `automation/inbox/[id]/route.ts`

**Purpose:** Updates inbox item status (acknowledge, resolve, dismiss).

**Endpoint:**

**POST `/api/automation/inbox/{id}`**
- Requires: Automation admin permissions
- Body: `{ action: "acknowledge"|"resolve"|"dismiss" }`
- Updates item status in `cc_admin_inbox_items` table

**Code Flow:**
1. Maps action to status:
   - `acknowledge` → `acknowledged`
   - `resolve` → `resolved`
   - `dismiss` → `dismissed`
2. Updates item in database
3. Returns updated item

---

### 5.5 `automation/events/[id]/retry/route.ts`

**Purpose:** Retries a failed automation event.

**Endpoint:**

**POST `/api/automation/events/{id}/retry`**
- Requires: Automation admin permissions
- Resets event status to `pending`
- Sets `next_attempt_at` to now
- Clears `last_error`
- Makes event eligible for processing again

**Code Flow:**
1. Updates event in `cc_automation_events` table
2. Sets status to `pending`
3. Sets `next_attempt_at` to current time
4. Clears error fields
5. Returns updated event

---

### 5.6 `automation/debug/route.ts`

**Purpose:** Diagnostic endpoint for automation system health.

**Endpoint:**

**GET `/api/automation/debug`**
- Requires: Automation admin permissions
- Returns system status and recent items

**Response:**
```json
{
  "success": true,
  "counts": {
    "events": 150,
    "inbox": 25
  },
  "errors": {
    "events": null,
    "inbox": null,
    "recentEvents": null,
    "recentInbox": null
  },
  "recent": {
    "events": [...],
    "inbox": [...]
  }
}
```

---

### 5.7 `automation/checkers/daily-summary/route.ts`

**Purpose:** Generates daily operational summary.

**Endpoint:**

**POST `/api/automation/checkers/daily-summary`**
- Requires: Automation admin permissions
- Body: `{ date?: "YYYY-MM-DD" }` (defaults to today)
- Generates daily summary and emits automation event
- Intended for cron invocation (e.g., daily at 9 AM)

**Code Flow:**
1. Calls `generateDailyOperationalSummary()`
2. Analyzes conversations, calls, cases from past 24 hours
3. Creates summary event
4. Returns summary data

---

### 5.8 `automation/checkers/otp-stuck/route.ts`

**Purpose:** Checks for outbound jobs stuck in verification.

**Endpoint:**

**POST `/api/automation/checkers/otp-stuck`**
- Requires: Automation admin permissions
- Body: `{ stuckMinutesThreshold?: number }` (default: 30)
- Finds jobs in `awaiting_verification` status for too long
- Emits automation events for stuck jobs
- Intended for cron invocation (e.g., every 15 minutes)

**Code Flow:**
1. Calls `checkOtpVerificationStuck()`
2. Queries `cc_outbound_jobs` for stuck jobs
3. Creates inbox items for supervisors
4. Returns count of stuck jobs found

---

## 6. `/api/twilio/` - Twilio Integration

### 6.1 `twilio/webhook/route.ts`

**Purpose:** Receives Twilio call status callbacks.

**Endpoint:**

**POST `/api/twilio/webhook`**
- Receives form-encoded data from Twilio
- Handles call status updates (initiated, ringing, answered, completed)
- Stores/updates call status in database
- Logs connectivity events for audit trail
- Optionally forwards to Vapi (if `VAPI_FORWARD_TWILIO_STATUS=true`)

**Code Flow:**
1. Parses Twilio form data (CallSid, CallStatus, From, To, etc.)
2. Optionally forwards to Vapi (if configured)
3. Updates call in store adapter
4. Logs voice connectivity event via `logVoiceConnectivityEvent()`
5. Returns 200 OK (or 500 if logging fails - forces Twilio retry)

**Events Logged:**
- `call_initiated`
- `call_ringing`
- `call_answered`
- `call_completed`

---

### 6.2 `twilio/calls/route.ts`

**Purpose:** Lists calls from Twilio API.

**Endpoint:**

**GET `/api/twilio/calls?status={active}&limit={50}`**
- Fetches calls directly from Twilio API
- Transforms Twilio format to application format
- Supports status filtering

**Code Flow:**
1. Gets Twilio client
2. Calls `client.calls.list()` with filters
3. Transforms each call:
   - Maps Twilio fields to app format
   - Converts timestamps to Date objects
   - Parses duration to integer
4. Returns formatted calls array

---

### 6.3 `twilio/calls/[callSid]/route.ts`

**Purpose:** Gets details of a specific call and can end calls.

**Endpoints:**

**GET `/api/twilio/calls/{callSid}`**
- Fetches call details from Twilio API
- Returns formatted call object

**POST `/api/twilio/calls/{callSid}`**
- Ends a call by updating status to `completed`
- Uses Twilio API to update call

**Code Flow:**
1. Gets Twilio client
2. Fetches/updates call via `client.calls(callSid)`
3. Transforms to app format
4. Returns call data

---

### 6.4 `twilio/incoming-call/route.ts`

**Purpose:** Handles incoming voice calls and generates TwiML.

**Endpoint:**

**POST `/api/twilio/incoming-call`**
- Receives incoming call webhook from Twilio
- Generates TwiML response
- Stores call and creates conversation
- Optionally connects to Vapi for AI voice handling

**Code Flow:**
1. Parses Twilio form data (From, To, CallSid)
2. Stores call via `storeCall()`
3. Creates conversation via `createConversationFromCall()`
4. Creates `cc_conversation` for banking-grade voice
5. Checks if Vapi is enabled
6. If Vapi enabled:
   - Creates TwiML `<Connect><Stream>` to Vapi WebSocket
   - Passes metadata (CallSid, From, To) in stream URL
   - Sets up status callback to `/api/twilio/stream-webhook`
7. If Vapi disabled:
   - Plays hold message
   - Could enqueue to Twilio queue (commented out)
8. Returns TwiML XML response

**TwiML Response:**
- Vapi mode: `<Connect><Stream>` with Vapi WebSocket URL
- Regular mode: `<Say>` with hold message

---

### 6.5 `twilio/make-call/route.ts`

**Purpose:** Initiates an outbound call via Twilio.

**Endpoint:**

**POST `/api/twilio/make-call`**
- Body: `{ to: string, agentId?: string }`
- Creates outbound call using Twilio API
- Sets up webhooks for status updates

**Code Flow:**
1. Validates `to` phone number
2. Gets Twilio client and phone number
3. Calls `client.calls.create()` with:
   - `to`: Recipient number
   - `from`: Twilio number
   - `url`: TwiML URL for outbound calls (`/api/twilio/outbound-call`)
   - `statusCallback`: Webhook URL (`/api/twilio/webhook`)
4. Returns call details (callSid, status, to, from)

---

### 6.6 `twilio/outbound-call/route.ts`

**Purpose:** Generates TwiML for outbound calls.

**Endpoint:**

**POST `/api/twilio/outbound-call`**
- Receives Twilio webhook when outbound call connects
- Generates TwiML response
- Optionally connects to Vapi for AI voice

**Code Flow:**
1. Parses form data (From, To, CallSid)
2. Checks if Vapi enabled
3. If Vapi enabled:
   - Creates `<Connect><Stream>` to Vapi
   - Passes metadata in stream URL
4. If Vapi disabled:
   - Plays greeting message
5. Returns TwiML XML

---

### 6.7 `twilio/stream-webhook/route.ts`

**Purpose:** Receives Twilio Media Streams status callbacks.

**Endpoint:**

**POST `/api/twilio/stream-webhook`**
- Receives stream status events (start, stop, error)
- Logs deterministic connectivity events
- Maps Twilio events to standardized event types

**Events Logged:**
- `twilio_stream_start` (on StreamEvent=start)
- `twilio_stream_connected` (on StreamEvent=start)
- `twilio_stream_disconnected` (on StreamEvent=stop)
- `twilio_stream_error` (on StreamEvent=error)

**Code Flow:**
1. Parses form data (CallSid, StreamSid, StreamEvent, etc.)
2. Maps Twilio event to standardized type
3. Calls `logVoiceConnectivityEvent()` for audit trail
4. Returns 200 OK (or 500 if logging fails - forces retry)

**Purpose:**
- Provides deterministic proof of WebSocket connectivity
- Used for compliance and debugging
- Logs to `cc_audit_logs` and `cc_call_transcripts`

---

### 6.8 `twilio/whatsapp/incoming/route.ts`

**Purpose:** Handles incoming WhatsApp messages from Twilio.

**Endpoint:**

**POST `/api/twilio/whatsapp/incoming`**
- Receives WhatsApp message webhook (form-encoded)
- Normalizes and stores message (idempotent)
- Resolves customer identity
- Triggers supervisor workflow for AI response

**Code Flow:**
1. Parses Twilio form data:
   - `From`, `To`, `Body`, `MessageSid`
   - `NumMedia`, `MediaUrl0`, `MediaContentType0`, etc.
2. Writes audit log (webhook received)
3. Validates required fields
4. Normalizes addresses using `normalizeAddress()`
5. Calls `createBankingConversationFromMessage()`:
   - Stores message in `cc_messages` (idempotent by provider+provider_message_id)
   - Creates/updates conversation in `cc_conversations`
   - Links identity via `cc_identity_links`
6. Resolves identity with conversation ID
7. Updates conversation with `bank_customer_id` if verified
8. If message already existed (idempotent retry), returns early
9. Runs supervisor workflow:
   - Calls `runSupervisor()` with conversationId, messageId, channel
   - Supervisor decides on AI response or human handover
   - Sends response via Twilio REST API if needed
10. Returns TwiML acknowledgment

**Features:**
- ✅ Idempotent message storage
- ✅ Address normalization
- ✅ Identity resolution
- ✅ Media attachment support
- ✅ Supervisor workflow integration
- ✅ Audit logging

---

### 6.9 `twilio/whatsapp/send/route.ts`

**Purpose:** Sends WhatsApp messages via Twilio.

**Endpoint:**

**POST `/api/twilio/whatsapp/send`**
- Body: `{ to: string, message: string, mediaUrl?: string }`
- Sends WhatsApp message using Twilio Messages API
- Formats phone numbers with `whatsapp:` prefix

**Code Flow:**
1. Validates `to` and `message`
2. Gets Twilio client
3. Formats numbers (ensures `whatsapp:` prefix)
4. Calls `client.messages.create()` with:
   - `from`: Twilio WhatsApp number
   - `to`: Recipient (with whatsapp: prefix)
   - `body`: Message text
   - `mediaUrl`: Optional media attachment
5. Returns message details (messageSid, status, to, from)

---

### 6.10 `twilio/whatsapp/webhook/route.ts`

**Purpose:** Receives WhatsApp message status updates from Twilio.

**Endpoint:**

**POST `/api/twilio/whatsapp/webhook`**
- Receives form-encoded status updates
- Logs webhook receipt for observability
- Could update message status in database (currently just logs)

**Code Flow:**
1. Parses form data (MessageSid, MessageStatus, From, To)
2. Logs status update
3. Writes webhook receipt for audit
4. Returns 200 OK

**Note:** Currently logs only. Could be extended to update message status in database.

---

### 6.11 `twilio/sms/incoming/route.ts`

**Purpose:** Handles incoming SMS messages (primarily for verification codes).

**Endpoint:**

**POST `/api/twilio/sms/incoming`**
- Receives SMS webhook from Twilio
- Detects verification codes (4-8 digit patterns)
- Stores SMS messages in database
- Logs verification codes prominently for Meta/WhatsApp setup

**Code Flow:**
1. Parses form data (From, To, Body, MessageSid, NumMedia)
2. Extracts media URLs if present
3. Detects verification codes using regex patterns
4. Logs verification codes prominently (for Meta setup)
5. Stores message via `createBankingConversationFromMessage()`
6. Returns TwiML acknowledgment

**Verification Code Patterns:**
- `/\b\d{4,8}\b/` - Generic 4-8 digit codes
- `/code[:\s]*([0-9]{4,8})/gi` - "code: 1234"
- `/verification[:\s]*([0-9]{4,8})/gi` - "verification: 1234"

**Use Case:**
- Meta WhatsApp Business verification
- OTP code capture
- SMS conversation handling

---

## 7. `/api/email/` - Email Handling

### 7.1 `email/incoming/route.ts`

**Purpose:** Handles incoming emails via webhook.

**Endpoint:**

**POST `/api/email/incoming`**
- Receives email webhook (SendGrid, Resend, etc.)
- Stores email message
- Creates conversation from email
- Processes through LangGraph AI workflow
- Sends auto-reply if configured

**Code Flow:**
1. Parses email data (from, to, subject, body, messageId)
2. Handles different provider formats (SendGrid array, Resend object)
3. Extracts email from "Name <email@domain.com>" format
4. Stores message via `storeMessage()`
5. Creates conversation via `createConversationFromMessage()`
6. Processes through LangGraph workflow:
   - Calls `processMessage()` with conversation context
   - Gets AI response, intent, sentiment
   - Stores AI response as message
   - Updates conversation with insights
7. Sends auto-reply email (if `EMAIL_AUTO_REPLY !== 'false'`)
8. Returns processing results

**Response:**
```json
{
  "success": true,
  "message": "Email processed",
  "aiResponse": "...",
  "intent": "...",
  "sentiment": "positive|neutral|negative",
  "requiresEscalation": false
}
```

---

### 7.2 `email/send/route.ts`

**Purpose:** Sends emails via SendGrid or Resend.

**Endpoint:**

**POST `/api/email/send`**
- Body: `{ to: string, subject: string, body: string, from?: string, html?: string }`
- Sends email using configured provider (SendGrid or Resend)

**Code Flow:**
1. Validates required fields (to, subject, body)
2. Checks for `SENDGRID_API_KEY`:
   - If present, uses SendGrid SDK
   - Sends email via `sgMail.send()`
3. Otherwise checks for `RESEND_API_KEY`:
   - If present, calls Resend API
   - Sends email via REST API
4. Returns success or error

**Providers Supported:**
- SendGrid (Twilio-owned)
- Resend (modern alternative)

---

### 7.3 `email/webhook/route.ts`

**Purpose:** Receives email event webhooks (bounces, opens, clicks).

**Endpoint:**

**POST `/api/email/webhook`**
- Handles webhooks from SendGrid, Resend, etc.
- Logs email events for observability
- Could update email status in database

**Code Flow:**
1. Parses webhook body (different formats for SendGrid vs Resend)
2. Extracts correlation ID (message ID)
3. Logs events (bounce, open, click, etc.)
4. Writes webhook receipt
5. Returns 200 OK

**Note:** Currently logs only. Could be extended to update message delivery status.

---

## 8. `/api/outbound/` - Outbound Campaigns

### 8.1 `outbound/jobs/route.ts`

**Purpose:** Lists outbound jobs with pagination and filtering.

**Endpoint:**

**GET `/api/outbound/jobs?status={queued|awaiting_verification|sent|failed|canceled}&limit={50}&cursor={timestamp|id}`**
- Requires: Outbound admin permissions
- Returns paginated list of outbound jobs
- Supports cursor-based pagination (stable, using created_at + id)
- Masks target addresses for privacy

**Code Flow:**
1. Parses query parameters (status, limit, cursor)
2. Normalizes status (canceled ↔ cancelled)
3. Queries `cc_outbound_jobs` table
4. Applies cursor pagination if provided
5. Fetches last attempt timestamps from `cc_outbound_attempts`
6. Masks target addresses (e.g., `+34***12` or `u***@domain.com`)
7. Returns items with next_cursor

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "created_at": "...",
      "status": "queued|awaiting_verification|sent|failed|canceled",
      "channel": "whatsapp|email|voice|sms",
      "to_hint": "+34***12",
      "campaign_id": "...",
      "attempts_count": 2,
      "last_attempt_at": "...",
      "last_error_hint": "..."
    }
  ],
  "next_cursor": "2024-01-01T12:00:00Z|job-id"
}
```

---

### 8.2 `outbound/jobs/create/route.ts`

**Purpose:** Creates a new outbound job.

**Endpoint:**

**POST `/api/outbound/jobs/create`**
- Requires: Outbound admin permissions
- Body: `{ campaignId?, campaign?, bankCustomerId?, channel, targetAddress, payloadJson?, scheduledAt?, maxAttempts? }`
- Creates job in `cc_outbound_jobs` table
- Optionally creates campaign if not provided

**Code Flow:**
1. Validates `channel` and `targetAddress`
2. Normalizes target address
3. Creates campaign if `campaignId` not provided (requires `campaign.name` and `campaign.purpose`)
4. Inserts job with:
   - `status`: `queued`
   - `scheduled_at`: provided or now
   - `next_attempt_at`: same as scheduled_at
   - `max_attempts`: provided or default (voice: 2, others: 3)
5. Writes audit log
6. Returns created job

**Campaign Purposes:**
- `fraud_alert`
- `kyc_update`
- `collections`
- `case_followup`
- `service_notice`

---

### 8.3 `outbound/jobs/run/route.ts`

**Purpose:** Processes due outbound jobs (runs the outbound runner).

**Endpoint:**

**POST `/api/outbound/jobs/run`**
- Requires: Outbound admin permissions
- Body: `{ limit?: number }` (default: 25)
- Processes jobs that are due (`next_attempt_at <= now`)
- Automatically runs dispatcher after processing (piggyback)

**Code Flow:**
1. Calls `runDueOutboundJobs()` with limit
2. Processes jobs:
   - Finds jobs with `status='queued'` and `next_attempt_at <= now`
   - Sends messages via appropriate channel (WhatsApp, email, voice, SMS)
   - Updates job status and attempt count
   - Creates attempt records
3. Runs automation dispatcher (non-fatal if fails)
4. Writes audit log
5. Returns processing results

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "sent": 8,
  "failed": 2,
  "dispatcher": {
    "sent": 5
  }
}
```

---

### 8.4 `outbound/jobs/[id]/route.ts`

**Purpose:** Gets details of a specific outbound job.

**Endpoint:**

**GET `/api/outbound/jobs/{id}`**
- Requires: Outbound admin permissions
- Returns job details with attempts and audit trail

**Code Flow:**
1. Fetches job from `cc_outbound_jobs`
2. Fetches attempts from `cc_outbound_attempts` (ordered by attempt_number)
3. Fetches audit logs related to job
4. Redacts sensitive data in `payload_json`
5. Returns job, attempts, and audit tail

**Response:**
```json
{
  "job": {
    "id": "...",
    "status": "...",
    "channel": "...",
    "created_at": "...",
    "campaign_id": "...",
    "payload_redacted": {...}
  },
  "attempts": [
    {
      "attempt_no": 1,
      "status": "sent|failed",
      "created_at": "...",
      "provider_message_id": "..."
    }
  ],
  "audit_tail": [...]
}
```

---

### 8.5 `outbound/jobs/[id]/cancel/route.ts`

**Purpose:** Cancels an outbound job.

**Endpoint:**

**POST `/api/outbound/jobs/{id}/cancel`**
- Requires: Outbound admin permissions
- Body: `{ reasonCode?, reasonMessage?, outcomeCode? }`
- Updates job status to `cancelled`
- Sets cancel reason and outcome

**Code Flow:**
1. Updates job in `cc_outbound_jobs`:
   - Sets `status`: `cancelled`
   - Sets `cancel_reason_code` (default: `cancelled_by_staff`)
   - Sets `cancel_reason_message`
   - Sets `outcome_code` (e.g., `opt_out`, `wrong_party`, `escalated_to_human`)
   - Clears `next_attempt_at`
2. Writes audit log
3. Returns updated job

---

### 8.6 `outbound/campaigns/route.ts`

**Purpose:** Lists outbound campaigns.

**Endpoint:**

**GET `/api/outbound/campaigns`**
- Requires: Outbound admin permissions
- Returns list of campaigns from `cc_outbound_campaigns` table

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "name": "...",
      "purpose": "fraud_alert|kyc_update|...",
      "status": "active|paused",
      "allowed_channels": ["whatsapp", "email"],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### 8.7 `outbound/health/route.ts`

**Purpose:** Health check for outbound system.

**Endpoint:**

**GET `/api/outbound/health`**
- Requires: Outbound admin permissions
- Returns job counts by status for last 24 hours

**Response:**
```json
{
  "window_hours": 24,
  "since": "2024-01-01T00:00:00Z",
  "total": 150,
  "counts": {
    "queued": 10,
    "awaiting_verification": 5,
    "sent": 120,
    "failed": 10,
    "canceled": 5
  }
}
```

---

## 9. `/api/vapi/` - Vapi AI Voice Integration

### 9.1 `vapi/call/route.ts`

**Purpose:** Creates and retrieves Vapi AI voice calls.

**Endpoints:**

**POST `/api/vapi/call`**
- Body: `{ to: string, assistantId?, metadata? }`
- Creates a Vapi call using Vapi API
- Returns call details

**GET `/api/vapi/call?id={callId}`**
- Fetches call details from Vapi API
- Returns call information

**Code Flow:**
1. Validates `to` phone number
2. Gets Vapi phone number ID and assistant ID from env
3. Calls `createVapiCall()` with:
   - `phoneNumberId`: From env
   - `customer.number`: Recipient
   - `assistantId`: Provided or from env
   - `metadata`: Optional metadata
4. Returns call object

---

### 9.2 `vapi/webhook/route.ts`

**Purpose:** Receives webhooks from Vapi for call events.

**Endpoint:**

**POST `/api/vapi/webhook`**
- Receives JSON webhooks from Vapi
- Handles multiple event types:
  - `call-status-update`: Call status changes
  - `end-of-call-report`: Call completion with analysis
  - `transcript`: Voice transcript updates
  - `speech-update`: ASR/TTS streaming updates
  - `assistant.started`: Assistant lifecycle
  - `conversation-update`: Conversation messages
  - `function-call`: Function calls from assistant

**Code Flow:**
1. Parses JSON body (handles nested message format)
2. Extracts event type and call data
3. Optionally fetches call details from Vapi API if only callId provided
4. Routes to appropriate handler based on event type
5. Logs webhook receipt
6. Returns 200 OK

**Key Handlers:**

**`handleCallStatusUpdate(call)`:**
- Updates call status in legacy store
- Creates/updates `cc_conversation` for voice
- Logs audit event

**`handleEndOfCallReport(call)`:**
- Updates call status to `completed`
- Stores transcript if available
- Processes Vapi structured output as call analysis:
  - Extracts CSAT, sentiment, success evaluation
  - Maps to call analysis schema
  - Stores in `cc_call_analysis` table
  - Triggers automation processing

**`handleTranscript(call, body)`:**
- Normalizes transcript data from various Vapi payload formats
- Appends to `cc_call_transcripts` table
- Mirrors to `cc_messages` for UI display
- Filters out system prompt blobs
- Only triggers supervisor on FINAL customer turns
- Handles low ASR confidence (asks to repeat)

**`handleSpeechUpdate(call, body)`:**
- Normalizes speech update events
- Routes to transcript handler

**`handleAssistantStarted(call, body)`:**
- Logs assistant lifecycle marker
- Creates system transcript entry

**`handleConversationUpdate(call, body)`:**
- Extracts messages from conversation update
- Normalizes to transcript format
- Routes to transcript handler

**`handleFunctionCall(call, body)`:**
- Logs function calls (placeholder for future implementation)

**Features:**
- ✅ Deterministic connectivity logging
- ✅ Transcript deduplication
- ✅ Supervisor workflow integration
- ✅ Call analysis extraction
- ✅ Address normalization
- ✅ Audit trail

---

## 10. `/api/agent-flows/` - Agent Builder

### 10.1 `agent-flows/route.ts`

**Purpose:** Lists and creates agent flows (visual flow builder).

**Endpoints:**

**GET `/api/agent-flows`**
- Returns list of all agent flows
- Fetches from `cc_agent_flows` table
- Returns: id, name, description, status, active_version_id, timestamps

**POST `/api/agent-flows`**
- Body: `{ name: string, description?: string }`
- Creates new agent flow with status `draft`
- Returns created flow

**Code Flow:**
1. Validates `name` is required
2. Inserts into `cc_agent_flows` table
3. Returns created flow
4. Handles missing table error (returns helpful migration message)

---

### 10.2 `agent-flows/[id]/route.ts`

**Purpose:** Gets and updates a specific agent flow.

**Endpoints:**

**GET `/api/agent-flows/{id}`**
- Fetches flow details
- Also fetches all versions for the flow
- Returns flow and versions array

**PATCH `/api/agent-flows/{id}`**
- Body: `{ name?, description?, status? }`
- Updates flow metadata
- Returns updated flow

---

### 10.3 `agent-flows/[id]/publish/route.ts`

**Purpose:** Publishes a flow version (makes it active).

**Endpoint:**

**POST `/api/agent-flows/{id}/publish`**
- Body: `{ versionId: string }`
- Marks version as `published`
- Sets flow's `active_version_id` to the version
- Updates flow status to `published`

**Code Flow:**
1. Validates `versionId`
2. Updates version status to `published`
3. Sets `published_at` timestamp
4. Updates flow's `active_version_id`
5. Updates flow status to `published`
6. Returns updated flow and version

---

### 10.4 `agent-flows/[id]/simulate/route.ts`

**Purpose:** Simulates running an agent flow with test input.

**Endpoint:**

**POST `/api/agent-flows/{id}/simulate`**
- Body: `{ versionId?, context: { message: string, ... } }`
- Loads flow graph (from versionId, active version, or latest)
- Executes flow with provided context
- Persists run to `cc_agent_flow_runs` table

**Code Flow:**
1. Validates `context.message` is required
2. Loads graph:
   - If `versionId` provided, loads that version
   - Otherwise loads active version
   - Falls back to latest version
3. Validates graph schema (must be schemaVersion=1)
4. Calls `runAgentFlow()` with graph and context
5. Persists run results to database (non-fatal)
6. Returns execution results

**Response:**
```json
{
  "success": true,
  "error": null,
  "result": {
    "outputText": "...",
    "success": true,
    "logs": [...],
    "error": null
  }
}
```

---

### 10.5 `agent-flows/[id]/versions/route.ts`

**Purpose:** Lists and creates versions of an agent flow.

**Endpoints:**

**GET `/api/agent-flows/{id}/versions`**
- Returns all versions for a flow
- Ordered by version number (descending)
- Returns: id, flow_id, version, label, status, graph_json, timestamps

**POST `/api/agent-flows/{id}/versions`**
- Body: `{ graph: AgentFlowGraph, label?: string }`
- Creates new version with incremented version number
- Graph must have `schemaVersion: 1`
- Status defaults to `draft`

**Code Flow:**
1. Validates graph schema
2. Finds max version number for flow
3. Increments to next version
4. Inserts new version with graph
5. Returns created version

---

### 10.6 `agent-flows/templates/route.ts`

**Purpose:** Lists available agent flow templates.

**Endpoint:**

**GET `/api/agent-flows/templates`**
- Returns list of predefined templates
- Templates are defined in `@/lib/agent-builder/templates`
- Returns: key, name, description for each template

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "key": "customer_support",
      "name": "Customer Support",
      "description": "..."
    }
  ]
}
```

---

### 10.7 `agent-flows/from-template/route.ts`

**Purpose:** Creates a new agent flow from a template.

**Endpoint:**

**POST `/api/agent-flows/from-template`**
- Body: `{ templateKey: string, name?: string }`
- Creates flow and first version from template
- Uses template's graph as initial version

**Code Flow:**
1. Gets template by key
2. Creates flow with template name (or override)
3. Creates version 1 with template graph
4. Returns flow and version

---

## 11. `/api/knowledge/` - Knowledge Base

### 11.1 `knowledge/search/route.ts`

**Purpose:** Searches knowledge base articles.

**Endpoints:**

**GET `/api/knowledge/search?q={query}&category={category}`**
- Searches published articles
- If no query: returns all published articles (filtered by category if provided)
- If query provided: uses full-text search RPC function `search_knowledge_base`
- Falls back to simple ILIKE search if RPC fails
- Returns articles sorted by relevance

**POST `/api/knowledge/search`**
- Body: `{ articleId: string, action: "view"|"helpful"|"not_helpful" }`
- Tracks article interactions
- Updates view count, helpful count, or not_helpful count
- Updates `last_accessed_at` timestamp

**Code Flow:**
1. If no query: fetches all published articles
2. If query: calls `search_knowledge_base` RPC function
3. Fetches full article details for search results
4. Sorts by relevance score
5. Falls back to ILIKE search if RPC unavailable
6. Handles missing table gracefully (returns empty array with migration hint)

**Response:**
```json
{
  "articles": [
    {
      "id": "...",
      "title": "...",
      "content": "...",
      "summary": "...",
      "category": "...",
      "view_count": 10,
      "helpful_count": 5,
      ...
    }
  ]
}
```

---

## 12. `/api/integrations/` - External Integrations

### 12.1 `integrations/route.ts`

**Purpose:** Lists and creates external integrations.

**Endpoints:**

**GET `/api/integrations`**
- Returns list of integrations from `cc_integrations` table
- Returns: id, name, provider, base_url, status, auth_type

**POST `/api/integrations`**
- Body: `{ name: string, provider: string, base_url: string, auth_type?: string, auth_env_key?: string, auth_config?: object }`
- Creates new integration
- Status defaults to `active`

**Code Flow:**
1. Validates required fields (name, provider, base_url)
2. Inserts into `cc_integrations` table
3. Returns created integration
4. Handles missing table error (returns migration hint)

---

### 12.2 `integrations/fetch/route.ts`

**Purpose:** Proxies API calls to external integrations.

**Endpoint:**

**POST `/api/integrations/fetch`**
- Body: `{ integrationId: string, path: string, method?: "GET"|"POST"|..., query?: object, headers?: object, bodyJson?: object }`
- Makes authenticated API call to external integration
- Uses integration's auth configuration

**Code Flow:**
1. Validates `integrationId` and `path`
2. Calls `integrationFetch()` which:
   - Loads integration config from database
   - Resolves authentication (bearer token from env, etc.)
   - Makes HTTP request to `base_url + path`
   - Returns response
3. Returns result with success status

**Use Case:**
- Calling external banking APIs
- CRM integrations
- Third-party service calls

---

## 13. `/api/back-office/` - Back Office Case Management

### 13.1 `back-office/cases/route.ts`

**Purpose:** Lists cases with filtering and assignment info.

**Endpoint:**

**GET `/api/back-office/cases?status={status}&priority={priority}&type={type}&limit={100}`**
- Requires: Back office permissions
- Fetches cases from `cc_cases` table
- Attaches latest assignment (queue, SLA) for each case
- Supports filtering by status, priority, type

**Code Flow:**
1. Builds query with filters
2. Fetches cases (ordered by created_at desc)
3. Fetches assignments from `cc_assignments` table
4. Maps latest assignment to each case
5. Returns cases with assignments

**Response:**
```json
{
  "success": true,
  "cases": [
    {
      "id": "...",
      "type": "...",
      "status": "...",
      "priority": "...",
      "assignment": {
        "queue_name": "...",
        "assigned_to": "...",
        "sla_due_at": "...",
        ...
      }
    }
  ]
}
```

---

### 13.2 `back-office/cases/[id]/route.ts`

**Purpose:** Gets and updates a specific case.

**Endpoints:**

**GET `/api/back-office/cases/{id}`**
- Requires: Back office permissions
- Fetches case details
- Also fetches latest assignment
- Returns case and assignment

**PATCH `/api/back-office/cases/{id}`**
- Requires: Back office permissions
- Body: `{ status?, priority?, description?, queue_name?, sla_due_at? }`
- Updates case fields
- Creates new assignment record if queue_name provided (preserves history)

**Code Flow:**
1. Updates case fields if provided
2. If `queue_name` provided:
   - Inserts new assignment record (preserves assignment history)
   - Sets `sla_due_at` if provided
3. Returns success

**Note:** Assignment history is preserved by creating new records rather than updating existing ones.

---

## 14. `/api/connectivity/` - Connectivity Status

### 14.1 `connectivity/twilio/route.ts`

**Purpose:** Provides connectivity status and webhook URLs for Twilio setup.

**Endpoint:**

**GET `/api/connectivity/twilio`**
- Returns environment variable status
- Returns webhook URLs for Twilio configuration
- Shows recent SMS messages (for Meta verification code capture)
- Extracts and displays verification codes from SMS

**Response:**
```json
{
  "success": true,
  "env": {
    "TWILIO_ACCOUNT_SID": true,
    "TWILIO_AUTH_TOKEN": true,
    "TWILIO_PHONE_NUMBER": true,
    "TWILIO_WHATSAPP_NUMBER": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "NEXT_PUBLIC_SUPABASE_URL": true
  },
  "webhooks": {
    "voice_incoming_call": "https://.../api/twilio/incoming-call",
    "voice_status_callback": "https://.../api/twilio/webhook",
    "whatsapp_incoming_message": "https://.../api/twilio/whatsapp/incoming",
    "whatsapp_status_callback": "https://.../api/twilio/whatsapp/webhook",
    "sms_incoming_message": "https://.../api/twilio/sms/incoming"
  },
  "metaVerification": {
    "dbEnabled": true,
    "recentSms": [
      {
        "id": "...",
        "created_at": "...",
        "from_address": "***1234",
        "to_address": "***5678",
        "body_preview": "...",
        "codes": ["1234"]
      }
    ],
    "recentCodes": ["1234", "5678"]
  }
}
```

**Features:**
- ✅ Environment variable status check
- ✅ Webhook URL generation (uses `NEXT_PUBLIC_APP_URL` or infers from request)
- ✅ Recent SMS display (masked addresses for privacy)
- ✅ Verification code extraction
- ✅ Helpful for Meta WhatsApp Business setup

---

## 15. `/api/debug/` - Debug Endpoints

### 15.1 `debug/cc/route.ts`

**Purpose:** Debug endpoint to verify Contact Centre database connectivity.

**Endpoint:**

**GET `/api/debug/cc`**
- Checks connectivity to CC tables
- Returns counts and recent items
- Useful for troubleshooting database issues

**Code Flow:**
1. Queries multiple tables in parallel:
   - `cc_conversations` (count)
   - `cc_messages` (count)
   - `cc_identity_links` (count)
   - `cc_messages` (latest 3)
   - `cc_conversations` (latest 3)
2. Returns counts and recent items
3. Returns errors if any queries fail

**Response:**
```json
{
  "success": true,
  "counts": {
    "cc_conversations": 50,
    "cc_messages": 200,
    "cc_identity_links": 30
  },
  "latest": {
    "conversations": [...],
    "messages": [...]
  }
}
```

---

## Summary by Category

### Agent Management
- **Status**: Agent status and queue counts
- **Performance**: Agent performance metrics
- **Process**: LangGraph AI message processing

### Conversations
- **List**: Get all conversations (with industry filter)
- **Detail**: Get single conversation with messages
- **Automation**: Get automation data for conversation

### Calls
- **Active**: List active calls for Live Console
- **Analysis**: Store/retrieve call analysis
- **Transcript**: Get voice transcript turns

### Twilio Integration
- **Webhooks**: Call status, WhatsApp, SMS, Stream status
- **Calls**: List calls, get call details, end calls
- **Incoming Call**: Handle incoming calls, generate TwiML
- **Make Call**: Initiate outbound calls
- **WhatsApp**: Send/receive WhatsApp messages
- **SMS**: Receive SMS (verification codes)

### Email
- **Incoming**: Process incoming emails, AI workflow
- **Send**: Send emails via SendGrid/Resend
- **Webhook**: Email event webhooks

### Automation
- **Dispatch**: Process automation events → inbox items
- **Events**: List automation events
- **Inbox**: List admin inbox items
- **Retry**: Retry failed events
- **Debug**: System diagnostics
- **Checkers**: Daily summary, OTP stuck detection

### Outbound
- **Jobs**: List, create, run, cancel outbound jobs
- **Campaigns**: List campaigns
- **Health**: System health check

### Vapi AI Voice
- **Call**: Create/get Vapi calls
- **Webhook**: Handle Vapi events (transcripts, analysis, status)

### Agent Builder
- **Flows**: Create, list, update flows
- **Versions**: Create, list versions
- **Publish**: Publish flow version
- **Simulate**: Test flow execution
- **Templates**: List templates, create from template

### Knowledge Base
- **Search**: Search articles, track views/helpfulness

### Integrations
- **List/Create**: Manage external integrations
- **Fetch**: Proxy API calls to integrations

### Back Office
- **Cases**: List and manage cases with assignments

### Debug
- **CC**: Database connectivity check

---

## Common Patterns

### Authentication
- **Automation Admin**: `requireAutomationAdmin()` - For automation endpoints
- **Outbound Admin**: `requireOutboundAdmin()` - For outbound endpoints
- **Back Office**: `requireBackOffice()` - For case management

### Error Handling
- Most endpoints use try-catch
- Returns JSON error responses
- Logs errors to console
- Some write audit logs on errors

### Database Access
- Uses `supabaseServer` from `@/lib/supabase-server`
- Service role key (full access)
- Handles missing table errors gracefully

### Audit Logging
- Many endpoints write to `cc_audit_logs`
- Uses `writeAuditLog()` from banking-store
- Redacts sensitive data before logging

### Webhook Receipts
- Twilio/Vapi webhooks write receipt via `writeWebhookReceipt()`
- Tracks request/response for debugging
- Stores correlation IDs

### Observability
- Uses `writeObservabilityEvent()` for important events
- Tracks duration, HTTP status, errors
- Helps with monitoring and debugging

---

## Environment Variables Used

**Twilio:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_WHATSAPP_NUMBER`

**Vapi:**
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_ASSISTANT_ID`
- `VAPI_TWILIO_STREAM_URL`
- `VAPI_PUBLIC_API_KEY`
- `USE_VAPI`

**Email:**
- `SENDGRID_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_AUTO_REPLY`

**Supabase:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`

**App:**
- `NEXT_PUBLIC_APP_URL`
- `USE_SUPABASE`
- `USE_LANGGRAPH`

---

## Database Tables Referenced

**Core Tables:**
- `agents`
- `conversations`, `cc_conversations`
- `messages`, `cc_messages`
- `calls`
- `cc_call_transcripts`
- `cc_call_analysis`

**Automation Tables:**
- `cc_automation_events`
- `cc_admin_inbox_items`

**Outbound Tables:**
- `cc_outbound_jobs`
- `cc_outbound_attempts`
- `cc_outbound_campaigns`

**Banking Tables:**
- `cc_cases`
- `cc_assignments`
- `cc_identity_links`
- `cc_audit_logs`

**Agent Builder Tables:**
- `cc_agent_flows`
- `cc_agent_flow_versions`
- `cc_agent_flow_runs`

**Other Tables:**
- `cc_knowledge_base`
- `cc_integrations`

---

## API Route Organization Principles

1. **RESTful Structure**: Most routes follow REST conventions
2. **Permission-Based**: Many endpoints require specific permissions
3. **Idempotency**: Webhook endpoints are idempotent (safe to retry)
4. **Audit Trail**: Important operations write audit logs
5. **Error Handling**: Consistent error responses
6. **Type Safety**: TypeScript types throughout
7. **Observability**: Webhook receipts and event logging

---

This API layer provides a comprehensive backend for:
- ✅ Agent performance tracking (status management removed - see 1.1)
- ✅ Multi-channel conversation handling (voice, chat, email, WhatsApp, SMS)
- ✅ AI agent processing (LangGraph workflows)
- ✅ Automation system (events, inbox, dispatcher)
- ✅ Outbound campaigns and job management
- ✅ Call analysis and quality tracking
- ✅ Knowledge base search
- ✅ External integrations
- ✅ Back-office case management
- ✅ Agent Builder (visual flow creation)

**Note:** The `/api/agents/status` route has been removed as part of the FastAPI-only backend migration. Agent status is now managed in UI local state only.

All endpoints are designed for production use with proper error handling, authentication, and audit logging.
