-- Migration 004: Add visual content support to document_chunks table
-- This migration adds support for tracking visual elements (tables, charts, images)

-- Add columns for visual content tracking
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'text';

-- Add column for visual element descriptions
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS visual_description TEXT;

-- Add column for structured data from visual elements
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS structured_data JSONB;

-- Add index for content type for faster queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_type ON document_chunks(content_type);

-- Add index for visual elements
CREATE INDEX IF NOT EXISTS idx_document_chunks_visual ON document_chunks((metadata->>'isVisualContent'));

-- Add index for element types
CREATE INDEX IF NOT EXISTS idx_document_chunks_element_type ON document_chunks((metadata->>'elementType'));

-- Update existing text chunks to have explicit content_type
UPDATE document_chunks 
SET content_type = 'text' 
WHERE content_type IS NULL OR content_type = '';

COMMENT ON COLUMN document_chunks.content_type IS 'Type of content: text, table, chart, or image';
COMMENT ON COLUMN document_chunks.visual_description IS 'Human-readable description of visual elements';
COMMENT ON COLUMN document_chunks.structured_data IS 'JSON data extracted from visual elements (table data, chart series, etc.)';