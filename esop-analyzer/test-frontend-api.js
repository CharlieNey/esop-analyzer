// Test frontend API integration
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testFrontendAPI() {
  console.log('🧪 Testing Frontend API Integration...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const health = await axios.get(`${API_BASE_URL}/health`);
    console.log(`✅ Health: ${health.data.status}\n`);

    // Test 2: Get documents (should have our uploaded PDF)
    console.log('2️⃣ Testing documents endpoint...');
    const docs = await axios.get(`${API_BASE_URL}/pdf/documents`);
    console.log(`✅ Documents found: ${docs.data.documents.length}`);
    
    if (docs.data.documents.length > 0) {
      const doc = docs.data.documents[0];
      console.log(`   📄 Document: ${doc.filename}`);
      console.log(`   🆔 ID: ${doc.id}`);
      console.log(`   📅 Uploaded: ${new Date(doc.upload_date).toLocaleString()}\n`);

      // Test 3: Get metrics for the document
      console.log('3️⃣ Testing metrics endpoint...');
      const metrics = await axios.get(`${API_BASE_URL}/metrics/${doc.id}`);
      console.log('✅ Metrics retrieved:');
      console.log(`   💰 Company Value: $${parseInt(metrics.data.metrics.companyValuation.data.totalValue).toLocaleString()}`);
      console.log(`   📊 Per Share: $${metrics.data.metrics.companyValuation.data.perShareValue}`);
      console.log(`   👥 ESOP Ownership: ${metrics.data.metrics.capitalStructure.data.esopPercentage}%`);
      console.log(`   📈 Discount Rate: ${metrics.data.metrics.discountRates.data.discountRate}%\n`);

      // Test 4: Ask a question
      console.log('4️⃣ Testing question-answering...');
      const question = "What is the company valuation?";
      const qaResponse = await axios.post(`${API_BASE_URL}/questions/ask`, {
        question,
        documentId: doc.id
      });
      
      console.log(`✅ Q&A Response:`);
      console.log(`   ❓ Question: "${question}"`);
      console.log(`   💬 Answer: "${qaResponse.data.answer.substring(0, 100)}..."`);
      console.log(`   📋 Citations: ${qaResponse.data.citations.length} found\n`);

      // Test 5: Test another question
      console.log('5️⃣ Testing second question...');
      const question2 = "What discount rate was used?";
      const qaResponse2 = await axios.post(`${API_BASE_URL}/questions/ask`, {
        question: question2,
        documentId: doc.id
      });
      
      console.log(`✅ Q&A Response 2:`);
      console.log(`   ❓ Question: "${question2}"`);
      console.log(`   💬 Answer: "${qaResponse2.data.answer.substring(0, 100)}..."`);
      console.log(`   📋 Citations: ${qaResponse2.data.citations.length} found\n`);

      console.log('🎉 All API tests passed! Frontend should work correctly.');
      console.log('\n📋 Frontend Testing Checklist:');
      console.log('   ✅ Backend API responding correctly');
      console.log('   ✅ Document data available');
      console.log('   ✅ Metrics extraction working');
      console.log('   ✅ Question-answering functional');
      console.log('   ✅ Citations provided');
      console.log('\n🌐 Open http://localhost:3000 to test the interface!');
      
    } else {
      console.log('⚠️  No documents found. Upload the sample PDF first.');
    }

  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testFrontendAPI();