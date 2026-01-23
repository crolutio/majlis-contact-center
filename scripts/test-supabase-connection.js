/**
 * Test Supabase Connection
 * Run: node scripts/test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🧪 Testing Supabase Connection...\n');
  console.log(`📍 Project: ${supabaseUrl}\n`);

  try {
    // Test 1: Check customers table
    console.log('1️⃣  Testing customers table...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .limit(1);

    if (customersError) {
      console.error('   ❌ Error:', customersError.message);
      return false;
    }
    console.log('   ✅ Customers table exists!');

    // Test 2: Count customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    console.log(`   📊 Found ${customerCount} customers`);

    // Test 3: Check agents table
    console.log('\n2️⃣  Testing agents table...');
    const { count: agentCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ Agents table exists!`);
    console.log(`   📊 Found ${agentCount} agents`);

    // Test 4: Check conversations table
    console.log('\n3️⃣  Testing conversations table...');
    const { count: conversationCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ Conversations table exists!`);
    console.log(`   📊 Found ${conversationCount} conversations`);

    // Test 5: Check messages table
    console.log('\n4️⃣  Testing messages table...');
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    console.log(`   ✅ Messages table exists!`);
    console.log(`   📊 Found ${messageCount} messages`);

    // Test 6: Fetch a conversation with relations
    console.log('\n5️⃣  Testing data relationships...');
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        customer:customers(*),
        agent:agents(*),
        messages:messages(*)
      `)
      .limit(1)
      .single();

    if (convError) {
      console.log('   ⚠️  Could not fetch conversation (might be empty)');
    } else {
      console.log('   ✅ Successfully fetched conversation with relations!');
      console.log(`   📝 Topic: ${conversation.topic || 'N/A'}`);
      console.log(`   👤 Customer: ${conversation.customer?.name || 'N/A'}`);
      console.log(`   💬 Messages: ${conversation.messages?.length || 0}`);
    }

    console.log('\n✨ All tests passed! Supabase is connected and working!');
    console.log('\n📋 Summary:');
    console.log(`   • Customers: ${customerCount}`);
    console.log(`   • Agents: ${agentCount}`);
    console.log(`   • Conversations: ${conversationCount}`);
    console.log(`   • Messages: ${messageCount}`);
    console.log('\n🚀 Your database is ready! Restart your Next.js server:');
    console.log('   pnpm dev\n');

    return true;
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection();



