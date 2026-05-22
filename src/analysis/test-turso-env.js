import { createClient } from '@libsql/client';

console.log('🔍 Testing Turso database connection with environment variables...');

// Check if we can get credentials from environment
const tursoUrl = process.env.TURSO_URL;
const tursoToken = process.env.TURSO_TOKEN;

console.log('TURSO_URL:', tursoUrl ? 'Set' : 'Not set');
console.log('TURSO_TOKEN:', tursoToken ? 'Set' : 'Not set');

if (!tursoUrl || !tursoToken) {
  console.log('❌ Environment variables not set, using fallback values...');
  
  // Use hardcoded values
  process.env.TURSO_URL = 'libsql://semimonitor-gavindingcoolapk.aws-ap-northeast-1.turso.io';
  process.env.TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5pXCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk0MzY2MDEsImlkIjoiMDE5ZTRlYWYtNDkwMS03YmE3LWEzOTItOGY3ZWNkODVjY2JkIiwicmlkIjoiOGVmZDY3NTUtY2E0Mi00NGVhLTlkNDctNGFiYjg1ZDQyMjgxIn0.SdCSl4WMs9_qJN3aWAQGBPUbcxcRtuQwu6bEDGMH_vlKfDlgV8R814fzmqse_MA8PGxBUOg-P4XzXNuTDTPdAQ';
}

function getClient() {
  return createClient({ 
    url: process.env.TURSO_URL, 
    authToken: process.env.TURSO_TOKEN 
  });
}

async function testConnection() {
  const db = getClient();
  
  try {
    console.log('Testing basic query...');
    
    // Test a simple query
    const result = await db.execute({
      sql: "SELECT 1 as test",
      args: []
    });
    
    console.log('✅ Connection successful!');
    console.log('Test result:', result.rows[0]);
    
    // Test date/time query
    const timeResult = await db.execute({
      sql: "SELECT datetime('now') as current_time",
      args: []
    });
    
    console.log('Database time:', timeResult.rows[0].current_time);
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.rawCode) {
      console.error('Raw error code:', error.rawCode);
    }
    
    console.error('\n🔧 Possible solutions:');
    console.error('1. Check if the database URL is correct');
    console.error('2. Verify the authentication token is valid');
    console.error('3. Check if the database is accessible from your network');
    console.error('4. Try using a different Turso region or database');
    
    process.exit(1);
  } finally {
    db.close();
  }
}

testConnection();