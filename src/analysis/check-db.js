import { createClient } from '@libsql/client';

// Database connection
const TURSO_URL = 'libsql://semimonitor-gavindingcoolapk.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5pXCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk0MzY2MDEsImlkIjoiMDE5ZTRlYWYtNDkwMS03YmE3LWEzOTItOGY3ZWNkODVjY2JkIiwicmlkIjoiOGVmZDY3NTUtY2E0Mi00NGVhLTlkNDctNGFiYjg1ZDQyMjgxIn0.SdCSl4WMs9_qJN3aWAQGBPUbcxcRtuQwu6bEDGMH_vlKfDlgV8R814fzmqse_MA8PGxBUOg-P4XzXNuTDTPdAQ';

function getClient() {
  return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
}

async function checkDatabase() {
  const db = getClient();
  
  try {
    console.log('🔍 Checking database connection...');
    
    // Test basic connection
    const result = await db.execute({
      sql: "SELECT datetime('now') as current_time",
      args: []
    });
    
    console.log('✅ Database connection successful');
    console.log(`Current database time: ${result.rows[0].current_time}`);
    
    // Check table structure
    console.log('\n📊 Checking news table structure...');
    const tableInfo = await db.execute({
      sql: "PRAGMA table_info(news)",
      args: []
    });
    
    console.log('News table columns:');
    tableInfo.rows.forEach((column, index) => {
      console.log(`${index + 1}. ${column.name} (${column.type}) ${column.notnull ? 'NOT NULL' : ''} ${column.dflt_value ? 'DEFAULT ' + column.dflt_value : ''}`);
    });
    
    // Check sample data
    console.log('\n📝 Checking recent news data...');
    const sampleData = await db.execute({
      sql: "SELECT COUNT(*) as total_count, COUNT(CASE WHEN analysis_brief IS NULL THEN 1 END) as pending_count FROM news",
      args: []
    });
    
    console.log(`Total news items: ${sampleData.rows[0].total_count}`);
    console.log(`News items needing analysis: ${sampleData.rows[0].pending_count}`);
    
    if (sampleData.rows[0].pending_count > 0) {
      console.log('\n🔍 Sample news items needing analysis:');
      const recentNews = await db.execute({
        sql: "SELECT id, title, source, published_at FROM news WHERE analysis_brief IS NULL ORDER BY published_at DESC LIMIT 3",
        args: []
      });
      
      recentNews.rows.forEach((news, index) => {
        console.log(`${index + 1}. ID: ${news.id}, Title: ${news.title.substring(0, 50)}..., Source: ${news.source}, Published: ${news.published_at}`);
      });
    }
    
    console.log('\n✅ Database check completed successfully');
    
  } catch (error) {
    console.error('❌ Database check failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.rawCode) {
      console.error('Raw error code:', error.rawCode);
    }
    
    process.exit(1);
  } finally {
    db.close();
  }
}

checkDatabase();