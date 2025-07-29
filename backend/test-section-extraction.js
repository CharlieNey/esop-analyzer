import { pool } from './src/models/database.js';
import { answerQuestion } from './src/services/openaiService.js';

async function testSectionExtraction() {
  console.log('🧪 Testing section-aware extraction...');
  
  const client = await pool.connect();
  try {
    const docs = await client.query('SELECT id, filename FROM documents ORDER BY upload_date DESC LIMIT 1');
    const docId = docs.rows[0].id;
    const filename = docs.rows[0].filename;
    console.log(`📄 Testing with: ${filename}`);
    
    const docContent = await client.query('SELECT content_text FROM documents WHERE id = $1', [docId]);
    const content = docContent.rows[0].content_text;
    
    // Test section finding for enterprise value
    console.log('\n🔍 Finding sections for enterprise value...');
    const keywords = ['enterprise value', 'business value', 'company value', 'total value', 'concluded value'];
    
    const sections = [];
    keywords.forEach(keyword => {
      const regex = new RegExp(`.{0,300}${keyword}.{0,700}`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        console.log(`📊 Found ${matches.length} sections for "${keyword}"`);
        sections.push(...matches.slice(0, 2)); // Top 2 per keyword
      }
    });
    
    if (sections.length > 0) {
      console.log(`\n📍 Total sections found: ${sections.length}`);
      console.log('\n--- Sample sections ---');
      sections.slice(0, 2).forEach((section, i) => {
        console.log(`Section ${i+1}:`);
        console.log(section.substring(0, 400));
        console.log('...\n');
      });
      
      // Test AI extraction with focused sections
      const sectionsText = sections.join('\n\n---SECTION---\n\n').substring(0, 6000);
      const question = `Looking at these sections from an ESOP valuation document, what is the final concluded enterprise value, total company value, or business enterprise value? Respond with just the dollar amount number.

Focus on these relevant sections:
${sectionsText}`;
      
      console.log('\n🤖 Asking AI with focused sections...');
      const response = await answerQuestion(question, '');
      
      console.log('\n✅ AI Response:');
      console.log(response);
      
      // Test number extraction
      const patterns = [
        /\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|m)\b/gi,
        /\$\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b)\b/gi,
        /\$\s*([\d,]+(?:\.\d+)?)\b/g,
      ];
      
      console.log('\n🔢 Extracting numbers...');
      let found = false;
      for (const pattern of patterns) {
        const matches = [...response.matchAll(pattern)];
        if (matches.length > 0) {
          found = true;
          matches.forEach(match => {
            let value = parseFloat(match[1].replace(/,/g, ''));
            if (match[0].toLowerCase().includes('million')) value *= 1000000;
            if (match[0].toLowerCase().includes('billion')) value *= 1000000000;
            console.log(`Found: "${match[0]}" -> ${value}`);
          });
        }
      }
      
      if (!found) {
        console.log('❌ No numbers found in AI response');
      }
      
    } else {
      console.log('❌ No relevant sections found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testSectionExtraction();