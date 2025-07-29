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

router.get('/ai/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const client = await pool.connect();
    try {
      // Get document content and metadata
      const documentResult = await client.query(
        'SELECT content_text, filename, upload_date FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const document = documentResult.rows[0];
      
      // Check if we have cached AI metrics (within last hour to prevent excessive AI calls)
      const cacheResult = await client.query(
        `SELECT ai_metrics, created_at FROM ai_metrics_cache 
         WHERE document_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
         ORDER BY created_at DESC LIMIT 1`,
        [documentId]
      );
      
      let aiMetrics;
      
      if (cacheResult.rows.length > 0) {
        console.log('📋 Using cached AI metrics for document', documentId);
        aiMetrics = cacheResult.rows[0].ai_metrics;
      } else {
        console.log('🤖 Generating fresh AI metrics for document', documentId);
        
        // Try multiple AI queries for different metrics instead of one complex JSON
        console.log('🤖 Extracting metrics with multiple focused queries...');
        
        aiMetrics = {
          confidence: 'Medium',
          notes: 'Extracted using focused AI queries'
        };

        // Helper function to find relevant sections for a metric
        const findRelevantSections = (content, metricName) => {
          const sectionKeywords = {
            enterpriseValue: ['enterprise value', 'business value', 'company value', 'total value', 'concluded value', 'valuation conclusion'],
            valueOfEquity: ['equity value', 'fair market value', 'shareholder value', 'equity conclusion'],
            valuationPerShare: ['per share', 'share value', 'price per share', 'value per share'],
            revenue: ['revenue', 'sales', 'income statement', 'financial statements'],
            ebitda: ['ebitda', 'earnings', 'cash flow', 'financial analysis'],
            discountRate: ['discount rate', 'required return', 'wacc', 'cost of capital', 'assumptions']
          };
          
          const keywords = sectionKeywords[metricName] || [];
          const sections = [];
          
          // Find sections containing relevant keywords
          keywords.forEach(keyword => {
            const regex = new RegExp(\`.\{0,500\}\${keyword}.\{0,1000\}\`, 'gi');
            const matches = content.match(regex);
            if (matches) {
              sections.push(...matches);
            }
          });
          
          return sections.slice(0, 3); // Limit to top 3 most relevant sections
        };

        // Helper function to extract a single metric with section-aware approach
        const extractMetric = async (metricName, question) => {
          try {
            // First, try to find relevant sections
            const relevantSections = findRelevantSections(document.content_text, metricName);
            
            let response;
            if (relevantSections.length > 0) {
              console.log(\`📍 Found \${relevantSections.length} relevant sections for \${metricName}\`);
              const sectionsText = relevantSections.join('\\n\\n---SECTION---\\n\\n').substring(0, 8000);
              const sectionQuestion = \`\${question}\\n\\nFocus on these relevant sections from the document:\\n\${sectionsText}\`;
              response = await answerQuestion(sectionQuestion, ''); // Empty context since we provided sections
            } else {
              console.log(\`📄 Using full document for \${metricName}\`);
              response = await answerQuestion(question, document.content_text);
            }
            
            console.log(\`📊 \${metricName} AI response:\`, response.substring(0, 200));
            
            // Extract numbers from response with comprehensive parsing
            console.log(`🔍 Full AI response for ${metricName}: "${response}"`);
            
            // Look for various number formats in valuation documents
            const patterns = [
              // Specific valuation formats
              /\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|m)\b/gi,
              /\$\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b)\b/gi,
              /([\d,]+(?:\.\d+)?)\s*(?:million|m)\s*(?:dollars?)?/gi,
              /([\d,]+(?:\.\d+)?)\s*(?:billion|b)\s*(?:dollars?)?/gi,
              // Currency with large numbers
              /\$\s*([\d,]+(?:\.\d+)?)\b/g,
              // Percentages 
              /([\d,]+(?:\.\d+)?)%/g,
              /([\d,]+(?:\.\d+)?)\s*percent/gi,
              // Any large number (could be unformatted)
              /\b([\d,]{4,}(?:\.\d+)?)\b/g
            ];
            
            let bestMatch = null;
            let bestValue = null;
            
            for (const pattern of patterns) {
              const matches = [...response.matchAll(pattern)];
              for (const match of matches) {
                let value = parseFloat(match[1].replace(/,/g, ''));
                const fullMatch = match[0].toLowerCase();
                
                // Apply multipliers
                if (fullMatch.includes('million') || fullMatch.endsWith(' m') || fullMatch.includes(' m ')) {
                  value *= 1000000;
                } else if (fullMatch.includes('billion') || fullMatch.endsWith(' b') || fullMatch.includes(' b ')) {
                  value *= 1000000000;
                }
                
                if (!isNaN(value) && value > 0) {
                  // Prefer matches with explicit units or currency symbols
                  const hasUnits = fullMatch.includes('million') || fullMatch.includes('billion') || fullMatch.includes('$');
                  const priority = hasUnits ? 2 : 1;
                  
                  if (!bestMatch || priority > (bestMatch.priority || 0)) {
                    bestMatch = { value, text: match[0], priority };
                    bestValue = value;
                  }
                  
                  console.log(`🔢 Found number: ${value} from "${match[0]}" (priority: ${priority})`);
                }
              }
            }
            
            if (bestValue !== null) {
              console.log(`✅ ${metricName}: ${bestValue} (from "${bestMatch.text}")`);
              return bestValue;
            }
            
            // Try to find explicit "null" or "not found" mentions
            if (response.toLowerCase().includes('not found') || 
                response.toLowerCase().includes('not mentioned') ||
                response.toLowerCase().includes('unavailable')) {
              console.log(`ℹ️ ${metricName}: explicitly not found`);
              return null;
            }
            
            console.log(`⚠️ ${metricName}: could not parse from response`);
            return null;
          } catch (error) {
            console.error(`❌ Error extracting ${metricName}:`, error.message);
            return null;
          }
        };

        // Extract each metric individually with more detailed questions
        const queries = [
          {
            key: 'enterpriseValue',
            question: 'Looking at this ESOP valuation document, what is the final concluded enterprise value, total company value, or business enterprise value? Look in executive summary, valuation conclusion, or final results sections. Respond with just the dollar amount number.'
          },
          {
            key: 'valueOfEquity',
            question: 'What is the concluded equity value, total equity value, or fair market value of equity mentioned in this ESOP valuation document? Look for final valuation conclusions. Respond with just the dollar amount number.'
          },
          {
            key: 'valuationPerShare',
            question: 'What is the fair market value per share, price per share, or per-share value concluded in this ESOP valuation? Look in the valuation conclusion or summary. Respond with just the dollar amount per share.'
          },
          {
            key: 'revenue',
            question: 'What is the company\'s most recent annual revenue, total revenue, or sales mentioned in this document? Look in financial statements or company overview sections. Respond with just the dollar amount number.'
          },
          {
            key: 'ebitda',
            question: 'What is the company\'s EBITDA, earnings before interest taxes depreciation and amortization, mentioned in this document? Look in financial analysis sections. Respond with just the dollar amount number.'
          },
          {
            key: 'discountRate',
            question: 'What discount rate, required rate of return, or weighted average cost of capital (WACC) was used in this valuation? Look in valuation methodology or assumptions sections. Respond with just the percentage number.'
          }
        ];

        // Extract metrics in parallel to speed up processing
        const metricPromises = queries.map(async (query) => {
          const value = await extractMetric(query.key, query.question);
          return { key: query.key, value };
        });

        const results = await Promise.all(metricPromises);
        
        // Build metrics object
        results.forEach(({ key, value }) => {
          aiMetrics[key] = value;
        });

        // Set confidence based on how many metrics we found
        const foundMetrics = results.filter(r => r.value !== null).length;
        if (foundMetrics >= 4) {
          aiMetrics.confidence = 'High';
        } else if (foundMetrics >= 2) {
          aiMetrics.confidence = 'Medium';
        } else {
          aiMetrics.confidence = 'Low';
        }
        
        aiMetrics.notes = `Successfully extracted ${foundMetrics} out of ${queries.length} metrics using focused AI queries.`;
          
        // Store in cache
        await client.query(
          `INSERT INTO ai_metrics_cache (document_id, ai_metrics, created_at) 
           VALUES ($1, $2, NOW())
           ON CONFLICT (document_id) DO UPDATE SET 
           ai_metrics = $2, created_at = NOW()`,
          [documentId, JSON.stringify(aiMetrics)]
        );
        
        console.log('✅ AI metrics generated and cached:', aiMetrics);
      }
      
      res.json({
        documentId,
        filename: document.filename,
        uploadDate: document.upload_date,
        valuationDate: aiMetrics.valuationDate,
        metrics: aiMetrics,
        source: 'ai',
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('AI metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;