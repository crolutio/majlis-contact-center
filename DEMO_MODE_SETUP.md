# Demo Mode Setup Guide

## Quick Start

To enable demo mode and prevent Next.js API route crashes:

1. **Add to `.env.local`:**
   ```bash
   NEXT_PUBLIC_DEMO_MODE=true
   ```

2. **Restart your Next.js dev server**

3. **Verify:** Open `/chat-agent` - should load without 500 errors

## What Was Changed

### ✅ Fixed: `lib/supabase-server.ts`
- Changed from immediate client creation to **lazy getter pattern**
- Uses a Proxy to maintain backward compatibility
- Only throws errors when actually used (not at import time)
- Prevents dev server crashes when `SUPABASE_SERVICE_ROLE_KEY` is missing

### ✅ Removed: Agent Status API Route
- **Route deleted:** `app/api/agents/status/route.ts`
- **Pages cleaned up:**
  - `app/(dashboard)/chat-agent/page.tsx`
  - `app/(dashboard)/agent-desktop/page.tsx`
  - `app/(dashboard)/call-agent/page.tsx`

- **What was removed:**
  - GET `/api/agents/status` endpoint (file deleted)
  - PATCH `/api/agents/status` endpoint (file deleted)
  - All API call logic removed from UI pages

- **Current behavior:**
  - Agent status works in **local state only** (UI-only, no persistence)
  - Status dropdown still changes UI appearance
  - Queue counts are static demo values (0 calls, 1 chat)
  - No network requests made (route no longer exists)

## What Still Works

✅ **Chat functionality (core demo):**
- Sending messages via FastAPI backend
- Receiving messages via Supabase Realtime
- Chat UI and message history
- All chat interactions

✅ **Other features:**
- Authentication
- Navigation
- UI components
- All non-API-dependent features

## Testing

After enabling demo mode, verify:

1. **No 500 errors:**
   ```bash
   # Check terminal - should see no errors about SUPABASE_SERVICE_ROLE_KEY
   ```

2. **No API calls:**
   - Open browser DevTools → Network tab
   - Navigate to `/chat-agent`
   - Should see **no requests** to `/api/agents/status`

3. **UI still works:**
   - Agent status dropdown changes status (local state)
   - Queue badges show demo values
   - Chat messages send/receive normally

## Note on Removed Routes

The `/api/agents/status` route has been **permanently removed** as part of the FastAPI-only backend migration. It cannot be re-enabled because:

- The route file has been deleted
- UI code has been cleaned up (no API call logic)
- This aligns with Option 2 architecture (FastAPI-only backend)

If agent status functionality is needed in the future, it should be implemented in the FastAPI backend (`backend/app/routes/`) instead.

## Files Modified

- `lib/supabase-server.ts` - Lazy getter + Proxy pattern
- `app/api/agents/status/route.ts` - **DELETED** (route removed)
- `app/(dashboard)/chat-agent/page.tsx` - Removed API calls, local state only
- `app/(dashboard)/agent-desktop/page.tsx` - Removed API calls, local state only
- `app/(dashboard)/call-agent/page.tsx` - Removed API calls, local state only
- `docs/DEMO_MODE_DISABLED_FEATURES.md` - Updated to reflect removal

## Notes

- Route file has been permanently deleted
- UI code cleaned up (no API call logic remaining)
- Agent status is UI-only (local state, no persistence)
- Chat demo (FastAPI + Realtime) is unaffected
- This is part of Option 2 migration (FastAPI-only backend)
