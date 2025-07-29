-- Create processing_jobs table for tracking async PDF processing
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress_message TEXT,
    document_id UUID REFERENCES documents(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_processing_jobs_updated_at ON processing_jobs;
CREATE TRIGGER update_processing_jobs_updated_at
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_jobs_updated_at();