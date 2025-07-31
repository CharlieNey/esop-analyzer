# Village Labs ESOP Analyzer

A  AI-powered document analysis platform specifically designed for ESOP (Employee Stock Ownership Plan) valuation reports. This system combines advanced AI models,  backend processing, and interactive data visualizations to extract, present, and explain key financial metrics from valuation documents.

## Core Features

### Document Processing & AI Extraction
- **PDF Processing**: PDF text extraction using Reducto API with comprehensive fallback mechanisms
- **Enhanced AI Validation with Date Awareness**: Multi-stage validation system that filters historical/projected data to match valuation dates
- **Conflict Resolution AI**: candidate selection system that chooses between conflicting values using AI judgment
- **Background Job Processing**: Async processing pipeline for large documents with real-time status updates
- **Content Chunking**: Intelligent document segmentation with page-aware citation tracking

### 🤖 AI-Powered Analysis
- **Dual AI Integration**: OpenAI GPT-4 and Anthropic Claude support with automatic fallback
- **Date-Aware Metrics Extraction**: Sophisticated extraction that avoids projected/historical values outside valuation date
- **Intelligent Question Answering**: Context-aware responses with precise page citations and consistent page numbering
- **Vector Similarity Search**: Semantic search using pgvector for relevant content retrieval with optimized context selection

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
- **Framework**: React 18.2.0 with TypeScript for type safety
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
- **Strengths**: better understanding of financial terminology and document structure

**Anthropic Claude (Sonnet/Haiku)**
- **Use Case**: Fallback processing and cross-validation
- **Strengths**: Alternative reasoning approach for validation

**Text Embedding Models**
- **Primary**: `text-embedding-3-small` for faster, cost-effective semantic search
- **Fallback**: `text-embedding-ada-002` for compatibility
- **Vector Dimensions**: 1536-dimensional embeddings with pgvector indexing


### Key Validation Improvements 
- **Date Filtering**: Automatically extracts valuation dates and filters out historical/projected values
- **Candidate Selection**: Collects multiple potential values and uses AI to choose the most reliable
- **Per-Share Detection**: Filters out per-share values (like 3.04) when looking for total amounts (like 25M)

## Database Schema & Vector Search

### PostgreSQL Tables
- **`documents`**: Core document metadata and full-text content
- **`document_chunks`**: Segmented content with vector embeddings
- **`extracted_metrics`**: AI-extracted financial metrics
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

### Enhanced Metrics Extraction
The system extracts and validates:
- **Enterprise Value**: Total business value including debt
- **Equity Value**: Shareholder value after debt
- **Valuation Per Share**: Fair market value calculations
- **Financial Ratios**: Revenue multiples, EBITDA multiples  
- **Capital Structure**: ESOP ownership percentages
- **Discount Rates**: risk-free rates, market premiums

## Charts Visualization

### Historical Data Analysis & Trend Visualization
- **Multi-Year Data Extraction**: AI-powered extraction of historical financial data (revenue, EBITDA, cash flow, growth rates, margins, debt coverage)
- **Intelligent Trend Charts**: Linear trend charts with historical vs. projected data visualization
- **Predictive Analytics**: Future trend projections based on historical patterns with clear distinction from actual data
- **Comprehensive Metrics**: Revenue trends, EBITDA trends, per-share value history, cash flow analysis, growth rate tracking, profit margin analysis, debt coverage ratios
- **Fallback System**: Multiple AI query strategies to maximize historical data extraction success

### Performance Optimization & Caching
- **Graph Caching System**: Intelligent localStorage caching with 24-hour expiration
- **Instant Loading**: Previously processed graphs load immediately on document revisits


### Multi-Layer Validation System
- **Date-Aware Extraction**: Valuation date detection with automatic filtering of wrong-period data
- **Candidate Collection**: Multiple extraction methods (primary, secondary, targeted search) for each metric
- **AI Conflict Resolution**: Smart selection between conflicting values using document context and authority
- **Cross-validation**: Mathematical relationship validation (Enterprise Value ≥ Equity Value)
- **Value Type Filtering**: Automatic detection and filtering of per-share vs. total values
- **Confidence Scoring**: Statistical confidence measures with date relevance weighting
- **Pattern Matching Fallback**: Regex-based extraction as backup validation

### Error Handling & Recovery
- **Graceful Degradation**: System continues functioning if components fail
- **Automatic Retry Logic**: Failed operations retry with exponential backoff
- **Comprehensive Logging**: Detailed audit trails for debugging and compliance
- **Health Monitoring**: System health checks and performance metrics

## 🚀 Performance & Scalability

### Optimization Strategies
- **Vector Indexing**: IVFFlat indexes for fast similarity search at scale
- **Connection Pooling**: Efficient database connection management
- **Async Processing**: Non-blocking operations for large document processing
- **Caching Layer**: Intelligent caching of embeddings and frequently accessed data
- **Resource Management**: Memory optimization for large document processing

## Security & Compliance

### Data Protection
- **Input Validation**: Basic sanitization for PDF uploads and questions using express-validator
- **File Type Verification**: Comprehensive PDF validation with magic byte detection and header validation
- **Access Control**: JWT authentication framework with role-based middleware

### API Security
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Security Headers**: Helmet.js integration with Content Security Policy
- **Environment Isolation**: Environment variable management with dotenv

### Security Features
- **PDF Security**: File size limits, type validation, suspicious content detection, secure file naming
- **Authentication Framework**: JWT token validation with security logging
- **Input Sanitization**: HTML escaping and length validation
- **Security Logging**: Comprehensive security event logging
- **Error Sanitization**: Production-safe error messages

### Security Limitations
- **Rate Limiting**: Currently disabled (framework exists but not active)
- **No Virus Scanning**: PDF files are not scanned for malware
- **Development Authentication**: Uses hardcoded development tokens
- **No Data Encryption**: Financial data stored in plain text

### Code Quality Standards
- **TypeScript**: Full type safety across frontend components
- **ESLint**: Consistent code formatting and best practices
- **Jest Testing**: Basic unit test coverage
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


## Future Enhancements

### Short-term Goals (3-6 months)
- **Outlier Detection**: Automatic detection and filtering of extreme values in chart data
- **Multi-document Comparison**: Side-by-side analysis of multiple ESOP reports
- **Advanced Export Features**: Excel, PowerPoint, and custom report generation  


**Built for Village Labs** 