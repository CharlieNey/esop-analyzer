// Simple test script to debug AI metrics endpoint
import { pool } from './src/models/database.js';
import { answerQuestion } from './src/services/openaiService.js';

async function testAIExtraction() {
  console.log('🧪 Testing AI metrics extraction...');
  
  const client = await pool.connect();
  try {
    // Get the first document
    const docs = await client.query('SELECT id, filename FROM documents ORDER BY upload_date DESC LIMIT 1');
    
    if (docs.rows.length === 0) {
      console.log('❌ No documents found in database');
      return;
    }
    
    const docId = docs.rows[0].id;
    const filename = docs.rows[0].filename;
    console.log(`📄 Testing with document: ${filename} (${docId})`);
    
    // Test the improved AI query
    const testQuestion = "Looking at this ESOP valuation document, what is the final concluded enterprise value, total company value, or business enterprise value? Look in executive summary, valuation conclusion, or final results sections. Respond with just the dollar amount number.";
    
    const docContent = await client.query('SELECT content_text FROM documents WHERE id = $1', [docId]);
    const content = docContent.rows[0].content_text;
    
    console.log(`📝 Document content length: ${content.length} characters`);
    console.log(`🔍 First 500 chars: ${content.substring(0, 500)}...`);
    
    console.log('\n🤖 Asking AI...');
    const aiResponse = await answerQuestion(testQuestion, content);
    
    console.log('\n✅ AI Response:');
    console.log(aiResponse);
    
    // Test our improved number extraction
    console.log('\n🔢 Testing improved number extraction:');
    const patterns = [
      /\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|m)\b/gi,
      /\$\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b)\b/gi,
      /([\d,]+(?:\.\d+)?)\s*(?:million|m)\s*(?:dollars?)?/gi,
      /\$\s*([\d,]+(?:\.\d+)?)\b/g,
    ];
    
    let bestValue = null;
    for (const pattern of patterns) {
      const matches = [...aiResponse.matchAll(pattern)];
      for (const match of matches) {
        let value = parseFloat(match[1].replace(/,/g, ''));
        const fullMatch = match[0].toLowerCase();
        
        if (fullMatch.includes('million') || fullMatch.endsWith(' m')) {
          value *= 1000000;
        } else if (fullMatch.includes('billion') || fullMatch.endsWith(' b')) {
          value *= 1000000000;
        }
        
        console.log(`Found: "${match[0]}" -> ${value}`);
        if (!isNaN(value) && value > 0) {
          bestValue = value;
        }
      }
    }
    
    console.log(`\n🎯 Best extracted value: ${bestValue}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testAIExtraction();