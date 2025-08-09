#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Run ESLint and capture output (server only to avoid huge output)
  const output = execSync('npx eslint server --ext .ts --format json', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  const results = JSON.parse(output);
  
  // Filter out files with no issues and sort by issue count
  const sortedResults = results
    .filter(result => result.errorCount > 0 || result.warningCount > 0)
    .sort((a, b) => {
      const aTotal = a.errorCount + a.warningCount;
      const bTotal = b.errorCount + b.warningCount;
      return bTotal - aTotal; // Sort descending
    });
  
  console.log(`\nServer files sorted by issue count (${sortedResults.length} files with issues):\n`);
  
  // Show top 20 files only
  const topFiles = sortedResults.slice(0, 20);
  
  topFiles.forEach((result, index) => {
    const total = result.errorCount + result.warningCount;
    const filePath = result.filePath.replace(process.cwd() + '/', '');
    
    console.log(`${(index + 1).toString().padStart(2)}. ${filePath}`);
    console.log(`    ${result.errorCount} errors, ${result.warningCount} warnings (${total} total)`);
  });
  
  if (sortedResults.length > 20) {
    console.log(`\n... and ${sortedResults.length - 20} more files with issues`);
  }
  
} catch (error) {
  console.error('Error running lint:', error.message);
  process.exit(1);
}