# Step 3 Runtime Wiring Fix

## Problem
- `cc_messages` has 22 rows but `cc_identity_links` has 0 rows
- `ensureIdentityLink()` was not being called correctly or was failing due to RLS

## Solution
1. Created service role Supabase client (`lib/supabase-server.ts`)
2. Updated `ensureIdentityLink()` to use service client and proper upsert logic
3. Moved `ensureIdentityLink()` call to immediately after parsing `From` (before message storage)
4. Added audit events for success/failure
5. Updated all identity resolution functions to use service client

## Files Modified

### 1. `lib/supabase-server.ts` (NEW FILE)

```typescript
/**
 * Supabase server-side client with service role key
 * Use this for server-side operations that need to bypass RLS
 * DO NOT expose this key to the client
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_CONTACT_CENTER_SECRET_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase service role key not configured. Please set SUPABASE_CONTACT_CENTER_SECRET_KEY in your .env.local file.');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

### 2. `lib/identity-resolution.ts` (MODIFIED)

**Changes:**
- Replaced `import { supabase } from './supabase'` with `import { supabaseServer } from './supabase-server'`
- Updated all `supabase` references to `supabaseServer` throughout the file
- Rewrote `ensureIdentityLink()` to:
  - Use proper upsert logic (check exists, update or insert)
  - Always update `last_seen_at`
  - Preserve existing `bank_customer_id` and `is_verified` when updating
  - Handle race conditions (unique constraint violations)
  - Add audit events: `identity_link_upserted` (success) and `identity_link_upsert_failed` (failure)

**Key Function Changes:**

```typescript
// OLD: Used anon client
import { supabase } from './supabase';
const { data } = await supabase.from('cc_identity_links')...

// NEW: Uses service client
import { supabaseServer } from './supabase-server';
const { data } = await supabaseServer.from('cc_identity_links')...
```

**ensureIdentityLink() Implementation:**

```typescript
export async function ensureIdentityLink(params: {
  channel: 'whatsapp' | 'email' | 'voice' | 'sms';
  address: string;
  conversationId?: string;
}): Promise<string | null> {
  const { channel, address, conversationId } = params;
  const normalizedAddress = normalizeAddress(channel, address);

  try {
    // Check if link exists
    const { data: existing } = await supabaseServer
      .from('cc_identity_links')
      .select('id, bank_customer_id, is_verified, confidence')
      .eq('channel', channel)
      .eq('address', normalizedAddress)
      .maybeSingle();

    if (existing) {
      // Update existing - always update last_seen_at, preserve other fields
      const { data: updatedLink, error: updateError } = await supabaseServer
        .from('cc_identity_links')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('id')
        .single();

      if (updateError) throw updateError;

      // Audit: Success
      await writeAuditLog({
        conversationId,
        actorType: 'system',
        eventType: 'identity_link_upserted',
        eventVersion: 1,
        inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
        outputRedacted: { identityLinkId: updatedLink?.id || existing.id },
        success: true,
      });

      return updatedLink?.id || existing.id;
    }

    // Create new link
    const { data: newLink, error: insertError } = await supabaseServer
      .from('cc_identity_links')
      .insert({
        channel,
        address: normalizedAddress,
        is_verified: false,
        confidence: 0,
        last_seen_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle race condition (unique constraint violation)
      if (insertError.code === '23505') {
        const { data: raceLink } = await supabaseServer
          .from('cc_identity_links')
          .select('id')
          .eq('channel', channel)
          .eq('address', normalizedAddress)
          .maybeSingle();

        if (raceLink) {
          await supabaseServer
            .from('cc_identity_links')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', raceLink.id);

          await writeAuditLog({
            conversationId,
            actorType: 'system',
            eventType: 'identity_link_upserted',
            eventVersion: 1,
            inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
            outputRedacted: { identityLinkId: raceLink.id },
            success: true,
          });

          return raceLink.id;
        }
      }

      throw insertError;
    }

    // Audit: Success (new link created)
    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType: 'identity_link_upserted',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      outputRedacted: { identityLinkId: newLink?.id },
      success: true,
    });

    return newLink?.id || null;
  } catch (error: any) {
    // Audit: Failure
    await writeAuditLog({
      conversationId,
      actorType: 'system',
      eventType: 'identity_link_upsert_failed',
      eventVersion: 1,
      inputRedacted: { channel, addressPrefix: normalizedAddress.substring(0, 10) + '...' },
      success: false,
      errorCode: 'IDENTITY_LINK_UPSERT_FAILED',
      errorMessage: error?.message || 'Unknown error upserting identity link',
    });

    console.error('Error in ensureIdentityLink:', error);
    return null;
  }
}
```

### 3. `app/api/twilio/whatsapp/incoming/route.ts` (MODIFIED)

**Changes:**
- Moved `ensureIdentityLink()` call to immediately after parsing `From` (before message storage)
- Added logging for identity link creation
- Pass `conversationId` to `ensureIdentityLink()` after conversation is created

**Key Changes:**

```typescript
// OLD: Called after message storage
// B) Normalize + store inbound message (idempotent)
const { createBankingConversationFromMessage } = await import('@/lib/banking-store');
const { ensureIdentityLink, resolveIdentity } = await import('@/lib/identity-resolution');

// Step 3: Ensure identity link exists (create if not exists)
await ensureIdentityLink({
  channel: 'whatsapp',
  address: from,
});

// NEW: Called immediately after parsing From (before message storage)
// Step 3: Ensure identity link exists IMMEDIATELY after parsing From
// This must happen before message storage and orchestrator processing
const { ensureIdentityLink, resolveIdentity } = await import('@/lib/identity-resolution');
const identityLinkId = await ensureIdentityLink({
  channel: 'whatsapp',
  address: from,
  conversationId: undefined, // Will be set after conversation creation
});
console.log('🔗 Identity link ensured:', identityLinkId ? 'Created/Updated' : 'Failed', from);

// B) Normalize + store inbound message (idempotent)
const { createBankingConversationFromMessage } = await import('@/lib/banking-store');
```

### 4. `lib/banking-store.ts` (MODIFIED)

**Changes:**
- Replaced `import { supabase } from './supabase'` with `import { supabaseServer } from './supabase-server'`
- Use service client for all operations (consistent with message inserts)

```typescript
// OLD
import { supabase } from './supabase';

// NEW
import { supabaseServer } from './supabase-server';
const supabase = supabaseServer; // Use server client for all operations
```

## Environment Variable Required

Add to `.env.local`:
```
SUPABASE_CONTACT_CENTER_SECRET_KEY=your_service_role_key_here
```

Get the service role key from Supabase Dashboard → Settings → API → Service Role Key

## Testing

After applying these changes:
1. Send a WhatsApp message to your Twilio number
2. Check `cc_identity_links` table - should have a new row
3. Check `cc_audit_logs` table - should have `identity_link_upserted` event
4. Verify `last_seen_at` is updated on subsequent messages from same address

## Summary

- ✅ `ensureIdentityLink()` called immediately after parsing `From` (before message storage)
- ✅ Uses service role client (same as message inserts, bypasses RLS)
- ✅ Proper upsert logic (check exists, update or insert)
- ✅ Always updates `last_seen_at`
- ✅ Preserves existing `bank_customer_id` and `is_verified` when updating
- ✅ Handles race conditions
- ✅ Audit events: `identity_link_upserted` (success) and `identity_link_upsert_failed` (failure)

