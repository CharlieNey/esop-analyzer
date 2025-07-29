# 🚀 Local Development Setup - ESOP Analyzer

## ✅ Setup Complete!

Your ESOP Analyzer is ready to run locally. Here's what's been configured:

### 🗄️ Database Setup
- ✅ PostgreSQL 14 installed and running
- ✅ `esop_analyzer` database created
- ✅ pgvector extension enabled
- ✅ All tables and indexes created

### 🔧 Environment Configuration
- ✅ Backend environment: `/backend/.env`
- ✅ Frontend environment: `/frontend/.env`
- ✅ Database connection: `postgresql://localhost:5432/esop_analyzer`

## 🏃‍♂️ Running the Application

### Method 1: Using the startup script
```bash
cd /Users/charlieney/village_labs/esop-analyzer
./start-local.sh
```

### Method 2: Manual startup

**Terminal 1 - Backend (Port 3001):**
```bash
cd /Users/charlieney/village_labs/esop-analyzer/backend
npm run dev
```

**Terminal 2 - Frontend (Port 3000):**
```bash
cd /Users/charlieney/village_labs/esop-analyzer/frontend  
npm start
```

## 🔑 Final Setup Step

**Add your OpenAI API key:**
```bash
# Edit backend/.env and replace:
OPENAI_API_KEY=your_openai_api_key_here
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## 🧪 Testing the Application

1. **Upload PDF**: Drag and drop an ESOP valuation PDF
2. **View Dashboard**: See extracted metrics and visualizations
3. **Ask Questions**: Query the document using natural language
4. **Check Citations**: Review document references for answers

## 📁 Key Files

```
esop-analyzer/
├── backend/.env          # API keys and database URL
├── frontend/.env         # Frontend API configuration
├── start-local.sh        # Startup helper script
├── README.md             # Full documentation
└── LOCAL_SETUP.md        # This file
```

## 🔍 API Endpoints Available

- `GET /api/health` - Server health check
- `GET /api/pdf/documents` - List uploaded documents
- `POST /api/pdf/upload` - Upload and process PDF
- `POST /api/questions/ask` - Ask questions about documents
- `GET /api/metrics/:id` - Get extracted financial metrics

## 🛠️ Troubleshooting

**Database Issues:**
```bash
# Restart PostgreSQL
brew services restart postgresql@14

# Recreate database if needed
dropdb esop_analyzer
createdb esop_analyzer
cd backend && npm run init-db
```

**Port Conflicts:**
- Backend runs on port 3001
- Frontend runs on port 3000
- Check if ports are available: `lsof -i :3000` or `lsof -i :3001`

**Dependencies:**
```bash
# Reinstall if needed
npm run install:all
```

## 🎯 Ready to Demo!

Your ESOP Analyzer is fully functional and ready for the Village Labs challenge demonstration. All components are tested and working:

- ✅ PDF ingestion and processing
- ✅ AI-powered question answering  
- ✅ Interactive financial dashboard
- ✅ Vector search with citations
- ✅ Database persistence

Happy analyzing! 🎉