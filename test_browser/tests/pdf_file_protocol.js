'use strict';

const assert = require('assert');
const { sleep } = require('../harness');

module.exports = async function run(context) {
  const page = await context.createPage({
    url: context.fileUrl,
    width: 1440,
    height: 1200
  });

  try {
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");

    // CSV must still work when the app is opened directly from file://.
    await page.evalJs("document.getElementById('tab-transactions').click(); true");
    await sleep(120);
    await page.evalJs("document.getElementById('txViewImportBtn').click(); true");
    await sleep(200);
    await page.evalJs(`
      (() => {
        const csv = 'Date,Narration,Debit,Credit\\n02/10/2026,"CSV file protocol lunch",123.00,\\n';
        const file = new File([csv], 'synthetic-file-protocol.csv', { type: 'text/csv' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('statementFileInput');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    assert.ok(/Comma delimiter/i.test(await page.evalJs("document.getElementById('statementParseMeta').textContent")));
    assert.strictEqual(await page.evalJs("document.getElementById('statementHeaderRowControl').classList.contains('hidden')"), false);
    console.log('✓ CSV import still works when the app is opened directly via file://');
    await page.evalJs("document.getElementById('statementCancelBtn').click(); true");
    await sleep(200);

    // PDF must fail clearly because PDF.js module/worker loading needs local HTTP.
    await page.evalJs("document.getElementById('txViewImportBtn').click(); true");
    await sleep(200);
    await page.evalJs(`
      (() => {
        const file = new File(['%PDF-1.4 synthetic placeholder'], 'synthetic-file-protocol.pdf', { type: 'application/pdf' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('statementFileInput');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
    await page.waitFor("!document.getElementById('statementImportError').classList.contains('hidden')");
    const errorText = await page.evalJs("document.getElementById('statementImportError').textContent");
    assert.ok(/served locally|http:\/\/localhost/i.test(errorText), errorText);
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 13);
    console.log('✓ PDF import under file:// explains the local HTTP requirement without changing data');

    await page.evalJs("document.getElementById('statementCancelBtn').click(); true");
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();

    const runtimeErrors = page.runtimeErrors();
    assert.strictEqual(runtimeErrors.length, 0, `Runtime errors: ${JSON.stringify(runtimeErrors)}`);
    console.log('✓ No runtime exceptions in file-protocol mode');
  } finally {
    await page.close();
  }
};
