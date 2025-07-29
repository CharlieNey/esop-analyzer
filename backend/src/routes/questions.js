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
    
    // Get document chunks with page metadata
    const client = await pool.connect();
    try {
      const chunksResult = await client.query(
        'SELECT chunk_text, chunk_index, embedding, metadata FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index',
        [documentId]
      );
      
      const chunks = chunksResult.rows;
      
      if (chunks.length === 0) {
        return res.status(404).json({ error: 'Document not found or no chunks available' });
      }
      
      // Create embeddings for the question
      const questionEmbedding = await createEmbedding(question);
      
      // Find similar chunks using vector similarity with lower threshold
      const similarChunks = [];
      for (const chunk of chunks) {
        const chunkEmbedding = JSON.parse(chunk.embedding);
        const similarity = calculateCosineSimilarity(questionEmbedding, chunkEmbedding);
        
        // Lower threshold to 0.25 to catch more relevant chunks
        if (similarity > 0.25) {
          similarChunks.push({
            ...chunk,
            similarity,
            pageNumber: chunk.metadata?.pageNumber || chunk.chunk_index + 1
          });
        }
      }
      
      // If no chunks meet threshold, include all chunks with their similarity scores
      if (similarChunks.length === 0) {
        console.log('⚠️ No chunks met similarity threshold, including all chunks');
        for (const chunk of chunks) {
          const chunkEmbedding = JSON.parse(chunk.embedding);
          const similarity = calculateCosineSimilarity(questionEmbedding, chunkEmbedding);
          similarChunks.push({
            ...chunk,
            similarity,
            pageNumber: chunk.metadata?.pageNumber || chunk.chunk_index + 1
          });
        }
      }
      
      // Sort by similarity and take top chunks, ensuring page diversity
      similarChunks.sort((a, b) => b.similarity - a.similarity);
      
      // Select chunks with page diversity - prefer different pages
      const topChunks = [];
      const usedPages = new Set();
      const maxChunksPerPage = 2;
      const pageChunkCount = new Map();
      
      for (const chunk of similarChunks) {
        const pageCount = pageChunkCount.get(chunk.pageNumber) || 0;
        
        if (topChunks.length < 7 && pageCount < maxChunksPerPage) {
          topChunks.push(chunk);
          pageChunkCount.set(chunk.pageNumber, pageCount + 1);
          usedPages.add(chunk.pageNumber);
        }
        
        if (topChunks.length >= 7) break;
      }
      
      // Add debug logging with page distribution
      console.log(`🔍 Question: "${question}"`);
      console.log(`📄 Found ${similarChunks.length} similar chunks, using top ${topChunks.length}`);
      console.log(`📊 Top chunk similarity: ${topChunks[0]?.similarity?.toFixed(3)}`);
      console.log(`📋 Pages used: ${Array.from(usedPages).sort().join(', ')}`);
      
      // Smart context preparation with token limit management
      const maxContextTokens = 16000; // Increased limit for better coverage
      let contextTokens = 0;
      const selectedChunks = [];
      
      for (const chunk of topChunks) {
        // Estimate tokens (roughly 4 characters per token)
        const chunkTokens = Math.ceil(chunk.chunk_text.length / 4);
        const chunkContextTokens = chunkTokens + 50; // Add overhead for formatting
        
        if (contextTokens + chunkContextTokens <= maxContextTokens) {
          selectedChunks.push(chunk);
          contextTokens += chunkContextTokens;
        } else {
          // If this chunk would exceed limit, try to include a truncated version
          const remainingTokens = maxContextTokens - contextTokens;
          if (remainingTokens > 500) { // Only if we have meaningful space left
            const truncatedText = chunk.chunk_text.substring(0, remainingTokens * 4);
            selectedChunks.push({
              ...chunk,
              chunk_text: truncatedText + '...',
              truncated: true
            });
          }
          break;
        }
      }
      
      console.log(` Using ${selectedChunks.length} chunks, estimated ${contextTokens} tokens`);
      
      // Prepare context for OpenAI with token-aware structure, grouped by page
      const pageGroups = {};
      selectedChunks.forEach(chunk => {
        if (!pageGroups[chunk.pageNumber]) {
          pageGroups[chunk.pageNumber] = [];
        }
        pageGroups[chunk.pageNumber].push(chunk);
      });
      
      const context = Object.keys(pageGroups)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(pageNum => {
          const chunks = pageGroups[pageNum];
          const chunkContents = chunks.map(chunk => chunk.chunk_text).join('\n\n');
          const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;
          return `=== PAGE ${pageNum} (Relevance: ${avgSimilarity.toFixed(3)}) ===
${chunkContents}
=== END OF PAGE ${pageNum} ===`;
        }).join('\n\n');
        
      // Add page summary at the top for AI reference
      const pageList = Object.keys(pageGroups).sort((a, b) => parseInt(a) - parseInt(b));
      const contextWithSummary = `AVAILABLE PAGES: ${pageList.join(', ')}

${context}`;
      
      // Add fallback context if we have very low similarity and no chunks selected
      if (selectedChunks.length === 0 && topChunks[0]?.similarity < 0.4) {
        console.log('⚠️ Low similarity detected, including limited document content');
        
        // Take just the first chunk to stay within limits
        const fallbackChunk = chunks[0];
        const fallbackPageNum = fallbackChunk.metadata?.pageNumber || fallbackChunk.chunk_index + 1;
        const fallbackContext = `AVAILABLE PAGES: ${fallbackPageNum}

=== PAGE ${fallbackPageNum} (Relevance: 0.500) ===
${fallbackChunk.chunk_text.substring(0, 8000)}
=== END OF PAGE ${fallbackPageNum} ===`; // Limit to ~2000 tokens
        
        const answer = await answerQuestion(question, fallbackContext, documentId);
        
        const citations = [{
          chunkIndex: fallbackChunk.chunk_index,
          distance: 0.5,
          preview: fallbackChunk.chunk_text.substring(0, 200) + '...',
          pageNumber: fallbackChunk.metadata?.pageNumber || fallbackChunk.chunk_index + 1,
          relevance: 0.5,
          section: `Page ${fallbackChunk.metadata?.pageNumber || fallbackChunk.chunk_index + 1}`,
          fullText: fallbackChunk.chunk_text
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
        preview: chunk.chunk_text.substring(0, 200) + '...',
        pageNumber: chunk.pageNumber,
        relevance: chunk.similarity,
        section: `Page ${chunk.pageNumber}`,
        fullText: chunk.chunk_text,
        truncated: chunk.truncated || false
      }));
      
      res.json({
        question,
        answer,
        citations,
        documentId
      });
      
    } finally {
      client.release();
    }
    
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