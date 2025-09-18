#!/usr/bin/env node
// Test runner script for manual testing
const { spawn } = require('child_process');

console.log('🧪 Running Vitest...');

const vitest = spawn('npx', ['vitest', 'run'], {
  stdio: 'inherit',
  shell: true
});

vitest.on('close', (code) => {
  if (code === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed.');
  }
  process.exit(code);
});

vitest.on('error', (err) => {
  console.error('Failed to start test runner:', err);
  process.exit(1);
});