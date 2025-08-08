# Supabase CLI Setup Guide

This guide shows you how to set up Supabase using the Supabase CLI - the easiest and most reliable method.

## 🚀 Quick Setup (Recommended)

### Option 1: Link to Existing Supabase Project

1. **Create a Supabase project** at https://supabase.com
2. **Run the interactive setup script:**
   ```bash
   node setup-supabase.js
   ```
   Choose option `1` and follow the prompts.

### Option 2: Local Development Setup

1. **Run the setup script:**
   ```bash
   node setup-supabase.js
   ```
   Choose option `2` to start a local Supabase instance.

## 📋 Manual CLI Setup

If you prefer manual setup:

### 1. Link to Your Supabase Project

```bash
# Link to your project (get project ref from dashboard)
npx supabase link --project-ref your-project-reference-id

# Push the database schema
npx supabase db push
```

### 2. Or Start Local Development

```bash
# Start local Supabase (first time may take several minutes)
npx supabase start

# The output will show your local URLs and keys
```

### 3. Configure Environment Variables

Use the setup script to generate templates:
```bash
node setup-supabase.js
# Choose option 3
```

Or manually create the files:

**Backend (.env):**
```env
# Get these from your Supabase dashboard or local output
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
USE_SUPABASE=true

# Keep existing vars
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key
```

**Frontend (.env):**
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_USE_SUPABASE=true
REACT_APP_API_URL=http://localhost:3001/api
```

## 🗂️ What Gets Created

The CLI migrations will create:

### Database Tables
- `documents` - Main document storage
- `document_chunks` - Text chunks with vector embeddings
- `extracted_metrics` - Parsed metrics from documents
- `ai_metrics_cache` - Cached AI analysis results
- `processing_jobs` - Background job tracking
- `security_audit_log` - Security event logging

### Storage
- `documents` bucket - For PDF file storage

### Security
- Row Level Security (RLS) policies on all tables
- Helper functions for access control
- Audit logging system

## ✅ Verify Setup

### Test with CLI
```bash
node setup-supabase.js
# Choose option 4
```

### Manual Testing
```bash
# Run backend test
cd backend && node test-supabase.js

# Check Supabase status
npx supabase status
```

## 🔧 Development Workflow

### With Remote Project
```bash
# Pull latest schema changes
npx supabase db pull

# Make schema changes locally
# Edit files in supabase/migrations/

# Push changes to remote
npx supabase db push
```

### With Local Development
```bash
# Start local environment
npx supabase start

# Stop when done
npx supabase stop

# Reset local database
npx supabase db reset
```

## 🛠️ Migration Files

The setup creates these migration files:

- `20250808001239_initial_schema.sql` - Core tables and indexes
- `20250808001338_row_level_security.sql` - Security policies
- `seed.sql` - Initial data and storage bucket

## 🎯 Next Steps

1. **Start your application:**
   ```bash
   # Backend
   cd backend && npm run dev

   # Frontend
   cd frontend && npm start
   ```

2. **Test the integration:**
   - Upload a PDF file
   - Check real-time updates
   - Verify data appears in Supabase dashboard

3. **Production deployment:**
   - Use your production Supabase project
   - Update environment variables
   - Run migrations with `npx supabase db push`

## 🔍 Troubleshooting

### Migration Errors
```bash
# Check migration status
npx supabase migration list

# Reset and retry
npx supabase db reset
npx supabase db push
```

### Connection Issues
```bash
# Check Supabase status
npx supabase status

# Re-link project
npx supabase link --project-ref your-project-ref
```

### Storage Issues
- Ensure the `documents` bucket exists in your dashboard
- Check storage policies are correctly applied
- Verify file size limits (50MB default)

## 🔐 Security Notes

**Current Setup (Demo Mode):**
- Public read access to all tables
- Authenticated users can insert/update
- Service role can delete (for admin operations)

**For Production:**
- Implement user authentication
- Add user-specific access controls
- Update RLS policies for proper user isolation
- Use signed URLs for storage access

## 📚 Useful Commands

```bash
# View local dashboard
npx supabase dashboard

# Generate TypeScript types
npx supabase gen types typescript --local > types/supabase.ts

# View logs
npx supabase logs

# Backup data
npx supabase db dump > backup.sql
```

## 🆘 Need Help?

1. **Check the logs:**
   ```bash
   npx supabase logs
   ```

2. **Verify environment variables:**
   ```bash
   node setup-supabase.js  # Option 4
   ```

3. **Reset everything:**
   ```bash
   npx supabase db reset
   npx supabase db push
   ```

---

**The CLI approach handles all the complexity for you - no manual SQL copying required! 🎉**