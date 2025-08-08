# 🚀 Quick Supabase Setup (Manual Steps)

Since you got the authentication error, here are the manual steps to complete your setup:

## Step 1: Login to Supabase CLI

Open your terminal and run:
```bash
npx supabase login
```
This will open your browser to authenticate with Supabase.

## Step 2: Link Your Project

After login, link to your project:
```bash
npx supabase link --project-ref ezqfejnjhhmrtvifpakn
```

## Step 3: Push Database Schema

Run the migrations to set up your database:
```bash
npx supabase db push
```

This will create all your tables, indexes, and security policies automatically.

## Step 4: Set Up Environment Variables

### Backend (.env):
```env
# Get these values from your Supabase dashboard > Settings > API
SUPABASE_URL=https://ezqfejnjhhmrtvifpakn.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-from-dashboard
SUPABASE_ANON_KEY=your-anon-key-from-dashboard

# Enable Supabase mode
USE_SUPABASE=true

# Keep existing config
DATABASE_URL=your-existing-postgresql-url
ANTHROPIC_API_KEY=your-existing-key
OPENAI_API_KEY=your-existing-key
PROCESSING_TIMEOUT=900000
NODE_ENV=development
```

### Frontend (.env):
```env
REACT_APP_SUPABASE_URL=https://ezqfejnjhhmrtvifpakn.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-from-dashboard
REACT_APP_USE_SUPABASE=true
REACT_APP_API_URL=http://localhost:3001/api
```

## Step 5: Get Your Keys from Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/ezqfejnjhhmrtvifpakn
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (for SUPABASE_URL)
   - **anon public** key (for SUPABASE_ANON_KEY)
   - **service_role secret** key (for SUPABASE_SERVICE_KEY) ⚠️ Keep this secure!

## Step 6: Create Storage Bucket

In your Supabase dashboard:
1. Go to **Storage**
2. Create a new bucket named `documents`
3. Set it to **Private** (recommended)

## Step 7: Test Your Setup

```bash
# Test backend configuration
npm run test-supabase

# Or manually:
cd backend && node test-supabase.js
```

## Step 8: Start Your Application

```bash
npm run dev
```

## ✅ Verification Checklist

- [ ] `npx supabase login` completed successfully
- [ ] `npx supabase link` worked without errors  
- [ ] `npx supabase db push` created all tables
- [ ] Environment variables set in both backend/.env and frontend/.env
- [ ] Storage bucket 'documents' exists in dashboard
- [ ] `npm run test-supabase` passes all tests
- [ ] Application starts with `npm run dev`
- [ ] Can upload PDFs and see real-time updates

## 🔍 Common Issues

**"Project not found" error:**
- Double-check your project reference ID: `ezqfejnjhhmrtvifpakn`
- Ensure you have access to the project

**Migration errors:**
- Check the Supabase dashboard logs
- Try: `npx supabase db reset && npx supabase db push`

**Environment variables not working:**
- Restart your development servers after changing .env files
- Check for typos in variable names

## 🎯 What You'll Get

Once setup is complete:
- ⚡ Real-time document updates across all browser tabs
- 📊 Live processing progress without page refresh
- 🗄️ Cloud storage for PDF files  
- 🔒 Enterprise-grade security with Row Level Security
- 📡 Server-Sent Events for instant updates

## 🆘 Need Help?

If you encounter issues:
1. Check the Supabase dashboard for any error messages
2. Run `npx supabase status` to check connection
3. Review the logs in your development console
4. Try the test suite: `npm run test-supabase`

Your project reference ID is: **ezqfejnjhhmrtvifpakn** 
Dashboard URL: https://supabase.com/dashboard/project/ezqfejnjhhmrtvifpakn