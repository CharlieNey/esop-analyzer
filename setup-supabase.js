#!/usr/bin/env node

/**
 * Supabase Setup Script
 * This script helps set up Supabase for the ESOP Analyzer project
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logBold(color, message) {
  console.log(`${color}${colors.bold}${message}${colors.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  logBold(colors.blue, '🚀 ESOP Analyzer Supabase Setup');
  console.log();
  
  log(colors.yellow, 'This script will help you set up Supabase for your project.');
  log(colors.yellow, 'Choose one of the following options:');
  console.log();
  
  log(colors.cyan, '1. 📡 Link to existing Supabase project (recommended)');
  log(colors.cyan, '2. 🏠 Start local Supabase development server');
  log(colors.cyan, '3. 🔧 Generate environment variable template');
  log(colors.cyan, '4. 🧪 Test current Supabase configuration');
  console.log();
  
  const choice = await question('Enter your choice (1-4): ');
  console.log();
  
  switch (choice.trim()) {
    case '1':
      await linkToProject();
      break;
    case '2':
      await startLocal();
      break;
    case '3':
      await generateEnvTemplate();
      break;
    case '4':
      await testConfiguration();
      break;
    default:
      log(colors.red, '❌ Invalid choice. Please run the script again.');
  }
  
  rl.close();
}

async function linkToProject() {
  logBold(colors.green, '📡 Linking to Supabase Project');
  console.log();
  
  log(colors.yellow, 'First, make sure you have:');
  log(colors.yellow, '1. Created a Supabase project at https://supabase.com');
  log(colors.yellow, '2. Have your project reference ID ready');
  log(colors.yellow, '3. Are logged into Supabase CLI');
  console.log();
  
  // Check if user is logged in
  try {
    execSync('npx supabase projects list', { stdio: 'pipe' });
    log(colors.green, '✅ You are logged into Supabase CLI');
  } catch (error) {
    log(colors.red, '❌ You need to login to Supabase CLI first');
    console.log();
    log(colors.blue, '🔑 Logging you in...');
    
    try {
      execSync('npx supabase login', { stdio: 'inherit' });
      log(colors.green, '✅ Successfully logged in!');
    } catch (loginError) {
      log(colors.red, '❌ Login failed. Please try manually:');
      log(colors.cyan, '   npx supabase login');
      return;
    }
  }
  
  console.log();
  const projectRef = await question('Enter your Supabase project reference ID: ');
  
  if (!projectRef.trim()) {
    log(colors.red, '❌ Project reference ID is required');
    return;
  }
  
  try {
    log(colors.blue, '🔗 Linking to project...');
    execSync(`npx supabase link --project-ref ${projectRef.trim()}`, { stdio: 'inherit' });
    
    log(colors.green, '✅ Successfully linked to project!');
    console.log();
    
    const runMigrations = await question('Do you want to run migrations now? (y/N): ');
    
    if (runMigrations.toLowerCase().startsWith('y')) {
      await runDatabaseMigrations();
    } else {
      log(colors.yellow, '⚠️  Remember to run migrations later with: npx supabase db push');
    }
    
    await generateEnvTemplate();
    
  } catch (error) {
    log(colors.red, '❌ Failed to link to project');
    log(colors.red, error.message);
    console.log();
    log(colors.cyan, '💡 Try these troubleshooting steps:');
    log(colors.cyan, '1. Verify your project reference ID is correct');
    log(colors.cyan, '2. Check you have access to the project');
    log(colors.cyan, '3. Try logging out and back in: npx supabase logout && npx supabase login');
  }
}

async function startLocal() {
  logBold(colors.green, '🏠 Starting Local Supabase');
  console.log();
  
  try {
    log(colors.blue, '🐳 Starting local Supabase services...');
    log(colors.yellow, 'This may take a few minutes on first run...');
    
    execSync('npx supabase start', { stdio: 'inherit' });
    
    log(colors.green, '✅ Local Supabase is running!');
    console.log();
    
    log(colors.cyan, '📋 Local Supabase URLs:');
    log(colors.cyan, '   API URL: http://127.0.0.1:54321');
    log(colors.cyan, '   Studio URL: http://127.0.0.1:54323');
    log(colors.cyan, '   Anon Key: check the output above');
    log(colors.cyan, '   Service Role Key: check the output above');
    console.log();
    
    const setupLocal = await question('Configure local environment variables? (Y/n): ');
    
    if (!setupLocal.toLowerCase().startsWith('n')) {
      await generateLocalEnv();
    }
    
  } catch (error) {
    log(colors.red, '❌ Failed to start local Supabase');
    log(colors.red, error.message);
  }
}

async function runDatabaseMigrations() {
  try {
    log(colors.blue, '🗄️  Running database migrations...');
    
    execSync('npx supabase db push', { stdio: 'inherit' });
    
    log(colors.green, '✅ Database migrations completed!');
    console.log();
    
    log(colors.cyan, '📋 Migration Summary:');
    log(colors.cyan, '   ✓ Created all required tables');
    log(colors.cyan, '   ✓ Set up Row Level Security policies');
    log(colors.cyan, '   ✓ Created storage bucket for documents');
    log(colors.cyan, '   ✓ Inserted test data for verification');
    
  } catch (error) {
    log(colors.red, '❌ Database migration failed');
    log(colors.red, error.message);
  }
}

async function generateEnvTemplate() {
  logBold(colors.green, '🔧 Generating Environment Variables');
  console.log();
  
  const backendEnv = `# Backend Environment Variables (.env)
# Copy these to your backend/.env file

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Enable Supabase mode
USE_SUPABASE=true

# Keep existing PostgreSQL config as backup
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# AI Services (existing)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Processing Configuration (existing)
PROCESSING_TIMEOUT=900000
NODE_ENV=development
`;

  const frontendEnv = `# Frontend Environment Variables (frontend/.env)
# Create frontend/.env with these values

# Supabase Configuration  
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
REACT_APP_USE_SUPABASE=true

# API Configuration (existing)
REACT_APP_API_URL=http://localhost:3001/api
`;
  
  try {
    fs.writeFileSync('backend/.env.supabase.example', backendEnv);
    fs.writeFileSync('frontend/.env.supabase.example', frontendEnv);
    
    log(colors.green, '✅ Environment variable templates created:');
    log(colors.cyan, '   📁 backend/.env.supabase.example');
    log(colors.cyan, '   📁 frontend/.env.supabase.example');
    console.log();
    
    log(colors.yellow, '⚠️  Next steps:');
    log(colors.yellow, '1. Get your Supabase project URL and keys from your dashboard');
    log(colors.yellow, '2. Copy the templates to .env files and fill in your values');
    log(colors.yellow, '3. Set USE_SUPABASE=true and REACT_APP_USE_SUPABASE=true');
    log(colors.yellow, '4. Restart your backend and frontend servers');
    
  } catch (error) {
    log(colors.red, '❌ Failed to create environment templates');
    log(colors.red, error.message);
  }
}

async function generateLocalEnv() {
  try {
    // Get local Supabase status
    const status = execSync('npx supabase status', { encoding: 'utf8' });
    
    // Parse the status to extract keys (this is a simplified parser)
    const lines = status.split('\n');
    let apiUrl = 'http://127.0.0.1:54321';
    let anonKey = '';
    let serviceKey = '';
    
    for (const line of lines) {
      if (line.includes('API URL')) {
        const match = line.match(/http:\/\/[^\s]+/);
        if (match) apiUrl = match[0];
      }
      if (line.includes('anon key')) {
        anonKey = line.split(':').pop()?.trim() || '';
      }
      if (line.includes('service_role key')) {
        serviceKey = line.split(':').pop()?.trim() || '';
      }
    }
    
    const backendEnv = `# Backend Environment Variables for Local Supabase
SUPABASE_URL=${apiUrl}
SUPABASE_SERVICE_KEY=${serviceKey}
SUPABASE_ANON_KEY=${anonKey}
USE_SUPABASE=true

# Keep existing config as backup
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
PROCESSING_TIMEOUT=900000
NODE_ENV=development
`;

    const frontendEnv = `# Frontend Environment Variables for Local Supabase
REACT_APP_SUPABASE_URL=${apiUrl}
REACT_APP_SUPABASE_ANON_KEY=${anonKey}
REACT_APP_USE_SUPABASE=true
REACT_APP_API_URL=http://localhost:3001/api
`;
    
    fs.writeFileSync('backend/.env.local', backendEnv);
    fs.writeFileSync('frontend/.env.local', frontendEnv);
    
    log(colors.green, '✅ Local environment files created:');
    log(colors.cyan, '   📁 backend/.env.local');
    log(colors.cyan, '   📁 frontend/.env.local');
    console.log();
    
    log(colors.yellow, '💡 To use these configurations:');
    log(colors.yellow, '   cp backend/.env.local backend/.env');
    log(colors.yellow, '   cp frontend/.env.local frontend/.env');
    
  } catch (error) {
    log(colors.red, '❌ Failed to generate local environment');
    log(colors.red, error.message);
  }
}

async function testConfiguration() {
  logBold(colors.green, '🧪 Testing Supabase Configuration');
  console.log();
  
  try {
    // Check if backend test script exists
    if (fs.existsSync('backend/test-supabase.js')) {
      log(colors.blue, '🔍 Running backend configuration test...');
      execSync('cd backend && node test-supabase.js', { stdio: 'inherit' });
    } else {
      log(colors.yellow, '⚠️  Backend test script not found');
    }
    
    // Check if Supabase CLI is connected
    try {
      execSync('npx supabase status', { stdio: 'inherit' });
    } catch (error) {
      log(colors.yellow, '⚠️  No local Supabase running or project linked');
    }
    
  } catch (error) {
    log(colors.red, '❌ Configuration test failed');
    log(colors.red, error.message);
  }
}

// Run the setup
main().catch(error => {
  log(colors.red, '❌ Setup failed');
  console.error(error);
  rl.close();
  process.exit(1);
});