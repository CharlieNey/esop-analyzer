# ESOP Analyzer Setup Guide

## Prerequisites

### 1. Redis (Required for Background Jobs)

The application uses Redis for background job processing with Bull Queue.

**Install Redis:**
```bash
brew install redis
```

**Start Redis:**
```bash
brew services start redis
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

### 2. Environment Variables

Make sure you have the following environment variables set in your `.env` files:

**Backend (.env):**
```env
# Database
DATABASE_URL=your_postgres_url

# OpenAI
OPENAI_API_KEY=your_openai_key

# Reducto AI
REDUCTO_API_KEY=your_reducto_key

# Redis (optional - defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3001
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## Running the Application

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## Troubleshooting

### Redis Connection Errors
If you see `ECONNREFUSED 127.0.0.1:6379` errors:
1. Make sure Redis is installed: `brew install redis`
2. Start Redis service: `brew services start redis`
3. Check if Redis is running: `redis-cli ping`

### Port Already in Use
If port 3001 is already in use:
```bash
lsof -ti:3001 | xargs kill -9
```

### Background Jobs Not Processing
1. Check Redis is running
2. Check server logs for job queue initialization
3. Verify WebSocket connection in browser DevTools

## Architecture

- **Frontend**: React with Socket.IO for real-time updates
- **Backend**: Node.js/Express with Bull Queue for background jobs
- **Database**: PostgreSQL for document and chunk storage
- **Cache/Queue**: Redis for job processing and real-time updates
- **AI Services**: OpenAI for embeddings/chat, Reducto for PDF parsing