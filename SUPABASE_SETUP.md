# Supabase Integration Setup Guide

This guide explains how to set up and use Supabase with your ESOP analyzer application.

## Overview

The application now supports both PostgreSQL (default) and Supabase as database backends. Supabase provides additional real-time capabilities, built-in authentication, file storage, and auto-generated APIs.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created in your dashboard
3. Node.js and npm installed

## Setup Instructions

### 1. Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization and set project name
4. Choose a database password (save this securely)
5. Select a region close to your users
6. Wait for the project to be created

### 2. Get Supabase Credentials

From your Supabase project dashboard:

1. Go to Settings > API
2. Copy the following values:
   - Project URL (e.g., `https://your-project.supabase.co`)
   - Public anon key
   - Service role key (keep this secret!)

### 3. Set Up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Run the schema setup script:

```sql
-- Copy and paste the contents of backend/supabase-schema.sql
```

3. Then run the RLS policies script:

```sql
-- Copy and paste the contents of backend/supabase-rls-policies.sql
```

### 4. Configure Environment Variables

#### Backend Configuration

Add to your `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Enable Supabase mode (optional - defaults to PostgreSQL)
USE_SUPABASE=true

# Keep existing PostgreSQL config as backup
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

#### Frontend Configuration

Create/update `frontend/.env`:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here

# Enable Supabase mode
REACT_APP_USE_SUPABASE=true

# API URL (keep existing)
REACT_APP_API_URL=http://localhost:3001/api
```

### 5. Install Dependencies

Dependencies are already installed if you followed the main setup, but you can verify:

```bash
# Backend
cd backend
npm list @supabase/supabase-js

# Frontend  
cd ../frontend
npm list @supabase/supabase-js
```

### 6. Set Up Storage Bucket

1. In Supabase dashboard, go to Storage
2. Create a bucket named `documents`
3. Set the bucket to private (recommended) or public based on your needs
4. The RLS policies will handle access control

### 7. Start the Application

```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)  
npm start
```

You should see console messages indicating which database mode is active:
- "🗄️ Using Supabase for data storage" (if USE_SUPABASE=true)
- "🗄️ Using PostgreSQL for data storage" (if USE_SUPABASE=false or not set)

## Features Available with Supabase

### Real-time Updates
- Document list updates automatically when new files are uploaded
- Processing status updates in real-time without page refresh
- Metrics and analysis results appear as they're computed

### File Storage
- PDF files are stored in Supabase Storage instead of local filesystem
- Secure file access with signed URLs
- Automatic cleanup and organization

### Enhanced Security
- Row Level Security (RLS) policies protect data access
- Built-in authentication support (can be extended)
- Audit logging for security events

### API Features
- Auto-generated REST API for database operations
- Real-time subscriptions via websockets
- Server-Sent Events for job status updates

## Using Real-time Features

### In React Components

```typescript
import { useRealtimeDocuments, useJobStream } from '../hooks/useRealtimeUpdates';

// Real-time document updates
const { isConnected } = useRealtimeDocuments({
  onDocumentAdded: (doc) => console.log('New document:', doc),
  onDocumentUpdated: (doc) => console.log('Updated:', doc)
});

// Real-time job status
const { status, isConnected: jobConnected } = useJobStream(jobId);
```

### Server-Sent Events

The `/api/supabase/pdf/job/:jobId/stream` endpoint provides real-time job updates:

```javascript
const eventSource = new EventSource(`/api/supabase/pdf/job/${jobId}/stream`);
eventSource.onmessage = (event) => {
  const jobData = JSON.parse(event.data);
  console.log('Job update:', jobData);
};
```

## API Endpoints

When Supabase mode is enabled, additional API endpoints are available:

- `POST /api/supabase/pdf/upload` - Upload PDF with Supabase storage
- `GET /api/supabase/pdf/job/:jobId` - Get job status
- `GET /api/supabase/pdf/job/:jobId/stream` - Stream job updates (SSE)
- `GET /api/supabase/pdf/documents` - List documents
- `GET /api/supabase/pdf/documents/:id` - Get document
- `GET /api/supabase/metrics/:documentId` - Get metrics
- `GET /api/supabase/metrics/live/:documentId` - Get live metrics
- `GET /api/supabase/metrics/stream/:documentId` - Stream metrics updates

## Migration from PostgreSQL

To migrate existing data from PostgreSQL to Supabase:

1. Export your existing PostgreSQL data
2. Set up Supabase schema (steps above)
3. Import data using Supabase SQL editor or pg_dump/pg_restore
4. Update file paths in documents table to point to Supabase Storage
5. Test the migration thoroughly

## Switching Between Modes

You can switch between PostgreSQL and Supabase by changing the `USE_SUPABASE` environment variable:

```env
# Use Supabase
USE_SUPABASE=true

# Use PostgreSQL  
USE_SUPABASE=false
```

Restart your backend server after changing this setting.

## Troubleshooting

### Connection Issues
- Verify your Supabase URL and keys are correct
- Check that your Supabase project is active
- Ensure environment variables are loaded properly

### Real-time Not Working
- Check browser console for WebSocket connection errors
- Verify RLS policies allow your user to access data
- Ensure Supabase project has real-time enabled

### File Upload Issues
- Check that the `documents` storage bucket exists
- Verify storage policies allow your user to upload
- Check file size limits (default: 50MB)

### Authentication Errors
- For demo purposes, the app uses anonymous access
- Check RLS policies if you implement user authentication
- Verify service role key is used for backend operations

## Security Considerations

### Row Level Security
- Current setup allows anonymous read access for demo purposes
- In production, implement proper user authentication
- Restrict access based on user ownership or organization membership

### API Keys
- Keep service role key secret and only use on backend
- Use anon key for frontend operations
- Rotate keys periodically

### Storage Security
- Current storage bucket allows public read for demo
- In production, use signed URLs for secure file access
- Implement proper access controls based on user permissions

## Performance Optimization

### Database
- Indexes are automatically created for common queries
- Use Supabase's built-in query optimization
- Monitor query performance in Supabase dashboard

### Real-time
- Limit number of active subscriptions
- Use specific filters to reduce data transfer
- Clean up subscriptions when components unmount

### Storage
- Use appropriate file sizes and formats
- Implement client-side compression if needed
- Consider CDN for frequently accessed files

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-production-service-key
SUPABASE_ANON_KEY=your-production-anon-key
```

### Security Hardening
- Enable proper RLS policies with user authentication
- Set up API rate limiting
- Configure CORS appropriately
- Use HTTPS everywhere

### Monitoring
- Set up Supabase monitoring and alerts
- Monitor API usage and database performance
- Set up logging and error tracking

## Support

For issues specific to Supabase integration:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review the generated SQL queries in Supabase dashboard
3. Check the browser console and server logs for errors
4. Verify environment variables and configuration

For application-specific issues, refer to the main project documentation.