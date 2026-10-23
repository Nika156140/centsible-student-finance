const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

// Match all getElementById calls
const matches = [...js.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(matches)];

console.log(`Checking ${uniqueIds.length} unique getElementById targets...`);

const missing = [];
for (const id of uniqueIds) {
  // Dynamically constructed IDs like budget_input_... are created at runtime
  if (id.startsWith('budget_input_')) continue;

  const pattern = new RegExp(`id=["']${id}["']`);
  if (!pattern.test(html)) {
    missing.push(id);
  }
}

if (missing.length === 0) {
  console.log('✓ All getElementById targets exist in index.html!');
} else {
  console.error('Missing IDs in index.html:', missing);
  process.exit(1);
}
