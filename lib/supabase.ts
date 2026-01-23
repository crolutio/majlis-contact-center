/**
 * Supabase client initialization
 * Replace these with your actual Supabase project credentials
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in your .env.local file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (matching our schema)
export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string;
          avatar: string | null;
          language: string;
          preferred_language: string;
          tier: 'standard' | 'premium' | 'enterprise';
          company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      agents: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar: string | null;
          status: 'online' | 'away' | 'busy' | 'offline';
          role: 'agent' | 'supervisor';
          active_conversations: number;
          avg_handle_time: number;
          csat: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          customer_id: string | null;
          channel: 'voice' | 'chat' | 'email' | 'whatsapp';
          status: 'active' | 'waiting' | 'resolved' | 'escalated';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          sentiment: 'positive' | 'neutral' | 'negative';
          sentiment_score: number;
          sla_deadline: string | null;
          sla_remaining: number | null;
          sla_status: 'healthy' | 'warning' | 'breached';
          assigned_to: string | null;
          queue: string | null;
          topic: string | null;
          last_message: string | null;
          last_message_time: string;
          start_time: string;
          ai_confidence: number;
          escalation_risk: boolean;
          tags: string[];
          industry: 'healthcare' | 'ecommerce' | 'banking' | 'saas' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string | null;
          type: 'customer' | 'agent' | 'ai' | 'system';
          content: string;
          timestamp: string;
          sentiment: 'positive' | 'neutral' | 'negative' | null;
          confidence: number | null;
          is_transcript: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      calls: {
        Row: {
          id: string;
          call_sid: string;
          conversation_id: string | null;
          from_number: string;
          to_number: string;
          status: string;
          direction: 'inbound' | 'outbound';
          duration: number | null;
          start_time: string;
          end_time: string | null;
          agent_id: string | null;
          customer_id: string | null;
          topic: string | null;
          sentiment: 'positive' | 'neutral' | 'negative' | null;
          sentiment_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['calls']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['calls']['Insert']>;
      };
      channel_messages: {
        Row: {
          id: string;
          message_sid: string | null;
          conversation_id: string | null;
          from_number: string | null;
          to_number: string | null;
          from_email: string | null;
          to_email: string | null;
          body: string;
          channel: 'whatsapp' | 'email' | 'sms';
          status: string;
          timestamp: string;
          direction: 'inbound' | 'outbound';
          customer_id: string | null;
          media_urls: string[] | null;
          subject: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['channel_messages']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['channel_messages']['Insert']>;
      };
      call_transcripts: {
        Row: {
          id: string;
          call_id: string;
          speaker: 'customer' | 'agent' | 'ai' | 'system';
          text: string;
          timestamp: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['call_transcripts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['call_transcripts']['Insert']>;
      };
    };
  };
}



