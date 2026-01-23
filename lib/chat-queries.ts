import { supabase } from './supabase';
import type { DbMessage, ConversationDetails } from './types';

// Re-export types for convenience
export type { ConversationDetails, DbMessage } from './types';

// Helper function to get channel color
function getChannelColor(channel: string): string {
  switch (channel?.toLowerCase()) {
    case 'voice':
      return 'bg-green-500';
    case 'chat':
      return 'bg-blue-500';
    case 'email':
      return 'bg-purple-500';
    case 'whatsapp':
      return 'bg-green-600';
    case 'sms':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

// Fallback mock data when database is not available
function getMockConversationDetails(conversationId: string): ConversationDetails {
  console.log('Generating mock conversation data for ID:', conversationId);

  const mockCustomers = [
    { id: '1', name: 'John Smith', email: 'john@example.com', phone: '+1234567890' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '+1234567891' },
    { id: '3', name: 'Mike Davis', email: 'mike@example.com', phone: '+1234567892' },
  ];

  const channels = ['chat', 'whatsapp', 'email', 'voice'];
  const statuses = ['active', 'waiting', 'escalated'];

  const customerIndex = Math.abs(conversationId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % mockCustomers.length;
  const channelIndex = Math.abs(conversationId.charCodeAt(0)) % channels.length;
  const statusIndex = Math.abs(conversationId.charCodeAt(conversationId.length - 1)) % statuses.length;

  const customer = mockCustomers[customerIndex];
  const channel = channels[channelIndex];
  const status = statuses[statusIndex];

  return {
    id: conversationId,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatar: '/placeholder-user.jpg',
      language: 'English',
      preferredLanguage: 'en',
      tier: 'standard',
    },
    channel,
    status,
    priority: 'medium',
    sentiment: 'neutral',
    sentimentScore: 0.5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    handlingMode: 'ai-assisted',
    customerName: customer.name,
    loyaltyStatus: 'standard',
    channelColor: getChannelColor(channel),
    smartReplies: [
      "Thank you for your patience. I'm here to help.",
      "I understand your concern. Let me assist you with that.",
      "Please provide more details so I can better help you.",
      "I'm checking your account information now.",
      "Let me transfer you to a specialist who can help."
    ],
    history: [],
    products: [],
    dni: customer.id,
  };
}

// Fallback mock messages when database is not available
function getMockConversationMessages(conversationId: string): DbMessage[] {
  console.log('Generating mock messages for conversation:', conversationId);

  const mockMessages = [
    {
      id: `${conversationId}-msg-1`,
      conversation_id: conversationId,
      sender_type: 'customer' as const,
      content: 'Hello, I need help with my account.',
      created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      is_internal: false,
      metadata: {},
    },
    {
      id: `${conversationId}-msg-2`,
      conversation_id: conversationId,
      sender_type: 'agent' as const,
      content: 'Hi there! I\'d be happy to help you with your account. What specific issue are you experiencing?',
      created_at: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
      is_internal: false,
      metadata: {},
    },
    {
      id: `${conversationId}-msg-3`,
      conversation_id: conversationId,
      sender_type: 'customer' as const,
      content: 'I\'m having trouble logging in. It says my password is incorrect but I\'m sure it\'s right.',
      created_at: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
      is_internal: false,
      metadata: {},
    },
    {
      id: `${conversationId}-msg-4`,
      conversation_id: conversationId,
      sender_type: 'agent' as const,
      content: 'I understand your frustration. Let me help you reset your password. First, can you confirm your account email address?',
      created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      is_internal: false,
      metadata: {},
    },
  ];

  return mockMessages;
}

export async function getConversationDetails(conversationId: string): Promise<ConversationDetails | null> {
  try {
    console.log('Fetching conversation details for ID:', conversationId);

    // Validate conversation ID
    if (!conversationId || conversationId.trim() === '') {
      console.log('Empty conversation ID provided');
      return null;
    }

    // First check if conversation exists without join
    const { data: basicConversation, error: basicError } = await supabase
      .from('conversations')
      .select('id, channel, status, created_at, customer_id')
      .eq('id', conversationId)
      .single();

    if (basicError) {
      console.error('Basic conversation query failed:', basicError);
      console.error('Conversation ID:', conversationId);
      console.error('Error details:', JSON.stringify(basicError, null, 2));

      // Fallback: Return mock data for demo purposes if database is not set up
      console.log('Using fallback mock data for conversation');
      return getMockConversationDetails(conversationId);
    }

    if (!basicConversation) {
      console.error('Conversation not found:', conversationId);
      return getMockConversationDetails(conversationId);
    }

    console.log('Found basic conversation:', basicConversation);

    // Now get the customer if they exist
    let customer = null;
    if (basicConversation.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('id', basicConversation.customer_id)
        .single();

      if (customerError) {
        console.warn('Customer lookup failed:', customerError);
      } else {
        customer = customerData;
      }
    }

    // Create conversation details with available data
    const conversationDetails: ConversationDetails = {
      id: basicConversation.id,
      customer: {
        id: customer?.id || conversationId,
        name: customer?.name || 'Unknown Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
        avatar: '/placeholder-user.jpg',
        language: 'English',
        preferredLanguage: 'en',
        tier: 'standard',
      },
      channel: basicConversation.channel,
      status: basicConversation.status,
      priority: 'medium', // Default
      sentiment: 'neutral', // Default
      sentimentScore: 0.5,
      created_at: basicConversation.created_at,
      updated_at: basicConversation.created_at,

      // Additional properties with defaults
      handlingMode: 'ai-assisted',
      customerName: customer?.name || 'Unknown Customer',
      loyaltyStatus: 'standard',
      channelColor: getChannelColor(basicConversation.channel),
      smartReplies: [
        "Thank you for your patience. I'm here to help.",
        "I understand your concern. Let me assist you with that.",
        "Please provide more details so I can better help you.",
        "I'm checking your account information now.",
        "Let me transfer you to a specialist who can help."
      ],
      history: [],
      products: [],
      dni: customer?.id || '',
    };

    console.log('Successfully created conversation details');
    return conversationDetails;
  } catch (error) {
    console.error('Error in getConversationDetails:', error);
    return null;
  }
}

export async function getConversationMessages(
  conversationId: string,
  source: 'banking' | 'default' = 'default'
): Promise<DbMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      console.log('Using fallback mock messages for conversation:', conversationId);
      return getMockConversationMessages(conversationId);
    }

    // Transform messages to DbMessage format
    const dbMessages: DbMessage[] = (messages || []).map((msg: any) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_type: (msg.sender_type || msg.type || 'customer') as 'customer' | 'agent' | 'ai' | 'system',
      content: msg.content || '',
      created_at: msg.created_at || msg.timestamp,
      is_internal: msg.is_internal || msg.metadata?.is_internal || false,
      metadata: msg.metadata || msg.payload || {},
    }));

    return dbMessages;
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    return [];
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: 'customer' | 'agent' | 'ai' | 'system' = 'agent',
  isInternal: boolean = false,
  options?: {
    source?: 'banking' | 'default';
    channel?: 'voice' | 'chat' | 'email' | 'whatsapp' | 'sms';
    agentId?: string;
    customerId?: string;
  }
): Promise<DbMessage | null> {
  try {
    const source = options?.source || 'default';
    const channel = options?.channel || 'chat';
    const createdAt = new Date().toISOString();

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_agent_id: options?.agentId || null,
        sender_customer_id: options?.customerId || null,
        content: content,
        created_at: createdAt,
        source,
        channel,
        is_internal: isInternal,
        metadata: { is_internal: isInternal },
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    // Update conversation with new message info
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_time: createdAt,
        status: 'active', // Ensure it's active when agent responds
      })
      .eq('id', conversationId);

    // Transform to DbMessage format
    const dbMessage: DbMessage = {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_type: senderType,
      content: message.content,
      created_at: message.created_at || message.timestamp,
      is_internal: isInternal,
      metadata: message.metadata || message.payload || {},
    };

    return dbMessage;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return null;
  }
}