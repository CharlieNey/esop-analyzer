import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  query_timeout: parseInt(process.env.PROCESSING_TIMEOUT) || 900000, // 15 minutes for long operations
  connectionTimeoutMillis: 30000, // 30 seconds to establish connection
  idleTimeoutMillis: 600000, // 10 minutes idle timeout
});

export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        content_text TEXT,
        metadata JSONB DEFAULT '{}',
        processed_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        chunk_text TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS extracted_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        metric_type VARCHAR(100) NOT NULL,
        metric_value TEXT,
        metric_data JSONB DEFAULT '{}',
        confidence_score FLOAT DEFAULT 0.0,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
      ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    `);

    // Create AI metrics cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_metrics_cache (
        id SERIAL PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        ai_metrics JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(document_id)
      )
    `);

    // Create index on document_id and created_at for cache queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_metrics_cache_document_created 
      ON ai_metrics_cache (document_id, created_at)
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export { pool };