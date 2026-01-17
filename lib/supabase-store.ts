/**
 * Supabase-based data store
 * Replaces the in-memory store with persistent Supabase storage
 */

import { supabase } from './supabase';
import { Conversation, Message } from './sample-data';
import { StoredCall, StoredMessage, TranscriptTurn } from './data-store';

/**
 * Call storage functions
 */
export async function storeCall(call: StoredCall): Promise<void> {
  try {
    // First, find or create customer
    let customerId: string | null = null;
    if (call.customerPhone || call.customerEmail) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.eq.${call.customerPhone},email.eq.${call.customerEmail}`)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: call.customerName || call.customerPhone || 'Unknown Caller',
            email: call.customerEmail || null,
            phone: call.customerPhone || '',
            tier: 'standard',
          })
          .select('id')
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
        } else if (customerError) {
          console.error('Error creating customer:', customerError);
        }
      }
    } else {
      // Create customer even without phone/email (use call SID as identifier)
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          name: call.customerName || 'Unknown Caller',
          email: null,
          phone: call.from || `call-${call.callSid}`,
          tier: 'standard',
        })
        .select('id')
        .single();

      if (newCustomer) {
        customerId = newCustomer.id;
      }
    }

    // Insert or update call
    const { error } = await supabase
      .from('calls')
      .upsert({
        call_sid: call.callSid,
        from_number: call.from,
        to_number: call.to,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        start_time: call.startTime.toISOString(),
        end_time: call.endTime?.toISOString() || null,
        agent_id: call.agentId || null,
        customer_id: customerId,
        topic: call.topic || null,
        sentiment: call.sentiment || null,
        sentiment_score: call.sentimentScore || null,
      }, {
        onConflict: 'call_sid',
      });

    if (error) {
      console.error('Error storing call:', error);
      throw error;
    }

    // Store transcripts if available
    if (call.transcript && call.transcript.length > 0) {
      const { data: callData } = await supabase
        .from('calls')
        .select('id')
        .eq('call_sid', call.callSid)
        .single();

      if (callData) {
        const transcripts = call.transcript.map(t => ({
          call_id: callData.id,
          speaker: t.speaker,
          text: t.text,
          timestamp: t.timestamp.toISOString(),
        }));

        await supabase.from('call_transcripts').insert(transcripts);
      }
    }
  } catch (error) {
    console.error('Error in storeCall:', error);
    throw error;
  }
}

export async function getCall(callSid: string): Promise<StoredCall | null> {
  const { data, error } = await supabase
    .from('calls')
    .select(`
      *,
      customer:customers(*),
      transcripts:call_transcripts(*)
    `)
    .eq('call_sid', callSid)
    .single();

  if (error || !data) return null;

  return {
    callSid: data.call_sid,
    from: data.from_number,
    to: data.to_number,
    status: data.status,
    direction: data.direction,
    duration: data.duration || undefined,
    startTime: new Date(data.start_time),
    endTime: data.end_time ? new Date(data.end_time) : undefined,
    agentId: data.agent_id || undefined,
    customerName: data.customer?.name,
    customerEmail: data.customer?.email,
    customerPhone: data.customer?.phone,
    topic: data.topic || undefined,
    sentiment: data.sentiment || undefined,
    sentimentScore: data.sentiment_score || undefined,
    transcript: data.transcripts?.map((t: any) => ({
      speaker: t.speaker,
      text: t.text,
      timestamp: new Date(t.timestamp),
    })),
  };
}

export async function getAllCalls(): Promise<StoredCall[]> {
  const { data, error } = await supabase
    .from('calls')
    .select(`
      *,
      customer:customers(*)
    `)
    .order('start_time', { ascending: false });

  if (error || !data) return [];

  return data.map((call: any) => ({
    callSid: call.call_sid,
    from: call.from_number,
    to: call.to_number,
    status: call.status,
    direction: call.direction,
    duration: call.duration || undefined,
    startTime: new Date(call.start_time),
    endTime: call.end_time ? new Date(call.end_time) : undefined,
    agentId: call.agent_id || undefined,
    customerName: call.customer?.name,
    customerEmail: call.customer?.email,
    customerPhone: call.customer?.phone,
    topic: call.topic || undefined,
    sentiment: call.sentiment || undefined,
    sentimentScore: call.sentiment_score || undefined,
  }));
}

export async function getActiveCalls(): Promise<StoredCall[]> {
  const { data, error } = await supabase
    .from('calls')
    .select(`
      *,
      customer:customers(*)
    `)
    .in('status', ['in-progress', 'ringing', 'queued', 'initiated'])
    .order('start_time', { ascending: false });

  if (error || !data) return [];

  return data.map((call: any) => ({
    callSid: call.call_sid,
    from: call.from_number,
    to: call.to_number,
    status: call.status,
    direction: call.direction,
    duration: call.duration || undefined,
    startTime: new Date(call.start_time),
    endTime: call.end_time ? new Date(call.end_time) : undefined,
    agentId: call.agent_id || undefined,
    customerName: call.customer?.name,
    customerEmail: call.customer?.email,
    customerPhone: call.customer?.phone,
    topic: call.topic || undefined,
    sentiment: call.sentiment || undefined,
    sentimentScore: call.sentiment_score || undefined,
  }));
}

export async function updateCallStatus(
  callSid: string,
  status: string,
  updates?: Partial<StoredCall>
): Promise<void> {
  const updateData: any = { status };

  if (updates?.duration !== undefined) updateData.duration = updates.duration;
  if (updates?.endTime) updateData.end_time = updates.endTime.toISOString();
  if (updates?.sentiment) updateData.sentiment = updates.sentiment;
  if (updates?.sentimentScore !== undefined) updateData.sentiment_score = updates.sentimentScore;

  const { error } = await supabase
    .from('calls')
    .update(updateData)
    .eq('call_sid', callSid);

  if (error) {
    console.error('Error updating call:', error);
    throw error;
  }
}

/**
 * Append transcript turns to an existing call (used by Vapi/Twilio voice webhooks).
 * Persists into `call_transcripts` and mirrors into `messages` with `is_transcript=true`
 * when the call is linked to a conversation.
 */
export async function appendCallTranscript(callSid: string, turns: TranscriptTurn[]): Promise<void> {
  if (!turns || turns.length === 0) return;

  // Look up call row for FK + optional conversation mirroring
  const { data: callRow, error: callErr } = await supabase
    .from('calls')
    .select('id, conversation_id')
    .eq('call_sid', callSid)
    .single();

  if (callErr || !callRow) {
    console.warn('appendCallTranscript: call not found', { callSid, callErr });
    return;
  }

  const transcriptRows = turns.map((t) => ({
    call_id: callRow.id,
    speaker: t.speaker,
    text: t.text,
    timestamp: t.timestamp.toISOString(),
  }));

  const { error: txErr } = await supabase.from('call_transcripts').insert(transcriptRows);
  if (txErr) {
    console.error('appendCallTranscript: failed to insert call_transcripts', txErr);
    // continue; we still might mirror into messages for UI
  }

  // Mirror into conversation messages for UI (optional)
  if (callRow.conversation_id) {
    const msgRows = turns.map((t) => ({
      conversation_id: callRow.conversation_id,
      type: t.speaker,
      content: t.text,
      timestamp: t.timestamp.toISOString(),
      is_transcript: true,
    }));

    const { error: msgErr } = await supabase.from('messages').insert(msgRows);
    if (msgErr) {
      console.error('appendCallTranscript: failed to insert messages mirror', msgErr);
    }

    // Update conversation preview
    const last = turns.reduce((acc, cur) => (cur.timestamp > acc.timestamp ? cur : acc), turns[0]);
    await supabase
      .from('conversations')
      .update({
        last_message: last.text,
        last_message_time: last.timestamp.toISOString(),
      })
      .eq('id', callRow.conversation_id);
  }
}

/**
 * Message storage functions
 */
export async function storeMessage(message: StoredMessage): Promise<void> {
  try {
    // Find or create customer
    let customerId: string | null = null;
    const identifier = message.customerPhone || message.customerEmail || message.from;

    if (identifier) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.eq.${message.customerPhone || message.from},email.eq.${message.customerEmail || ''}`)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: message.customerName || 'Unknown',
            email: message.customerEmail || null,
            phone: message.customerPhone || message.from,
            tier: 'standard',
          })
          .select('id')
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    // Insert message
    const { data, error } = await supabase
      .from('channel_messages')
      .insert({
        message_sid: message.messageSid,
        from_number: message.channel === 'email' ? null : message.from,
        to_number: message.channel === 'email' ? null : message.to,
        from_email: message.channel === 'email' ? message.from : null,
        to_email: message.channel === 'email' ? message.to : null,
        body: message.body,
        channel: message.channel,
        status: message.status,
        timestamp: message.timestamp.toISOString(),
        direction: message.direction,
        customer_id: customerId,
        media_urls: message.mediaUrls || null,
      })
      .select('id, conversation_id')
      .single();

    if (error) {
      console.error('Error storing message:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in storeMessage:', error);
    throw error;
  }
}

