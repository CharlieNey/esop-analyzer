import { pool } from './src/models/database.js';
import fs from 'fs/promises';
import path from 'path';

const runMigration = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration to add concurrency support...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '008_increase_concurrency.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Concurrency support added');
    console.log('💡 You can now set CONCURRENCY_LIMIT in your .env file (default: 8)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

runMigration().then(() => {
  console.log('🎉 Migration script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
}); 