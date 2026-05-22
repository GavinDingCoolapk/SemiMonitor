#!/usr/bin/env node

import { analyzeNewsFromTurso } from './analyze-news.js';

/**
 * SemiMonitor Analysis Engine - Cron Job
 * 
 * This script performs automated analysis of semiconductor industry news:
 * 1. Fetches recent news items that need analysis
 * 2. Classifies and analyzes each news item using the 6-layer传导链 framework
 * 3. Updates the database with analysis results
 * 4. Reports completion statistics
 */

async function main() {
  console.log('🚀 Starting SemiMonitor Analysis Engine');
  console.log(`⏰ Analysis time: ${new Date().toISOString()}`);
  console.log('=====================================');
  
  try {
    // Execute analysis
    const result = await analyzeNewsFromTurso();
    
    // Generate report
    console.log('\n📊 Analysis Report');
    console.log('=====================================');
    console.log(`Total news items processed: ${result.total}`);
    console.log(`Semiconductor news analyzed: ${result.analyzed}`);
    console.log(`Irrelevant news filtered: ${result.irrelevant}`);
    console.log(`Analysis completion rate: ${((result.analyzed / result.total) * 100).toFixed(1)}%`);
    console.log(`Completion time: ${new Date().toISOString()}`);
    
    // Key findings summary
    console.log('\n🔍 Key Findings');
    console.log('=====================================');
    if (result.analyzed > 0) {
      console.log(`✅ ${result.analyzed} semiconductor news items analyzed`);
      console.log(`📈 Signals categorized by component type and impact direction`);
      console.log(`🏢 Company impacts assessed and mapped to relevant stakeholders`);
      console.log(`📈 Stock signals generated with confidence levels`);
    } else {
      console.log('📭 No semiconductor news items found in the analysis window');
    }
    
    if (result.irrelevant > 0) {
      console.log(`❌ ${result.irrelevant} non-semiconductor news items filtered out`);
    }
    
    console.log('\n✅ Analysis completed successfully');
    
    // Return success for cron monitoring
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Analysis failed with error:');
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.error('\n🔧 Troubleshooting suggestions:');
    console.error('1. Check database connection credentials');
    console.error('2. Verify TURSO_URL and TURSO_TOKEN environment variables');
    console.error('3. Check if there are any network connectivity issues');
    console.error('4. Review the news table structure and column names');
    
    // Return failure for cron monitoring
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Execute main function
main();