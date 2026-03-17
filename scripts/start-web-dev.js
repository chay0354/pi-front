#!/usr/bin/env node
// Run the web dev server with cache clear and CI unset so changes show on refresh
process.env.CI = 'false';
const { spawn } = require('child_process');
const child = spawn(
  'npx',
  ['expo', 'start', '--web', '--port', '8085', '--clear'],
  { stdio: 'inherit', shell: true, env: process.env, cwd: require('path').resolve(__dirname, '..') }
);
child.on('exit', (code) => process.exit(code != null ? code : 0));
