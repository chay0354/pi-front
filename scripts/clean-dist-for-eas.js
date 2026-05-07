/**
 * Webpack output — not used by native EAS builds but was ~226MB and broke uploads (ECONNRESET).
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
  console.log('[clean-dist-for-eas] Removed dist/');
}
