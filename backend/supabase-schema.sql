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
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_extracted_metrics_document_id ON public.extracted_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_cache_document_created ON public.ai_metrics_cache(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON public.processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.processing_jobs(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON public.processing_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations for authenticated users
-- In production, you would want more granular policies
CREATE POLICY "Allow all operations for authenticated users" ON public.documents
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow all operations for authenticated users" ON public.document_chunks
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow all operations for authenticated users" ON public.extracted_metrics
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow all operations for authenticated users" ON public.ai_metrics_cache
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow all operations for authenticated users" ON public.processing_jobs
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

-- Storage policy for documents bucket
CREATE POLICY "Allow authenticated users to upload documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to documents" 
ON storage.objects FOR ALL 
USING (bucket_id = 'documents' AND auth.role() = 'service_role');