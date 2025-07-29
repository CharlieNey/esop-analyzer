-- Migration 006: Add extracted_metrics column to documents table
-- This migration adds support for storing extracted financial metrics

-- Add column for extracted metrics
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS extracted_metrics JSONB;

-- Add column for metrics extraction timestamp
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS metrics_extracted_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster metrics queries
CREATE INDEX IF NOT EXISTS idx_documents_extracted_metrics ON documents USING GIN (extracted_metrics);

-- Add index for metrics extraction timestamp
CREATE INDEX IF NOT EXISTS idx_documents_metrics_extracted_at ON documents(metrics_extracted_at);

COMMENT ON COLUMN documents.extracted_metrics IS 'JSON data containing extracted financial metrics and key values';
COMMENT ON COLUMN documents.metrics_extracted_at IS 'Timestamp when metrics were successfully extracted';