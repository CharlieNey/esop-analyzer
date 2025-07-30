import { pool } from '../models/database.js';
import { processPDF } from './pdfService.js';
import { extractMetrics } from './openaiService.js';
import { extractComprehensiveMetrics } from './comprehensiveExtraction.js';
import { enhancedAIValidation } from './enhancedAIValidation.js';
import { runAutoAIValidationAndUpdate } from '../routes/metrics.js';
import { v4 as uuidv4 } from 'uuid';

class JobService {
  constructor() {
    this.activeJobs = new Map();
  }

  async createJob(filename, filePath) {
    const jobId = uuidv4();
    
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO processing_jobs (id, filename, file_path, status, progress_message) VALUES ($1, $2, $3, $4, $5)',
        [jobId, filename, filePath, 'pending', 'Job created, starting processing...']
      );
      
      // Start processing in background (don't await)
      this.processJob(jobId).catch(error => {
        console.error(`Background job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, 'failed', null, error.message);
      });
      
      return jobId;
    } finally {
      client.release();
    }
  }

  async processJob(jobId) {
    console.log(`🚀 Starting background processing for job ${jobId}`);
    
    try {
      // Set global job ID for progress tracking
      global.currentJobId = jobId;
      
      // Get job details
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Update status to processing
      await this.updateJobStatus(jobId, 'processing', 'Processing PDF with Reducto AI...');

      // Process the PDF
      const pdfResult = await processPDF(job.file_path, job.filename);
      
      // Update status
      await this.updateJobStatus(jobId, 'processing', 'Extracting financial metrics...', pdfResult.documentId);

      // Extract metrics
      const client = await pool.connect();
      try {
        const document = await client.query(
          'SELECT * FROM documents WHERE id = $1',
          [pdfResult.documentId]
        );
        
        if (document.rows[0]?.content_text) {
          let finalMetrics = null;
          
          try {
            // First try enhanced AI validation
            await this.updateJobStatus(jobId, 'processing', 'Running enhanced AI validation with cross-validation...');
            const enhancedResult = await enhancedAIValidation.runEnhancedValidation(document.rows[0].content_text);
            
            // Always start with standard AI extraction as the base
            console.log('🔍 Step 1: Running standard AI extraction as base...');
            await this.updateJobStatus(jobId, 'processing', 'Running standard AI extraction...');
            const aiMetrics = await extractMetrics(document.rows[0].content_text);
            
            let baseMetrics = null;
            if (aiMetrics && this.hasValidMetrics(aiMetrics)) {
              console.log('✅ Standard AI extraction successful');
              baseMetrics = aiMetrics;
            } else {
              console.log('⚠️ Standard AI extraction failed, trying comprehensive fallback...');
              await this.updateJobStatus(jobId, 'processing', 'AI extraction failed, using comprehensive fallback patterns...');
              
              // Use comprehensive extraction as fallback
              const comprehensiveMetrics = extractComprehensiveMetrics(document.rows[0].content_text);
              
              if (comprehensiveMetrics && this.hasValidMetrics(comprehensiveMetrics)) {
                console.log('✅ Comprehensive extraction successful');
                baseMetrics = comprehensiveMetrics;
              } else {
                console.log('⚠️ Standard and comprehensive extraction failed, creating base structure...');
                baseMetrics = this.createEmptyMetricsStructure();
              }
            }

            // Now try enhanced AI validation to AUGMENT the base metrics
            console.log('🚀 Step 2: Running enhanced AI validation to augment base metrics...');
            await this.updateJobStatus(jobId, 'processing', 'Running enhanced AI validation to improve metrics...');
            
            if (enhancedResult && enhancedResult.metrics && this.hasValidEnhancedMetrics(enhancedResult.metrics)) {
              console.log('✅ Enhanced AI validation successful');
              console.log(`🎯 Confidence score: ${enhancedResult.confidence}%`);
              
              // MERGE enhanced metrics with base metrics (enhanced only replaces NULL values)
              const enhancedStandard = this.convertEnhancedMetricsToStandard(enhancedResult.metrics);
              finalMetrics = this.mergeMetricsIntelligently(baseMetrics, enhancedStandard);
              console.log('🔄 Merged enhanced validation with base metrics');
            } else {
              console.log('⚠️ Enhanced AI validation incomplete, using base metrics');
              finalMetrics = baseMetrics;
            }
            
            // Store the final metrics
            if (finalMetrics) {
              for (const [metricType, metricData] of Object.entries(finalMetrics)) {
                await client.query(
                  'INSERT INTO extracted_metrics (document_id, metric_type, metric_data) VALUES ($1, $2, $3)',
                  [pdfResult.documentId, metricType, metricData]
                );
              }
              console.log(`📊 Stored ${Object.keys(finalMetrics).length} metric types for document ${pdfResult.documentId}`);
            }
            
          } catch (metricsError) {
            console.warn('All metrics extraction methods failed:', metricsError.message);
            // Continue without metrics but store empty structure for consistency
            const emptyMetrics = this.createEmptyMetricsStructure();
            for (const [metricType, metricData] of Object.entries(emptyMetrics)) {
              await client.query(
                'INSERT INTO extracted_metrics (document_id, metric_type, metric_data) VALUES ($1, $2, $3)',
                [pdfResult.documentId, metricType, metricData]
              );
            }
          }
        }
      } finally {
        client.release();
      }

      // Run automatic AI validation and update metrics if better values are found
      await this.updateJobStatus(jobId, 'processing', 'Running AI validation and auto-updating metrics...');
      
      try {
        await runAutoAIValidationAndUpdate(pdfResult.documentId);
        console.log(`🤖 Automatic AI validation completed for document ${pdfResult.documentId}`);
      } catch (aiValidationError) {
        console.warn('Auto AI validation failed, but continuing:', aiValidationError.message);
        // Don't fail the entire job if AI validation fails
      }

      // Complete the job
      await this.updateJobStatus(jobId, 'completed', 'Processing completed successfully!', pdfResult.documentId);
      
      console.log(`✅ Job ${jobId} completed successfully`);
      
      return pdfResult;
      
    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'failed', null, error.message);
      throw error;
    }
  }

  async updateJobStatus(jobId, status, progressMessage = null, documentId = null, errorMessage = null) {
    const client = await pool.connect();
    try {
      const updates = ['status = $2'];
      const params = [jobId, status];
      let paramIndex = 3;

      if (progressMessage !== null) {
        updates.push(`progress_message = $${paramIndex}`);
        params.push(progressMessage);
        paramIndex++;
      }

      if (documentId !== null) {
        updates.push(`document_id = $${paramIndex}`);
        params.push(documentId);
        paramIndex++;
      }

      if (errorMessage !== null) {
        updates.push(`error_message = $${paramIndex}`);
        params.push(errorMessage);
        paramIndex++;
      }

      if (status === 'completed') {
        updates.push('completed_at = NOW()');
      }

      const query = `UPDATE processing_jobs SET ${updates.join(', ')} WHERE id = $1`;
      await client.query(query, params);
      
    } finally {
      client.release();
    }
  }

  async getJob(jobId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM processing_jobs WHERE id = $1',
        [jobId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getJobStatus(jobId) {
    const job = await this.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: job.status,
      progressMessage: job.progress_message,
      documentId: job.document_id,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at
    };
  }

  // Helper method to check if metrics contain valid data
  hasValidMetrics(metrics) {
    if (!metrics || typeof metrics !== 'object') return false;
    
    // Check if at least some key metrics have non-null values
    const keyMetricPaths = [
      'enterpriseValue.currentValue',
      'valueOfEquity.currentValue', 
      'valuationPerShare.currentValue',
      'companyValuation.totalValue',
      'companyValuation.perShareValue',
      'keyFinancials.revenue',
      'keyFinancials.ebitda'
    ];
    
    let validCount = 0;
    for (const path of keyMetricPaths) {
      const value = this.getNestedValue(metrics, path);
      if (value !== null && value !== undefined) {
        validCount++;
      }
    }
    
    // Consider valid if at least 2 key metrics are found
    return validCount >= 2;
  }

  // Helper method to check if enhanced metrics contain valid data
  hasValidEnhancedMetrics(enhancedMetrics) {
    if (!enhancedMetrics || typeof enhancedMetrics !== 'object') return false;
    
    // Check if at least some key metrics have non-null values
    const keyMetrics = [
      'enterpriseValue',
      'valueOfEquity',
      'revenue',
      'ebitda',
      'discountRate'
    ];
    
    let validCount = 0;
    for (const metric of keyMetrics) {
      const value = enhancedMetrics[metric];
      if (value !== null && value !== undefined) {
        validCount++;
      }
    }
    
    // Consider valid if at least 2 key metrics are found
    return validCount >= 2;
  }

  // Intelligently merge enhanced metrics with base metrics
  // Enhanced metrics ONLY replace base metrics if the base value is null/undefined
  mergeMetricsIntelligently(baseMetrics, enhancedMetrics) {
    console.log('🔄 Merging enhanced metrics with base metrics...');
    
    const merged = JSON.parse(JSON.stringify(baseMetrics)); // Deep clone
    
    // Helper function to safely merge nested objects
    const mergeNested = (baseObj, enhancedObj, path = '') => {
      if (!enhancedObj || typeof enhancedObj !== 'object') return;
      
      for (const [key, enhancedValue] of Object.entries(enhancedObj)) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (enhancedValue && typeof enhancedValue === 'object' && !Array.isArray(enhancedValue)) {
          // Recursively merge nested objects
          if (!baseObj[key]) baseObj[key] = {};
          mergeNested(baseObj[key], enhancedValue, fullPath);
        } else {
          // Only replace if base value is null, undefined, or 0 and enhanced has a meaningful value
          const baseValue = baseObj[key];
          const shouldReplace = (baseValue === null || baseValue === undefined || baseValue === 0) && 
                               (enhancedValue !== null && enhancedValue !== undefined && enhancedValue !== 0);
          
          if (shouldReplace) {
            console.log(`  ✅ Enhanced ${fullPath}: ${baseValue} → ${enhancedValue}`);
            baseObj[key] = enhancedValue;
          } else if (baseValue !== null && baseValue !== undefined && baseValue !== 0) {
            console.log(`  ⚪ Kept base ${fullPath}: ${baseValue} (enhanced: ${enhancedValue})`);
          }
        }
      }
    };
    
    mergeNested(merged, enhancedMetrics);
    return merged;
  }

  // Convert enhanced metrics format to standard format
  convertEnhancedMetricsToStandard(enhancedMetrics) {
    return {
      enterpriseValue: { 
        currentValue: enhancedMetrics.enterpriseValue, 
        previousValue: null, 
        currency: "USD" 
      },
      valueOfEquity: { 
        currentValue: enhancedMetrics.valueOfEquity, 
        previousValue: null, 
        currency: "USD" 
      },
      valuationPerShare: { 
        currentValue: enhancedMetrics.valuationPerShare, 
        previousValue: null, 
        currency: "USD" 
      },
      keyFinancials: { 
        revenue: enhancedMetrics.revenue, 
        ebitda: enhancedMetrics.ebitda, 
        weightedAverageCostOfCapital: enhancedMetrics.discountRate 
      },
      companyValuation: { 
        totalValue: enhancedMetrics.enterpriseValue, 
        perShareValue: enhancedMetrics.valuationPerShare, 
        currency: "USD" 
      },
      discountRates: { 
        discountRate: enhancedMetrics.discountRate, 
        riskFreeRate: null, 
        marketRiskPremium: null 
      },
      capitalStructure: { 
        totalShares: enhancedMetrics.totalShares, 
        esopShares: null, 
        esopPercentage: enhancedMetrics.esopPercentage 
      },
      valuationMultiples: { 
        revenueMultiple: null, 
        ebitdaMultiple: null 
      }
    };
  }
  
  // Helper to safely get nested object values
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
  
  // Create empty metrics structure for consistency
  createEmptyMetricsStructure() {
    return {
      enterpriseValue: { currentValue: null, previousValue: null, currency: "USD" },
      valueOfEquity: { currentValue: null, previousValue: null, currency: "USD" },
      valuationPerShare: { currentValue: null, previousValue: null, currency: "USD" },
      keyFinancials: { revenue: null, ebitda: null, weightedAverageCostOfCapital: null },
      companyValuation: { totalValue: null, perShareValue: null, currency: "USD" },
      discountRates: { discountRate: null, riskFreeRate: null, marketRiskPremium: null },
      capitalStructure: { totalShares: null, esopShares: null, esopPercentage: null },
      valuationMultiples: { revenueMultiple: null, ebitdaMultiple: null }
    };
  }

  async cleanupOldJobs(olderThanDays = 7) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM processing_jobs WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'`
      );
      console.log(`Cleaned up ${result.rowCount} old processing jobs`);
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const jobService = new JobService();
export default jobService;