export async function getMessage(messageSid: string): Promise<StoredMessage | null> {
  const { data, error } = await supabase
    .from('channel_messages')
    .select('*, customer:customers(*)')
    .eq('message_sid', messageSid)
    .single();

  if (error || !data) return null;

  return {
    messageSid: data.message_sid,
    from: data.from_number || data.from_email || '',
    to: data.to_number || data.to_email || '',
    body: data.body,
    channel: data.channel,
    status: data.status,
    timestamp: new Date(data.timestamp),
    direction: data.direction,
    customerName: data.customer?.name,
    customerEmail: data.customer?.email,
    customerPhone: data.customer?.phone,
    mediaUrls: data.media_urls || undefined,
  };
}

export async function getAllMessages(): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('channel_messages')
    .select('*, customer:customers(*)')
    .order('timestamp', { ascending: false });

  if (error || !data) return [];

  return data.map((msg: any) => ({
    messageSid: msg.message_sid,
    from: msg.from_number || msg.from_email || '',
    to: msg.to_number || msg.to_email || '',
    body: msg.body,
    channel: msg.channel,
    status: msg.status,
    timestamp: new Date(msg.timestamp),
    direction: msg.direction,
    customerName: msg.customer?.name,
    customerEmail: msg.customer?.email,
    customerPhone: msg.customer?.phone,
    mediaUrls: msg.media_urls || undefined,
  }));
}

