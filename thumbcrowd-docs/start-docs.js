#!/usr/bin/env node
import { spawn } from 'child_process';

const mint = spawn('mint', ['dev', '--port', '80'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

mint.on('close', (code) => {
  process.exit(code);
});

mint.on('error', (err) => {
  console.error('Failed to start mint:', err);
  process.exit(1);
});