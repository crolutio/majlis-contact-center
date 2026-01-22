"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getConversationMessages, sendMessage } from '../chat-queries';
import type { DbMessage } from '../types';

interface UseConversationMessagesProps {
  conversationId: string | null;
  agentId: string;
}

interface UseConversationMessagesReturn {
  messages: DbMessage[];
  send: (content: string, isInternal?: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useConversationMessages({
  conversationId,
  agentId
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
        const msgs = await getConversationMessages(conversationId);
        setMessages(msgs);
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cc_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage: DbMessage = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_type: payload.new.direction === 'inbound' ? 'customer' : 'agent',
            content: payload.new.body_text || payload.new.text || '',
            created_at: payload.new.created_at,
            is_internal: payload.new.metadata?.is_internal || false,
            metadata: payload.new.metadata || {},
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Send message function
  const send = useCallback(async (content: string, isInternal: boolean = false) => {
    if (!conversationId || !content.trim()) return;

    try {
      setError(null);

      // Optimistically add the message to UI
      const optimisticMessage: DbMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent',
        content: content.trim(),
        created_at: new Date().toISOString(),
        is_internal: isInternal,
        metadata: {},
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Send to backend
      const sentMessage = await sendMessage(conversationId, content.trim(), 'agent', isInternal);

      if (sentMessage) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(msg =>
            msg.id === optimisticMessage.id ? sentMessage : msg
          )
        );
      } else {
        // Remove optimistic message on failure
        setMessages(prev =>
          prev.filter(msg => msg.id !== optimisticMessage.id)
        );
        setError('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [conversationId]);

  return {
    messages,
    send,
    isLoading,
    error,
  };
}