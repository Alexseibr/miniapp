import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
#!/usr/bin/env node
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
