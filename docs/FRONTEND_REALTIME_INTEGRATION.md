# Frontend Realtime Integration - Supabase Message Streaming

This document explains the frontend implementation of Supabase Realtime message streaming for the Next.js call center app. It details the client-side API layer, subscription management, and component integration.

---

## Overview

The frontend implements **Option A pattern** for realtime message streaming:
1. Agent sends message → Backend API inserts into DB → Frontend appends immediately from response
2. Supabase Realtime delivers the same message → Frontend deduplicates by message ID
3. Result: Instant UI update with no duplicate messages

**Key Principle:** Frontend **never writes directly** to Supabase. All writes go through the FastAPI backend API.

---

## File Structure

```
lib/
├── supabaseClient.ts           # Browser Supabase client (anon key)
├── realtime.ts                 # Realtime subscription helper
├── supportApi.ts               # Backend API client
├── types.ts                    # TypeScript types
└── hooks/
    └── useConversationMessages.ts  # React hook for message management

components/
├── chat-agent-desktop.tsx      # Main chat agent interface (updated)
└── inbox/
    └── conversation-panel.tsx  # Conversation view panel (updated)
```

---

## Created Files

### 1. `lib/supabaseClient.ts` - Browser Supabase Client

**Purpose:** Creates a Supabase client instance for browser use, using the anon key (safe to expose).

**Code:**
```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Explanation:**
- Uses `createClient` from `@supabase/supabase-js`
- Reads environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- The `NEXT_PUBLIC_` prefix makes these available in the browser
- **Anon key is safe** to expose - it's restricted by Row Level Security (RLS) policies
- This client is used **only for Realtime subscriptions** (read-only)
- **Never used for writes** - all writes go through the backend API

**Why Anon Key?**
- Frontend needs to subscribe to Realtime changes
- Anon key respects RLS policies (read-only access)
- Service role key is backend-only (never in frontend)

---

### 2. `lib/realtime.ts` - Realtime Subscription Helper

**Purpose:** Subscribes to Postgres changes (INSERT events) on the `messages` table for a specific conversation.

**Code:**
```typescript
import { supabase } from "./supabaseClient";

