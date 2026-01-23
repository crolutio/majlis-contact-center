/**
 * Automated Supabase Migration Runner
 * Uses Supabase Management API to run migrations
 * 
 * Usage: node scripts/run-migrations.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

console.log('🚀 Supabase Migration Runner\n');
console.log(`📍 Project: ${supabaseUrl}\n`);

// Since we can't execute SQL directly via anon key, we'll provide a safe helper
console.log('📋 Migration Instructions:\n');
console.log('Since automated SQL execution requires service role permissions,');
console.log('please run these migrations in the Supabase SQL Editor:\n');
const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
console.log(`🔗 Open: https://supabase.com/dashboard/project/${projectId}/sql/new\n`);

// List all migration SQL files in order (001_... -> 999_...)
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

migrations.forEach((file, index) => {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n${index + 1}. ${file}`);
  console.log('   ──────────────────────────────────────────');
  console.log(`   📄 File: ${filePath}`);
  console.log(`   📏 Size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`   📝 Copy the contents and paste in SQL Editor`);
  console.log('   ──────────────────────────────────────────');
});

console.log('\n✅ After running all migrations, restart your Next.js server!');
console.log('   pnpm dev\n');



