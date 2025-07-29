import axios from 'axios';
import { Document, QuestionResponse, DocumentMetrics } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 2 minutes for general requests
});

export const uploadPDF = async (
  file: File, 
  onUploadProgress?: (progressEvent: any) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await api.post('/pdf/upload', formData, {
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
  const response = await api.get(`/pdf/job/${jobId}`);
  return response.data;
};

export const pollJobUntilComplete = async (
  jobId: string, 
  onProgress?: (status: any) => void,
  timeoutMs: number = 600000 // 10 minutes default timeout for long processing
): Promise<any> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const status = await getJobStatus(jobId);
      
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
      // If it's a 404, the job might not exist yet, continue polling
      if (error.response?.status === 404) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Processing timed out');
};

export const getDocuments = async (): Promise<Document[]> => {
  const response = await api.get('/pdf/documents');
  return response.data.documents;
};

export const getDocument = async (documentId: string): Promise<Document> => {
  const response = await api.get(`/pdf/documents/${documentId}`);
  return response.data.document;
};

export const askQuestion = async (
  question: string,
  documentId: string
): Promise<QuestionResponse> => {
  const response = await api.post('/questions/ask', {
    question,
    documentId,
  }, {
    timeout: 180000, // 3 minutes for question answering
  });
  return response.data;
};

export const getDocumentMetrics = async (documentId: string): Promise<DocumentMetrics> => {
  const response = await api.get(`/metrics/${documentId}`);
  return response.data;
};

export const getMetricsSummary = async (documentId: string): Promise<any> => {
  const response = await api.get(`/metrics/summary/${documentId}`);
  return response.data;
};

export const validateMetrics = async (documentId: string, metrics: any): Promise<any> => {
  const response = await api.post(`/metrics/validate/${documentId}`, { metrics }, {
    timeout: 60000, // 1 minute for AI validation
  });
  return response.data;
};

export const healthCheck = async (): Promise<any> => {
  const response = await api.get('/health');
  return response.data;
};