export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (msg: any) => void
) {
  const channel = supabase
    .channel(`conv:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        // payload.new is the inserted row
        onNewMessage(payload.new);
      }
    )
    .subscribe((status) => {
      console.log("[realtime]", conversationId, status); // expect SUBSCRIBED
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
```

**Explanation:**
- **Channel Creation:** Creates a unique channel per conversation (`conv:${conversationId}`)
- **Postgres Changes Listener:** Listens for `INSERT` events on `public.messages` table
- **Filter:** Only receives messages where `conversation_id` matches the provided ID
- **Callback:** When a new message is inserted, calls `onNewMessage` with the message data
- **Subscription:** Subscribes to the channel and logs status (expects "SUBSCRIBED")
- **Cleanup Function:** Returns a function that removes the channel (for cleanup)

**How It Works:**
1. Supabase Realtime uses WebSockets under the hood
2. When backend inserts a message, Supabase broadcasts it to subscribed clients
3. Frontend receives the message via the callback
4. Frontend can then update the UI

**Filter Syntax:**
- `conversation_id=eq.${conversationId}` means "where conversation_id equals conversationId"
- This ensures we only receive messages for the current conversation

---

### 3. `lib/supportApi.ts` - Backend API Client

**Purpose:** Provides functions to call the FastAPI backend for fetching message history and sending messages.

**Code:**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_SUPPORT_API_BASE_URL!;

export async function fetchMessages(conversationId: string) {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    method: "GET",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendAgentMessage(args: {
  conversation_id: string;
  sender_agent_id: string;
  content: string;
  is_internal?: boolean;
}) {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: args.conversation_id,
      sender_type: "agent",
      sender_agent_id: args.sender_agent_id,
      sender_customer_id: null,
      content: args.content,
      is_internal: args.is_internal ?? false,
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json(); // returns inserted row (includes id)
}
```

**Explanation:**

**`fetchMessages(conversationId: string)`:**
- Fetches all messages for a conversation from the backend
- Calls `GET /api/conversations/{conversationId}/messages`
- Returns array of messages ordered by `created_at` ascending
- Throws error if request fails

**`sendAgentMessage(args)`:**
- Sends an agent message through the backend
- Calls `POST /api/messages` with message payload
- Sets `sender_type: "agent"` and `sender_customer_id: null`
- Includes `is_internal` flag for whisper mode
- Returns the inserted message row (includes `id` and `created_at`)
- This is the **only way** messages are written to the database

**Why Backend API?**
- Backend uses service role key (full access)
- Backend validates message data
- Backend enforces business rules (e.g., customers can't send internal messages)
- Frontend never has write access to database

---

### 4. `lib/types.ts` - TypeScript Types

**Purpose:** Defines the database message type for consistent typing across the app.

**Code:**
```typescript
export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_type: "customer" | "agent";
  sender_customer_id: string | null;
  sender_agent_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
};
```

**Explanation:**
- Matches the `public.messages` table schema
- `id`: UUID of the message
- `conversation_id`: UUID of the conversation
- `sender_type`: Either "customer" or "agent"
- `sender_customer_id`: UUID if customer message, null otherwise
- `sender_agent_id`: UUID if agent message, null otherwise
- `content`: Message text content
- `is_internal`: Boolean for whisper/internal notes
- `created_at`: ISO timestamp string

**Why Separate Type?**
- Keeps database schema separate from UI display format
- Allows conversion between DB format and display format
- Type safety prevents errors

---

### 5. `lib/hooks/useConversationMessages.ts` - React Hook

**Purpose:** Encapsulates the complete workflow: loading history, subscribing to realtime, deduplicating messages, and sending messages.

**Code:**
```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import type { DbMessage } from "@/lib/types";
import { fetchMessages, sendAgentMessage } from "@/lib/supportApi";
import { subscribeToConversationMessages } from "@/lib/realtime";

export function useConversationMessages(params: {
  conversationId: string | null;
  agentId: string; // call center agent UUID
}) {
  const { conversationId, agentId } = params;

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) return;

    let unsubscribe = () => {};

    (async () => {
      // 1) Load history via backend
      const history: DbMessage[] = await fetchMessages(conversationId);
      setMessages(history);
      seenIds.current = new Set(history.map((m) => m.id));

      // 2) Subscribe to realtime inserts
      unsubscribe = subscribeToConversationMessages(conversationId, (msg: DbMessage) => {
        // Dedupe realtime echo + any double events
        if (seenIds.current.has(msg.id)) return;
        seenIds.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      });
    })();

    // 3) cleanup when switching conversation
    return () => unsubscribe();
  }, [conversationId]);

  async function send(content: string, isInternal: boolean) {
    if (!conversationId) return;

    const saved: DbMessage = await sendAgentMessage({
      conversation_id: conversationId,
      sender_agent_id: agentId,
      content,
      is_internal: isInternal,
    });

    // Option A: append immediately from backend response
    if (!seenIds.current.has(saved.id)) {
      seenIds.current.add(saved.id);
      setMessages((prev) => [...prev, saved]);
    }
  }

  return { messages, send };
}
```

**Explanation:**

**State Management:**
- `messages`: Array of messages for the current conversation
- `seenIds`: Ref to a Set tracking message IDs we've already seen (for deduplication)

**Effect Hook (Load History + Subscribe):**
1. **Guard:** Returns early if no `conversationId`
2. **Load History:** Fetches all messages from backend API
3. **Initialize State:** Sets messages and populates `seenIds` with existing message IDs
4. **Subscribe:** Subscribes to Realtime for new messages
5. **Deduplication:** When Realtime delivers a message, checks if we've seen it before
   - If seen, ignores it (prevents duplicates)
   - If new, adds to `seenIds` and appends to messages
6. **Cleanup:** Unsubscribes when conversation changes or component unmounts

**Send Function (Option A Pattern):**
1. **Validation:** Checks if conversationId exists
2. **API Call:** Sends message to backend via `sendAgentMessage`
3. **Immediate Append:** Appends message to local state immediately from backend response
4. **Deduplication:** Checks `seenIds` before appending (safety check)
5. **Realtime Echo:** When Realtime delivers the same message, it's deduplicated by ID

**Why Option A?**
- **Instant UI Update:** Message appears immediately when sent
- **No Waiting:** Don't wait for Realtime to deliver the message
- **Deduplication:** Realtime echo is safely ignored
- **Better UX:** User sees their message right away

**Return Value:**
- `messages`: Array of messages (reactive state)
- `send`: Function to send a new message

---

## Modified Files

### 1. `components/chat-agent-desktop.tsx` - Main Chat Agent Interface

**Changes Made:**

#### Import Hook and Types
```typescript
import { useConversationMessages } from "@/lib/hooks/useConversationMessages"
import type { DbMessage } from "@/lib/types"
```

#### Use Hook
```typescript
// Demo agent ID - replace with real agent ID from context/store
const agentId = "00000000-0000-0000-0000-000000000001" // TODO: Get from auth context

