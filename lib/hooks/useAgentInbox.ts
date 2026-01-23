"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Conversation } from '../sample-data';

interface UseAgentInboxReturn {
  conversations: (Conversation & { customerName: string; timeInQueue: string })[];
  isLoading: boolean;
  error: string | null;
}

export function useAgentInbox(agentId: string | null): UseAgentInboxReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Allow fetching conversations even without specific agent ID (for demo/development)
    // In production, you'd want to ensure agentId is present

    const fetchConversations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[useAgentInbox] Fetching conversations...');

        // Get conversations assigned to this agent with handling_mode='human'
        let query = supabase
          .from('conversations')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('handling_mode', 'human');  // Only show human-handled conversations
        
        // Filter by assigned agent if agentId is provided
        if (agentId) {
          query = query.eq('assigned_agent_id', agentId);
        }
        
        const { data: convsWithCustomers, error: fetchError } = await query;

        console.log('[useAgentInbox] Response:', { 
          data: convsWithCustomers, 
          error: fetchError,
          count: convsWithCustomers?.length 
        });

        if (fetchError) {
          console.error('[useAgentInbox] Error fetching conversations:', fetchError);
          setError(`Failed to load conversations: ${fetchError.message}`);
          return;
        }

        if (!convsWithCustomers || convsWithCustomers.length === 0) {
          console.log('[useAgentInbox] No conversations found');
          setConversations([]);
          return;
        }

        // Fetch messages for each conversation
        const convIds = convsWithCustomers.map((c: any) => c.id);
        const { data: allMessages } = await supabase
          .from('messages')
          .select('id, conversation_id, created_at, content')
          .in('conversation_id', convIds);

        // Group messages by conversation
        const messagesByConv = new Map();
        allMessages?.forEach((msg: any) => {
          if (!messagesByConv.has(msg.conversation_id)) {
            messagesByConv.set(msg.conversation_id, []);
          }
          messagesByConv.get(msg.conversation_id).push(msg);
        });

        // Transform to Conversation format with ChatInbox expected fields
        // Filter out any AI conversations that might have slipped through
        const transformedConversations: any[] = convsWithCustomers
          .filter((conv: any) => {
            // Safety check: only include human-handled conversations
            const isHuman = conv.handling_mode === 'human';
            const matchesAgent = !agentId || conv.assigned_agent_id === agentId;
            if (!isHuman) {
              console.warn('[useAgentInbox] Filtering out AI conversation:', conv.id, {
                handling_mode: conv.handling_mode,
                assigned_agent_id: conv.assigned_agent_id,
                agentId,
              });
            }
            return isHuman && matchesAgent;
          })
          .map((conv: any) => {
          const messages = messagesByConv.get(conv.id) || [];
          const lastMessage = messages.length > 0
            ? messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            : null;

          // Calculate time in queue (minutes since created_at)
          // Handle null/undefined created_at to prevent NaN
          const createdAt = conv.created_at ? new Date(conv.created_at).getTime() : Date.now();
          const timeInQueue = Math.floor((Date.now() - createdAt) / (1000 * 60));

          const customer = conv.customer || {};
          const customerName = customer.name || customer.email || 'Unknown Customer';

          return {
            id: conv.id,
            customer: {
              id: customer.id || conv.customer_id || conv.id,
              name: customerName,
              email: customer.email || '',
              phone: customer.phone || '',
              avatar: customer.avatar_url || '/placeholder-user.jpg',
              language: customer.preferred_language || 'English',
              preferredLanguage: customer.preferred_language || 'en',
              tier: customer.tier || 'standard',
            },
            // Additional fields expected by ChatInbox
            customerName,
            timeInQueue: isNaN(timeInQueue) ? '0m' : `${timeInQueue}m`,
            channel: conv.channel,
            status: conv.status,
            priority: conv.priority || 'medium',
            sentiment: conv.sentiment || 'neutral',
            sentimentScore: 0.5,
            sla: {
              deadline: conv.sla_deadline ? new Date(conv.sla_deadline) : new Date(Date.now() + 30 * 60 * 1000),
              remaining: conv.sla_remaining || 30 * 60 * 1000,
              status: conv.sla_status || 'healthy',
            },
            assignedTo: conv.assigned_to || null,
            queue: conv.queue || 'general',
            topic: conv.topic || '',
            lastMessage: lastMessage?.content || conv.last_message || '',
            lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : new Date(conv.last_message_time || conv.created_at),
            startTime: new Date(conv.created_at),
            messages: messages.map((msg: any) => ({
              id: msg.id,
              type: 'customer', // Default, would need more logic
              content: msg.content || '',
              timestamp: new Date(msg.created_at),
            })),
            aiConfidence: 0.8,
            escalationRisk: false,
            tags: [],
            industry: 'banking',
          };
        });

        console.log('[useAgentInbox] Transformed conversations:', transformedConversations.length);
        setConversations(transformedConversations);
      } catch (err) {
        console.error('[useAgentInbox] Error in fetchConversations:', err);
        setError(`Failed to load conversations: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time subscription for conversation updates
    // Only listen for conversations assigned to this agent with handling_mode='human'
    if (!agentId) {
      return; // No cleanup needed if no agentId
    }

    const channel = supabase
      .channel(`agent_conversations:${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `assigned_agent_id=eq.${agentId}`,  // Filter at database level
        },
        (payload) => {
          // Additional check: only refetch if handling_mode is 'human'
          const conv = payload.new || payload.old;
          if (conv && conv.handling_mode === 'human' && conv.assigned_agent_id === agentId) {
            console.log('[useAgentInbox] Realtime update for human-handled conversation:', conv.id);
            fetchConversations();
          } else {
            console.log('[useAgentInbox] Ignoring realtime update (not human-handled):', {
              id: conv?.id,
              handling_mode: conv?.handling_mode,
              assigned_agent_id: conv?.assigned_agent_id,
              agentId,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  return {
    conversations,
    isLoading,
    error,
  };
}