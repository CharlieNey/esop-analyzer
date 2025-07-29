import { pool } from './src/models/database.js';

async function clearCache() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Clearing AI metrics cache...');
    
    // Clear the AI metrics cache table
    const result = await client.query('DELETE FROM ai_metrics_cache');
    console.log(`✅ Cleared ${result.rowCount} cached AI metrics entries`);
    
    // Optionally, you can also clear other caches if needed
    // For example, if you want to clear extracted metrics as well:
    // const metricsResult = await client.query('DELETE FROM extracted_metrics');
    // console.log(`✅ Cleared ${metricsResult.rowCount} extracted metrics entries`);
    
    console.log('🎯 Cache cleared successfully! You can now test with fresh data.');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

clearCache();