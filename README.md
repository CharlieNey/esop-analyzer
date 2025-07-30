# Village Labs ESOP Analyzer

A  AI-powered document analysis platform specifically designed for ESOP (Employee Stock Ownership Plan) valuation reports. This system combines advanced AI models,  backend processing, and interactive data visualizations to extract, present, and explain key financial metrics from complex valuation documents.

## Core Features

### Document Processing & AI Extraction
- **PDF Processing**: PDF text extraction with fallback mechanisms
- **AI Validation**: validation system using multiple AI prompts for improved accuracy
- **Content Chunking**: document segmentation for optimal AI processing

### AI-Powered Analysis
- **AI Integrations**: OpenAI GPT-4 and Anthropic Claude support with automatic fallback
- **Metrics Extraction**: extraction of enterprise value, equity value, financial ratios
- **Question Answering**: Context-aware responses with precise page citations
- **Similarity Search**: Semantic search using pgvector for relevant content retrieval

### Interactive Analytics Dashboard


## Architecture

### Backend Infrastructure (`/backend`)

**Core Technologies:**
- **Runtime**: Node.js 18+ with ES6 modules
- **Framework**: Express.js with comprehensive middleware stack
- **Database**: PostgreSQL with pgvector extension for vector operations
- **AI Integration**: OpenAI GPT-4, Anthropic Claude SDK
- **PDF Processing**: Reducto API

**Key Libraries & Services:**
```json
{
  "AI & ML": {
    "openai": "^4.28.0",
    "@anthropic-ai/sdk": "^0.57.0",
    "pgvector": "^0.1.8"
  },
  "PDF Processing": {
    "reductoai": "^0.8.0"
  },
  "Database & Storage": {
    "pg": "^8.11.3", 
    "uuid": "^9.0.1"
  },
  "Web Framework": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "multer": "^1.4.5-lts.1"
  }
}
```

**PDF Processing Pipeline:**
1. **Multi-Stage PDF Extraction**: Reducto API -> Text cleaning
2. **Enhanced AI Validation**: validation with multiple prompts
3. **Intelligent Chunking**: Content-aware segmentation with overlap
4. **Vector Embedding**: dimensional semantic representations for similarity search
5. **Background Job Management**: Async processing with status tracking and error recovery

### Frontend Application (`/frontend`)

**Core Technologies:**
- **Framework**: React 19.1.0 with TypeScript for type safety
- **Styling**: Tailwind CSS 3.4+ with custom components
- **Data Visualization**: Recharts + D3.js for advanced charts
- **State Management**: React hooks with optimized rendering

**Advanced Visualization Libraries:**
```json
{
  "Charts & Visualizations": {
    "recharts": "^3.1.0",
    "d3": "^7.9.0", 
    "d3-sankey": "^0.12.3"
  },
  "UI Components": {
    "lucide-react": "^0.526.0",
    "@tailwindcss/forms": "^0.5.10"
  },
  "Export & Utilities": {
    "html2canvas": "^1.4.1",
    "jspdf": "^3.0.1"
  }
}
```

**Interactive Dashboard Components:**
- **Enhanced Metrics Dashboard**: Real-time financial metrics
- **Advanced Charts**: Various charts to help visualize data change over time
- **Export System**: PDF generation and image capture for reporting

## Model Selection & AI Strategy

### Primary AI Models

**OpenAI GPT-4**
- **Use Case**: Primary extraction engine for complex financial documents
- **Strengths**: Superior understanding of financial terminology and document structure

**Anthropic Claude (Sonnet/Haiku)**
- **Use Case**: Fallback processing and cross-validation
- **Strengths**: Alternative reasoning approach for validation

**Text Embedding Models**
- **Primary**: `text-embedding-3-small` for faster, cost-effective semantic search
- **Fallback**: `text-embedding-ada-002` for compatibility
- **Vector Dimensions**: 1536-dimensional embeddings with pgvector indexing


## Database Schema & Vector Search

### PostgreSQL Tables
- **`documents`**: Core document metadata and full-text content
- **`document_chunks`**: Segmented content with vector embeddings
- **`extracted_metrics`**: AI-extracted financial metrics with confidence scores
- **`processing_jobs`**: Background job tracking and status management
- **`questions`**: Q&A history with citation tracking


## Setup & Installation

### Prerequisites
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 14+ with pgvector extension
- **API Keys**: OpenAI API key, optional Reducto API key

### Database Setup
```bash
# Install PostgreSQL and pgvector
createdb village_labs_esop

# Run migrations
cd backend
npm run migrate
```

### Backend Configuration
```bash
cd backend
npm install
cp .env.example .env
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Development Workflow
```bash
cd backend && npm run dev  
cd frontend && npm start
npm test
```

## 🔧 API Architecture

### Document Processing Endpoints
```javascript
POST   /api/pdf/upload        // Upload & process PDF documents
GET    /api/pdf/job/:jobId     // Check background job status  
GET    /api/pdf/documents      // List all processed documents
GET    /api/pdf/documents/:id  // Get specific document details
```

### AI Analysis Endpoints
```javascript
POST   /api/questions/ask           // Intelligent Q&A with citations
GET    /api/questions/history/:id   // Question/answer history
GET    /api/metrics/:documentId     // Extract financial metrics
POST   /api/metrics/validate        // Manual metrics validation
```

### Image Processing Endpoints
```javascript
POST   /api/images/upload      // Process document images/charts
GET    /api/images/:id         // Retrieve processed image data
```


## Performance & Scalability

### Optimization Strategies
- **Vector Indexing**: IVFFlat indexes for fast similarity search at scale
- **Connection Pooling**: Efficient database connection management
- **Async Processing**: Non-blocking operations for large document processing
- **Caching Layer**: Intelligent caching of embeddings and frequently accessed data
- **Resource Management**: Memory optimization for large document processing

### Monitoring & Analytics
- **Processing Metrics**: Document processing times and success rates
- **AI Model Performance**: Accuracy tracking and model comparison
- **System Resources**: Memory, CPU, and database performance monitoring
- **User Analytics**: Usage patterns and feature adoption tracking

## Security & Compliance

### Data Protection
- **Input Validation**: Comprehensive sanitization of all user inputs
- **File Type Verification**: Strict PDF validation and virus scanning
- **Access Control**: Role-based permissions and authentication ready
- **Data Encryption**: Secure storage of sensitive financial data

### API Security
- **Rate Limiting**: Configurable request rate limiting
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Security Headers**: Helmet.js integration for security best practices
- **Environment Isolation**: Secure environment variable management

## 🛠️ Development & Testing

### Code Quality Standards
- **TypeScript**: Full type safety across frontend components
- **ESLint**: Consistent code formatting and best practices
- **Jest Testing**: Comprehensive unit and integration test coverage
- **Database Migrations**: Version-controlled schema management

### Testing Strategy
```bash
# Backend testing
cd backend
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:load          # Load testing

# Frontend testing
cd frontend  
npm test                   # React component tests
npm run test:e2e          # End-to-end testing
```

### Deployment Architecture
```bash
# Production deployment
docker-compose up -d        # Multi-container deployment
npm run build              # Production builds
npm run migrate:prod       # Production migrations
```

## Future Enhancements
- **Multi-document Comparison**: Side-by-side analysis of multiple ESOP reports
- **Advanced Export Features**: Excel, PowerPoint, and custom report generation  



**Built for Village Labs** 