import { supabase } from '../config/supabase.js';

export class SupabaseDatabase {
  constructor() {
    this.client = supabase;
  }

  // Document operations
  async createDocument(filename, filePath, contentText = null, metadata = {}) {
    const { data, error } = await this.client
      .from('documents')
      .insert({
        filename,
        file_path: filePath,
        content_text: contentText,
        metadata
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDocument(documentId, updates) {
    const { data, error } = await this.client
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDocument(documentId) {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return data;
  }

  async getDocuments() {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .order('upload_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async deleteDocument(documentId) {
    const { error } = await this.client
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return true;
  }

  // Document chunks operations
  async insertDocumentChunks(chunks) {
    const { data, error } = await this.client
      .from('document_chunks')
      .insert(chunks)
      .select();

    if (error) throw error;
    return data;
  }

  async getDocumentChunks(documentId) {
    const { data, error } = await this.client
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index');

    if (error) throw error;
    return data;
  }

  async searchSimilarChunks(embedding, documentId = null, limit = 10) {
    let query = this.client
      .from('document_chunks')
      .select('*, documents!inner(filename)')
      .order('embedding <=> $1', { ascending: true })
      .limit(limit);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    // Note: Vector similarity search requires proper indexing in Supabase
    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  // Extracted metrics operations
  async insertExtractedMetric(documentId, metricType, metricValue, metricData = {}, confidenceScore = 0.0) {
    const { data, error } = await this.client
      .from('extracted_metrics')
      .insert({
        document_id: documentId,
        metric_type: metricType,
        metric_value: metricValue,
        metric_data: metricData,
        confidence_score: confidenceScore
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getExtractedMetrics(documentId) {
    const { data, error } = await this.client
      .from('extracted_metrics')
      .select('*')
      .eq('document_id', documentId)
      .order('extracted_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // AI metrics cache operations
  async upsertAIMetricsCache(documentId, aiMetrics) {
    const { data, error } = await this.client
      .from('ai_metrics_cache')
      .upsert({
        document_id: documentId,
        ai_metrics: aiMetrics
      }, {
        onConflict: 'document_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAIMetricsCache(documentId) {
    const { data, error } = await this.client
      .from('ai_metrics_cache')
      .select('*')
      .eq('document_id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data;
  }

  // Processing jobs operations
  async createProcessingJob(documentId, jobType, status = 'pending') {
    const { data, error } = await this.client
      .from('processing_jobs')
      .insert({
        document_id: documentId,
        job_type: jobType,
        status
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProcessingJob(jobId, updates) {
    const { data, error } = await this.client
      .from('processing_jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getProcessingJob(jobId) {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data;
  }

  async getProcessingJobsByDocument(documentId) {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  subscribeToProcessingJobs(jobId, callback) {
    return this.client
      .channel(`processing_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'processing_jobs',
          filter: `id=eq.${jobId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToDocuments(callback) {
    return this.client
      .channel('documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        callback
      )
      .subscribe();
  }

  // Storage operations
  async uploadFile(bucket, filePath, file, options = {}) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(filePath, file, options);

    if (error) throw error;
    return data;
  }

  async downloadFile(bucket, filePath) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(filePath);

    if (error) throw error;
    return data;
  }

  async deleteFile(bucket, filePath) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return data;
  }

  async getFileUrl(bucket, filePath, expiresIn = 3600) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data;
  }

  // Generic query method for complex operations
  async query(sql, params = []) {
    // For complex queries, you might need to use Supabase's RPC functionality
    // or create PostgreSQL functions in your database
    console.warn('Complex queries should be implemented as database functions');
    throw new Error('Use database functions for complex queries');
  }

  // Health check
  async healthCheck() {
    try {
      const { data, error } = await this.client
        .from('documents')
        .select('count')
        .limit(1)
        .single();

      return { status: 'healthy', error: null };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Create and export singleton instance
export const supabaseDb = new SupabaseDatabase();