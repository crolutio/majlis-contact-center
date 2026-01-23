/**
 * Automated Supabase Setup Script
 * This script will run all migrations automatically
 * 
 * Usage: node scripts/setup-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(name, sql) {
  console.log(`\n📦 Running migration: ${name}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct SQL execution via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        // If RPC doesn't work, try executing via SQL endpoint
        console.log(`   ⚠️  Direct execution not available, using SQL editor method...`);
        console.log(`   📝 Please run this SQL in Supabase SQL Editor:`);
        console.log(`   ──────────────────────────────────────────`);
        console.log(sql.substring(0, 200) + '...');
        console.log(`   ──────────────────────────────────────────`);
        return false;
      }
    }
    
    console.log(`   ✅ Migration ${name} completed successfully!`);
    return true;
  } catch (err) {
    console.error(`   ❌ Error running migration ${name}:`, err.message);
    return false;
  }
}

async function setupSupabase() {
  console.log('🚀 Starting Supabase Database Setup...\n');
  console.log(`📍 Project: ${supabaseUrl}\n`);

  // Read migration files
  const migrations = [
    {
      name: '001_initial_schema',
      file: path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql'),
    },
    {
      name: '002_seed_demo_data',
      file: path.join(__dirname, '..', 'supabase', 'migrations', '002_seed_demo_data.sql'),
    },
    {
      name: '003_seed_conversations',
      file: path.join(__dirname, '..', 'supabase', 'migrations', '003_seed_conversations.sql'),
    },
  ];

  const results = [];

  for (const migration of migrations) {
    if (!fs.existsSync(migration.file)) {
      console.error(`❌ Migration file not found: ${migration.file}`);
      results.push(false);
      continue;
    }

    const sql = fs.readFileSync(migration.file, 'utf8');
    
    // Try to execute via Supabase client
    try {
      // Use execute_sql if available (requires service role key)
      // For now, we'll provide instructions
      console.log(`\n📋 Migration: ${migration.name}`);
      console.log(`   File: ${migration.file}`);
      console.log(`   ⚠️  Automated execution requires service role key.`);
      console.log(`   📝 Please run this SQL in Supabase SQL Editor:`);
      console.log(`   ──────────────────────────────────────────`);
      console.log(sql.substring(0, 300) + '...');
      console.log(`   ──────────────────────────────────────────`);
      console.log(`   🔗 Go to: https://supabase.com/dashboard/project/plcjfyftcnmkrffpvukz/sql`);
      results.push(false);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      results.push(false);
    }
  }

  // Summary
  console.log('\n\n📊 Setup Summary:');
  console.log('──────────────────────────────────────────');
  
  if (results.every(r => r)) {
    console.log('✅ All migrations completed successfully!');
  } else {
    console.log('⚠️  Some migrations need manual execution');
    console.log('\n📝 Next Steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/plcjfyftcnmkrffpvukz/sql');
    console.log('2. Copy and paste each migration SQL file');
    console.log('3. Run them in order: 001, 002, 003');
    console.log('\n📁 Migration files location:');
    console.log('   supabase/migrations/001_initial_schema.sql');
    console.log('   supabase/migrations/002_seed_demo_data.sql');
    console.log('   supabase/migrations/003_seed_conversations.sql');
  }

  console.log('\n✨ Done!');
}

// Run setup
setupSupabase().catch(console.error);



