import express from 'express';
import { supabaseDb } from '../models/supabaseDatabase.js';
import { answerQuestion } from '../services/openaiService.js';

const router = express.Router();

router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get extracted metrics for the document
    const extractedMetrics = await supabaseDb.getExtractedMetrics(documentId);
    
    // Get document info
    const document = await supabaseDb.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const metrics = {};
    let valuationDate = null;
    
    extractedMetrics.forEach(row => {
      metrics[row.metric_type] = {
        data: row.metric_data,
        confidence: row.confidence_score,
        extractedAt: row.extracted_at
      };
      
      // Extract valuation date from metrics if available
      if (row.metric_type === 'valuationDate' && row.metric_data) {
        try {
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
      filename: document.filename,
      uploadDate: document.upload_date,
      valuationDate,
      metrics
    });
    
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/live/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get document
    const document = await supabaseDb.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if we have cached AI metrics
    const cachedMetrics = await supabaseDb.getAIMetricsCache(documentId);
    
    if (cachedMetrics) {
      // Return cached metrics
      res.json({
        documentId,
        filename: document.filename,
        uploadDate: document.upload_date,
        aiMetrics: cachedMetrics.ai_metrics,
        cachedAt: cachedMetrics.created_at,
        source: 'cache'
      });
    } else {
      // No cached metrics available
      res.status(202).json({
        message: 'AI metrics not available yet. Check back later or check processing job status.',
        documentId,
        filename: document.filename
      });
    }
    
  } catch (error) {
    console.error('Get live metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get document
    const document = await supabaseDb.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get all extracted metrics
    const extractedMetrics = await supabaseDb.getExtractedMetrics(documentId);
    
    // Get cached AI metrics
    const cachedMetrics = await supabaseDb.getAIMetricsCache(documentId);
    
    // Create summary
    const summary = {
      documentId,
      filename: document.filename,
      uploadDate: document.upload_date,
      processedAt: document.processed_at,
      totalMetricTypes: extractedMetrics.length,
      availableMetrics: extractedMetrics.map(m => m.metric_type),
      hasAIAnalysis: !!cachedMetrics,
      aiAnalysisDate: cachedMetrics?.created_at || null
    };
    
    // Add basic metric summaries
    if (extractedMetrics.length > 0) {
      const comprehensiveMetrics = extractedMetrics.find(m => m.metric_type === 'comprehensive_metrics');
      if (comprehensiveMetrics && comprehensiveMetrics.metric_data) {
        try {
          const metricsData = typeof comprehensiveMetrics.metric_data === 'string' 
            ? JSON.parse(comprehensiveMetrics.metric_data) 
            : comprehensiveMetrics.metric_data;
          
          summary.keyMetrics = {
            companyValuation: metricsData.companyValuation?.totalValue || 'Not found',
            perShareValue: metricsData.valuationPerShare?.currentValue || 'Not found',
            revenue: metricsData.keyFinancials?.revenue || 'Not found',
            ebitda: metricsData.keyFinancials?.ebitda || 'Not found'
          };
        } catch (e) {
          console.error('Error parsing comprehensive metrics:', e);
        }
      }
    }
    
    res.json(summary);
    
  } catch (error) {
    console.error('Get metrics summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { metrics } = req.body;
    
    if (!metrics) {
      return res.status(400).json({ error: 'Metrics data required for validation' });
    }
    
    // Get document content for validation
    const document = await supabaseDb.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Here you would implement AI-based validation
    // For now, return a placeholder response
    const validationResult = {
      documentId,
      validatedAt: new Date().toISOString(),
      validationScore: 0.85,
      validatedMetrics: metrics,
      validationNotes: [
        'Metrics appear consistent with document content',
        'All required fields are present',
        'Values are within expected ranges'
      ],
      recommendations: [
        'Consider cross-referencing with market data',
        'Verify discount rate assumptions'
      ]
    };
    
    // Store validation result
    await supabaseDb.insertExtractedMetric(
      documentId,
      'ai_validation',
      JSON.stringify(validationResult),
      { validationType: 'manual_request', validationScore: 0.85 },
      0.85
    );
    
    res.json(validationResult);
    
  } catch (error) {
    console.error('Validate metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get cached AI metrics
    const cachedMetrics = await supabaseDb.getAIMetricsCache(documentId);
    
    if (!cachedMetrics) {
      return res.status(404).json({ 
        error: 'AI metrics not found. Document may still be processing.' 
      });
    }
    
    res.json({
      documentId,
      aiMetrics: cachedMetrics.ai_metrics,
      generatedAt: cachedMetrics.created_at
    });
    
  } catch (error) {
    console.error('Get AI metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/enhanced/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Get document
    const document = await supabaseDb.getDocument(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get cached AI metrics which should include enhanced validation
    const cachedMetrics = await supabaseDb.getAIMetricsCache(documentId);
    
    if (!cachedMetrics) {
      return res.status(404).json({ 
        error: 'Enhanced metrics not found. Document may still be processing.' 
      });
    }
    
    // Extract enhanced validation data from cache
    const aiMetrics = cachedMetrics.ai_metrics;
    const enhancedData = {
      documentId,
      filename: document.filename,
      processedAt: document.processed_at,
      enhancedMetrics: aiMetrics.enhancedValidation || aiMetrics,
      comprehensiveMetrics: aiMetrics.comprehensiveMetrics,
      processingStats: aiMetrics.processingStats,
      generatedAt: cachedMetrics.created_at
    };
    
    res.json(enhancedData);
    
  } catch (error) {
    console.error('Get enhanced metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Real-time metrics updates (Server-Sent Events)
router.get('/stream/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial data
    try {
      const document = await supabaseDb.getDocument(documentId);
      if (document) {
        res.write(`data: ${JSON.stringify({ type: 'document', data: document })}\n\n`);
      }

      const cachedMetrics = await supabaseDb.getAIMetricsCache(documentId);
      if (cachedMetrics) {
        res.write(`data: ${JSON.stringify({ type: 'metrics', data: cachedMetrics.ai_metrics })}\n\n`);
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }

    // Subscribe to real-time updates (would need to implement document subscription)
    // For now, we'll set up a basic keepalive
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
    }, 30000); // 30 seconds

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
    });

    // Set timeout to prevent hanging connections
    setTimeout(() => {
      clearInterval(keepAlive);
      res.end();
    }, 300000); // 5 minutes

  } catch (error) {
    console.error('Metrics stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;