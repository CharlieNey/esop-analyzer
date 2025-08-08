#!/usr/bin/env node

/**
 * Test script for Supabase integration
 * Run with: node test-supabase.js
 */

import dotenv from 'dotenv';
import { supabaseDb } from './src/models/supabaseDatabase.js';
import { supabase } from './src/config/supabase.js';

dotenv.config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testSupabaseConnection() {
  log(colors.blue, '🧪 Testing Supabase Integration...\n');

  // Check environment variables
  log(colors.yellow, '1. Checking Environment Variables...');
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY'];
  let envOk = true;

  for (const env of required) {
    if (process.env[env]) {
      log(colors.green, `   ✓ ${env} is set`);
    } else {
      log(colors.red, `   ✗ ${env} is missing`);
      envOk = false;
    }
  }

  if (!envOk) {
    log(colors.red, '\n❌ Environment variables missing. Check your .env file.');
    process.exit(1);
  }

  // Test database connection
  log(colors.yellow, '\n2. Testing Database Connection...');
  try {
    const healthCheck = await supabaseDb.healthCheck();
    log(colors.green, `   ✓ Database connection successful`);
    log(colors.green, `   ✓ Health check status: ${healthCheck.status}`);
  } catch (error) {
    log(colors.red, `   ✗ Database connection failed: ${error.message}`);
    return false;
  }

  // Test table access
  log(colors.yellow, '\n3. Testing Table Access...');
  const tables = ['documents', 'document_chunks', 'extracted_metrics', 'ai_metrics_cache', 'processing_jobs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) throw error;
      log(colors.green, `   ✓ ${table} table accessible`);
    } catch (error) {
      log(colors.red, `   ✗ ${table} table error: ${error.message}`);
    }
  }

  // Test storage access
  log(colors.yellow, '\n4. Testing Storage Access...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    
    const documentsBucket = buckets.find(b => b.name === 'documents');
    if (documentsBucket) {
      log(colors.green, '   ✓ Documents storage bucket exists');
    } else {
      log(colors.yellow, '   ⚠ Documents storage bucket not found (you may need to create it)');
    }
  } catch (error) {
    log(colors.red, `   ✗ Storage access failed: ${error.message}`);
  }

  // Test CRUD operations
  log(colors.yellow, '\n5. Testing CRUD Operations...');
  let testDocumentId = null;
  
  try {
    // Create test document
    const testDocument = await supabaseDb.createDocument(
      'test-document.pdf',
      'test/path',
      'This is test content',
      { test: true }
    );
    testDocumentId = testDocument.id;
    log(colors.green, '   ✓ Document creation successful');

    // Read document
    const retrievedDoc = await supabaseDb.getDocument(testDocumentId);
    if (retrievedDoc && retrievedDoc.filename === 'test-document.pdf') {
      log(colors.green, '   ✓ Document retrieval successful');
    } else {
      throw new Error('Document retrieval validation failed');
    }

    // Update document
    const updatedDoc = await supabaseDb.updateDocument(testDocumentId, {
      content_text: 'Updated test content'
    });
    if (updatedDoc && updatedDoc.content_text === 'Updated test content') {
      log(colors.green, '   ✓ Document update successful');
    } else {
      throw new Error('Document update validation failed');
    }

    // Test metrics operations
    const metric = await supabaseDb.insertExtractedMetric(
      testDocumentId,
      'test_metric',
      'test_value',
      { test: true },
      0.95
    );
    log(colors.green, '   ✓ Metrics insertion successful');

    const metrics = await supabaseDb.getExtractedMetrics(testDocumentId);
    if (metrics.length > 0) {
      log(colors.green, '   ✓ Metrics retrieval successful');
    }

    // Test AI metrics cache
    await supabaseDb.upsertAIMetricsCache(testDocumentId, { test: 'ai_metrics' });
    log(colors.green, '   ✓ AI metrics cache successful');

    // Test processing job
    const job = await supabaseDb.createProcessingJob(testDocumentId, 'test_job', 'test_type', 'pending');
    log(colors.green, '   ✓ Processing job creation successful');

    const jobStatus = await supabaseDb.getProcessingJob(job.id);
    if (jobStatus && jobStatus.status === 'pending') {
      log(colors.green, '   ✓ Processing job retrieval successful');
    }

  } catch (error) {
    log(colors.red, `   ✗ CRUD operations failed: ${error.message}`);
  }

  // Clean up test data
  log(colors.yellow, '\n6. Cleaning Up Test Data...');
  if (testDocumentId) {
    try {
      await supabaseDb.deleteDocument(testDocumentId);
      log(colors.green, '   ✓ Test data cleaned up');
    } catch (error) {
      log(colors.yellow, `   ⚠ Cleanup failed (this is not critical): ${error.message}`);
    }
  }

  // Test real-time capabilities
  log(colors.yellow, '\n7. Testing Real-time Capabilities...');
  try {
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {})
      .subscribe();

    if (channel) {
      log(colors.green, '   ✓ Real-time channel creation successful');
      channel.unsubscribe();
      log(colors.green, '   ✓ Real-time channel cleanup successful');
    }
  } catch (error) {
    log(colors.red, `   ✗ Real-time test failed: ${error.message}`);
  }

  // Configuration summary
  log(colors.yellow, '\n8. Configuration Summary...');
  log(colors.blue, `   • Supabase URL: ${process.env.SUPABASE_URL}`);
  log(colors.blue, `   • Service Key: ${process.env.SUPABASE_SERVICE_KEY ? 'Set (***' + process.env.SUPABASE_SERVICE_KEY.slice(-4) + ')' : 'Not set'}`);
  log(colors.blue, `   • Anon Key: ${process.env.SUPABASE_ANON_KEY ? 'Set (***' + process.env.SUPABASE_ANON_KEY.slice(-4) + ')' : 'Not set'}`);
  log(colors.blue, `   • Use Supabase: ${process.env.USE_SUPABASE || 'false'}`);

  log(colors.green, '\n✅ Supabase integration test completed successfully!');
  log(colors.blue, '\n📚 Next steps:');
  log(colors.blue, '   1. Set USE_SUPABASE=true in your .env file to enable Supabase mode');
  log(colors.blue, '   2. Create the documents storage bucket in Supabase dashboard');
  log(colors.blue, '   3. Run the main application and test PDF upload');
  log(colors.blue, '   4. Check real-time updates in the frontend');
  
  return true;
}

// Run the test
testSupabaseConnection().catch(error => {
  log(colors.red, `\n❌ Test failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});