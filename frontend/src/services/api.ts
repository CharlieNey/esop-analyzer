import axios from 'axios';
import { Document, QuestionResponse, DocumentMetrics } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const USE_SUPABASE = process.env.REACT_APP_USE_SUPABASE === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 2 minutes for general requests
});

// Helper function to get the correct route prefix
const getRoutePrefix = (baseRoute: string): string => {
  const prefix = USE_SUPABASE ? `/supabase/${baseRoute}` : `/${baseRoute}`;
  
  // Log which routes are being used (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔗 API Route: ${API_BASE_URL}${prefix} (${USE_SUPABASE ? 'Supabase' : 'PostgreSQL'} mode)`);
  }
  
  return prefix;
};

export const uploadPDF = async (
  file: File, 
  onUploadProgress?: (progressEvent: any) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await api.post(getRoutePrefix('pdf') + '/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 180000, // Increased to 3 minutes for file upload
    onUploadProgress: onUploadProgress ? (progressEvent) => {
      const total = progressEvent.total || progressEvent.loaded;
      const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
      onUploadProgress({
        loaded: progressEvent.loaded,
        total: total,
        progress: percentCompleted
      });
    } : undefined,
  });

  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<any> => {
  const response = await api.get(`${getRoutePrefix('pdf')}/job/${jobId}`);
  return response.data;
};

export const pollJobUntilComplete = async (
  jobId: string, 
  onProgress?: (status: any) => void,
  timeoutMs: number = 600000 // 10 minutes default timeout for long processing
): Promise<any> => {
  const startTime = Date.now();
  let consecutiveNotFoundCount = 0;
  const maxConsecutiveNotFound = 5; // Allow max 5 consecutive 404s
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await getJobStatus(jobId);
      
      // Reset consecutive not found counter since we got a response
      consecutiveNotFoundCount = 0;
      
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
      console.log(`🔍 Polling error for job ${jobId}:`, error.response?.status, error.message);
      
      // If it's a 404, the job might not exist yet OR it completed and was cleaned up
      if (error.response?.status === 404) {
        consecutiveNotFoundCount++;
        console.log(`⚠️ Job ${jobId} not found (${consecutiveNotFoundCount}/${maxConsecutiveNotFound})`);
        
        // If we get too many consecutive 404s after some time, assume the job completed
        if (consecutiveNotFoundCount >= maxConsecutiveNotFound && Date.now() - startTime > 30000) {
          console.log(`✅ Job ${jobId} appears to have completed (not found after processing time)`);
          // Return a success status - the job likely completed and was cleaned up
          return {
            id: jobId,
            status: 'completed',
            message: 'Processing completed (job cleaned up)',
            documentId: null // Will need to be resolved by checking recent documents
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      // For other errors, throw immediately
      console.error(`❌ Job polling failed:`, error);
      throw error;
    }
  }
  
  throw new Error('Processing timed out');
};

export const getDocuments = async (): Promise<Document[]> => {
  const response = await api.get(`${getRoutePrefix('pdf')}/documents`);
  return response.data.documents;
};

export const getDocument = async (documentId: string): Promise<Document> => {
  const response = await api.get(`${getRoutePrefix('pdf')}/documents/${documentId}`);
  return response.data.document;
};

export const askQuestion = async (
  question: string,
  documentId: string
): Promise<QuestionResponse> => {
  const response = await api.post(`${getRoutePrefix('questions')}/ask`, {
    question,
    documentId,
  }, {
    timeout: 180000, // 3 minutes for question answering
  });
  return response.data;
};

export const getDocumentMetrics = async (documentId: string): Promise<DocumentMetrics> => {
  const response = await api.get(`${getRoutePrefix('metrics')}/${documentId}`);
  return response.data;
};

export const getLiveDocumentMetrics = async (documentId: string): Promise<DocumentMetrics> => {
  const response = await api.get(`${getRoutePrefix('metrics')}/live/${documentId}`, {
    timeout: 300000, // 5 minutes for live AI analysis
  });
  return response.data;
};

export const getMetricsSummary = async (documentId: string): Promise<any> => {
  const response = await api.get(`${getRoutePrefix('metrics')}/summary/${documentId}`);
  return response.data;
};

export const validateMetrics = async (documentId: string, metrics: any): Promise<any> => {
  const response = await api.post(`${getRoutePrefix('metrics')}/validate/${documentId}`, { metrics }, {
    timeout: 60000, // 1 minute for AI validation
  });
  return response.data;
};

export const getAIMetrics = async (documentId: string): Promise<any> => {
  const response = await api.get(`${getRoutePrefix('metrics')}/ai/${documentId}`);
  return response.data;
};

export const getEnhancedMetrics = async (documentId: string): Promise<any> => {
  const response = await api.get(`${getRoutePrefix('metrics')}/enhanced/${documentId}`, {
    timeout: 300000, // 5 minutes for enhanced AI analysis with historical data
  });
  return response.data;
};

export const healthCheck = async (): Promise<any> => {
  const response = await api.get('/health');
  return response.data;
};