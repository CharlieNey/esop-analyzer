-- Migration 007: Upgrade to text-embedding-3-large (3072 dimensions)
-- WARNING: This will drop all existing embeddings and require re-processing

-- Drop existing chunks table and its dependencies
DROP TABLE IF EXISTS document_chunks CASCADE;

-- Recreate with 3072 dimensions for text-embedding-3-large
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_number INTEGER,
    embedding vector(3072),
    metadata JSONB DEFAULT '{}'
);

-- Note: Vector indexes limited to 2000 dimensions in pgvector
-- Using exact search for 3072-dimensional embeddings
-- CREATE INDEX would be added here when pgvector supports >2000 dimensions

-- Add other indexes that were in the original schema
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(chunk_index);

-- Add comments
COMMENT ON TABLE document_chunks IS 'Document chunks with 3072-dimensional embeddings for text-embedding-3-large';
COMMENT ON COLUMN document_chunks.embedding IS '3072-dimensional vector embedding from text-embedding-3-large model'; 