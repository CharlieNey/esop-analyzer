// Test script to verify job completion flow
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testJobCompletion() {
  console.log('🧪 Testing Job Completion Flow...\n');

  try {
    // Step 1: Check if there are any completed jobs
    console.log('1️⃣ Checking for existing completed jobs...');
    const documentsResponse = await axios.get(`${API_BASE_URL}/pdf/documents`);
    const completedDocs = documentsResponse.data.documents.filter(doc => doc.processed_at);
    
    if (completedDocs.length === 0) {
      console.log('❌ No completed documents found');
      return;
    }
    
    console.log(`✅ Found ${completedDocs.length} completed documents`);
    
    // Step 2: Get the most recent completed document
    const latestDoc = completedDocs[0];
    console.log(`📄 Latest completed document: ${latestDoc.filename} (ID: ${latestDoc.id})`);
    
    // Step 3: Check if there's a job record for this document
    console.log('3️⃣ Checking job status...');
    
    // Try to find a job that processed this document
    // We'll check a few recent job IDs
    for (let jobId = 1; jobId <= 20; jobId++) {
      try {
        const jobStatus = await axios.get(`${API_BASE_URL}/pdf/job/${jobId}`);
        
        if (jobStatus.data.status === 'completed' && 
            jobStatus.data.data?.documentId === latestDoc.id) {
          console.log(`✅ Found completed job ${jobId} for document ${latestDoc.id}`);
          
          // Step 4: Test the job status endpoint
          console.log('4️⃣ Testing job status endpoint...');
          const statusResponse = await axios.get(`${API_BASE_URL}/pdf/job/${jobId}`);
          console.log('📊 Job status response:', JSON.stringify(statusResponse.data, null, 2));
          
          // Step 5: Test metrics endpoint
          console.log('5️⃣ Testing metrics endpoint...');
          try {
            const metricsResponse = await axios.get(`${API_BASE_URL}/metrics/${latestDoc.id}`);
            console.log('📈 Metrics response:', JSON.stringify(metricsResponse.data, null, 2));
          } catch (metricsError) {
            console.log('⚠️ Metrics endpoint error:', metricsError.response?.data || metricsError.message);
          }
          
          return;
        }
      } catch (error) {
        // Job not found, continue to next
        continue;
      }
    }
    
    console.log('❌ No completed job found for the latest document');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testJobCompletion(); 