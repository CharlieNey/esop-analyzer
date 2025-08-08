import { supabase } from '../config/supabase';
import { Document, QuestionResponse, DocumentMetrics } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

// Configuration
const USE_SUPABASE = process.env.REACT_APP_USE_SUPABASE === 'true';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const SUPABASE_API_PATH = USE_SUPABASE ? '/supabase' : '';

class SupabaseApiService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // Document operations
  async uploadPDF(file: File, onUploadProgress?: (progressEvent: any) => void): Promise<any> {
    const formData = new FormData();
    formData.append('pdf', file);

    const endpoint = USE_SUPABASE 
      ? `${API_BASE_URL}/supabase/pdf/upload`
      : `${API_BASE_URL}/pdf/upload`;

    // For now, use fetch since we need FormData upload
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<any> {
    const endpoint = USE_SUPABASE 
      ? `${API_BASE_URL}/supabase/pdf/job/${jobId}`
      : `${API_BASE_URL}/pdf/job/${jobId}`;

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }
    return response.json();
  }

  // Real-time job status updates using Server-Sent Events
  async streamJobStatus(
    jobId: string, 
    onProgress: (status: any) => void,
    onComplete?: (finalStatus: any) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const endpoint = USE_SUPABASE 
      ? `${API_BASE_URL}/supabase/pdf/job/${jobId}/stream`
      : `${API_BASE_URL}/pdf/job/${jobId}`; // Fallback to polling for non-Supabase

    if (USE_SUPABASE) {
      // Use Server-Sent Events for real-time updates
      const eventSource = new EventSource(endpoint);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onProgress(data);

          if (data.status === 'completed' || data.status === 'failed') {
            eventSource.close();
            if (onComplete) onComplete(data);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
          if (onError) onError(error as Error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource.close();
        if (onError) onError(new Error('Connection error'));
      };

      // Cleanup after 10 minutes
      setTimeout(() => {
        eventSource.close();
      }, 600000);

    } else {
      // Fallback to polling for non-Supabase mode
      this.pollJobUntilComplete(jobId, onProgress, 600000)
        .then(onComplete)
        .catch(onError);
    }
  }

  async pollJobUntilComplete(
    jobId: string, 
    onProgress?: (status: any) => void,
    timeoutMs: number = 600000
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await this.getJobStatus(jobId);
        
        if (onProgress) {
          onProgress(status);
        }
        
        if (status.status === 'completed') {
          return status;
        }
        
        if (status.status === 'failed') {
          throw new Error(status.errorMessage || 'Processing failed');
        }
        
        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        if (error.message?.includes('404')) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Processing timed out');
  }

  // Document management
  async getDocuments(): Promise<Document[]> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      return data as Document[];
    } else {
      // Fallback to REST API
      const response = await fetch(`${API_BASE_URL}/pdf/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const result = await response.json();
      return result.documents;
    }
  }

  async getDocument(documentId: string): Promise<Document> {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return data as Document;
    } else {
      const response = await fetch(`${API_BASE_URL}/pdf/documents/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      const result = await response.json();
      return result.document;
    }
  }

  // Metrics operations
  async getDocumentMetrics(documentId: string): Promise<DocumentMetrics> {
    const endpoint = USE_SUPABASE 
      ? `${API_BASE_URL}/supabase/metrics/${documentId}`
      : `${API_BASE_URL}/metrics/${documentId}`;

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    return response.json();
  }

  async getLiveDocumentMetrics(documentId: string): Promise<DocumentMetrics> {
    const endpoint = USE_SUPABASE 
      ? `${API_BASE_URL}/supabase/metrics/live/${documentId}`
      : `${API_BASE_URL}/metrics/live/${documentId}`;

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Failed to fetch live metrics');
    return response.json();
  }

  // Real-time subscriptions (Supabase only)
  subscribeToDocuments(callback: (payload: any) => void): RealtimeChannel | null {
    if (!USE_SUPABASE) return null;

    const channel = supabase
      .channel('documents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents' },
        callback
      )
      .subscribe();

    this.channels.set('documents', channel);
    return channel;
  }

  subscribeToProcessingJobs(jobId: string, callback: (payload: any) => void): RealtimeChannel | null {
    if (!USE_SUPABASE) return null;

    const channel = supabase
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

    this.channels.set(`processing_job_${jobId}`, channel);
    return channel;
  }

  subscribeToMetrics(documentId: string, callback: (payload: any) => void): RealtimeChannel | null {
    if (!USE_SUPABASE) return null;

    const channel = supabase
      .channel(`metrics_${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_metrics_cache',
          filter: `document_id=eq.${documentId}`
        },
        callback
      )
      .subscribe();

    this.channels.set(`metrics_${documentId}`, channel);
    return channel;
  }

  // Cleanup subscriptions
  unsubscribe(channelName?: string): void {
    if (channelName) {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(channelName);
      }
    } else {
      // Unsubscribe from all channels
      this.channels.forEach((channel) => channel.unsubscribe());
      this.channels.clear();
    }
  }

  // Questions (fallback to regular API)
  async askQuestion(question: string, documentId: string): Promise<QuestionResponse> {
    const response = await fetch(`${API_BASE_URL}/questions/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, documentId }),
    });

    if (!response.ok) {
      throw new Error('Failed to ask question');
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<any> {
    if (USE_SUPABASE) {
      // Test Supabase connection
      const { data, error } = await supabase
        .from('documents')
        .select('count')
        .limit(1)
        .single();

      if (error) throw error;
      return { status: 'healthy', backend: 'supabase', timestamp: new Date().toISOString() };
    } else {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error('Health check failed');
      return response.json();
    }
  }

  // Get current configuration
  getConfig() {
    return {
      useSupabase: USE_SUPABASE,
      apiBaseUrl: API_BASE_URL,
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
      hasSupabaseConfig: !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY)
    };
  }
}

// Create singleton instance
export const supabaseApi = new SupabaseApiService();

// Export individual functions for backward compatibility
export const uploadPDF = (file: File, onUploadProgress?: (progressEvent: any) => void) => 
  supabaseApi.uploadPDF(file, onUploadProgress);

export const getJobStatus = (jobId: string) => supabaseApi.getJobStatus(jobId);

export const pollJobUntilComplete = (jobId: string, onProgress?: (status: any) => void, timeoutMs?: number) =>
  supabaseApi.pollJobUntilComplete(jobId, onProgress, timeoutMs);

export const getDocuments = () => supabaseApi.getDocuments();

export const getDocument = (documentId: string) => supabaseApi.getDocument(documentId);

export const getDocumentMetrics = (documentId: string) => supabaseApi.getDocumentMetrics(documentId);

export const getLiveDocumentMetrics = (documentId: string) => supabaseApi.getLiveDocumentMetrics(documentId);

export const askQuestion = (question: string, documentId: string) => 
  supabaseApi.askQuestion(question, documentId);

export const healthCheck = () => supabaseApi.healthCheck();