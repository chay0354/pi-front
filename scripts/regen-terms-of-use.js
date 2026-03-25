/**
 * Regenerate screens/termsOfUseContent.js from assets/legal/terms-of-use-body.txt
 * Run from pi-front: node scripts/regen-terms-of-use.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bodyPath = path.join(root, 'assets', 'legal', 'terms-of-use-body.txt');
const outPath = path.join(root, 'screens', 'termsOfUseContent.js');

const s = fs.readFileSync(bodyPath, 'utf8');
const escaped = JSON.stringify(s);
const out = `/** Hebrew terms of use (Pi 2701) — generated from assets/legal/terms-of-use-body.txt */
export const TERMS_OF_USE_HEBREW = ${escaped};
`;
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath, '(' + s.length + ' chars)');
