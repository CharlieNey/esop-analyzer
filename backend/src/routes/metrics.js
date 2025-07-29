import express from 'express';
import { pool } from '../models/database.js';
import { answerQuestion } from '../services/openaiService.js';

const router = express.Router();

router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const client = await pool.connect();
    try {
      const metricsResult = await client.query(
        'SELECT metric_type, metric_data, confidence_score, extracted_at FROM extracted_metrics WHERE document_id = $1',
        [documentId]
      );
      
      const documentResult = await client.query(
        'SELECT filename, upload_date FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const metrics = {};
      let valuationDate = null;
      
      metricsResult.rows.forEach(row => {
        metrics[row.metric_type] = {
          data: row.metric_data,
          confidence: row.confidence_score,
          extractedAt: row.extracted_at
        };
        
        // Extract valuation date from metrics if available
        if (row.metric_type === 'valuationDate' && row.metric_data) {
          try {
            // row.metric_data is already an object (PostgreSQL JSONB), no need to parse
            const dateData = row.metric_data;
            if (dateData.date) {
              valuationDate = dateData.date;
            }
          } catch (e) {
            console.log('Failed to extract valuation date:', e.message);
          }
        }
      });
      
      res.json({
        documentId,
        filename: documentResult.rows[0].filename,
        uploadDate: documentResult.rows[0].upload_date,
        valuationDate: valuationDate, // Add the actual valuation date
        metrics
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT d.filename, d.upload_date,
               COUNT(em.id) as metrics_count,
               ARRAY_AGG(em.metric_type) as metric_types
        FROM documents d
        LEFT JOIN extracted_metrics em ON d.id = em.document_id
        WHERE d.id = $1
        GROUP BY d.id, d.filename, d.upload_date
      `, [documentId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const summary = result.rows[0];
      
      res.json({
        documentId,
        filename: summary.filename,
        uploadDate: summary.upload_date,
        metricsExtracted: summary.metrics_count || 0,
        availableMetrics: summary.metric_types || []
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Get metrics summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { metrics } = req.body;
    
    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Metrics object is required' });
    }
    
    const client = await pool.connect();
    try {
      // Get document content
      const documentResult = await client.query(
        'SELECT content_text FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const documentText = documentResult.rows[0].content_text;
      
      // Create validation questions for each metric
      const validationResults = {};
      
      const validationQueries = [
        {
          key: 'enterpriseValue',
          question: `What is the total enterprise value or company valuation mentioned in this document? Please provide the exact number with units (millions/billions).`,
          currentValue: metrics.enterpriseValue
        },
        {
          key: 'valueOfEquity',
          question: `What is the total value of equity mentioned in this document? Please provide the exact number with units.`,
          currentValue: metrics.valueOfEquity
        },
        {
          key: 'valuationPerShare',
          question: `What is the fair market value per share or price per share mentioned in this document? Please provide the exact number.`,
          currentValue: metrics.valuationPerShare
        },
        {
          key: 'revenue',
          question: `What is the company's annual revenue mentioned in this document? Please provide the exact number with units.`,
          currentValue: metrics.revenue
        },
        {
          key: 'ebitda',
          question: `What is the company's EBITDA mentioned in this document? Please provide the exact number with units.`,
          currentValue: metrics.ebitda
        },
        {
          key: 'discountRate',
          question: `What is the discount rate or weighted average cost of capital (WACC) mentioned in this document? Please provide the exact percentage.`,
          currentValue: metrics.discountRate
        }
      ];
      
      // Process each validation query
      for (const query of validationQueries) {
        if (query.currentValue !== null && query.currentValue !== undefined) {
          try {
            console.log(`🔍 Validating ${query.key}: ${query.currentValue}`);
            
            const validationPrompt = `${query.question}
            
Current extracted value: ${query.currentValue}

Please respond in this exact format:
EXTRACTED_VALUE: [the exact value you find in the document, or "NOT_FOUND" if not mentioned]
CONFIDENCE: [High/Medium/Low]
MATCHES_CURRENT: [Yes/No]
EXPLANATION: [brief explanation of what you found and why it matches or doesn't match]`;

            const aiResponse = await answerQuestion(validationPrompt, documentText);
            
            validationResults[query.key] = {
              currentValue: query.currentValue,
              aiValidation: aiResponse,
              query: query.question
            };
            
          } catch (error) {
            console.error(`Error validating ${query.key}:`, error);
            validationResults[query.key] = {
              currentValue: query.currentValue,
              error: 'Validation failed',
              query: query.question
            };
          }
        }
      }
      
      res.json({
        documentId,
        validationResults,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Metrics validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;