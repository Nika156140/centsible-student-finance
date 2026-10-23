'use strict';

const assert = require('assert');
const { sleep } = require('../harness');

module.exports = async function run(context) {
  const page = await context.createPage({
    url: context.pageUrl,
    width: 1440,
    height: 1200
  });

  try {
    const openImporter = async () => {
      await page.evalJs("document.getElementById('tab-transactions').click(); true");
      await sleep(150);
      await page.evalJs("document.getElementById('txViewImportBtn').click(); true");
      await sleep(200);
    };

    const cancelImporter = async () => {
      await page.evalJs("document.getElementById('statementCancelBtn').click(); true");
      await sleep(250);
    };

    const injectFixture = fixture => page.evalJs(`
      (async () => {
        const response = await fetch('/test_fixtures/${fixture}');
        const buffer = await response.arrayBuffer();
        const file = new File([buffer], '${fixture}', { type: 'application/pdf' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('statementFileInput');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.files.length;
      })()
    `);

    const injectFakeLargePdf = () => page.evalJs(`
      (() => {
        const file = new File([new Uint8Array(11 * 1024 * 1024)], 'synthetic-too-large.pdf', { type: 'application/pdf' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('statementFileInput');
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.files.length;
      })()
    `);

    const expectError = async fragment => {
      await page.waitFor("!document.getElementById('statementImportError').classList.contains('hidden')");
      const text = await page.evalJs("document.getElementById('statementImportError').textContent");
      assert.ok(fragment.test(text), `Expected error matching ${fragment}, got: ${text}`);
      return text;
    };

    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");
    const baseline = await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1'))");
    console.log('✓ CSV-era demo baseline loaded');

    // Primary PDF import.
    await openImporter();
    await injectFixture('synthetic-debit-credit.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");

    const pdfMapping = await page.evalJs(`({
      meta: document.getElementById('statementParseMeta').textContent,
      date: document.getElementById('statementDateColumn').value,
      description: document.getElementById('statementDescriptionColumn').value,
      debit: document.getElementById('statementDebitColumn').value,
      credit: document.getElementById('statementCreditColumn').value,
      balance: document.getElementById('statementBalanceColumn').value,
      reference: document.getElementById('statementReferenceColumn').value,
      amountMode: document.getElementById('statementAmountMode').value,
      headerControlHidden: document.getElementById('statementHeaderRowControl').classList.contains('hidden'),
      nextDisabled: document.getElementById('statementNextBtn').disabled
    })`);
    assert.ok(/text-based PDF/i.test(pdfMapping.meta));
    assert.ok(/1 page/i.test(pdfMapping.meta));
    assert.strictEqual(pdfMapping.date, '0');
    assert.strictEqual(pdfMapping.description, '1');
    assert.strictEqual(pdfMapping.debit, '2');
    assert.strictEqual(pdfMapping.credit, '3');
    assert.strictEqual(pdfMapping.balance, '4');
    assert.strictEqual(pdfMapping.reference, '5');
    assert.strictEqual(pdfMapping.amountMode, 'separate');
    assert.strictEqual(pdfMapping.headerControlHidden, true);
    assert.strictEqual(pdfMapping.nextDisabled, false);
    await page.screenshot('round3-pdf-mapping.png');
    console.log('✓ Debit/credit PDF maps into the existing import UI');

    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const pdfPreview = await page.evalJs(`({
      rows: document.querySelectorAll('#statementPreviewBody tr').length,
      invalid: document.querySelectorAll('#statementPreviewBody tr.row-invalid').length,
      duplicates: document.querySelectorAll('#statementPreviewBody tr.row-duplicate').length,
      nextLabel: document.getElementById('statementNextBtn').textContent,
      wrapped: document.getElementById('statementPreviewBody').textContent.includes('with wrapped synthetic description')
    })`);
    assert.strictEqual(pdfPreview.rows, 5);
    assert.strictEqual(pdfPreview.invalid, 0);
    assert.strictEqual(pdfPreview.duplicates, 0);
    assert.strictEqual(pdfPreview.nextLabel, 'Import 5 transactions');
    assert.strictEqual(pdfPreview.wrapped, true);
    await page.screenshot('round3-pdf-preview.png');
    console.log('✓ PDF preview reuses the existing review table and preserves wrapped descriptions');

    await page.evalJs(`
      (() => {
        const select = document.querySelector('.import-category-select[data-index="3"]');
        select.value = 'Shopping';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return select.value;
      })()
    `);

    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("document.getElementById('statementImportModal').classList.contains('hidden')");
    await sleep(300);
    assert.strictEqual(await page.evalJs("document.getElementById('tab-transactions').classList.contains('active')"), true);
    assert.strictEqual(await page.evalJs("document.querySelectorAll('#txFullTableContainer tbody tr').length"), 18);
    assert.ok((await page.evalJs("document.getElementById('toastContainer').textContent")).includes('Imported 5 transactions'));

    const afterPdfImport = await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1'))");
    assert.strictEqual(afterPdfImport.transactions.length, 18);
    assert.strictEqual(afterPdfImport.transactions.filter(transaction => transaction.payment === 'Bank').length, 5);
    assert.ok(afterPdfImport.transactions.some(transaction => transaction.importRef === 'DUP-001'));
    assert.strictEqual(afterPdfImport.transactions.filter(transaction => transaction.desc === 'Campus cafe, lunch').length, 1);
    const edited = afterPdfImport.transactions.find(transaction => transaction.desc.includes('wrapped synthetic description'));
    assert.strictEqual(edited.category, 'Shopping');
    assert.deepStrictEqual(afterPdfImport.budgets, baseline.budgets);
    assert.deepStrictEqual(afterPdfImport.goals, baseline.goals);
    assert.strictEqual(afterPdfImport.baseAllowance, baseline.baseAllowance);
    assert.strictEqual(await page.evalJs("document.getElementById('dashExpenseTotal').textContent"), '₹10,214.50');
    assert.strictEqual(await page.evalJs("document.getElementById('dashIncomeTotal').textContent"), '₹17,000');
    assert.strictEqual(await page.evalJs("document.getElementById('dashRemainingTotal').textContent"), '₹6,785.50');
    await page.screenshot('round3-after-pdf-import.png');
    console.log('✓ PDF import merges into existing state, updates totals, and preserves budgets/goals/allowance');

    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹10,214.50'");
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 18);
    console.log('✓ Imported PDF transactions persist after reload');

    // Re-import duplicates.
    await openImporter();
    await injectFixture('synthetic-debit-credit.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const reimport = await page.evalJs(`({
      duplicates: document.querySelectorAll('#statementPreviewBody tr.row-duplicate').length,
      summary: document.getElementById('statementSummary').textContent,
      nextDisabled: document.getElementById('statementNextBtn').disabled,
      nextLabel: document.getElementById('statementNextBtn').textContent
    })`);
    assert.strictEqual(reimport.duplicates, 5);
    assert.ok(/0 selected/i.test(reimport.summary));
    assert.strictEqual(reimport.nextDisabled, true);
    assert.strictEqual(reimport.nextLabel, 'Import selected transactions');
    await page.screenshot('round3-pdf-reimport-duplicates.png');
    await cancelImporter();
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 18);
    console.log('✓ Re-import flags duplicates; cancel changes no data');

    // Signed amount PDF.
    await openImporter();
    await injectFixture('synthetic-signed-amount.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    assert.strictEqual(await page.evalJs("document.getElementById('statementAmountMode').value"), '');
    assert.strictEqual(await page.evalJs("document.getElementById('statementNextBtn').disabled"), true);
    assert.ok(/interpreted/i.test(await page.evalJs("document.getElementById('statementMapStatus').textContent")));
    await page.evalJs("(() => { const s=document.getElementById('statementAmountMode'); s.value='signed'; s.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await sleep(200);
    assert.strictEqual(await page.evalJs("document.getElementById('statementNextBtn').disabled"), false);
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const signedPreview = await page.evalJs(`({
      rows: document.querySelectorAll('#statementPreviewBody tr').length,
      types: [...document.querySelectorAll('.import-type-select')].map(select => select.value),
      amounts: [...document.querySelectorAll('.import-amount')].map(cell => cell.textContent.trim())
    })`);
    assert.strictEqual(signedPreview.rows, 3);
    assert.deepStrictEqual(signedPreview.types, ['expense', 'income', 'expense']);
    assert.ok(signedPreview.amounts.includes('₹350'));
    assert.ok(signedPreview.amounts.includes('₹1,200.50'));
    await cancelImporter();
    console.log('✓ Single signed amounts require explicit interpretation and preserve negative directions');

    // Unsigned ambiguous PDF.
    await openImporter();
    await injectFixture('synthetic-ambiguous.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    assert.strictEqual(await page.evalJs("document.getElementById('statementAmountMode').value"), '');
    assert.strictEqual(await page.evalJs("document.getElementById('statementNextBtn').disabled"), true);
    await cancelImporter();
    console.log('✓ Unsigned single-amount PDF does not infer income/expense');

    // Dr/Cr indicator PDF.
    await openImporter();
    await injectFixture('synthetic-indicator.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    assert.strictEqual(await page.evalJs("document.getElementById('statementAmountMode').value"), 'indicator');
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const indicatorTypes = await page.evalJs("[...document.querySelectorAll('.import-type-select')].map(select => select.value)");
    assert.deepStrictEqual(indicatorTypes, ['expense', 'income']);
    await cancelImporter();
    console.log('✓ Dr/Cr PDF uses the indicator column instead of guessing');

    // Invalid rows.
    await openImporter();
    await injectFixture('synthetic-invalid.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    await page.evalJs("(() => { const s=document.getElementById('statementAmountMode'); s.value='signed'; s.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await sleep(150);
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const invalidPreview = await page.evalJs(`({
      rows: document.querySelectorAll('#statementPreviewBody tr').length,
      invalid: document.querySelectorAll('#statementPreviewBody tr.row-invalid').length,
      disabledChecks: document.querySelectorAll('.import-row-check:disabled').length,
      nextLabel: document.getElementById('statementNextBtn').textContent
    })`);
    assert.strictEqual(invalidPreview.rows, 3);
    assert.strictEqual(invalidPreview.invalid, 2);
    assert.strictEqual(invalidPreview.disabledChecks, 2);
    assert.strictEqual(invalidPreview.nextLabel, 'Import 1 transaction');
    await cancelImporter();
    console.log('✓ Invalid PDF rows remain visible and unselectable');

    // Multipage and cover page.
    await openImporter();
    await injectFixture('synthetic-multipage.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    assert.ok(/2 pages/i.test(await page.evalJs("document.getElementById('statementParseMeta').textContent")));
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    assert.strictEqual(await page.evalJs("document.querySelectorAll('#statementPreviewBody tr').length"), 4);
    await cancelImporter();

    await openImporter();
    await injectFixture('synthetic-cover-page.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    assert.ok(/before the transaction table was skipped/i.test(await page.evalJs("document.getElementById('statementParseMeta').textContent")));
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    assert.strictEqual(await page.evalJs("document.querySelectorAll('#statementPreviewBody tr').length"), 1);
    await cancelImporter();
    console.log('✓ Multipage PDFs and cover-page PDFs are handled and reported');

    // Error paths.
    await openImporter();
    await injectFixture('synthetic-no-header.pdf');
    await expectError(/recognizable transaction table header/i);
    await cancelImporter();

    await openImporter();
    await injectFixture('synthetic-scanned.pdf');
    await expectError(/OCR is not supported/i);
    await cancelImporter();

    await openImporter();
    await injectFixture('synthetic-encrypted.pdf');
    await expectError(/password-protected|encrypted/i);
    await cancelImporter();

    await openImporter();
    await injectFixture('synthetic-corrupt.pdf');
    await expectError(/could not be read|corrupted|malformed/i);
    await cancelImporter();

    await openImporter();
    await injectFakeLargePdf();
    await expectError(/too large/i);
    await cancelImporter();

    await openImporter();
    await injectFixture('synthetic-many-pages.pdf');
    await expectError(/more than 30 pages/i);
    await cancelImporter();
    console.log('✓ Unsupported, scanned, encrypted, corrupt, oversized, and over-page-limit PDFs fail clearly');

    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 18);

    // CSV regression in the same app build.
    await openImporter();
    await page.evalJs(`
      (() => {
        const csv = 'Date,Narration,Debit,Credit,Ref No\\n02/10/2026,"CSV regression, lunch",123.00,,CSV-001\\n';
        const file = new File([csv], 'synthetic-regression.csv', { type: 'text/csv' });
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
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    assert.strictEqual(await page.evalJs("document.querySelectorAll('#statementPreviewBody tr').length"), 1);
    await cancelImporter();
    console.log('✓ CSV import still works through the same modal after PDF integration');

    // Date & Time multi-line PDF format from a fresh demo state.
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");
    const dateTimeBaseline = await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1'))");

    await openImporter();
    await injectFixture('synthetic-date-time-multiline.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    const dateTimeMapping = await page.evalJs(`({
      meta: document.getElementById('statementParseMeta').textContent,
      date: document.getElementById('statementDateColumn').value,
      description: document.getElementById('statementDescriptionColumn').value,
      amount: document.getElementById('statementAmountColumn').value,
      balance: document.getElementById('statementBalanceColumn').value,
      indicator: document.getElementById('statementIndicatorColumn').value,
      reference: document.getElementById('statementReferenceColumn').value,
      amountMode: document.getElementById('statementAmountMode').value,
      nextDisabled: document.getElementById('statementNextBtn').disabled
    })`);
    assert.ok(/2 pages/i.test(dateTimeMapping.meta));
    assert.strictEqual(dateTimeMapping.date, '0');
    assert.strictEqual(dateTimeMapping.description, '1');
    assert.strictEqual(dateTimeMapping.amount, '2');
    assert.strictEqual(dateTimeMapping.balance, '3');
    assert.strictEqual(dateTimeMapping.indicator, '4');
    assert.strictEqual(dateTimeMapping.reference, '5');
    assert.strictEqual(dateTimeMapping.amountMode, 'indicator');
    assert.strictEqual(dateTimeMapping.nextDisabled, false);
    await page.screenshot('round3-date-time-mapping.png');

    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const dateTimePreview = await page.evalJs(`({
      rows: document.querySelectorAll('#statementPreviewBody tr').length,
      invalid: document.querySelectorAll('#statementPreviewBody tr.row-invalid').length,
      summary: document.getElementById('statementSummary').textContent,
      nextLabel: document.getElementById('statementNextBtn').textContent,
      text: document.getElementById('statementPreviewBody').textContent,
      amounts: [...document.querySelectorAll('.import-amount')].map(cell => cell.textContent.trim())
    })`);
    assert.strictEqual(dateTimePreview.rows, 5);
    assert.strictEqual(dateTimePreview.invalid, 1);
    assert.ok(/4 selected/i.test(dateTimePreview.summary));
    assert.strictEqual(dateTimePreview.nextLabel, 'Import 4 transactions');
    assert.ok(dateTimePreview.text.includes('To UPI/SYNTHETIC CAFE'));
    assert.ok(dateTimePreview.text.includes('Time: 10:42 AM'));
    assert.ok(dateTimePreview.text.includes('UPI ID: synthetic@upi'));
    assert.ok(dateTimePreview.text.includes('Txn ID: SYNTH12345'));
    assert.ok(dateTimePreview.text.includes('SYNTH12345'));
    assert.ok(dateTimePreview.text.includes('From SYNTHETIC EMPLOYER'));
    assert.ok(dateTimePreview.text.includes('SYNTH67890'));
    assert.ok(!/Opening balance|Total Debit|Closing balance 55/i.test(dateTimePreview.text));
    assert.ok(dateTimePreview.amounts.includes('₹1,200'));
    assert.ok(dateTimePreview.amounts.includes('250.00'), 'Ambiguous row amount must remain visible for review');
    await page.screenshot('round3-date-time-preview.png');

    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("document.getElementById('statementImportModal').classList.contains('hidden')");
    await sleep(300);

    const afterDateTimeImport = await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1'))");
    assert.strictEqual(afterDateTimeImport.transactions.length, 17);
    assert.strictEqual(afterDateTimeImport.transactions.filter(transaction => transaction.payment === 'Bank').length, 4);
    const outgoing = afterDateTimeImport.transactions.find(transaction => transaction.importRef === 'SYNTH12345');
    const incoming = afterDateTimeImport.transactions.find(transaction => transaction.importRef === 'SYNTH67890');
    assert.ok(outgoing);
    assert.ok(incoming);
    assert.strictEqual(outgoing.type, 'expense');
    assert.strictEqual(outgoing.amount, 1200);
    assert.strictEqual(incoming.type, 'income');
    assert.strictEqual(incoming.amount, 2000);
    assert.ok(!afterDateTimeImport.transactions.some(transaction => /unknown transfer|Opening balance|Total Debit|Closing balance 55/i.test(transaction.desc)));
    assert.deepStrictEqual(afterDateTimeImport.budgets, dateTimeBaseline.budgets);
    assert.deepStrictEqual(afterDateTimeImport.goals, dateTimeBaseline.goals);
    assert.strictEqual(afterDateTimeImport.baseAllowance, dateTimeBaseline.baseAllowance);
    assert.strictEqual(await page.evalJs("document.getElementById('dashExpenseTotal').textContent"), '₹8,980');
    assert.strictEqual(await page.evalJs("document.getElementById('dashIncomeTotal').textContent"), '₹21,500');
    assert.strictEqual(await page.evalJs("document.getElementById('dashRemainingTotal').textContent"), '₹12,520');
    console.log('✓ Date & Time PDF imports correct To/From types, references, and totals');

    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹8,980'");
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 17);

    await openImporter();
    await injectFixture('synthetic-date-time-multiline.pdf');
    await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
    await page.evalJs("document.getElementById('statementNextBtn').click(); true");
    await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
    const dateTimeReimport = await page.evalJs(`({
      duplicates: document.querySelectorAll('#statementPreviewBody tr.row-duplicate').length,
      selected: document.getElementById('statementSummary').textContent,
      nextDisabled: document.getElementById('statementNextBtn').disabled
    })`);
    assert.strictEqual(dateTimeReimport.duplicates, 4);
    assert.ok(/0 selected/i.test(dateTimeReimport.selected));
    assert.strictEqual(dateTimeReimport.nextDisabled, true);
    await cancelImporter();
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).transactions.length"), 17);
    console.log('✓ Date & Time re-import flags duplicates and cancel preserves data');

    // Restore demo state in this isolated browser profile.
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");

    const externalRequests = page.requests.filter(url =>
      /^https?:\/\//i.test(url) && !url.startsWith(context.origin)
    );
    assert.deepStrictEqual(externalRequests, [], `Unexpected external requests: ${externalRequests.join(', ')}`);
    const runtimeErrors = page.runtimeErrors();
    assert.strictEqual(runtimeErrors.length, 0, `Runtime errors: ${JSON.stringify(runtimeErrors)}`);
    console.log('✓ No external requests and no runtime errors');
  } finally {
    await page.close();
  }
};
