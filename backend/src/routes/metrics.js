import express from 'express';
import { pool } from '../models/database.js';

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

export default router;