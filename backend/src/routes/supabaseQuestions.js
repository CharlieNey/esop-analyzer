import express from 'express';
import { createEmbedding, answerQuestion } from '../services/openaiService.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Function to get similar chunks using vector similarity search in Supabase
const getSimilarChunks = async (question, documentId, limit = 10) => {
  try {
    console.log('🔑 Creating embedding for question:', { questionLength: question.length });
    
    // Create embedding for the question
    const questionEmbedding = await createEmbedding(question);
    console.log('✅ Question embedding created:', { dimensions: questionEmbedding.length });
    
    console.log('🎯 Searching for document:', { documentId, limit });
    
    // First, check if the document exists and has chunks
    const { data: docCheck, error: docError } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('document_id', documentId);
    
    if (docError) {
      console.error('❌ Error checking document chunks:', docError);
      throw docError;
    }
    
    console.log('📊 Document chunk count:', { chunk_count: docCheck.length });
    
    if (docCheck.length === 0) {
      console.log('❌ No chunks found for document:', documentId);
      
      // Get available documents for debugging
      const { data: availableDocs, error: availableError } = await supabase
        .from('documents')
        .select(`
          id, 
          filename,
          document_chunks!inner(id)
        `)
        .order('upload_date', { ascending: false })
        .limit(5);
      
      if (!availableError && availableDocs) {
        const docsWithCounts = availableDocs.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          chunk_count: doc.document_chunks?.length || 0
        }));
        
        console.log('📋 Available documents with chunks:', docsWithCounts);
      }
      
      return [];
    }
    
    // Try vector similarity search with RPC function first
    console.log('🔍 Attempting vector similarity search with Supabase...');
    
    let result = null;
    let searchError = null;
    
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'match_document_chunks',
        {
          query_embedding: questionEmbedding,
          match_document_id: documentId,
          match_count: limit,
          similarity_threshold: 0.1
        }
      );
      result = rpcResult;
      searchError = rpcError;
    } catch (rpcException) {
      console.log('⚠️ RPC function not available, using fallback method');
      searchError = rpcException;
    }
    
    if (searchError || !result) {
      console.log('🔄 Using simple chunk retrieval (no vector search)...');
      
      // Fallback: get chunks without similarity search and calculate manually
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from('document_chunks')
        .select('id, document_id, chunk_text, chunk_index, page_number, metadata, embedding')
        .eq('document_id', documentId)
        .limit(limit * 2); // Get more chunks to filter later
      
      if (fallbackError) {
        console.error('❌ Fallback chunk retrieval failed:', fallbackError);
        throw fallbackError;
      }
      
      // Calculate similarity manually if we have embeddings
      const chunksWithSimilarity = fallbackChunks.map(chunk => {
        let similarity = 0.5; // Default similarity
        
        try {
          if (chunk.embedding) {
            const chunkEmbedding = Array.isArray(chunk.embedding) 
              ? chunk.embedding 
              : JSON.parse(chunk.embedding);
            similarity = calculateCosineSimilarity(questionEmbedding, chunkEmbedding);
          }
        } catch (e) {
          console.log('⚠️ Could not calculate similarity for chunk:', chunk.id);
        }
        
        return {
          id: chunk.id,
          document_id: chunk.document_id,
          text: chunk.chunk_text,
          chunk_index: chunk.chunk_index,
          pageNumber: chunk.page_number,
          similarity: similarity,
          metadata: chunk.metadata
        };
      });
      
      // Sort by similarity and return top results
      return chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    }
    
    console.log('📋 Vector search completed:', { rowCount: result?.length || 0 });
    
    if (result && result.length > 0) {
      console.log('🎯 Top similarity scores:', 
        result.slice(0, 3).map((row, i) => `${i+1}: ${row.similarity?.toFixed(3) || 'N/A'}`)
      );
    }
    
    return result?.map(row => ({
      id: row.id,
      document_id: row.document_id,
      text: row.chunk_text,
      chunk_index: row.chunk_index,
      pageNumber: row.page_number,
      similarity: parseFloat(row.similarity || 0.5),
      metadata: row.metadata
    })) || [];
    
  } catch (error) {
    console.error('❌ Error in getSimilarChunks:', error);
    throw error;
  }
};

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
    
    console.log('📥 Supabase Question request received:', { question, documentId });
    
    if (!question || !documentId) {
      console.log('❌ Missing required fields:', { hasQuestion: !!question, hasDocumentId: !!documentId });
      return res.status(400).json({ error: 'Question and documentId are required' });
    }
    
    // Get similar chunks using vector similarity search
    console.log('🔍 Getting similar chunks for:', { documentId, questionLength: question.length });
    const similarChunks = await getSimilarChunks(question, documentId, 10);
    console.log('📊 Found similar chunks:', { count: similarChunks.length });
    
    if (similarChunks.length === 0) {
      return res.status(404).json({ 
        error: 'No relevant content found for this question',
        details: 'The document may not exist or may not have been processed yet. Please try uploading the document again or select a different document.',
        documentId 
      });
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
      console.log(`📄 Using ${selectedChunks.length} chunks, estimated ${contextTokens} tokens`);
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
      const fallbackChunk = similarChunks[0];
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
    console.error('Supabase Question answering error:', error);
    res.status(500).json({ error: 'Failed to answer question' });
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