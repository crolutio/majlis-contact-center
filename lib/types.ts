// Shared types for the application

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'ai' | 'system';
  content: string;
  created_at: string;
  is_internal?: boolean;
  metadata?: Record<string, any>;
}

export interface ConversationDetails {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar: string;
    language: string;
    preferredLanguage: string;
    tier: string;
  };
  channel: string;
  status: string;
  priority: string;
  sentiment: string;
  sentimentScore: number;
  messages?: DbMessage[];
  created_at: string;
  updated_at: string;

  // Additional properties used by components
  handlingMode?: string;
  customerName?: string;
  loyaltyStatus?: string;
  channelColor?: string;
  smartReplies?: string[];
  history?: any[];
  products?: any[];
  dni?: string;
}