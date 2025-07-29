-- Migration 008: Add concurrency configuration support
-- This migration adds a comment to document the concurrency settings

COMMENT ON TABLE document_chunks IS 'Document chunks with configurable concurrency via CONCURRENCY_LIMIT env var (default: 8)'; 