/**
 * Conversation functions
 */
export async function getAllConversations(industry?: string): Promise<Conversation[]> {
  let query = supabase
    .from('conversations')
    .select(`
      *,
      customer:customers(*),
      messages:messages(*),
      agent:agents(*)
    `)
    .order('last_message_time', { ascending: false });

  if (industry) {
    // Filter by industry, but also include conversations without industry set (null)
    // This ensures WhatsApp/Email conversations created before industry was added still appear
    query = query.or(`industry.eq.${industry},industry.is.null`);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((conv: any) => ({
    id: conv.id,
    customer: {
      id: conv.customer?.id || '',
      name: conv.customer?.name || 'Unknown',
      email: conv.customer?.email || '',
      phone: conv.customer?.phone || '',
      avatar: conv.customer?.avatar || '/placeholder-user.jpg',
      language: conv.customer?.language || 'English',
      preferredLanguage: conv.customer?.preferred_language || 'en',
      tier: conv.customer?.tier || 'standard',
    },
    channel: conv.channel,
    status: conv.status,
    priority: conv.priority,
    sentiment: conv.sentiment,
    sentimentScore: conv.sentiment_score,
    sla: {
      deadline: conv.sla_deadline ? new Date(conv.sla_deadline) : new Date(),
      remaining: conv.sla_remaining || 0,
      status: conv.sla_status,
    },
    assignedTo: conv.assigned_to || null,
    queue: conv.queue || 'General Support',
    topic: conv.topic || '',
    lastMessage: conv.last_message || '',
    lastMessageTime: new Date(conv.last_message_time),
    startTime: new Date(conv.start_time),
    messages: (conv.messages || []).map((msg: any) => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      sentiment: msg.sentiment || undefined,
      confidence: msg.confidence || undefined,
      isTranscript: msg.is_transcript || false,
    })),
    aiConfidence: conv.ai_confidence,
    escalationRisk: conv.escalation_risk,
    tags: conv.tags || [],
  }));
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      customer:customers(*),
      messages:messages(*),
      agent:agents(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    customer: {
      id: data.customer?.id || '',
      name: data.customer?.name || 'Unknown',
      email: data.customer?.email || '',
      phone: data.customer?.phone || '',
      avatar: data.customer?.avatar || '/placeholder-user.jpg',
      language: data.customer?.language || 'English',
      preferredLanguage: data.customer?.preferred_language || 'en',
      tier: data.customer?.tier || 'standard',
    },
    channel: data.channel,
    status: data.status,
    priority: data.priority,
    sentiment: data.sentiment,
    sentimentScore: data.sentiment_score,
    sla: {
      deadline: data.sla_deadline ? new Date(data.sla_deadline) : new Date(),
      remaining: data.sla_remaining || 0,
      status: data.sla_status,
    },
    assignedTo: data.assigned_to || null,
    queue: data.queue || 'General Support',
    topic: data.topic || '',
    lastMessage: data.last_message || '',
    lastMessageTime: new Date(data.last_message_time),
    startTime: new Date(data.start_time),
    messages: (data.messages || []).map((msg: any) => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      sentiment: msg.sentiment || undefined,
      confidence: msg.confidence || undefined,
      isTranscript: msg.is_transcript || false,
    })),
    aiConfidence: data.ai_confidence,
    escalationRisk: data.escalation_risk,
    tags: data.tags || [],
  };
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
  const updateData: any = {};

  if (updates.status) updateData.status = updates.status;
  if (updates.priority) updateData.priority = updates.priority;
  if (updates.sentiment) updateData.sentiment = updates.sentiment;
  if (updates.sentimentScore !== undefined) updateData.sentiment_score = updates.sentimentScore;
  if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
  if (updates.lastMessage) updateData.last_message = updates.lastMessage;
  if (updates.lastMessageTime) updateData.last_message_time = updates.lastMessageTime.toISOString();
  if (updates.escalationRisk !== undefined) updateData.escalation_risk = updates.escalationRisk;
  if (updates.tags) updateData.tags = updates.tags;

  const { error } = await supabase
    .from('conversations')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

