# ESOP Analyzer - AI-Powered Document Analysis Platform

A full-stack application that uses AI to analyze ESOP (Employee Stock Ownership Plan) valuation documents, extract key financial metrics, and provide intelligent question-answering capabilities.

## Features

- **PDF Document Processing**: Upload and process ESOP valuation reports
- **AI-Powered Metrics Extraction**: Automatically extract key financial metrics using OpenAI
- **Intelligent Question Answering**: Ask questions about your documents with proper page citations
- **Multi-Page Document Support**: Smart page splitting and citation management
- **Real-time Processing**: Background job processing with status updates
- **Interactive Dashboard**: View extracted metrics in an intuitive interface

## Architecture

### Backend (`/backend`)
- **Node.js/Express** API server
- **PostgreSQL** database for document storage
- **OpenAI GPT-4** for AI analysis and question answering
- **Reducto API** for PDF text extraction
- **Vector embeddings** for semantic search
- **Background job processing** for large documents

### Frontend (`/frontend`)
- **React/TypeScript** single-page application  
- **Tailwind CSS** for styling
- **Real-time updates** for processing status
- **Interactive metrics dashboard**
- **Citation-linked question answering**

## Key Improvements Made

### Question Answering System
- ✅ **Smart Document Chunking**: Breaks large documents into optimal-sized chunks for better AI processing
- ✅ **Page-Aware Citations**: Properly tracks and displays page numbers in citations
- ✅ **Multi-Page Coverage**: Uses content from across the entire document, not just the beginning
- ✅ **Citation Alignment**: Page numbers mentioned in AI answers match the citation sources shown

### Document Processing
- ✅ **Intelligent Page Splitting**: Automatically detects logical page breaks or splits by content size
- ✅ **Fallback Processing**: Multiple extraction methods ensure documents are processed even if primary methods fail
- ✅ **Vector Similarity Search**: Uses embeddings to find most relevant content for questions
- ✅ **Token Management**: Smart context preparation to maximize AI model performance

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- OpenAI API key
- Reducto API key (optional, has fallback)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys and database URL
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Database Setup
The application will automatically create the required database tables on first run.

## Environment Variables

### Backend (.env)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/esop_analyzer
OPENAI_API_KEY=your_openai_key_here
REDUCTO_API_KEY=your_reducto_key_here
CHAT_MODEL=gpt-4
EMBEDDING_MODEL=text-embedding-3-small
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

## API Endpoints

### Document Management
- `POST /api/pdf/upload` - Upload PDF document
- `GET /api/pdf/job/:jobId` - Check processing status
- `GET /api/pdf/documents` - List all documents
- `GET /api/pdf/documents/:id` - Get specific document

### AI Analysis
- `POST /api/questions/ask` - Ask questions about documents
- `GET /api/questions/history/:documentId` - Get question history
- `GET /api/metrics/:documentId` - Get extracted metrics

## Technical Details

### Document Processing Pipeline
1. **PDF Upload** → Reducto API extraction
2. **Text Analysis** → Intelligent page splitting 
3. **Chunking** → Break into optimal-sized pieces
4. **Embedding** → Generate vector embeddings
5. **Storage** → Store with page metadata

### Question Answering Flow
1. **Question Input** → Create question embedding
2. **Similarity Search** → Find relevant document chunks
3. **Page Diversity** → Select chunks from different pages
4. **Context Preparation** → Format with page markers
5. **AI Processing** → Generate answer with citations
6. **Citation Alignment** → Ensure page references match

### Key Technologies
- **Vector Search**: Cosine similarity for semantic matching
- **Background Jobs**: Async processing for large documents
- **Smart Chunking**: Content-aware text splitting
- **Token Management**: Optimize AI model context usage
- **Citation Tracking**: Page-level source attribution

## Recent Fixes & Improvements

### Fixed Citation Issues ✅
- **Problem**: Citations always showed "Page 1" regardless of actual content location
- **Solution**: Implemented intelligent page splitting that works even when PDF parsing returns single page
- **Result**: Proper page numbers (1, 2, 3, etc.) in both AI answers and citation sources

### Enhanced Document Processing ✅  
- **Problem**: Large documents only used first portion of content
- **Solution**: Smart chunking with overlap and full document coverage
- **Result**: Questions can be answered from anywhere in the document

### Improved AI Responses ✅
- **Problem**: AI responses didn't explicitly reference page numbers
- **Solution**: Enhanced system prompts and citation validation
- **Result**: AI answers now include specific page references that match citations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license here]

## Support

For questions or issues, please open a GitHub issue or contact the development team.