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

router.get('/live/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const client = await pool.connect();
    try {
      // Get document content for real-time analysis
      const documentResult = await client.query(
        'SELECT content_text, filename FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const documentText = documentResult.rows[0].content_text;
      const filename = documentResult.rows[0].filename;
      
      // Define key metrics questions that mirror dashboard display
      const metricQuestions = [
        {
          key: 'companyValue',
          question: 'What is the total company valuation or enterprise value mentioned in this document? Please provide the answer in the format "X million" or "X billion" or the exact dollar amount like "$X,XXX,XXX".',
          category: 'companyValuation'
        },
        {
          key: 'perShareValue', 
          question: 'What is the fair market value per share or price per share mentioned in this document? Please provide the answer as a dollar amount like "$XX.XX".',
          category: 'companyValuation'
        },
        {
          key: 'esopPercentage',
          question: 'What percentage of the company is owned by the ESOP or employees? Please provide the answer as "X%" or "X percent".',
          category: 'capitalStructure'
        },
        {
          key: 'discountRate',
          question: 'What is the discount rate or WACC (weighted average cost of capital) mentioned in this document? Please provide the answer as "X%" or "X percent".',
          category: 'discountRates'
        },
        {
          key: 'revenue',
          question: 'What is the annual revenue of the company mentioned in this document? Please provide the answer in the format "X million" or "X billion" or the exact dollar amount.',
          category: 'keyFinancials'
        },
        {
          key: 'ebitda',
          question: 'What is the EBITDA (earnings before interest, taxes, depreciation, and amortization) mentioned in this document? Please provide the answer in the format "X million" or "X billion" or the exact dollar amount.',
          category: 'keyFinancials'
        }
      ];
      
      // Get live answers for each metric
      const liveMetrics = {};
      const errors = [];
      
      for (const metric of metricQuestions) {
        try {
          console.log(`🔍 Getting live ${metric.key} for document ${documentId}`);
          const answer = await answerQuestion(metric.question, documentText);
          
          // Parse the numeric value from the answer
          const numericValue = parseNumericAnswer(answer);
          
          if (!liveMetrics[metric.category]) {
            liveMetrics[metric.category] = { data: {} };
          }
          
          liveMetrics[metric.category].data[metric.key] = numericValue;
          
          console.log(`✅ ${metric.key}: ${numericValue} (from: "${answer?.substring(0, 100)}...")`);
          
        } catch (error) {
          console.error(`❌ Error getting live ${metric.key}:`, error.message);
          errors.push({ metric: metric.key, error: error.message });
        }
      }
      
      res.json({
        documentId,
        filename,
        type: 'live',
        metrics: liveMetrics,
        extractedAt: new Date().toISOString(),
        errors: errors.length > 0 ? errors : undefined
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Get live metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to parse numeric answers from AI responses
const parseNumericAnswer = (answer) => {
  if (!answer || typeof answer !== 'string') return null;
  
  // Clean the answer and extract numbers
  const cleaned = answer.trim().toLowerCase();
  
  console.log(`📝 Parsing answer: "${cleaned}"`);
  
  // Handle negative responses
  if (cleaned.includes('not found') || cleaned.includes('not mentioned') || 
      cleaned.includes('unclear') || cleaned.includes('not specified') ||
      cleaned.includes('n/a') || cleaned.includes('unavailable')) {
    return null;
  }
  
  // Extract numeric patterns in order of specificity (most specific first)
  const patterns = [
    // Currency with billion (e.g., "$1.5 billion", "$1.5B")
    { regex: /\$\s*([\d,]+(?:\.\d+)?)\s*billion/gi, multiplier: 1000000000 },
    { regex: /\$\s*([\d,]+(?:\.\d+)?)\s*b\b/gi, multiplier: 1000000000 },
    
    // Currency with million (e.g., "$5.2 million", "$5.2M")  
    { regex: /\$\s*([\d,]+(?:\.\d+)?)\s*million/gi, multiplier: 1000000 },
    { regex: /\$\s*([\d,]+(?:\.\d+)?)\s*m\b/gi, multiplier: 1000000 },
    
    // Numbers with billion (e.g., "1.5 billion")
    { regex: /([\d,]+(?:\.\d+)?)\s*billion/gi, multiplier: 1000000000 },
    { regex: /([\d,]+(?:\.\d+)?)\s*b\b/gi, multiplier: 1000000000 },
    
    // Numbers with million (e.g., "5.2 million")
    { regex: /([\d,]+(?:\.\d+)?)\s*million/gi, multiplier: 1000000 },
    { regex: /([\d,]+(?:\.\d+)?)\s*m\b/gi, multiplier: 1000000 },
    
    // Percentages (e.g., "15%", "15 percent")
    { regex: /([\d,]+(?:\.\d+)?)(?:%|\s*percent)/gi, multiplier: 1 },
    
    // Currency without units but with large amounts (e.g., "$50,000,000")
    { regex: /\$\s*([\d,]+(?:\.\d+)?)/g, multiplier: 1 },
    
    // Plain large numbers (e.g., "50000000", "50,000,000") - only if > 1000
    { regex: /\b([\d,]{4,}(?:\.\d+)?)\b/g, multiplier: 1 },
    
    // Any remaining numbers
    { regex: /\b([\d,]+(?:\.\d+)?)\b/g, multiplier: 1 }
  ];
  
  for (const pattern of patterns) {
    const matches = [...cleaned.matchAll(pattern.regex)];
    if (matches.length > 0) {
      let value = parseFloat(matches[0][1].replace(/,/g, ''));
      
      if (!isNaN(value)) {
        const finalValue = value * pattern.multiplier;
        console.log(`🔢 Found: "${matches[0][0]}" -> ${value} * ${pattern.multiplier} = ${finalValue}`);
        return finalValue;
      }
    }
  }
  
  console.log(`❌ No valid number found in: "${cleaned}"`);
  return null;
};

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
            const regex = new RegExp(`.{0,500}${keyword}.{0,1000}`, 'gi');
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
              console.log(`📍 Found ${relevantSections.length} relevant sections for ${metricName}`);
              const sectionsText = relevantSections.join('\n\n---SECTION---\n\n').substring(0, 8000);
              const sectionQuestion = `${question}\n\nFocus on these relevant sections from the document:\n${sectionsText}`;
              response = await answerQuestion(sectionQuestion, ''); // Empty context since we provided sections
            } else {
              console.log(`📄 Using full document for ${metricName}`);
              response = await answerQuestion(question, document.content_text);
            }
            
            console.log(`📊 ${metricName} AI response:`, response.substring(0, 200));
            
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

// Function to automatically run AI validation and update metrics if better values are found
export const runAutoAIValidationAndUpdate = async (documentId) => {
  try {
    const client = await pool.connect();
    try {
      // Get current extracted metrics
      const metricsResult = await client.query(
        'SELECT metric_type, metric_data, confidence_score FROM extracted_metrics WHERE document_id = $1',
        [documentId]
      );
      
      // Get document content for AI validation
      const documentResult = await client.query(
        'SELECT content_text FROM documents WHERE id = $1',
        [documentId]
      );
      
      if (documentResult.rows.length === 0) {
        console.log('Document not found for auto AI validation:', documentId);
        return;
      }
      
      const documentText = documentResult.rows[0].content_text;
      const currentMetrics = {};
      
      // Build current metrics object based on actual database structure
      metricsResult.rows.forEach(row => {
        try {
          const data = row.metric_data;
          
          if (row.metric_type === 'companyValuation' && data) {
            if (data.totalValue) currentMetrics.enterpriseValue = data.totalValue;
            if (data.perShareValue) currentMetrics.valuationPerShare = data.perShareValue;
          } else if (row.metric_type === 'valueOfEquity' && data) {
            if (data.currentValue) currentMetrics.valueOfEquity = data.currentValue;
          } else if (row.metric_type === 'enterpriseValue' && data) {
            if (data.currentValue) currentMetrics.enterpriseValue = data.currentValue;
          } else if (row.metric_type === 'valuationPerShare' && data) {
            if (data.currentValue) currentMetrics.valuationPerShare = data.currentValue;
          } else if (row.metric_type === 'keyFinancials' && data) {
            if (data.revenue) currentMetrics.revenue = data.revenue;
            if (data.ebitda) currentMetrics.ebitda = data.ebitda;
          } else if (row.metric_type === 'discountRates' && data) {
            if (data.discountRate) currentMetrics.discountRate = data.discountRate;
          }
        } catch (e) {
          console.log('Error parsing metric data:', e.message);
        }
      });
      
      console.log('🤖 Running automatic AI validation for document:', documentId);
      console.log('Current metrics:', currentMetrics);
      
      // Define validation queries - using same format as manual validation for consistency
      const validationQueries = [
        {
          key: 'enterpriseValue',
          question: `What is the total enterprise value or company valuation mentioned in this document? Please provide the exact number with units (millions/billions).`,
          currentValue: currentMetrics.enterpriseValue
        },
        {
          key: 'valueOfEquity',
          question: `What is the total value of equity mentioned in this document? Please provide the exact number with units.`,
          currentValue: currentMetrics.valueOfEquity
        },
        {
          key: 'valuationPerShare',
          question: `What is the fair market value per share or price per share mentioned in this document? Please provide the exact number.`,
          currentValue: currentMetrics.valuationPerShare
        },
        {
          key: 'revenue',
          question: `What is the company's annual revenue mentioned in this document? Please provide the exact number with units.`,
          currentValue: currentMetrics.revenue
        },
        {
          key: 'ebitda',
          question: `What is the company's EBITDA mentioned in this document? Please provide the exact number with units.`,
          currentValue: currentMetrics.ebitda
        },
        {
          key: 'discountRate',
          question: `What is the discount rate or weighted average cost of capital (WACC) mentioned in this document? Please provide the exact percentage.`,
          currentValue: currentMetrics.discountRate
        }
      ];
      
      const updates = [];
      
      // Process each validation query - check ALL metrics, not just existing ones
      for (const query of validationQueries) {
        // Always run validation, even for missing/null values
        try {
          console.log(`🔍 Auto-validating ${query.key}: ${query.currentValue || 'NULL/MISSING'}`);
            
            const validationPrompt = `${query.question}
            
Current extracted value: ${query.currentValue || 'None found'}

Please respond in this exact format:
EXTRACTED_VALUE: [the exact value you find in the document, or "NOT_FOUND" if not mentioned]
CONFIDENCE: [High/Medium/Low]
MATCHES_CURRENT: [Yes/No/N/A if no current value]
EXPLANATION: [brief explanation of what you found and why it matches or doesn't match]`;

            const aiResponse = await answerQuestion(validationPrompt, documentText);
            
            // Parse AI response to check if we found a conflicting value
            const lines = aiResponse.split('\n');
            let extractedValue = null;
            let matches = 'Unknown';
            let confidence = 'Unknown';
            
            for (const line of lines) {
              if (line.startsWith('EXTRACTED_VALUE:')) {
                const rawValue = line.replace('EXTRACTED_VALUE:', '').trim();
                if (!rawValue.toLowerCase().includes('not_found') && 
                    !rawValue.toLowerCase().includes('not found') &&
                    !rawValue.toLowerCase().includes('unknown')) {
                  // Try to parse the extracted value
                  const patterns = [
                    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|m)\b/gi,
                    /\$\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b)\b/gi,
                    /([\d,]+(?:\.\d+)?)\s*(?:million|m)\s*(?:dollars?)?/gi,
                    /([\d,]+(?:\.\d+)?)\s*(?:billion|b)\s*(?:dollars?)?/gi,
                    /\$\s*([\d,]+(?:\.\d+)?)\b/g,
                    /([\d,]+(?:\.\d+)?)%/g,
                    /([\d,]+(?:\.\d+)?)\s*percent/gi,
                    /\b([\d,]{4,}(?:\.\d+)?)\b/g
                  ];
                  
                  for (const pattern of patterns) {
                    const matches = [...rawValue.matchAll(pattern)];
                    for (const match of matches) {
                      let value = parseFloat(match[1].replace(/,/g, ''));
                      const fullMatch = match[0].toLowerCase();
                      
                      if (fullMatch.includes('million') || fullMatch.endsWith(' m') || fullMatch.includes(' m ')) {
                        value *= 1000000;
                      } else if (fullMatch.includes('billion') || fullMatch.endsWith(' b') || fullMatch.includes(' b ')) {
                        value *= 1000000000;
                      }
                      
                      if (!isNaN(value) && value > 0) {
                        extractedValue = value;
                        break;
                      }
                    }
                    if (extractedValue !== null) break;
                  }
                }
              } else if (line.startsWith('MATCHES_CURRENT:')) {
                matches = line.replace('MATCHES_CURRENT:', '').trim();
              } else if (line.startsWith('CONFIDENCE:')) {
                confidence = line.replace('CONFIDENCE:', '').trim();
              }
            }
            
            // Update if: AI found a value AND (no current value OR doesn't match current) AND good confidence
            const shouldUpdate = extractedValue !== null && 
                (confidence.toLowerCase() === 'high' || confidence.toLowerCase() === 'medium') &&
                (query.currentValue === null || 
                 query.currentValue === undefined || 
                 matches.toLowerCase() === 'no' ||
                 matches.toLowerCase() === 'n/a');
                 
            if (shouldUpdate) {
              
              console.log(`✨ Found better AI value for ${query.key}: ${extractedValue} (current: ${query.currentValue})`);
              
              // Map validation key back to metric type and data structure
              const metricTypeMap = {
                'enterpriseValue': ['companyValuation', 'enterpriseValue'],
                'valueOfEquity': ['valueOfEquity'],
                'valuationPerShare': ['companyValuation', 'valuationPerShare'],
                'revenue': ['keyFinancials'],
                'ebitda': ['keyFinancials'],
                'discountRate': ['discountRates']
              };
              
              const metricTypes = metricTypeMap[query.key];
              if (metricTypes) {
                metricTypes.forEach(metricType => {
                  updates.push({
                    metricType,
                    key: query.key,
                    value: extractedValue,
                    confidence: confidence.toLowerCase() === 'high' ? 0.9 : 0.7
                  });
                });
              }
            }
            
          } catch (error) {
            console.error(`Error in auto-validation for ${query.key}:`, error);
          }
      }
      
      // Apply updates to database
      if (updates.length > 0) {
        console.log(`🔄 Applying ${updates.length} AI-improved values to database`);
        
        for (const update of updates) {
          try {
            // Get current metric data
            const currentResult = await client.query(
              'SELECT metric_data FROM extracted_metrics WHERE document_id = $1 AND metric_type = $2',
              [documentId, update.metricType]
            );
            
            let updatedData = {};
            let isNewRecord = false;
            
            if (currentResult.rows.length > 0) {
              updatedData = { ...currentResult.rows[0].metric_data };
            } else {
              // Create new record structure with defaults
              isNewRecord = true;
              console.log(`📝 Creating new metric record for ${update.metricType}`);
              
              // Initialize with appropriate default structure
              if (update.metricType === 'companyValuation') {
                updatedData = { currency: 'USD', totalValue: null, perShareValue: null };
              } else if (update.metricType === 'enterpriseValue') {
                updatedData = { currency: 'USD', currentValue: null, previousValue: null };
              } else if (update.metricType === 'valueOfEquity') {
                updatedData = { currency: 'USD', currentValue: null, previousValue: null };
              } else if (update.metricType === 'valuationPerShare') {
                updatedData = { currency: 'USD', currentValue: null, previousValue: null };
              } else if (update.metricType === 'keyFinancials') {
                updatedData = { revenue: null, ebitda: null, weightedAverageCostOfCapital: null };
              } else if (update.metricType === 'discountRates') {
                updatedData = { discountRate: null, riskFreeRate: null, marketRiskPremium: null };
              }
            }
              
              // Update the specific field based on actual database structure
              if (update.metricType === 'companyValuation') {
                if (update.key === 'enterpriseValue') {
                  updatedData.totalValue = update.value;
                } else if (update.key === 'valuationPerShare') {
                  updatedData.perShareValue = update.value;
                }
              } else if (update.metricType === 'enterpriseValue') {
                updatedData.currentValue = update.value;
              } else if (update.metricType === 'valueOfEquity') {
                updatedData.currentValue = update.value;
              } else if (update.metricType === 'valuationPerShare') {
                updatedData.currentValue = update.value;
              } else if (update.metricType === 'keyFinancials') {
                if (update.key === 'revenue') {
                  updatedData.revenue = update.value;
                } else if (update.key === 'ebitda') {
                  updatedData.ebitda = update.value;
                }
              } else if (update.metricType === 'discountRates') {
                updatedData.discountRate = update.value;
              }
              
              // Update or insert the record
              if (isNewRecord) {
                await client.query(
                  'INSERT INTO extracted_metrics (document_id, metric_type, metric_data, confidence_score, extracted_at) VALUES ($1, $2, $3, $4, NOW())',
                  [documentId, update.metricType, JSON.stringify(updatedData), update.confidence]
                );
                console.log(`✅ Created ${update.metricType}.${update.key} with value ${update.value}`);
              } else {
                await client.query(
                  'UPDATE extracted_metrics SET metric_data = $1, confidence_score = $2, extracted_at = NOW() WHERE document_id = $3 AND metric_type = $4',
                  [JSON.stringify(updatedData), update.confidence, documentId, update.metricType]
                );
                console.log(`✅ Updated ${update.metricType}.${update.key} to ${update.value}`);
              }
              
          } catch (updateError) {
            console.error(`Error updating ${update.metricType}.${update.key}:`, updateError);
          }
        }
        
        console.log(`🎉 Successfully auto-updated ${updates.length} metrics with AI-improved values`);
      } else {
        console.log('✅ No better AI values found, keeping current metrics');
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Auto AI validation error:', error);
  }
};

export default router;