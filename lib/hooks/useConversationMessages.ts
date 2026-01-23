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
        console.log('[useConversationMessages] Loading messages for conversation:', conversationId);
        const msgs = await getConversationMessages(conversationId);
        console.log('[useConversationMessages] Loaded messages:', msgs.length, msgs);
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

    console.log('[useConversationMessages] Setting up real-time subscription for conversation:', conversationId, 'agentId:', agentId);

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages', // Changed from 'cc_messages' to 'messages'
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('[useConversationMessages] New message received:', payload.new);
          
          // Skip agent messages from the current agent (already rendered optimistically)
          const isAgentMessage = payload.new.sender_type === 'agent';
          const isFromCurrentAgent = payload.new.sender_agent_id === agentId;
          
          if (isAgentMessage && isFromCurrentAgent) {
            console.log('[useConversationMessages] Skipping agent message from current agent (already rendered optimistically):', payload.new.id);
            return;
          }

          const newMessage: DbMessage = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_type: payload.new.sender_type || 'customer', // Use sender_type directly (not direction)
            content: payload.new.content || '', // Use content field (not body_text or text)
            created_at: payload.new.created_at,
            is_internal: payload.new.is_internal || false,
            metadata: payload.new.metadata || {},
          };

          console.log('[useConversationMessages] Adding new message to state:', newMessage);
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) {
              console.log('[useConversationMessages] Message already exists, skipping:', newMessage.id);
              return prev;
            }
            // Add new message and sort by created_at to maintain chronological order
            const updated = [...prev, newMessage];
            updated.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            console.log('[useConversationMessages] Updated messages count:', updated.length);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      console.log('[useConversationMessages] Cleaning up real-time subscription for conversation:', conversationId);
      supabase.removeChannel(channel);
    };
  }, [conversationId, agentId]);

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

      // Send to backend API
      const sentMessage = await sendMessage(conversationId, content.trim(), 'agent', isInternal, agentId);

      if (sentMessage) {
        // Replace optimistic message with real one
        // Also check if the real message already exists (from real-time subscription, though it should be skipped)
        setMessages(prev => {
          // Remove optimistic message
          const withoutOptimistic = prev.filter(msg => msg.id !== optimisticMessage.id);
          // Check if real message already exists
          const alreadyExists = withoutOptimistic.some(msg => msg.id === sentMessage.id);
          if (alreadyExists) {
            console.log('[useConversationMessages] Real message already exists, skipping replacement:', sentMessage.id);
            return withoutOptimistic;
          }
          // Add real message and sort
          const updated = [...withoutOptimistic, sentMessage];
          updated.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return updated;
        });
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
  }, [conversationId, agentId]);

  return {
    messages,
    send,
    isLoading,
    error,
  };
}