import OpenAI from 'openai';
import dotenv from 'dotenv';
import { pool } from '../models/database.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const createEmbedding = async (text) => {
  try {
    const embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error(`Failed to create embedding: ${error.message}`);
  }
};

export const answerQuestion = async (question, context, documentId = null) => {
  try {
    // Get extracted metrics to include in context
    let extractedMetrics = null;
    if (documentId) {
      try {
        const client = await pool.connect();
        const metricsResult = await client.query(
          'SELECT metric_type, metric_data FROM extracted_metrics WHERE document_id = $1',
          [documentId]
        );
        client.release();
        
        if (metricsResult.rows.length > 0) {
          extractedMetrics = {};
          metricsResult.rows.forEach(row => {
            extractedMetrics[row.metric_type] = row.metric_data;
          });
        }
      } catch (error) {
        console.log('⚠️ Could not fetch extracted metrics:', error.message);
      }
    }
    
    // Estimate total tokens
    const questionTokens = Math.ceil(question.length / 4);
    const contextTokens = Math.ceil(context.length / 4);
    const systemPromptTokens = 500; // Approximate
    const totalTokens = questionTokens + contextTokens + systemPromptTokens;
    
    console.log(`📊 Token estimation: Question=${questionTokens}, Context=${contextTokens}, Total=${totalTokens}`);
    
    // If context is too large, truncate it more intelligently
    let finalContext = context;
    if (totalTokens > 20000) { // Increased limit for better coverage
      console.log('⚠️ Context too large, truncating...');
      const maxContextLength = (20000 - questionTokens - systemPromptTokens) * 4;
      
      // Try to preserve complete pages instead of cutting mid-sentence
      const pages = context.split(/PAGE \d+/);
      let truncatedContext = '';
      let currentLength = 0;
      
      for (let i = 0; i < pages.length && currentLength < maxContextLength; i++) {
        const pageContent = i === 0 ? pages[i] : 'PAGE ' + (i) + pages[i];
        if (currentLength + pageContent.length <= maxContextLength) {
          truncatedContext += pageContent;
          currentLength += pageContent.length;
        } else {
          break;
        }
      }
      
      finalContext = truncatedContext || context.substring(0, maxContextLength);
      if (finalContext.length < context.length) {
        finalContext += '\n\n[Note: Content truncated to fit context limits]';
      }
      console.log(`📊 Truncated context to ${Math.ceil(finalContext.length / 4)} tokens`);
    }
    
    const systemPrompt = `You are an expert financial analyst specializing in ESOP (Employee Stock Ownership Plan) valuation reports. 

VISUAL CONTENT HANDLING:
- When you see "TABLE X:" interpret and analyze the tabular data thoroughly
- When you see "CHART X:" describe the visualization and extract key insights
- When you see "IMAGE X:" reference any relevant visual information
- Always reference both text content AND visual elements in your analysis
- For financial data, prioritize table values and chart data over narrative text
- When citing tables or charts, mention both the element type AND page number

CRITICAL CITATION REQUIREMENTS:
- You MUST explicitly mention page numbers in your answer (e.g., "According to Page 2..." or "Table 1 on Page 2 shows...")
- Every factual claim MUST reference the specific page where that information appears
- Use the exact page numbers shown in the document content below (PAGE 1, PAGE 2, etc.)
- When referencing visual elements, specify the element type (e.g., "Table 1 on Page 2", "Chart 2 on Page 3")
- If information spans multiple pages, mention all relevant page numbers

IMPORTANT: You MUST answer based ONLY on the document content provided below. If the information is not in the provided content, say "I cannot find that specific information in the provided document content" rather than making assumptions.

ALIGNMENT WITH DASHBOARD DATA:
${extractedMetrics ? `The following metrics have been extracted from this document and are displayed on the dashboard:
${JSON.stringify(extractedMetrics, null, 2)}

IMPORTANT: Your answer should be consistent with these extracted metrics. If there are discrepancies, prioritize the extracted metrics data and explain any differences.` : ''}

When answering:
1. Start each key point with a page reference (e.g., "Table 1 on Page 3 indicates that...")
2. Use ONLY the information from the provided document pages and visual elements
3. Be specific and cite page numbers AND element types for EVERY piece of information
4. If asked about something not in the content, clearly state it's not available
5. For financial figures, be precise with numbers, currency, AND source (table/chart/page)
6. Explain complex financial concepts in clear terms with page and element citations
7. When analyzing tables, reference specific rows/columns if helpful
8. When describing charts, mention the chart type and key data points
9. Ensure consistency with the extracted metrics data above

Document Content:
${finalContext}

REMEMBER: Your answer must explicitly reference the page numbers AND visual elements that appear in the document content above. The user will see these same references in the citations, so they must match your analysis.`;

    // Use GPT-4o for faster processing
    const chatModel = process.env.CHAT_MODEL || 'gpt-4o';
    let response;
    try {
      response = await openai.chat.completions.create({
        model: chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 1500, // Reduced for faster responses
      });
      console.log(`✅ Used ${chatModel} for question answering`);
    } catch (modelError) {
      console.log(`⚠️ ${chatModel} failed, trying GPT-3.5-turbo fallback`);
      response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI question answering error:', error);
    
    // Try Claude as fallback before mock answer
    try {
      console.log('🔄 Trying Claude fallback for question answering...');
      const { answerQuestionWithClaude } = await import('./anthropicService.js');
      const claudeAnswer = await answerQuestionWithClaude(question, finalContext);
      console.log('✅ Question answered with Claude fallback');
      return claudeAnswer;
    } catch (claudeError) {
      console.error('Claude fallback also failed:', claudeError);
      // Final fallback to mock answer
      return generateMockAnswer(question, context);
    }
  }
};

const generateMockAnswer = (question, context) => {
  // Enhanced keyword-based analysis that handles visual content
  const lowerQuestion = question.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  // Check for visual content markers
  const hasTable = context.includes('TABLE');
  const hasChart = context.includes('CHART');
  const hasImage = context.includes('IMAGE');
  
  // Extract actual values from the document content (including visual elements)
  const valuationMatch = context.match(/valuation:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  const shareMatch = context.match(/per share value:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  const discountMatch = context.match(/discount rate:?\s*([\d.]+)%?/i);
  const ownershipMatch = context.match(/(?:esop )?ownership:?\s*([\d.]+)%?/i);
  const revenueMatch = context.match(/revenue:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  const ebitdaMatch = context.match(/ebitda:?\s*\$?([\d,]+(?:\.\d{2})?)/i);
  const sharesMatch = context.match(/shares outstanding:?\s*([\d,]+)/i);
  
  // Extract table/chart references
  const tableMatch = context.match(/TABLE (\d+) \(Page (\d+)\)/i);
  const chartMatch = context.match(/CHART (\d+) \(Page (\d+)\)/i);
  
  // Answer based on what the user is asking and what's actually in the document
  if (lowerQuestion.includes('valuation') || lowerQuestion.includes('value')) {
    if (valuationMatch) {
      let source = 'the document';
      if (tableMatch) source = `Table ${tableMatch[1]} on Page ${tableMatch[2]}`;
      else if (chartMatch) source = `Chart ${chartMatch[1]} on Page ${chartMatch[2]}`;
      return `Based on ${source}, the total company valuation is $${valuationMatch[1]}. This represents the enterprise value as determined by the ESOP valuation analysis.`;
    }
  }
  
  if (lowerQuestion.includes('share') && !lowerQuestion.includes('outstanding')) {
    if (shareMatch) {
      let source = 'the valuation report';
      if (tableMatch) source = `Table ${tableMatch[1]} on Page ${tableMatch[2]}`;
      else if (chartMatch) source = `Chart ${chartMatch[1]} on Page ${chartMatch[2]}`;
      return `According to ${source}, the per share value is $${shareMatch[1]}. This price reflects the fair market value per share for ESOP participants.`;
    }
  }
  
  if (lowerQuestion.includes('discount')) {
    if (discountMatch) {
      return `The discount rate used in the valuation is ${discountMatch[1]}%. This rate reflects the company's cost of capital and risk profile.`;
    }
  }
  
  if (lowerQuestion.includes('ownership') || lowerQuestion.includes('percentage')) {
    if (ownershipMatch) {
      return `According to the document, the ESOP ownership percentage is ${ownershipMatch[1]}%.`;
    }
  }
  
  if (lowerQuestion.includes('revenue')) {
    if (revenueMatch) {
      return `The document shows company revenue of $${revenueMatch[1]}.`;
    }
  }
  
  if (lowerQuestion.includes('ebitda')) {
    if (ebitdaMatch) {
      return `The EBITDA shown in the document is $${ebitdaMatch[1]}.`;
    }
  }
  
  if (lowerQuestion.includes('shares') && lowerQuestion.includes('outstanding')) {
    if (sharesMatch) {
      return `The total shares outstanding according to the document is ${sharesMatch[1]}.`;
    }
  }
  
  // Handle questions specifically about tables or charts
  if (lowerQuestion.includes('table') && hasTable) {
    return `The document contains tabular data. ${tableMatch ? `Table ${tableMatch[1]} appears on Page ${tableMatch[2]}` : 'Tables are present in the document'} with financial information. Please refer to the specific table content for detailed values.`;
  }
  
  if (lowerQuestion.includes('chart') && hasChart) {
    return `The document contains chart visualizations. ${chartMatch ? `Chart ${chartMatch[1]} appears on Page ${chartMatch[2]}` : 'Charts are present in the document'} showing financial trends and data. Please refer to the specific chart analysis for insights.`;
  }
  
  // Fallback with actual document content
  const visualNote = (hasTable || hasChart || hasImage) ? ' This document includes visual elements (tables, charts, or images) that provide additional financial data.' : '';
  return `Based on the document content, here's what I found: ${context.substring(0, 300)}...${visualNote} Note: This analysis uses limited capabilities due to OpenAI quota limits, but is based on your actual document content.`;
};

// Helper function to chunk text into smaller pieces
const chunkText = (text, maxTokens = 12000) => {
  // Rough estimation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  const chunks = [];
  let currentChunk = '';
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

// Helper function to merge multiple JSON responses
const mergeMetricsResults = (results) => {
  const merged = {
    enterpriseValue: { currency: "USD" },
    valueOfEquity: { currency: "USD" },
    valuationPerShare: { currency: "USD" },
    keyFinancials: {},
    companyValuation: { currency: "USD" },
    discountRates: {},
    capitalStructure: {},
    valuationMultiples: {},
    valuationDate: { date: null, description: null }
  };
  
  // Track confidence scores for each metric
  const confidenceScores = {};
  
  for (const result of results) {
    if (!result) continue;
    
    // Merge each section, taking the first non-null value found
    Object.keys(result).forEach(section => {
      if (result[section] && typeof result[section] === 'object') {
        Object.keys(result[section]).forEach(key => {
          if (result[section][key] !== null && result[section][key] !== undefined) {
            if (!merged[section]) merged[section] = {};
            if (merged[section][key] === null || merged[section][key] === undefined) {
              merged[section][key] = result[section][key];
              
              // Track confidence (first value found gets highest confidence)
              const metricKey = `${section}.${key}`;
              if (!confidenceScores[metricKey]) {
                confidenceScores[metricKey] = 1.0; // High confidence for first value
              }
            } else {
              // If we find a different value, lower confidence
              const metricKey = `${section}.${key}`;
              if (merged[section][key] !== result[section][key]) {
                confidenceScores[metricKey] = Math.min(confidenceScores[metricKey] || 1.0, 0.7);
                console.log(`⚠️ Conflicting values for ${metricKey}: ${merged[section][key]} vs ${result[section][key]}`);
              }
            }
          }
        });
      }
    });
  }
  
  // Add confidence scores to the result
  merged.confidenceScores = confidenceScores;
  
  return merged;
};

// Simple in-memory cache for processed documents
const processedCache = new Map();

export const extractMetrics = async (documentText) => {
  // Create a hash of the document content for caching
  const documentHash = Buffer.from(documentText).toString('base64').substring(0, 50);
  
  // Check cache first
  if (processedCache.has(documentHash)) {
    console.log('🚀 Using cached metrics result');
    return processedCache.get(documentHash);
  }

  try {
    const systemPrompt = `You are an expert financial analyst. Extract ALL available ESOP valuation metrics from this document section. Be thorough and look for various ways these metrics might be expressed.

    IMPORTANT: Look for these terms and their variations:
    - Company Value/Valuation: "total value", "enterprise value", "company valuation", "fair market value", "firm value"
    - Per Share Value: "per share", "share value", "price per share", "fair market value per share"
    - Revenue: "annual revenue", "total revenue", "sales", "gross revenue"
    - EBITDA: "earnings before", "operating income", "adjusted EBITDA"
    - Discount Rate: "discount rate", "required rate", "cost of capital", "WACC", "weighted average"
    - Shares: "outstanding shares", "total shares", "shares issued", "common shares"
    - ESOP: "employee stock", "ESOP percentage", "employee ownership"
    - Valuation Date: "valuation date", "as of", "effective date", "date of valuation"

    CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no text before or after the JSON.

    Return a JSON object with this exact structure:
    {
      "enterpriseValue": {
        "currentValue": numeric_value_or_null,
        "previousValue": numeric_value_or_null,
        "currency": "USD"
      },
      "valueOfEquity": {
        "currentValue": numeric_value_or_null,
        "previousValue": numeric_value_or_null,
        "currency": "USD"
      },
      "valuationPerShare": {
        "currentValue": numeric_value_or_null,
        "previousValue": numeric_value_or_null,
        "currency": "USD"
      },
      "keyFinancials": {
        "revenue": numeric_value_or_null,
        "ebitda": numeric_value_or_null,
        "weightedAverageCostOfCapital": numeric_value_or_null
      },
      "companyValuation": {
        "totalValue": numeric_value_or_null,
        "perShareValue": numeric_value_or_null,
        "currency": "USD"
      },
      "discountRates": {
        "discountRate": numeric_value_or_null,
        "riskFreeRate": numeric_value_or_null,
        "marketRiskPremium": numeric_value_or_null
      },
      "capitalStructure": {
        "totalShares": numeric_value_or_null,
        "esopShares": numeric_value_or_null,
        "esopPercentage": numeric_value_or_null
      },
      "valuationMultiples": {
        "revenueMultiple": numeric_value_or_null,
        "ebitdaMultiple": numeric_value_or_null
      },
      "valuationDate": {
        "date": "YYYY-MM-DD or null",
        "description": "text description of the valuation date"
      }
    }

    CRITICAL RULES:
    1. Extract EXACT numeric values only (no $ signs, % symbols, or commas)
    2. If enterprise value not found, use company/total valuation
    3. If value of equity not found, use company valuation minus debt (or same as company value if no debt mentioned)
    4. If WACC not found, use discount rate
    5. Look carefully for ALL financial numbers in this section
    6. Use null only if truly not available after thorough search
    7. For valuation date: Look for "Valuation Date:", "as of", "effective date", etc. Convert to YYYY-MM-DD format if possible
    8. RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT
    
    Be aggressive in finding values - look in tables, summaries, conclusions, and anywhere numbers appear.`;

    // Split document into pages
    const pages = splitIntoPages(documentText);
    console.log(`📄 Document split into ${pages.length} pages for processing`);
    
    const chatModel = process.env.CHAT_MODEL || 'gpt-4o';
    
    // Process pages in parallel with concurrency control
    const processPage = async (page, pageIndex) => {
      try {
        // Try Claude first for better accuracy and speed
        const { extractMetricsWithClaude } = await import('./anthropicService.js');
        const pageResult = await extractMetricsWithClaude(page);
        console.log(`✅ Page ${pageIndex + 1} processed with Claude`);
        return { success: true, result: pageResult, pageIndex };
        
      } catch (claudeError) {
        console.log(`⚠️ Page ${pageIndex + 1} failed with Claude:`, claudeError.message);
        
        // Fallback to OpenAI GPT-4o
        try {
          const response = await openai.chat.completions.create({
            model: chatModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Page ${pageIndex + 1} content:\n${page}` }
            ],
            temperature: 0.1,
            max_tokens: 1000,
          });
          
          const responseContent = response.choices[0].message.content.trim();
          const pageResult = parseJSONResponse(responseContent);
          console.log(`✅ Page ${pageIndex + 1} processed with GPT-4o fallback`);
          return { success: true, result: pageResult, pageIndex };
          
        } catch (gptError) {
          console.log(`⚠️ Page ${pageIndex + 1} failed with GPT-4o:`, gptError.message);
          
          // Final fallback with GPT-3.5-turbo
          try {
            const response = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Page ${pageIndex + 1} content:\n${page}` }
              ],
              temperature: 0.1,
              max_tokens: 1500,
            });
            
            const responseContent = response.choices[0].message.content.trim();
            const pageResult = parseJSONResponse(responseContent);
            console.log(`✅ Page ${pageIndex + 1} processed with GPT-3.5 final fallback`);
            return { success: true, result: pageResult, pageIndex };
            
          } catch (finalError) {
            console.log(`❌ Page ${pageIndex + 1} failed completely:`, finalError.message);
            return { success: false, result: null, pageIndex };
          }
        }
      }
    };
    
    // Process pages in parallel with concurrency limit
    const concurrencyLimit = parseInt(process.env.CONCURRENCY_LIMIT) || 8; // Process 8 pages at once
    const results = new Array(pages.length);
    
    for (let i = 0; i < pages.length; i += concurrencyLimit) {
      const batch = pages.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map((page, batchIndex) => 
        processPage(page, i + batchIndex)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Store results in correct order
      batchResults.forEach(({ success, result, pageIndex }) => {
        results[pageIndex] = result;
      });
      
      console.log(` Processed batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(pages.length / concurrencyLimit)}`);
    }
    
    console.log(`🔗 Merging results from ${results.length} pages...`);
    const mergedResult = mergeMetricsResults(results);
    console.log(`✅ Metrics extraction completed with parallel processing`);
    
    // Cache the result
    processedCache.set(documentHash, mergedResult);
    
    // Limit cache size
    if (processedCache.size > 10) {
      const firstKey = processedCache.keys().next().value;
      processedCache.delete(firstKey);
    }
    
    return mergedResult;
    
  } catch (error) {
    console.error('OpenAI metrics extraction error:', error);
    return null;
  }
};

// Add cache clearing function
export const clearMetricsCache = () => {
  processedCache.clear();
  console.log('🧹 Metrics cache cleared');
};

// Helper function to parse JSON responses with better error handling
const parseJSONResponse = (responseContent) => {
  try {
    // First, try direct JSON parsing
    return JSON.parse(responseContent);
  } catch (error) {
    console.log('⚠️ Direct JSON parsing failed, attempting to extract JSON...');
    
    // Try to find JSON object in the response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (jsonError) {
        console.log('⚠️ JSON extraction failed:', jsonError.message);
      }
    }
    
    // If no JSON found, return null result
    console.log('⚠️ No valid JSON found in response, returning null');
    return {
      enterpriseValue: { currentValue: null, previousValue: null, currency: "USD" },
      valueOfEquity: { currentValue: null, previousValue: null, currency: "USD" },
      valuationPerShare: { currentValue: null, previousValue: null, currency: "USD" },
      keyFinancials: { revenue: null, ebitda: null, weightedAverageCostOfCapital: null },
      companyValuation: { totalValue: null, perShareValue: null, currency: "USD" },
      discountRates: { discountRate: null, riskFreeRate: null, marketRiskPremium: null },
      capitalStructure: { totalShares: null, esopShares: null, esopPercentage: null },
      valuationMultiples: { revenueMultiple: null, ebitdaMultiple: null },
      valuationDate: { date: null, description: null }
    };
  }
};

// Optimize page size for faster processing
const splitIntoPages = (documentText) => {
  // Optimize page size for faster processing
  const targetPageSize = 2000; // Smaller pages = faster processing
  
  // Try to split by common page separators
  const pageSeparators = [
    /\n\s*Page\s+\d+\s*\n/gi,
    /\n\s*\d+\s*\n/gi,
    /\n\s*-\s*Page\s+\d+\s*-\s*\n/gi,
    /\n\s*PAGE\s+\d+\s*\n/gi
  ];
  
  for (const separator of pageSeparators) {
    const pages = documentText.split(separator);
    if (pages.length > 1) {
      return pages.filter(page => page.trim().length > 0);
    }
  }
  
  // If no page separators found, create optimal-sized chunks
  const paragraphs = documentText.split(/\n\s*\n/);
  const pages = [];
  let currentPage = '';
  
  for (const paragraph of paragraphs) {
    if (currentPage.length + paragraph.length > targetPageSize) {
      if (currentPage.trim().length > 0) {
        pages.push(currentPage.trim());
      }
      currentPage = paragraph;
    } else {
      currentPage += '\n\n' + paragraph;
    }
  }
  
  if (currentPage.trim().length > 0) {
    pages.push(currentPage.trim());
  }
  
  return pages.length > 0 ? pages : [documentText];
};

const getOptimalModel = (documentSize) => {
  const estimatedTokens = documentSize.length / 4;
  
  // Use faster models for better performance
  if (estimatedTokens > 8000) {
    return 'gpt-4o'; // Fastest GPT-4 variant
  } else if (estimatedTokens > 4000) {
    return 'gpt-4o'; // GPT-4o is faster
  } else {
    return 'gpt-3.5-turbo'; // Fastest overall
  }
};