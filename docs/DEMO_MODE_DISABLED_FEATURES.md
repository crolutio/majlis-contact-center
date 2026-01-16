# Demo Mode - Removed Features

## Overview

This document lists Next.js API route features that have been **removed** as part of the FastAPI-only backend migration. These routes are no longer needed since the FastAPI backend handles database operations.

## Removed API Routes

### `/api/agents/status`

**Status:** ✅ **REMOVED** (file deleted)

**Affected Pages:**
- `app/(dashboard)/chat-agent/page.tsx`
- `app/(dashboard)/agent-desktop/page.tsx`
- `app/(dashboard)/call-agent/page.tsx`

**What was removed:**
- **GET** `/api/agents/status?agentId={id}` - Agent status polling endpoint
- **PATCH** `/api/agents/status` - Agent status update endpoint
- **File:** `app/api/agents/status/route.ts` (deleted)

**Current Behavior:**
- Agent status is managed in **local state only** (UI-only)
- Status dropdown still works (changes UI appearance, no persistence)
- Queue counts are static demo values:
  - `callsInQueue`: 0
  - `chatsInQueue`: 1
- No network requests to `/api/agents/status` (route no longer exists)

**Why Removed:**
- Part of FastAPI-only backend migration (Option 2)
- Agent status functionality not required for chat demo
- Removes dependency on `SUPABASE_SERVICE_ROLE_KEY` in Next.js
- Simplifies codebase architecture

---

## Other API Routes (Not Yet Disabled)

The following routes are still active but may require `SUPABASE_SERVICE_ROLE_KEY`:

- `/api/agents/performance` - Used by `components/quality/agent-performance-dashboard.tsx`
- `/api/calls/active` - Used by `app/(dashboard)/live-console/page.tsx`
- `/api/knowledge/search` - Used by `app/(dashboard)/knowledge/page.tsx`
- `/api/integrations/*` - Used by `app/(dashboard)/integrations/page.tsx`
- `/api/connectivity/twilio` - Used by `app/(dashboard)/settings/page.tsx`

**Note:** These routes may cause errors if accessed while `SUPABASE_SERVICE_ROLE_KEY` is not set. They are not disabled yet as they are not part of the core chat demo flow.

---

## Implementation Details

### Lazy Supabase Server Client

The `lib/supabase-server.ts` file has been updated to use a **lazy getter pattern** to avoid crashing at import time:

```typescript
// Before: Crashed at import if key missing
export const supabaseServer = createClient(...)

// After: Only throws when actually used
export function getSupabaseServer() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set...')
  }
  return createClient(...)
}
```

This ensures that:
- Importing the file doesn't crash the dev server
- Errors only occur when code actually tries to use the server client
- Demo mode can run without the service role key

---

## Chat Demo Functionality

The core chat demo functionality **remains fully functional** in demo mode:

✅ **Working:**
- Sending messages via FastAPI backend (`/api/conversations`, `/api/messages`)
- Receiving messages via Supabase Realtime (anon client)
- Chat UI rendering and interaction
- Message history loading

❌ **Disabled:**
- Agent status polling
- Queue count updates
- Status persistence to database

---

## Migration Path (Future)

When ready to migrate to FastAPI-only backend:

1. **Remove Next.js API routes** (`app/api/**`)
2. **Update UI components** to call FastAPI endpoints instead
3. **Remove DEMO_MODE guards** from page components
4. **Update environment variables** to point to FastAPI backend

---

## Testing Checklist

After enabling demo mode:

- [ ] `/chat-agent` page loads without 500 errors
- [ ] No requests to `/api/agents/status` in Network tab
- [ ] Agent status dropdown changes UI (local state)
- [ ] Queue badges show static demo values
- [ ] Chat message send/receive still works
- [ ] No console errors about missing `SUPABASE_SERVICE_ROLE_KEY`

---

## Files Modified

1. `lib/supabase-server.ts` - Lazy getter pattern
2. `app/(dashboard)/chat-agent/page.tsx` - Disabled status polling
3. `app/(dashboard)/agent-desktop/page.tsx` - Disabled status polling
4. `app/(dashboard)/call-agent/page.tsx` - Disabled status polling

---

## Notes

- Removed routes are permanently deleted (not just disabled)
- UI code has been cleaned up to remove API call logic
- Agent status works in local state only (UI-only, no persistence)
- Chat functionality (FastAPI + Realtime) is unaffected
- This aligns with Option 2 migration (FastAPI-only backend)