// Convert numeric ID to UUID string for API calls, or use string directly
const conversationIdForApi = typeof activeConversationId === "string" 
  ? activeConversationId 
  : null // For demo mode with numeric IDs, don't use realtime

// Use realtime hook only when we have a valid UUID conversation ID
const { messages: dbMessages, send: sendMessage } = useConversationMessages({
  conversationId: conversationIdForApi,
  agentId,
})
```

**Explanation:**
- Gets agent ID (currently hardcoded, should come from auth context)
- Converts conversation ID to string UUID if needed (supports demo mode with numeric IDs)
- Uses hook to get messages and send function

#### Convert DB Messages to Display Format
```typescript
// Convert DbMessage format to display format
const convertDbMessageToDisplay = (msg: DbMessage) => {
  const isAgent = msg.sender_type === "agent"
  const isWhisper = isAgent && msg.is_internal
  const timestamp = new Date(msg.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return {
    id: msg.id,
    sender: isWhisper ? "whisper" : isAgent ? "agent" : "customer",
    type: "text" as const,
    content: msg.content,
    timestamp,
  }
}

// Use real messages if available, otherwise fall back to demo data
const messages = conversationIdForApi && dbMessages.length > 0
  ? dbMessages.map(convertDbMessageToDisplay)
  : activeConvo?.messages || []
```

**Explanation:**
- Converts `DbMessage` (database format) to display format used by UI
- Maps `sender_type` and `is_internal` to `sender` field ("agent", "customer", "whisper")
- Formats timestamp for display
- Falls back to demo data if no real conversation ID

#### Update Send Handler
```typescript
const handleSendMessage = async () => {
  const trimmed = message.trim()
  if (!trimmed) return

  // If we have a real conversation ID, use the API
  if (conversationIdForApi) {
    try {
      await sendMessage(trimmed, whisperMode)
      setMessage("") // clear input
    } catch (error) {
      console.error("Failed to send message:", error)
      // Optionally show error toast
    }
  } else {
    // Fallback to demo mode (local only)
    // Note: In demo mode, messages are not persisted
    setMessage("")
  }
}
```

**Explanation:**
- Calls `sendMessage` from hook (which calls backend API)
- Passes `whisperMode` as `isInternal` parameter
- Clears input on success
- Handles errors gracefully
- Maintains backward compatibility with demo mode

#### Added Null Checks
- Added null checks for `activeConvo` throughout the component
- Prevents errors when switching between demo and real conversations

---

### 2. `components/inbox/conversation-panel.tsx` - Conversation View Panel

**Changes Made:**

#### Import Hook and Types
```typescript
import { useConversationMessages } from "@/lib/hooks/useConversationMessages"
import type { DbMessage } from "@/lib/types"
```

#### Use Hook
```typescript
// Demo agent ID - replace with real agent ID from context/store
const agentId = "00000000-0000-0000-0000-000000000001" // TODO: Get from auth context

// Use realtime hook for messages
const { messages: dbMessages, send: sendMessage } = useConversationMessages({
  conversationId: conversation?.id ?? null,
  agentId,
})
```

**Explanation:**
- Uses conversation ID from props (or null if no conversation)
- Gets messages and send function from hook

#### Convert DB Messages to Message Format
```typescript
// Convert DbMessage to Message format for rendering
const convertDbMessageToMessage = (msg: DbMessage): Message => {
  const isAgent = msg.sender_type === "agent"
  const isInternal = isAgent && msg.is_internal

  return {
    id: msg.id,
    type: msg.sender_type === "customer" ? "customer" : isInternal ? "agent" : "agent",
    content: msg.content,
    timestamp: new Date(msg.created_at),
    sentiment: null, // Can be added if available in DB
    confidence: null,
    isTranscript: false,
  }
}

// Use real messages from DB if available, otherwise fall back to conversation.messages
const messages = conversation?.id && dbMessages.length > 0
  ? dbMessages.map(convertDbMessageToMessage)
  : conversation?.messages || []
```

**Explanation:**
- Converts `DbMessage` to `Message` type used by `renderMessage` function
- Maps database fields to display format
- Falls back to `conversation.messages` if no real messages

#### Update Message Rendering
```typescript
{/* Messages */}
<div className="flex-1 overflow-y-auto p-6">{messages.map(renderMessage)}</div>
```

**Explanation:**
- Uses `messages` from conversion (real or fallback)
- Renders using existing `renderMessage` function

#### Add Send Handler
```typescript
<Button 
  size="sm"
  onClick={async () => {
    const trimmed = message.trim()
    if (!trimmed || !conversation?.id) return
    
    try {
      await sendMessage(trimmed, false) // isInternal = false for regular messages
      setMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
      // Optionally show error toast
    }
  }}
>
  <Send className="h-4 w-4 mr-1" />
  Send
</Button>
```

**Explanation:**
- Calls `sendMessage` from hook
- Passes `false` for `isInternal` (regular messages)
- Clears input on success
- Handles errors

#### Add Enter Key Support
```typescript
<Textarea
  placeholder="Type your message..."
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const trimmed = message.trim()
      if (trimmed && conversation?.id) {
        sendMessage(trimmed, false).then(() => setMessage("")).catch(console.error)
      }
    }
  }}
  className="min-h-[80px] resize-none"
