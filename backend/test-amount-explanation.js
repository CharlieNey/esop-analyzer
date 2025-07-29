import { pool } from './src/models/database.js';
import { answerQuestion } from './src/services/openaiService.js';

async function testAmountExplanation() {
  const client = await pool.connect();
  try {
    const docs = await client.query('SELECT id FROM documents ORDER BY upload_date DESC LIMIT 1');
    const docId = docs.rows[0].id;
    
    const docContent = await client.query('SELECT content_text FROM documents WHERE id = $1', [docId]);
    const content = docContent.rows[0].content_text;
    
    // Target the specific large amounts we found
    const targetAmounts = ['$23,100,000', '$29,380,000', '$20,460,000', '$18,380,000'];
    
    console.log('🧪 Testing explanation of specific amounts...');
    
    for (const amount of targetAmounts) {
      console.log(`\n💰 Analyzing ${amount}...`);
      
      // Find the context for this specific amount
      const regex = new RegExp(`.{0,400}\\${amount.replace('$', '\\$')}.{0,400}`, 'gi');
      const context = content.match(regex);
      
      if (context && context[0]) {
        console.log(`Context: ${context[0].substring(0, 200)}...`);
        
        const question = `Looking at this context from an ESOP valuation document: "${context[0]}"
        
What does the amount ${amount} represent? Is this the final concluded enterprise value, total company value, or business enterprise value of the company? Please explain what valuation method or approach this amount comes from.`;
        
        const response = await answerQuestion(question, '');
        console.log(`AI explains: ${response.substring(0, 300)}...`);
        
        // Check if this sounds like a final conclusion
        const isFinal = response.toLowerCase().includes('final') || 
                       response.toLowerCase().includes('concluded') ||
                       response.toLowerCase().includes('enterprise value') ||
                       response.toLowerCase().includes('total.*value');
        
        console.log(`🎯 Sounds like final value: ${isFinal}`);
      } else {
        console.log('❌ Context not found');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testAmountExplanation();