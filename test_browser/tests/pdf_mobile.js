'use strict';

const assert = require('assert');
const { sleep } = require('../harness');

module.exports = async function run(context) {
  const page = await context.createPage({
    url: context.pageUrl,
    width: 390,
    height: 844,
    mobile: true
  });

  try {
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");

    await page.evalJs("document.getElementById('tab-transactions').click(); true");
    await sleep(120);
    await page.evalJs("document.getElementById('txViewImportBtn').click(); true");
    await sleep(200);
    await page.evalJs(`
      (async () => {
        const response = await fetch('/test_fixtures/synthetic-debit-credit.pdf');
        const buffer = await response.arrayBuffer();
        const file = new File([buffer], 'synthetic-mobile.pdf', { type: 'application/pdf' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('statementFileInput');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    await page.screenshot('round3-pdf-mobile-mapping.png');

    const layoutMapping = await page.evalJs(`({
      bodyScrollWidth: document.body.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      modalWidth: document.querySelector('#statementImportModal .modal-dialog').getBoundingClientRect().width,
      viewportWidth: window.innerWidth
    })`);
    assert.ok(layoutMapping.bodyScrollWidth <= layoutMapping.docClientWidth, 'Body must not overflow horizontally');
    assert.ok(layoutMapping.modalWidth <= layoutMapping.viewportWidth, 'Modal must fit the viewport');

    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    await page.screenshot('round3-pdf-mobile-preview.png');

    const previewScrolls = await page.evalJs(`(() => {
      const wrap = document.querySelector('.import-preview-wrap');
      return wrap.scrollWidth > wrap.clientWidth;
    })()`);
    assert.strictEqual(previewScrolls, true, 'Wide preview must scroll inside its container on mobile');

    await page.evalJs("document.getElementById('statementCancelBtn').click(); true");
    await sleep(200);
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 13);

    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    console.log('✓ Mobile PDF mapping and preview remain usable at 390px');
  } finally {
    await page.close();
  }
};
