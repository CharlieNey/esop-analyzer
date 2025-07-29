// Simple API test script
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testHealthEndpoint() {
  try {
    console.log('Testing health endpoint...');
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testDocumentsEndpoint() {
  try {
    console.log('Testing documents endpoint...');
    const response = await axios.get(`${API_BASE_URL}/pdf/documents`);
    console.log('✅ Documents endpoint:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Documents endpoint failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting API Tests...\n');
  
  const healthOK = await testHealthEndpoint();
  const documentsOK = await testDocumentsEndpoint();
  
  console.log('\n📊 Test Results:');
  console.log(`Health endpoint: ${healthOK ? '✅' : '❌'}`);
  console.log(`Documents endpoint: ${documentsOK ? '✅' : '❌'}`);
  
  if (healthOK && documentsOK) {
    console.log('\n🎉 Basic API tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check if the server is running.');
  }
}

// Only run if this file is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}