export async function deleteConversation(id: string): Promise<void> {
  // Delete related records first (cascade delete)
  // Messages are deleted automatically via foreign key cascade
  // Channel messages are deleted automatically via foreign key cascade
  // Calls are updated to remove conversation_id
  
  // Update calls to remove conversation reference
  await supabase
    .from('calls')
    .update({ conversation_id: null })
    .eq('conversation_id', id);

  // Delete the conversation (messages and channel_messages will be cascade deleted)
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Create conversation from call or message
 */
export async function createConversationFromCall(call: StoredCall): Promise<string | null> {
  try {
    // Find or create customer
    let customerId: string | null = null;
    const phoneNumber = call.customerPhone || call.from;
    
    if (phoneNumber || call.customerEmail) {
      // Try to find existing customer by phone or email
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.eq.${phoneNumber},email.eq.${call.customerEmail || ''}`)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: call.customerName || 'Unknown',
            email: call.customerEmail || null,
            phone: call.customerPhone || call.from,
            tier: 'standard',
          })
          .select('id')
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    // Create conversation
    // Default agent ID for testing purposes
    const DEFAULT_AGENT_ID = "e66fa391-28b5-44ec-b3a9-4397c2f2d225";
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        channel: 'voice',
        status: call.status === 'completed' ? 'resolved' : 
                call.status === 'in-progress' || call.status === 'ringing' ? 'active' : 'waiting',
        priority: call.sentiment === 'negative' ? 'high' : 'medium',
        sentiment: call.sentiment || 'neutral',
        sentiment_score: call.sentimentScore || 0.5,
        sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        sla_remaining: 30,
        sla_status: 'healthy',
        assigned_to: call.agentId || null,
        assigned_agent_id: DEFAULT_AGENT_ID,
        queue: 'General Support',
        topic: call.topic || 'Incoming Call',
        last_message: 'Call in progress',
        last_message_time: call.startTime.toISOString(),
        start_time: call.startTime.toISOString(),
        ai_confidence: 0.85,
        escalation_risk: call.sentiment === 'negative',
        tags: call.sentiment === 'negative' ? ['urgent'] : [],
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    // Link call to conversation
    await supabase
      .from('calls')
      .update({ conversation_id: data.id })
      .eq('call_sid', call.callSid);

    return data.id;
  } catch (error) {
    console.error('Error in createConversationFromCall:', error);
    return null;
  }
}

export async function createConversationFromMessage(message: StoredMessage): Promise<string | null> {
  try {
    // Find or create customer
    let customerId: string | null = null;
    const identifier = message.customerPhone || message.customerEmail || message.from;

    if (identifier) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .or(`phone.eq.${message.customerPhone || message.from},email.eq.${message.customerEmail || ''}`)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: message.customerName || 'Unknown',
            email: message.customerEmail || null,
            phone: message.customerPhone || message.from,
            tier: 'standard',
          })
          .select('id')
          .single();

        if (newCustomer) {
          customerId = newCustomer.id;
        }
      }
    }

    const channel = message.channel === 'whatsapp' ? 'whatsapp' : message.channel === 'email' ? 'email' : 'chat';

    // Check if there's an existing active conversation for this customer and channel
    // Look for conversations that are active or waiting (not resolved/escalated)
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('channel', channel)
      .in('status', ['active', 'waiting'])
      .order('last_message_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    let conversationId: string;

    if (existingConversation) {
      // Use existing conversation
      conversationId = existingConversation.id;
      console.log('📝 Adding message to existing conversation:', conversationId);

      // Update conversation with new message
      await supabase
        .from('conversations')
        .update({
          last_message: message.body,
          last_message_time: message.timestamp.toISOString(),
          status: 'active', // Ensure it's active
        })
        .eq('id', conversationId);
    } else {
      // Create new conversation
      console.log('🆕 Creating new conversation');
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          customer_id: customerId,
          channel: channel,
          status: 'active',
          priority: 'medium',
          sentiment: 'neutral',
          sentiment_score: 0.5,
          sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          sla_remaining: 30,
          sla_status: 'healthy',
          queue: 'General Support',
          topic: 'Incoming Message',
          last_message: message.body,
          last_message_time: message.timestamp.toISOString(),
          start_time: message.timestamp.toISOString(),
          ai_confidence: 0.85,
          escalation_risk: false,
          tags: [],
                industry: 'banking', // Default industry for new conversations
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      conversationId = data.id;
    }

    // Link message to conversation and add as message
    await supabase
      .from('channel_messages')
      .update({ conversation_id: conversationId })
      .eq('message_sid', message.messageSid);

    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        type: message.direction === 'inbound' ? 'customer' : 'agent',
        content: message.body,
        timestamp: message.timestamp.toISOString(),
      });

    return conversationId;
  } catch (error) {
    console.error('Error in createConversationFromMessage:', error);
    return null;
  }
}

