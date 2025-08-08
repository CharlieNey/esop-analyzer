-- Initial schema for ESOP Analyzer application
-- This sets up all required tables and extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_text TEXT,
    metadata JSONB DEFAULT '{}',
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extracted_metrics table
CREATE TABLE IF NOT EXISTS public.extracted_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value TEXT,
    metric_data JSONB DEFAULT '{}',
    confidence_score FLOAT DEFAULT 0.0,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_metrics_cache table
CREATE TABLE IF NOT EXISTS public.ai_metrics_cache (
    id SERIAL PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    ai_metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id)
);

-- Create processing_jobs table (for background job tracking)
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    job_type VARCHAR(50) NOT NULL,
    progress INTEGER DEFAULT 0,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON public.documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_processed_at ON public.documents(processed_at);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_page ON public.document_chunks(page_number);
-- Note: Vector index will be created after data is inserted

CREATE INDEX IF NOT EXISTS idx_extracted_metrics_document_id ON public.extracted_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_metrics_type ON public.extracted_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_extracted_metrics_extracted_at ON public.extracted_metrics(extracted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_cache_document_created ON public.ai_metrics_cache(document_id, created_at);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON public.processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON public.processing_jobs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers (drop if exists first)
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON public.processing_jobs;
CREATE TRIGGER update_processing_jobs_updated_at 
    BEFORE UPDATE ON public.processing_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add table comments
COMMENT ON TABLE public.documents IS 'Main documents table storing uploaded PDF files and their metadata';
COMMENT ON TABLE public.document_chunks IS 'Text chunks extracted from documents with embeddings for similarity search';
COMMENT ON TABLE public.extracted_metrics IS 'Metrics extracted from documents using various methods (OpenAI, regex, etc.)';
COMMENT ON TABLE public.ai_metrics_cache IS 'Cached AI-generated metrics and analysis results';
COMMENT ON TABLE public.processing_jobs IS 'Background job tracking for document processing tasks';

COMMENT ON COLUMN public.documents.file_path IS 'Path to file in storage (local filesystem or Supabase Storage)';
COMMENT ON COLUMN public.document_chunks.embedding IS 'Vector embedding for semantic search (1536 dimensions for OpenAI)';
COMMENT ON COLUMN public.processing_jobs.progress IS 'Job completion percentage (0-100)';