import express from 'express';
import { createEmbedding, answerQuestion } from '../services/openaiService.js';
import { pool } from '../models/database.js';

const router = express.Router();

// Add the missing cosine similarity function
const calculateCosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

router.post('/ask', async (req, res) => {
  try {
    const { question, documentId } = req.body;
    
    if (!question || !documentId) {
      return res.status(400).json({ error: 'Question and documentId are required' });
    }
    
    // Get similar chunks using vector similarity search
    const similarChunks = await getSimilarChunks(question, documentId, 10);
    
    if (similarChunks.length === 0) {
      return res.status(404).json({ error: 'No relevant content found for this question' });
    }
    
    // Filter chunks by similarity threshold and get top chunks
    const similarityThreshold = 0.7;
    const topChunks = similarChunks.filter(chunk => chunk.similarity > similarityThreshold);
    
    if (topChunks.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ No chunks met similarity threshold, including all chunks');
      }
      // If no chunks meet threshold, use all chunks but limit to top 5
      topChunks.push(...similarChunks.slice(0, 5));
    }
    
    // Limit to top 5 chunks to avoid context overflow
    const selectedChunks = topChunks.slice(0, 5);
    
    // Track which pages are being used for citations
    const usedPages = new Set();
    selectedChunks.forEach(chunk => {
      if (chunk.pageNumber) {
        usedPages.add(chunk.pageNumber);
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Question: "${question}"`);
      console.log(`📄 Found ${similarChunks.length} similar chunks, using top ${topChunks.length}`);
      console.log(`📊 Top chunk similarity: ${topChunks[0]?.similarity?.toFixed(3)}`);
      console.log(`📋 Pages used: ${Array.from(usedPages).sort().join(', ')}`);
    }
    
    // Build context from selected chunks
    let context = '';
    let contextTokens = 0;
    
    for (const chunk of selectedChunks) {
      const chunkText = `PAGE ${chunk.pageNumber || 'Unknown'}: ${chunk.text}\n\n`;
      const estimatedTokens = Math.ceil(chunkText.length / 4);
      
      // Limit context to ~8000 tokens to leave room for question and response
      if (contextTokens + estimatedTokens > 8000) {
        break;
      }
      
      context += chunkText;
      contextTokens += estimatedTokens;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(` Using ${selectedChunks.length} chunks, estimated ${contextTokens} tokens`);
    }
    
    // If context is too small, include more content
    if (contextTokens < 1000 && similarChunks.length > selectedChunks.length) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Low similarity detected, including limited document content');
      }
      
      // Add more chunks with lower similarity
      const additionalChunks = similarChunks.slice(selectedChunks.length, selectedChunks.length + 3);
      for (const chunk of additionalChunks) {
        const chunkText = `PAGE ${chunk.pageNumber || 'Unknown'}: ${chunk.text}\n\n`;
        const estimatedTokens = Math.ceil(chunkText.length / 4);
        
        if (contextTokens + estimatedTokens > 12000) {
          break;
        }
        
        context += chunkText;
        contextTokens += estimatedTokens;
        if (chunk.pageNumber) {
          usedPages.add(chunk.pageNumber);
        }
      }
    }
    
    // Prepare context for OpenAI with token-aware structure, grouped by page
    const pageGroups = {};
    selectedChunks.forEach(chunk => {
      if (!pageGroups[chunk.pageNumber]) {
        pageGroups[chunk.pageNumber] = [];
      }
      pageGroups[chunk.pageNumber].push(chunk);
    });
    
    const contextWithSummary = Object.keys(pageGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(pageNum => {
        const chunks = pageGroups[pageNum];
        const chunkContents = chunks.map(chunk => chunk.text).join('\n\n');
        const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;
        return `=== PAGE ${pageNum} (Relevance: ${avgSimilarity.toFixed(3)}) ===
${chunkContents}
=== END OF PAGE ${pageNum} ===`;
      }).join('\n\n');
      
    // Add page summary at the top for AI reference
    const pageList = Object.keys(pageGroups).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Add fallback context if we have very low similarity and no chunks selected
    if (selectedChunks.length === 0 && topChunks[0]?.similarity < 0.4) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Low similarity detected, including limited document content');
      }
      
      // Take just the first chunk to stay within limits
      const fallbackChunk = chunks[0];
      const fallbackPageNum = fallbackChunk.pageNumber || 1;
      const fallbackContext = `AVAILABLE PAGES: ${fallbackPageNum}

=== PAGE ${fallbackPageNum} (Relevance: 0.500) ===
${fallbackChunk.text.substring(0, 8000)}
=== END OF PAGE ${fallbackPageNum} ===`; // Limit to ~2000 tokens
      
      const answer = await answerQuestion(question, fallbackContext, documentId);
      
      const citations = [{
        chunkIndex: fallbackChunk.chunk_index,
        distance: 0.5,
        preview: fallbackChunk.text.substring(0, 200) + '...',
        pageNumber: fallbackPageNum,
        relevance: 0.5,
        section: `Page ${fallbackPageNum}`,
        fullText: fallbackChunk.text
      }];
      
      res.json({
        question,
        answer,
        citations,
        documentId
      });
      return;
    }
    
    // Get answer from OpenAI
    let answer = await answerQuestion(question, contextWithSummary, documentId);
    
    // Validate that answer contains page references - if not, add them
    answer = ensurePageReferences(answer, pageList);
    
    // Prepare citations with page numbers
    const citations = selectedChunks.map(chunk => ({
      chunkIndex: chunk.chunk_index,
      distance: 1 - chunk.similarity,
      preview: chunk.text.substring(0, 200) + '...',
      pageNumber: chunk.pageNumber,
      relevance: chunk.similarity,
      section: `Page ${chunk.pageNumber}`,
      fullText: chunk.text,
      truncated: chunk.truncated || false
    }));
    
    res.json({
      question,
      answer,
      citations,
      documentId
    });
    
  } catch (error) {
    console.error('Question answering error:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

// Add validation endpoint to check data alignment
router.get('/validate/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const client = await pool.connect();
    try {
      // Get extracted metrics
      const metricsResult = await client.query(
        'SELECT metric_type, metric_data FROM extracted_metrics WHERE document_id = $1',
        [documentId]
      );
      
      // Get document chunks
      const chunksResult = await client.query(
        'SELECT chunk_text, metadata FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index',
        [documentId]
      );
      
      const extractedMetrics = {};
      metricsResult.rows.forEach(row => {
        extractedMetrics[row.metric_type] = row.metric_data;
      });
      
      // Sample questions to test alignment
      const testQuestions = [
        "What is the company valuation?",
        "What is the per share value?",
        "What is the discount rate?",
        "How many shares are outstanding?"
      ];
      
      const validationResults = [];
      
      for (const question of testQuestions) {
        try {
          // Get Q&A response
          const questionEmbedding = await createEmbedding(question);
          const similarChunks = [];
          
          for (const chunk of chunksResult.rows) {
            const chunkEmbedding = JSON.parse(chunk.embedding);
            const similarity = calculateCosineSimilarity(questionEmbedding, chunkEmbedding);
            if (similarity > 0.25) {
              similarChunks.push({ ...chunk, similarity });
            }
          }
          
          if (similarChunks.length > 0) {
            similarChunks.sort((a, b) => b.similarity - a.similarity);
            const context = similarChunks.slice(0, 3).map(chunk => chunk.chunk_text).join('\n\n');
            const answer = await answerQuestion(question, context, documentId);
            
            validationResults.push({
              question,
              answer,
              hasMetrics: Object.keys(extractedMetrics).length > 0,
              metricsCount: Object.keys(extractedMetrics).length
            });
          }
        } catch (error) {
          validationResults.push({
            question,
            error: error.message,
            hasMetrics: Object.keys(extractedMetrics).length > 0
          });
        }
      }
      
      res.json({
        documentId,
        extractedMetrics,
        validationResults,
        summary: {
          totalMetrics: Object.keys(extractedMetrics).length,
          successfulValidations: validationResults.filter(r => !r.error).length,
          totalValidations: validationResults.length
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate alignment' });
  }
});

router.get('/history/:documentId', async (req, res) => {
  try {
    res.json({ 
      message: 'Question history feature coming soon',
      documentId: req.params.documentId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ensure AI answer contains page references that match citations
const ensurePageReferences = (answer, availablePages) => {
  // Check if answer already contains page references
  const hasPageReferences = /(?:page|on page|from page|according to page)\s*\d+/i.test(answer);
  
  if (hasPageReferences) {
    return answer; // Already has page references
  }
  
  // If no page references found, add a note about source pages
  const pageListText = availablePages.length === 1 
    ? `page ${availablePages[0]}` 
    : `pages ${availablePages.slice(0, -1).join(', ')} and ${availablePages[availablePages.length - 1]}`;
    
  return `${answer}\n\n*Information sourced from ${pageListText} of the document.*`;
};

export default router;