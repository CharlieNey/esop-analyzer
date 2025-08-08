import { supabaseDb } from '../models/supabaseDatabase.js';
import { processPDF } from './supabasePdfService.js';
import { extractMetrics } from './openaiService.js';
import { extractComprehensiveMetrics } from './comprehensiveExtraction.js';
import { enhancedAIValidation } from './enhancedAIValidation.js';
import { v4 as uuidv4 } from 'uuid';

class SupabaseJobService {
  constructor() {
    this.activeJobs = new Map();
  }

  async createJob(filename, filePath) {
    const jobId = uuidv4();
    
    try {
      // Create processing job record
      await supabaseDb.createProcessingJob(jobId, filename, 'pdf_processing', 'pending');
      
      // Start processing in background (don't await)
      this.processJob(jobId, filename, filePath).catch(error => {
        console.error(`Background job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, 'failed', null, error.message);
      });
      
      return jobId;
    } catch (error) {
      console.error('Job creation failed:', error);
      throw error;
    }
  }

  async processJob(jobId, filename, filePath) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Starting background processing for job ${jobId}`);
    }
    
    try {
      // Set global job ID for progress tracking
      global.currentJobId = jobId;
      
      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', 'Starting PDF processing...', null, 10);
      
      // Process PDF
      const pdfResult = await processPDF(filePath, filename);
      await this.updateJobStatus(jobId, 'processing', 'PDF processing complete, extracting metrics...', null, 40);
      
      // Extract comprehensive metrics
      const comprehensiveMetrics = await extractComprehensiveMetrics(pdfResult.contentText);
      await this.updateJobStatus(jobId, 'processing', 'Comprehensive metrics extracted, performing AI validation...', null, 70);
      
      // Store comprehensive metrics
      await supabaseDb.insertExtractedMetric(
        pdfResult.documentId,
        'comprehensive_metrics',
        JSON.stringify(comprehensiveMetrics),
        { extractionMethod: 'comprehensive', version: '1.0' },
        0.95
      );
      
      // Enhanced AI validation
      const enhancedResults = await enhancedAIValidation(comprehensiveMetrics, pdfResult.contentText);
      await this.updateJobStatus(jobId, 'processing', 'AI validation complete, finalizing...', null, 90);
      
      // Store enhanced AI metrics in cache
      await supabaseDb.upsertAIMetricsCache(pdfResult.documentId, {
        comprehensiveMetrics,
        enhancedValidation: enhancedResults,
        processingStats: {
          totalChunks: pdfResult.totalChunks,
          processingTime: pdfResult.processingTime,
          parseMethod: pdfResult.parseMethod
        },
        timestamp: new Date().toISOString()
      });
      
      // Complete job
      await this.updateJobStatus(
        jobId, 
        'completed', 
        'Processing complete!', 
        {
          documentId: pdfResult.documentId,
          filename: pdfResult.filename,
          totalChunks: pdfResult.totalChunks,
          processingTime: pdfResult.processingTime,
          metrics: {
            comprehensive: comprehensiveMetrics,
            enhanced: enhancedResults
          }
        }, 
        100
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Job ${jobId} completed successfully`);
      }
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'failed', null, error.message, null);
      throw error;
    } finally {
      // Clear global job ID
      global.currentJobId = null;
      this.activeJobs.delete(jobId);
    }
  }

  async updateJobStatus(jobId, status, progressMessage = null, errorMessage = null, progress = null) {
    try {
      const updates = {
        status,
        updated_at: new Date().toISOString()
      };

      if (progressMessage) {
        updates.result = { progressMessage };
      }
      
      if (errorMessage) {
        updates.error_message = errorMessage;
      }
      
      if (progress !== null) {
        updates.progress = progress;
      }
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      await supabaseDb.updateProcessingJob(jobId, updates);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Job ${jobId} status: ${status}${progressMessage ? ` - ${progressMessage}` : ''}${progress !== null ? ` (${progress}%)` : ''}`);
      }
      
    } catch (error) {
      console.error(`Failed to update job ${jobId} status:`, error);
    }
  }

  async getJobStatus(jobId) {
    try {
      const job = await supabaseDb.getProcessingJob(jobId);
      
      if (!job) {
        return null;
      }

      return {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        progressMessage: job.result?.progressMessage || null,
        errorMessage: job.error_message,
        result: job.result,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at
      };
      
    } catch (error) {
      console.error(`Failed to get job ${jobId} status:`, error);
      throw error;
    }
  }

  async getJob(jobId) {
    try {
      const job = await supabaseDb.getProcessingJob(jobId);
      return job;
    } catch (error) {
      console.error(`Failed to get job ${jobId}:`, error);
      throw error;
    }
  }

  async getJobsByDocument(documentId) {
    try {
      const jobs = await supabaseDb.getProcessingJobsByDocument(documentId);
      return jobs;
    } catch (error) {
      console.error(`Failed to get jobs for document ${documentId}:`, error);
      throw error;
    }
  }

  // Real-time job status subscription
  subscribeToJobUpdates(jobId, callback) {
    try {
      return supabaseDb.subscribeToProcessingJobs(jobId, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const jobData = {
            id: payload.new.id,
            status: payload.new.status,
            progress: payload.new.progress || 0,
            progressMessage: payload.new.result?.progressMessage || null,
            errorMessage: payload.new.error_message,
            result: payload.new.result,
            updatedAt: payload.new.updated_at
          };
          callback(jobData);
        }
      });
    } catch (error) {
      console.error(`Failed to subscribe to job ${jobId} updates:`, error);
      throw error;
    }
  }

  async cleanupOldJobs(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // This would need a custom database function in Supabase
      console.log(`Cleanup of jobs older than ${daysOld} days would be implemented via database function`);
      
    } catch (error) {
      console.error('Failed to cleanup old jobs:', error);
    }
  }
}

// Create and export singleton instance
export const supabaseJobService = new SupabaseJobService();