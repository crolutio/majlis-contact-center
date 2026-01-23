/**
 * Script to populate database with extensive demo data
 * Run with: node scripts/populate-demo-data.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const industries = ['healthcare', 'ecommerce', 'banking', 'saas'];
const channels = ['whatsapp', 'email', 'chat', 'voice'];
const statuses = ['active', 'waiting', 'resolved', 'escalated'];
const priorities = ['low', 'medium', 'high', 'urgent'];
const sentiments = ['positive', 'neutral', 'negative'];
const tiers = ['standard', 'premium', 'enterprise'];

const customerNames = [
  'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim', 'Jessica Martinez',
  'Robert Taylor', 'Amanda Wilson', 'James Anderson', 'Lisa Brown', 'Christopher Lee',
  'Jennifer Davis', 'Matthew Garcia', 'Ashley Moore', 'Daniel White', 'Nicole Harris',
  'Kevin Martin', 'Rachel Thompson', 'Andrew Jackson', 'Lauren Clark', 'Ryan Lewis',
  'Michelle Walker', 'Brandon Hall', 'Stephanie Allen', 'Justin Young', 'Melissa King',
  'Tyler Wright', 'Brittany Lopez', 'Jordan Hill', 'Kayla Green', 'Alex Adams',
];

const topics = [
  'Billing Inquiry', 'Product Question', 'Technical Support', 'Account Issue',
  'Order Status', 'Refund Request', 'Feature Request', 'Bug Report',
  'Payment Problem', 'Shipping Question', 'Appointment Scheduling', 'Prescription Refill',
  'Loan Application', 'Transaction Dispute', 'Password Reset', 'Subscription Change',
  'Integration Help', 'API Documentation', 'Pricing Question', 'Trial Extension',
];

const customerMessages = [
  "Hi, I have a question about my recent order.",
  "My account isn't working properly. Can you help?",
  "I need to update my billing information.",
  "When will my order arrive?",
  "I'd like to cancel my subscription.",
  "Can you help me with a refund?",
  "I'm having trouble logging in.",
  "What are your business hours?",
  "I need to schedule an appointment.",
  "Can you explain your pricing plans?",
  "I'm interested in upgrading my plan.",
  "There's an error in my account.",
  "I need help with the API integration.",
  "My payment was declined. What should I do?",
  "I want to change my delivery address.",
  "Can you help me understand my bill?",
  "I'm experiencing a bug in the app.",
  "How do I reset my password?",
  "I need to speak with a supervisor.",
  "Thank you for your help!",
];

const aiResponses = [
  "Hello! I'd be happy to help you with that. Let me check your account details.",
  "I understand your concern. Let me look into this for you right away.",
  "Thank you for reaching out. I can definitely assist you with that.",
  "I see the issue. Let me help you resolve this quickly.",
  "Of course! I'll take care of that for you right now.",
  "I appreciate you bringing this to our attention. Let me investigate.",
  "I can help you with that. Let me gather some information first.",
  "Thank you for your patience. I'm working on resolving this for you.",
  "I understand this is important. Let me connect you with the right team.",
  "Great question! Let me provide you with the details you need.",
];

async function getOrCreateCustomer(name, phone, email, tier) {
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .or(`phone.eq.${phone},email.eq.${email}`)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      name,
      phone,
      email,
      tier,
      language: 'English',
      preferred_language: 'en',
    })
    .select('id')
    .single();

  if (error) throw error;
  return customer.id;
}

async function createConversationWithMessages(
  customerId,
  channel,
  industry,
  status,
  priority,
  sentiment,
  numMessages = 3
) {
  const now = new Date();
  const startTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  const topic = topics[Math.floor(Math.random() * topics.length)];
  
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      customer_id: customerId,
      channel,
      status,
      priority,
      sentiment,
      sentiment_score: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.2 : 0.5,
      sla_deadline: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
      sla_remaining: Math.floor(Math.random() * 30),
      sla_status: status === 'resolved' ? 'healthy' : Math.random() > 0.7 ? 'warning' : 'healthy',
      queue: 'General Support',
      topic,
      last_message: customerMessages[Math.floor(Math.random() * customerMessages.length)],
      last_message_time: startTime.toISOString(),
      start_time: startTime.toISOString(),
      ai_confidence: 0.7 + Math.random() * 0.25,
      escalation_risk: priority === 'urgent' || sentiment === 'negative',
      tags: [],
      industry,
    })
    .select('id')
    .single();

  if (convError) throw convError;

  const conversationId = conversation.id;
  const messages = [];

  for (let i = 0; i < numMessages; i++) {
    const messageTime = new Date(startTime.getTime() + i * 5 * 60 * 1000);
    
    if (i === 0) {
      const customerMsg = customerMessages[Math.floor(Math.random() * customerMessages.length)];
      messages.push({
        conversation_id: conversationId,
        type: 'customer',
        content: customerMsg,
        timestamp: messageTime.toISOString(),
      });
    } else if (i % 2 === 0) {
      const customerMsg = customerMessages[Math.floor(Math.random() * customerMessages.length)];
      messages.push({
        conversation_id: conversationId,
        type: 'customer',
        content: customerMsg,
        timestamp: messageTime.toISOString(),
      });
    } else {
      const aiMsg = aiResponses[Math.floor(Math.random() * aiResponses.length)];
      messages.push({
        conversation_id: conversationId,
        type: 'ai',
        content: aiMsg,
        timestamp: messageTime.toISOString(),
        confidence: 0.7 + Math.random() * 0.25,
      });
    }
  }

  if (messages.length > 0) {
    const { error: msgError } = await supabase
      .from('messages')
      .insert(messages);

    if (msgError) throw msgError;
  }

  return conversationId;
}

async function populateData() {
  console.log('🚀 Starting data population...\n');

  try {
    const conversationsToCreate = 100;
    let created = 0;

    for (let i = 0; i < conversationsToCreate; i++) {
      const name = customerNames[Math.floor(Math.random() * customerNames.length)];
      const phone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const numMessages = Math.floor(Math.random() * 5) + 2;

      const customerId = await getOrCreateCustomer(name, phone, email, tier);
      await createConversationWithMessages(
        customerId,
        channel,
        industry,
        status,
        priority,
        sentiment,
        numMessages
      );

      created++;
      if (created % 10 === 0) {
        console.log(`✅ Created ${created}/${conversationsToCreate} conversations...`);
      }
    }

    console.log(`\n🎉 Successfully created ${created} conversations!`);
    console.log(`📊 Data includes:`);
    console.log(`   - Multiple customers`);
    console.log(`   - All channels: ${channels.join(', ')}`);
    console.log(`   - All industries: ${industries.join(', ')}`);
    console.log(`   - Various statuses, priorities, and sentiments`);
    console.log(`\n💡 Refresh your inbox to see the new data!`);
  } catch (error) {
    console.error('❌ Error populating data:', error);
    throw error;
  }
}

populateData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



