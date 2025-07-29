# ESOP Analyzer - Village Labs Challenge

A full-stack application that ingests ESOP valuation PDFs, enables intelligent question-answering with citations, and presents key financial metrics through an interactive dashboard.

## 🎯 Purpose

This application demonstrates expertise in building AI-powered document analysis systems specifically for ESOP (Employee Stock Ownership Plan) valuation reports - the core domain of Village Labs.

## ✨ Features

### 1. **PDF Ingestion & Processing**
- Upload ESOP valuation PDFs through drag-and-drop interface
- Automatic text extraction and intelligent chunking
- Vector embeddings for semantic search capabilities

### 2. **AI-Powered Question Answering**
- Natural language queries about document content
- GPT-4 powered responses with precise citations
- Context-aware answers for financial terminology
- Real-time semantic search through document chunks

### 3. **Interactive Metrics Dashboard**
- **Company Valuation**: Total value and per-share pricing
- **Capital Structure**: ESOP ownership percentages and share distribution
- **Financial Metrics**: Revenue, EBITDA, and key ratios
- **Valuation Analysis**: Discount rates and valuation multiples
- Interactive charts and visualizations

## 🏗️ Architecture

### **Frontend (React + TypeScript)**
- **Component-based architecture** with TypeScript for type safety
- **Tailwind CSS** for rapid, consistent UI development
- **Recharts** for interactive financial data visualizations
- **Lucide React** for consistent iconography

### **Backend (Node.js + Express)**
- **RESTful API** with proper error handling and validation
- **Multer** for secure file upload handling
- **PDF-parse** for reliable text extraction
- **Express middleware** for CORS, security, and request parsing

### **Database (PostgreSQL + pgvector)**
- **PostgreSQL** for structured data storage and ACID compliance
- **pgvector extension** for vector similarity search
- **Optimized schemas** for documents, chunks, and extracted metrics

### **AI/ML Integration**
- **OpenAI GPT-4** for question answering and content analysis
- **text-embedding-ada-002** for semantic search capabilities
- **Custom prompts** optimized for financial document analysis

## 🛠️ Tech Stack Justification

| Technology | Justification |
|------------|---------------|
| **React + TypeScript** | Industry standard for maintainable UIs with compile-time type safety |
| **Node.js** | JavaScript ecosystem consistency, excellent PDF processing libraries |
| **PostgreSQL + pgvector** | Robust ACID compliance with native vector search capabilities |
| **OpenAI GPT-4** | Best-in-class language understanding for complex financial documents |
| **Tailwind CSS** | Rapid development with consistent design system |
| **Express.js** | Mature, lightweight framework with extensive middleware ecosystem |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+ with pgvector extension
- OpenAI API key

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd esop-analyzer
npm run install:all
```

2. **Database setup**
```bash
# Install PostgreSQL and pgvector extension
# Create database: esop_analyzer
createdb esop_analyzer

# Initialize database schema
cd backend
cp .env.example .env
# Edit .env with your database URL and OpenAI API key
npm run init-db
```

3. **Environment configuration**
```bash
# Backend (.env)
DATABASE_URL=postgresql://username:password@localhost:5432/esop_analyzer
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3001/api
```

4. **Start development servers**
```bash
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## 📱 Usage

1. **Upload PDF**: Drag and drop your ESOP valuation report
2. **Explore Dashboard**: View automatically extracted financial metrics
3. **Ask Questions**: Query the document using natural language
4. **Review Citations**: See exact document references for each answer

### Example Questions
- "What is the company's total valuation?"
- "What discount rate was used in the valuation?"
- "How many shares are owned by the ESOP?"
- "What are the key financial assumptions?"

## 🗂️ Project Structure

```
esop-analyzer/
├── backend/
│   ├── src/
│   │   ├── models/          # Database schemas and connections
│   │   ├── routes/          # API endpoints (PDF, questions, metrics)
│   │   ├── services/        # Business logic (PDF processing, OpenAI)
│   │   ├── utils/           # Database initialization
│   │   └── server.js        # Express server configuration
│   ├── uploads/             # PDF file storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript definitions
│   │   └── App.tsx          # Main application
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### PDF Management
- `POST /api/pdf/upload` - Upload and process PDF
- `GET /api/pdf/documents` - List processed documents
- `GET /api/pdf/documents/:id` - Get document details

### Question Answering
- `POST /api/questions/ask` - Ask question about document
- `GET /api/questions/history/:documentId` - Question history

### Metrics & Analytics
- `GET /api/metrics/:documentId` - Get extracted metrics
- `GET /api/metrics/summary/:documentId` - Get metrics summary

## 🎯 Key Metrics Extracted

- **Company Valuation**: Total enterprise value and per-share pricing
- **Capital Structure**: Share distribution and ESOP ownership percentages  
- **Financial Performance**: Revenue, EBITDA, net income
- **Valuation Methodology**: Discount rates, risk premiums, multiples
- **Market Analysis**: Comparable company data and industry benchmarks

## 🔒 Security Features

- **Helmet.js** for security headers
- **File type validation** (PDF only)
- **File size limits** (10MB max)
- **CORS configuration** for cross-origin security
- **Input sanitization** and validation

## 🧪 Testing & Development

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
cd frontend && npm test

# Lint code
npm run lint

# Build for production
npm run build
```

## 🚀 Deployment

The application is containerized and ready for deployment to:
- **AWS ECS/Fargate** with RDS PostgreSQL
- **Google Cloud Run** with Cloud SQL
- **Docker Compose** for local development

## 📊 Performance Considerations

- **Vector indexing** with IVFFlat for fast similarity search
- **Connection pooling** for database efficiency
- **Chunked processing** for large PDF documents
- **Caching** for frequently accessed embeddings
- **Lazy loading** for dashboard components

## 🔮 Future Enhancements

- **Multi-document analysis** and comparison
- **Historical trend analysis** across valuation reports
- **Advanced visualization** with D3.js integration
- **Export capabilities** (PDF reports, Excel)
- **User authentication** and document management
- **Real-time collaboration** features

## 📝 Demo Video

[5-minute Loom walkthrough](link-to-be-added) showcasing:
- PDF upload and processing
- Dashboard metrics visualization  
- Question-answering with citations
- Technical architecture overview

---

**Built for Village Labs Challenge** • Powered by OpenAI GPT-4 & PostgreSQL Vector Search