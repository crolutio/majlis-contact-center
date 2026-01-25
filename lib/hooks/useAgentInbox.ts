"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { Conversation } from '../sample-data';
import { getHandlingStatus } from '../conversation-handling';

interface UseAgentInboxReturn {
  conversations: (Conversation & { customerName: string; timeInQueue: string })[];
  isLoading: boolean;
  error: string | null;
}

export function useAgentInbox(agentId: string | null): UseAgentInboxReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useAgentInbox] Fetching conversations...');

      // Get conversations with customer data (limited for performance)
      const { data: convsWithCustomers, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('last_message_time', { ascending: false })
        .limit(100);

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

      // PERFORMANCE: Don't fetch all messages for list view
      // Messages are fetched separately when viewing a specific conversation
      // This dramatically improves load time for large inboxes

      // Transform to Conversation format with ChatInbox expected fields
      const transformedConversations: any[] = convsWithCustomers.map((conv: any) => {
        // Calculate time in queue (minutes since start_time)
        // Handle null/undefined start_time to prevent NaN
        const startTime = conv.start_time ? new Date(conv.start_time).getTime() : Date.now();
        const timeInQueue = Math.floor((Date.now() - startTime) / (1000 * 60));

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
          // Use last_message from conversation record (no need to fetch all messages)
          lastMessage: conv.last_message || '',
          lastMessageTime: new Date(conv.last_message_time || conv.start_time || Date.now()),
          startTime: new Date(conv.start_time || Date.now()),
          // PERFORMANCE: Messages loaded separately when viewing conversation detail
          messages: [],
          aiConfidence: 0.8,
          escalationRisk: conv.escalation_risk || false,
          tags: [],
          industry: 'banking',
          metadata: {
            source: conv.source || conv.industry || 'default',
            handlingMode: conv.handling_mode || null,
            handoverRequired: conv.handover_required ?? null,
          },
        };
      });

      console.log('[useAgentInbox] Transformed conversations:', transformedConversations.length);

      // Filter to only show conversations that need human attention (escalated or assigned)
      // Hide AI-handled conversations until customer escalates
      const escalatedConversations = transformedConversations.filter((conv: any) => {
        const handlingStatus = getHandlingStatus(conv);
        return handlingStatus !== 'ai-handled';
      });

      console.log('[useAgentInbox] Filtered to escalated conversations:', escalatedConversations.length);
      setConversations(escalatedConversations);
    } catch (err) {
      console.error('[useAgentInbox] Error in fetchConversations:', err);
      setError(`Failed to load conversations: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Allow fetching conversations even without specific agent ID (for demo/development)
    // In production, you'd want to ensure agentId is present

    fetchConversations();

    // Set up real-time subscription for conversation updates
    const channel = supabase
      .channel(`conversations`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const updatedConversation = payload.new;

          setConversations(prevConversations => {
            const exists = prevConversations.some(conv => conv.id === updatedConversation.id);

            // If it's newly escalated and not in the list yet, refetch with customer join
            if (!exists) {
              const handlingStatus = getHandlingStatus({
                ...updatedConversation,
                assignedTo: updatedConversation.assigned_to || null,
                escalationRisk: updatedConversation.escalation_risk || false,
                metadata: {
                  source: updatedConversation.source || updatedConversation.industry || 'default',
                  handlingMode: updatedConversation.handling_mode || null,
                  handoverRequired: updatedConversation.handover_required ?? null,
                },
              } as Conversation);

              if (handlingStatus !== 'ai-handled') {
                fetchConversations();
              }

              return prevConversations;
            }

            const updated = prevConversations.map(conv => {
              if (conv.id === updatedConversation.id) {
                // Transform the updated conversation data similar to fetchConversations
                const customer = updatedConversation.customer || conv.customer || {};
                const customerName = customer.name || customer.email || 'Unknown Customer';

                const updatedConv = {
                  ...conv,
                  status: updatedConversation.status,
                  lastMessage: updatedConversation.last_message || conv.lastMessage,
                  lastMessageTime: new Date(updatedConversation.last_message_time || conv.lastMessageTime),
                  assignedTo: updatedConversation.assigned_to || conv.assignedTo,
                  escalationRisk: updatedConversation.escalation_risk || conv.escalationRisk,
                  metadata: {
                    ...(conv.metadata || {}),
                    source: updatedConversation.source || conv.metadata?.source || 'default',
                    handlingMode: updatedConversation.handling_mode || conv.metadata?.handlingMode || null,
                    handoverRequired:
                      updatedConversation.handover_required ??
                      conv.metadata?.handoverRequired ??
                      null,
                  },
                  // Update other fields as needed
                };

                return updatedConv;
              }
              return conv;
            });

            // Re-apply the escalation filter in case the conversation status changed
            return updated.filter((conv: any) => {
              const handlingStatus = getHandlingStatus(conv);
              return handlingStatus !== 'ai-handled';
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, fetchConversations]);

  return {
    conversations,
    isLoading,
    error,
  };
}