require('dotenv').config();
const { execSync } = require('child_process');

const token = process.env.NOMINA_GH_TOKEN;
if (!token) {
  console.error('❌  NOMINA_GH_TOKEN not found.');
  console.error('    Copy .env.example to .env and add your GitHub token.');
  process.exit(1);
}

// electron-builder always reads GH_TOKEN — map our token to it
process.env.GH_TOKEN = token;

console.log('🚀  Building and publishing Nomina...');
execSync('electron-builder --win --publish always', { stdio: 'inherit' });
