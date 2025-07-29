import express from 'express';
import { processPDF, getDocuments, getDocumentById } from '../services/pdfService.js';
import { extractMetrics } from '../services/openaiService.js';
import { pool } from '../models/database.js';
import { jobService } from '../services/jobService.js';

const extractFallbackMetrics = (documentText) => {
  // Parse document text for key ESOP metrics when OpenAI is unavailable
  const text = documentText.toLowerCase();
  
  const metrics = {
    enterpriseValue: {},
    valueOfEquity: {},
    valuationPerShare: {},
    keyFinancials: {},
    companyValuation: {},
    discountRates: {},
    capitalStructure: {},
    valuationMultiples: {}
  };
  
  // Extract company/enterprise valuation
  const valuationMatch = documentText.match(/(?:company|enterprise|total)\s+valuation:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  if (valuationMatch) {
    metrics.companyValuation.totalValue = valuationMatch[1];
    metrics.companyValuation.currency = "USD";
    metrics.enterpriseValue.currentValue = valuationMatch[1];
    metrics.enterpriseValue.currency = "USD";
    metrics.valueOfEquity.currentValue = valuationMatch[1]; // Assume same if not specified
    metrics.valueOfEquity.currency = "USD";
  }
  
  // Extract per share value
  const shareMatch = documentText.match(/(?:per share|share)\s+value:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  if (shareMatch) {
    metrics.companyValuation.perShareValue = shareMatch[1];
    metrics.valuationPerShare.currentValue = shareMatch[1];
    metrics.valuationPerShare.currency = "USD";
  }
  
  // Extract discount rate / WACC
  const discountMatch = documentText.match(/(?:discount rate|wacc|weighted.*cost):?\s*([\d.]+)%?/i);
  if (discountMatch) {
    metrics.discountRates.discountRate = discountMatch[1];
    metrics.keyFinancials.weightedAverageCostOfCapital = discountMatch[1];
  }
  
  // Extract ESOP ownership
  const ownershipMatch = documentText.match(/(?:esop )?ownership:?\s*([\d.]+)%?/i);
  if (ownershipMatch) {
    metrics.capitalStructure.esopPercentage = ownershipMatch[1];
  }
  
  // Extract revenue
  const revenueMatch = documentText.match(/(?:annual\s+)?revenue:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  if (revenueMatch) {
    metrics.keyFinancials.revenue = revenueMatch[1];
  }
  
  // Extract EBITDA
  const ebitdaMatch = documentText.match(/ebitda:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  if (ebitdaMatch) {
    metrics.keyFinancials.ebitda = ebitdaMatch[1];
  }
  
  // Extract total shares
  const sharesMatch = documentText.match(/(?:shares outstanding|total shares):?\s*([\d,]+)/i);
  if (sharesMatch) {
    metrics.capitalStructure.totalShares = sharesMatch[1];
  }
  
  // Extract multiples
  const revenueMultipleMatch = documentText.match(/revenue multiple:?\s*([\d.]+)x?/i);
  if (revenueMultipleMatch) {
    metrics.valuationMultiples.revenueMultiple = revenueMultipleMatch[1];
  }
  
  const ebitdaMultipleMatch = documentText.match(/ebitda multiple:?\s*([\d.]+)x?/i);
  if (ebitdaMultipleMatch) {
    metrics.valuationMultiples.ebitdaMultiple = ebitdaMultipleMatch[1];
  }
  
  return metrics;
};

const router = express.Router();

router.post('/upload', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Create a background processing job
    const jobId = await jobService.createJob(req.file.originalname, req.file.path);
    
    // Return immediately with job ID
    res.status(202).json({
      message: 'PDF upload received, processing in background',
      jobId: jobId,
      status: 'processing'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/job/:jobId', async (req, res) => {
  try {
    const jobStatus = await jobService.getJobStatus(req.params.jobId);
    
    if (!jobStatus) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(jobStatus);
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const documents = await getDocuments();
    res.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/documents/:id', async (req, res) => {
  try {
    const document = await getDocumentById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ document });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;