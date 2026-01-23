/**
 * Cleanup script to remove conversations with invalid/missing timestamps
 * Run with: node scripts/cleanup-invalid-timestamps.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for deletes

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupInvalidTimestamps() {
  console.log('🧹 Cleaning up conversations with invalid timestamps...\n');

  try {
    // First, let's count how many conversations we have before cleanup
    const { count: beforeCount, error: countError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting conversations:', countError);
      return;
    }

    console.log(`📊 Total conversations before cleanup: ${beforeCount}`);

    // Find conversations with null timestamps
    const { data: nullTimestamps, error: nullError } = await supabase
      .from('conversations')
      .select('id')
      .or('last_message_time.is.null,start_time.is.null');

    if (nullError) {
      console.error('❌ Error finding conversations with null timestamps:', nullError);
      return;
    }

    console.log(`🔍 Found ${nullTimestamps?.length || 0} conversations with null timestamps`);

    // Delete conversations with null timestamps
    if (nullTimestamps && nullTimestamps.length > 0) {
      const { error: deleteNullError } = await supabase
        .from('conversations')
        .delete()
        .in('id', nullTimestamps.map(c => c.id));

      if (deleteNullError) {
        console.error('❌ Error deleting conversations with null timestamps:', deleteNullError);
        return;
      }

      console.log(`🗑️  Deleted ${nullTimestamps.length} conversations with null timestamps`);
    }

    // For epoch timestamps, we'll use a different approach
    // Get all conversations and filter client-side for epoch 0
    const { data: allConversations, error: allError } = await supabase
      .from('conversations')
      .select('id, last_message_time, start_time');

    if (allError) {
      console.error('❌ Error fetching all conversations:', allError);
      return;
    }

    // Filter for epoch 0 timestamps (invalid dates)
    const epochConversations = allConversations?.filter(conv => {
      const lastMsgTime = conv.last_message_time ? new Date(conv.last_message_time).getTime() : null;
      const startTime = conv.start_time ? new Date(conv.start_time).getTime() : null;
      return (lastMsgTime === 0) || (startTime === 0);
    }) || [];

    console.log(`🔍 Found ${epochConversations.length} conversations with epoch 0 timestamps`);

    // Delete conversations with epoch 0 timestamps
    if (epochConversations.length > 0) {
      const { error: deleteEpochError } = await supabase
        .from('conversations')
        .delete()
        .in('id', epochConversations.map(c => c.id));

      if (deleteEpochError) {
        console.error('❌ Error deleting conversations with epoch timestamps:', deleteEpochError);
        return;
      }

      console.log(`🗑️  Deleted ${epochConversations.length} conversations with epoch 0 timestamps`);
    }

    // Count conversations after cleanup
    const { count: afterCount, error: afterCountError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    if (afterCountError) {
      console.error('❌ Error counting conversations after cleanup:', afterCountError);
      return;
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`📊 Conversations removed: ${beforeCount - afterCount}`);
    console.log(`📊 Total conversations remaining: ${afterCount}`);

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
  }
}

cleanupInvalidTimestamps();