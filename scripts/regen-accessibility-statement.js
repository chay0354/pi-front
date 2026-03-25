/**
 * Regenerate screens/accessibilityStatementContent.js from
 * assets/legal/accessibility-statement-body.txt
 * Run from pi-front: node scripts/regen-accessibility-statement.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bodyPath = path.join(
  root,
  'assets',
  'legal',
  'accessibility-statement-body.txt',
);
const outPath = path.join(root, 'screens', 'accessibilityStatementContent.js');

const s = fs.readFileSync(bodyPath, 'utf8');
const out = `/** Hebrew accessibility statement (Pi 2701) — generated from assets/legal/accessibility-statement-body.txt */
export const ACCESSIBILITY_STATEMENT_HEBREW = ${JSON.stringify(s)};
`;
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', outPath, '(' + s.length + ' chars)');
