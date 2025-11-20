#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '5000';

const tsxPath = path.join(__dirname, 'node_modules', '.bin', 'tsx');
const tsx = spawn(tsxPath, ['server/marketplace.ts'], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

tsx.on('close', (code) => {
  process.exit(code);
});

tsx.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  tsx.kill('SIGINT');
});

process.on('SIGTERM', () => {
  tsx.kill('SIGTERM');
});
