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

        // Use view to get conversations with customers (workaround for schema cache issue)
        const { data: convsWithCustomers, error: fetchError } = await supabase
          .from('conversations_with_customers')
          .select('*');

        if (fetchError) {
          console.error('Error fetching conversations:', fetchError);
          setError('Failed to load conversations');
          return;
        }

        // Fetch messages for each conversation
        const convIds = convsWithCustomers.map((c: any) => c.id);
        const { data: allMessages } = await supabase
          .from('cc_messages')
          .select('id, conversation_id, created_at, body_text')
          .in('conversation_id', convIds);

        // Group messages by conversation
        const messagesByConv = new Map();
        allMessages?.forEach((msg: any) => {
          if (!messagesByConv.has(msg.conversation_id)) {
            messagesByConv.set(msg.conversation_id, []);
          }
          messagesByConv.get(msg.conversation_id).push(msg);
        });

        const convs = convsWithCustomers.map((c: any) => ({
          ...c,
          cc_messages: messagesByConv.get(c.id) || []
        }));

        // Transform to Conversation format with ChatInbox expected fields
        const transformedConversations: any[] = convs.map((conv: any) => {
          const messages = conv.cc_messages || [];
          const lastMessage = messages.length > 0
            ? messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            : null;

          // Calculate time in queue (minutes since opened)
          const timeInQueue = Math.floor((Date.now() - new Date(conv.opened_at).getTime()) / (1000 * 60));

          const customerName = conv.customer_name || 'Unknown Customer';

          return {
            id: conv.id,
            customer: {
              id: conv.customer_id || conv.id,
              name: customerName,
              email: conv.customer_email || '',
              phone: conv.customer_phone || '',
              avatar: '/placeholder-user.jpg',
              language: 'English',
              preferredLanguage: 'en',
              tier: 'standard',
            },
            // Additional fields expected by ChatInbox
            customerName,
            timeInQueue: `${timeInQueue}m`,
            channel: conv.channel,
            status: conv.status,
            priority: conv.priority || 'medium',
            sentiment: conv.sentiment || 'neutral',
            sentimentScore: 0.5,
            sla: {
              deadline: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
              remaining: 30 * 60 * 1000,
              status: 'healthy',
            },
            assignedTo: conv.assigned_agent_id || null,
            queue: conv.assigned_queue || 'general',
            topic: conv.topic || '',
            lastMessage: lastMessage?.body_text || '',
            lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : new Date(conv.opened_at),
            startTime: new Date(conv.opened_at),
            messages: messages.map((msg: any) => ({
              id: msg.id,
              type: 'customer', // Default, would need more logic
              content: msg.body_text || '',
              timestamp: new Date(msg.created_at),
            })),
            aiConfidence: 0.8,
            escalationRisk: false,
            tags: [],
            industry: 'banking',
          };
        });

        setConversations(transformedConversations);
      } catch (err) {
        console.error('Error in fetchConversations:', err);
        setError('Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    // Set up real-time subscription for conversation updates
    const channel = supabase
      .channel(`conversations`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cc_conversations',
        },
        () => {
          // Refetch conversations when there are changes
          fetchConversations();
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