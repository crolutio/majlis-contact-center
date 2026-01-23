-- Migration: Clean up conversations with invalid/missing timestamps
-- This removes conversations that show "0m ago" or have corrupted timestamp data

-- Remove conversations where last_message_time is NULL or invalid (epoch 0)
DELETE FROM conversations
WHERE last_message_time IS NULL
   OR last_message_time = '1970-01-01 00:00:00+00'::timestamptz
   OR EXTRACT(epoch FROM last_message_time) = 0;

-- Remove conversations where start_time is NULL or invalid (epoch 0)
DELETE FROM conversations
WHERE start_time IS NULL
   OR start_time = '1970-01-01 00:00:00+00'::timestamptz
   OR EXTRACT(epoch FROM start_time) = 0;

-- Also clean up any orphaned messages for deleted conversations
DELETE FROM messages
WHERE conversation_id NOT IN (
  SELECT id FROM conversations
);