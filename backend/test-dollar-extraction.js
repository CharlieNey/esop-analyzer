import { pool } from './src/models/database.js';
import { answerQuestion } from './src/services/openaiService.js';

async function testDollarExtraction() {
  console.log('🧪 Testing dollar amount extraction...');
  
  const client = await pool.connect();
  try {
    const docs = await client.query('SELECT id, filename FROM documents ORDER BY upload_date DESC LIMIT 1');
    const docId = docs.rows[0].id;
    const filename = docs.rows[0].filename;
    console.log(`📄 Testing with: ${filename}`);
    
    const docContent = await client.query('SELECT content_text FROM documents WHERE id = $1', [docId]);
    const content = docContent.rows[0].content_text;
    
    // Find all large dollar amounts and their context
    console.log('\n💰 Finding dollar amounts with context...');
    const dollarRegex = /(.{0,200})\$\s*([\d,]+(?:\.\d+)?)\s*(?:(?:million|billion|thousand)?(.{0,200}))/gi;
    const matches = [...content.matchAll(dollarRegex)];
    
    console.log(`Found ${matches.length} dollar amounts`);
    
    const largeAmounts = [];
    matches.forEach((match, i) => {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      if (amount >= 100000) { // Only amounts >= $100k
        largeAmounts.push({
          amount,
          fullMatch: match[0],
          context: match[1] + '$' + match[2] + (match[3] || ''),
          index: i
        });
      }
    });
    
    console.log(`\n📊 Found ${largeAmounts.length} large amounts (>=$100k):`);
    largeAmounts.slice(0, 10).forEach((item, i) => {
      console.log(`${i+1}. $${item.amount.toLocaleString()}: "${item.context.substring(0, 150)}..."`);
    });
    
    if (largeAmounts.length > 0) {
      // Create a focused question with the dollar amounts
      const amountContexts = largeAmounts.slice(0, 5).map(item => item.context).join('\n\n---\n\n');
      
      const question = `Looking at these sections containing dollar amounts from an ESOP valuation document, which amount represents the final concluded enterprise value, total company value, or business enterprise value?

Contexts with dollar amounts:
${amountContexts}

Please respond with just the specific dollar amount that represents the company's total valuation.`;
      
      console.log('\n🤖 Asking AI to identify the correct valuation amount...');
      const response = await answerQuestion(question, '');
      
      console.log('\n✅ AI Response:');
      console.log(response);
      
      // Extract the AI's chosen amount
      const responseNumbers = response.match(/\$[\d,]+(?:\.\d+)?/g);
      if (responseNumbers) {
        console.log('\n🎯 AI identified amounts:', responseNumbers);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testDollarExtraction();