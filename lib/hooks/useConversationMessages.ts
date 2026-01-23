"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getConversationMessages, sendMessage } from '../chat-queries';
import type { DbMessage } from '../types';

interface UseConversationMessagesProps {
  conversationId: string | null;
  agentId: string;
  source?: 'banking' | 'default';
  channel?: 'voice' | 'chat' | 'email' | 'whatsapp' | 'sms';
}

interface UseConversationMessagesReturn {
  messages: DbMessage[];
  send: (content: string, isInternal?: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useConversationMessages({
  conversationId,
  agentId,
  source = 'default',
  channel,
}: UseConversationMessagesProps): UseConversationMessagesReturn {
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const msgs = await getConversationMessages(conversationId, source);
        setMessages(msgs);
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId, source]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const realtimeChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage: DbMessage = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_type: payload.new.sender_type || payload.new.type || 'customer',
            content: payload.new.content || '',
            created_at: payload.new.created_at || payload.new.timestamp,
            is_internal: payload.new.is_internal || payload.new.metadata?.is_internal || false,
            metadata: payload.new.metadata || payload.new.payload || {},
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [conversationId, source]);

  // Send message function
  const send = useCallback(async (content: string, isInternal: boolean = false) => {
    if (!conversationId || !content.trim()) return;

    try {
      setError(null);

      // Send to backend - real-time subscription will add the message to UI
      const sentMessage = await sendMessage(conversationId, content.trim(), 'agent', isInternal, {
        source,
        channel,
        agentId,
      });

      if (!sentMessage) {
        setError('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [conversationId, source, channel]);

  return {
    messages,
    send,
    isLoading,
    error,
  };
}