/>
```

**Explanation:**
- Sends message on Enter key press
- Shift+Enter allows new line
- Prevents default form submission

---

## Features Implemented

### 1. Option A Pattern (Append on Send + Dedupe Realtime Echo)

**How It Works:**
1. Agent types message and clicks Send
2. Frontend calls `sendMessage()` hook function
3. Hook calls backend API `POST /api/messages`
4. Backend inserts message into database
5. Backend returns inserted message (with `id`)
6. **Frontend immediately appends message to UI** (Option A)
7. Supabase Realtime broadcasts the INSERT event
8. Frontend receives Realtime event
9. **Frontend checks `seenIds` - message ID already exists**
10. **Frontend ignores Realtime echo** (deduplication)
11. Result: Message appears once, instantly

**Benefits:**
- ✅ Instant UI feedback (no waiting for Realtime)
- ✅ No duplicate messages
- ✅ Works even if Realtime is slow or fails
- ✅ Better user experience

### 2. Automatic Subscription Management

**How It Works:**
- When conversation is selected, `useEffect` runs
- Hook subscribes to Realtime for that conversation
- When conversation changes, cleanup function runs
- Old subscription is removed
- New subscription is created for new conversation

**Benefits:**
- ✅ No memory leaks (cleanup on unmount)
- ✅ Only subscribed to active conversation
- ✅ Automatic reconnection if WebSocket drops

### 3. Type Safety

**How It Works:**
- TypeScript types for all data structures
- `DbMessage` type matches database schema
- Conversion functions ensure type safety
- Compile-time error checking

**Benefits:**
- ✅ Catches errors before runtime
- ✅ Better IDE autocomplete
- ✅ Self-documenting code

### 4. Backward Compatibility

**How It Works:**
- Components check if conversation ID is UUID string
- If UUID, use realtime hook
- If numeric (demo mode), use demo data
- Graceful fallback

**Benefits:**
- ✅ Works with existing demo data
- ✅ Easy migration to real data
- ✅ No breaking changes

### 5. Error Handling

**How It Works:**
- Try-catch blocks around API calls
- Console error logging
- Graceful degradation (fallback to demo data)
- User-friendly error messages (can add toast notifications)

**Benefits:**
- ✅ App doesn't crash on errors
- ✅ Errors are logged for debugging
- ✅ User experience maintained

---

## Data Flow

### Sending a Message

```
1. User types message → setMessage()
2. User clicks Send → handleSendMessage()
3. handleSendMessage() → sendMessage() (from hook)
4. sendMessage() → sendAgentMessage() (API client)
5. sendAgentMessage() → POST /api/messages (backend)
6. Backend → Insert into Supabase
7. Backend → Return inserted message
8. sendMessage() → Append to local state (Option A)
9. Supabase → Broadcast Realtime event
10. Frontend → Receive Realtime event
11. Frontend → Check seenIds, dedupe, ignore
```

### Receiving a Message (from another agent/customer)

```
1. Backend/Other client → Insert into Supabase
2. Supabase → Broadcast Realtime event
3. Frontend → Receive Realtime event
4. Frontend → Check seenIds (new message)
5. Frontend → Add to seenIds
6. Frontend → Append to messages state
7. React → Re-render UI with new message
```

### Loading Conversation

```
1. User selects conversation → setActiveConversationId()
2. useEffect() → Runs (conversationId changed)
3. fetchMessages() → GET /api/conversations/{id}/messages
4. Backend → Query Supabase, return messages
5. Frontend → Set messages state
6. Frontend → Populate seenIds with message IDs
7. subscribeToConversationMessages() → Create Realtime subscription
8. Supabase → Confirm subscription (SUBSCRIBED)
9. Frontend → Ready to receive new messages
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_SUPPORT_API_BASE_URL=http://localhost:8000
```

**Note:** All must be prefixed with `NEXT_PUBLIC_` to be available in the browser.

---

## Testing Checklist

1. ✅ Open conversation → Console shows `[realtime] <conversationId> SUBSCRIBED`
2. ✅ Send message → Message appears immediately
3. ✅ Check console → No duplicate messages
4. ✅ Switch conversation → Old subscription cleaned up, new one created
5. ✅ Receive message from another source → Appears via Realtime
6. ✅ Network error → Error logged, app doesn't crash

---

## Summary

The frontend implementation provides:

- ✅ **Realtime Message Streaming:** Instant message delivery via Supabase Realtime
- ✅ **Option A Pattern:** Immediate UI updates with deduplication
- ✅ **Backend API Integration:** All writes go through FastAPI backend
- ✅ **Type Safety:** Full TypeScript support
- ✅ **Automatic Management:** Subscriptions handled automatically
- ✅ **Error Handling:** Graceful error handling and fallbacks
- ✅ **Backward Compatibility:** Works with demo and real data

The architecture ensures security (backend-only writes), performance (instant updates), and reliability (deduplication, error handling).
