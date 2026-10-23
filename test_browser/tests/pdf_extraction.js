'use strict';

const assert = require('assert');

module.exports = async function run(context) {
  const page = await context.createPage({
    url: context.pageUrl,
    width: 1440,
    height: 1200
  });

  try {
    await page.waitFor('window.CentsibleStatementImport && window.CentsibleStatementPdf');

    const extract = fixture => page.evalJs(`
      (async () => {
        const response = await fetch('/test_fixtures/${fixture}');
        const buffer = await response.arrayBuffer();
        return window.CentsibleStatementPdf.extractPdfStatement(buffer);
      })()
    `);

    console.log('✓ statement_import.js and statement_pdf.js are loaded in the app');

    const debitCredit = await extract('synthetic-debit-credit.pdf');
    assert.strictEqual(debitCredit.ok, true, JSON.stringify(debitCredit));
    assert.strictEqual(debitCredit.pageCount, 1);
    assert.strictEqual(debitCredit.headerRowIndex, 0);
    assert.strictEqual(debitCredit.rows.length, 6, 'Header + five transaction rows expected');
    assert.ok(debitCredit.headers.includes('Debit'));
    assert.ok(debitCredit.headers.includes('Credit'));
    assert.ok(debitCredit.headers.includes('Ref No'));
    const wrappedRow = debitCredit.rows.find(row => row.join(' ').includes('Synthetic online course purchase'));
    assert.ok(wrappedRow, 'Wrapped-description row must exist');
    assert.ok(wrappedRow.join(' ').includes('with wrapped synthetic description'), 'Wrapped description must be appended');
    console.log('✓ Single-page debit/credit PDF extracts headers, rows, references, Indian commas, and wrapped description');

    const signed = await extract('synthetic-signed-amount.pdf');
    assert.strictEqual(signed.ok, true, JSON.stringify(signed));
    assert.strictEqual(signed.rows.length, 4);
    assert.ok(signed.rows.some(row => row.join(' ').includes('-1,200.50')), 'Negative amount must be preserved');
    console.log('✓ Signed-amount PDF preserves negative amounts and a single amount column');

    const indicator = await extract('synthetic-indicator.pdf');
    assert.strictEqual(indicator.ok, true, JSON.stringify(indicator));
    assert.ok(indicator.headers.includes('Dr/Cr'));
    assert.strictEqual(indicator.rows.length, 3);
    console.log('✓ Dr/Cr indicator PDF preserves the indicator column');

    const ambiguous = await extract('synthetic-ambiguous.pdf');
    assert.strictEqual(ambiguous.ok, true, JSON.stringify(ambiguous));
    assert.strictEqual(ambiguous.rows.length, 2);
    assert.ok(ambiguous.headers.includes('Amount'));
    assert.ok(!ambiguous.headers.some(header => /debit|credit|dr/i.test(header)), 'Ambiguous fixture must not contain direction columns');
    console.log('✓ Unsigned single-amount PDF extracts without inventing direction');

    const invalid = await extract('synthetic-invalid.pdf');
    assert.strictEqual(invalid.ok, true, JSON.stringify(invalid));
    assert.strictEqual(invalid.rows.length, 4);
    console.log('✓ Invalid-row PDF is extracted for preview validation');

    const multipage = await extract('synthetic-multipage.pdf');
    assert.strictEqual(multipage.ok, true, JSON.stringify(multipage));
    assert.strictEqual(multipage.pageCount, 2);
    assert.strictEqual(multipage.rows.length, 5, 'Header + four rows across two pages');
    assert.ok(multipage.rows.some(row => row.join(' ').includes('Synthetic page one lunch')));
    assert.ok(multipage.rows.some(row => row.join(' ').includes('Synthetic page two book')));
    console.log('✓ Multipage PDF skips repeated headers and combines rows');

    const cover = await extract('synthetic-cover-page.pdf');
    assert.strictEqual(cover.ok, true, JSON.stringify(cover));
    assert.strictEqual(cover.pageCount, 2);
    assert.strictEqual(cover.rows.length, 2, 'Header + one row after cover page');
    assert.ok(cover.warnings.some(warning => /before the transaction table/i.test(warning)));
    console.log('✓ Cover-page PDF finds the later table and reports skipped content');

    const dateTime = await extract('synthetic-date-time-multiline.pdf');
    assert.strictEqual(dateTime.ok, true, JSON.stringify(dateTime));
    assert.strictEqual(dateTime.pageCount, 2);
    assert.deepStrictEqual(dateTime.headers, [
      'Date', 'Description', 'Amount', 'Closing Balance', 'Transaction Type', 'Reference'
    ]);
    assert.strictEqual(dateTime.rows.length, 6, 'Header plus five Date & Time rows expected');
    assert.strictEqual(dateTime.rows[1][4], 'DR');
    assert.strictEqual(dateTime.rows[1][5], 'SYNTH12345');
    assert.ok(dateTime.rows[1][1].includes('To UPI/SYNTHETIC CAFE'));
    assert.ok(dateTime.rows[1][1].includes('Time: 10:42 AM'));
    assert.ok(dateTime.rows[1][1].includes('UPI ID: synthetic@upi'));
    assert.ok(dateTime.rows[1][1].includes('Txn ID: SYNTH12345'));
    assert.ok(dateTime.rows[1][1].includes('UTR: 123456789012'));
    assert.strictEqual(dateTime.rows[2][4], 'CR');
    assert.strictEqual(dateTime.rows[3][3], '', 'Missing closing balance must remain blank');
    assert.strictEqual(dateTime.rows[4][4], '', 'Unknown prefix must remain ambiguous');
    assert.strictEqual(dateTime.rows[5][4], 'CR');
    assert.strictEqual(dateTime.rows[5][5], 'SYNTH67890');
    assert.ok(!dateTime.rows.some(row => /Opening balance|Total Debit|Closing balance 55/i.test(row.join(' '))));
    console.log('✓ Date & Time multi-line PDF combines time/metadata, resolves To/From, and preserves references');

    const noHeader = await extract('synthetic-no-header.pdf');
    assert.strictEqual(noHeader.ok, false);
    assert.strictEqual(noHeader.code, 'unsupported-layout');
    console.log('✓ PDF without a recognizable table header is rejected');

    const scanned = await extract('synthetic-scanned.pdf');
    assert.strictEqual(scanned.ok, false);
    assert.strictEqual(scanned.code, 'scanned');
    assert.ok(/OCR is not supported/i.test(scanned.error));
    console.log('✓ Image-only/blank PDF is rejected without claiming OCR');

    const encrypted = await extract('synthetic-encrypted.pdf');
    assert.strictEqual(encrypted.ok, false);
    assert.strictEqual(encrypted.code, 'encrypted', JSON.stringify(encrypted));
    assert.ok(/password-protected|encrypted/i.test(encrypted.error));
    console.log('✓ Password-protected PDF fails gracefully');

    const corrupt = await extract('synthetic-corrupt.pdf');
    assert.strictEqual(corrupt.ok, false);
    assert.ok(['invalid-pdf', 'extract-failed'].includes(corrupt.code), JSON.stringify(corrupt));
    console.log('✓ Corrupt PDF fails gracefully');

    const externalRequests = page.requests.filter(url =>
      /^https?:\/\//i.test(url) && !url.startsWith(context.origin)
    );
    assert.deepStrictEqual(externalRequests, [], `Unexpected external requests: ${externalRequests.join(', ')}`);
    assert.ok(page.requests.some(url => url.includes('/vendor/pdfjs/pdf.min.mjs')), 'PDF.js module must be requested locally');
    assert.ok(page.requests.some(url => url.includes('/vendor/pdfjs/pdf.worker.min.mjs')), 'PDF.js worker must be requested locally');
    console.log('✓ PDF.js module and worker loaded locally; no external requests');

    const runtimeErrors = page.runtimeErrors();
    assert.strictEqual(runtimeErrors.length, 0, `Runtime errors: ${JSON.stringify(runtimeErrors)}`);
    console.log('✓ No runtime exceptions');
  } finally {
    await page.close();
  }
};
