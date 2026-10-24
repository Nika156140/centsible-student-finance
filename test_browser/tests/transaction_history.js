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
    const openTransactions = async () => {
      await page.evalJs("document.getElementById('tab-transactions').click(); true");
      await sleep(150);
    };

    const openImporter = async () => {
      await openTransactions();
      await page.evalJs("document.getElementById('txViewImportBtn').click(); true");
      await page.waitFor("!document.getElementById('statementImportModal').classList.contains('hidden')");
      await sleep(100);
    };

    const injectCsv = async csvText => {
      await page.evalJs(`
        (() => {
          const file = new File([${JSON.stringify(csvText)}], 'synthetic-history.csv', { type: 'text/csv' });
          const dt = new DataTransfer();
          dt.items.add(file);
          const input = document.getElementById('statementFileInput');
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()
      `);
    };

    const injectPdf = async fixture => {
      await page.evalJs(`
        (async () => {
          const response = await fetch('/test_fixtures/${fixture}');
          const buffer = await response.arrayBuffer();
          const file = new File([buffer], '${fixture}', { type: 'application/pdf' });
          const dt = new DataTransfer();
          dt.items.add(file);
          const input = document.getElementById('statementFileInput');
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        })()
      `);
    };

    const completeImport = async () => {
      await page.waitFor("!document.getElementById('statementMappingStep').classList.contains('hidden')");
      await page.waitFor("!document.getElementById('statementNextBtn').disabled");
      await page.evalJs("document.getElementById('statementNextBtn').click(); true");
      await page.waitFor("!document.getElementById('statementPreviewStep').classList.contains('hidden')");
      await page.waitFor("!document.getElementById('statementNextBtn').disabled");
      await page.evalJs("document.getElementById('statementNextBtn').click(); true");
      await page.waitFor("document.getElementById('statementImportModal').classList.contains('hidden')");
      await sleep(300);
    };

    const setSelect = async (id, value) => {
      await page.evalJs(`
        (() => {
          const select = document.getElementById(${JSON.stringify(id)});
          select.value = ${JSON.stringify(value)};
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return select.value;
        })()
      `);
      await sleep(100);
    };

    const setSearch = async value => {
      await page.evalJs(`
        (() => {
          const input = document.getElementById('txSearchInput');
          input.value = ${JSON.stringify(value)};
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return input.value;
        })()
      `);
      await sleep(100);
    };

    const snapshot = () => page.evalJs(`
      ({
        month: document.getElementById('txMonthFilter').value,
        monthOptions: [...document.getElementById('txMonthFilter').options].map(option => ({
          value: option.value,
          label: option.textContent.trim()
        })),
        countText: document.getElementById('txFilteredCount').textContent,
        rowCount: document.querySelectorAll('#txFullTableContainer tbody tr').length,
        descriptions: [...document.querySelectorAll('#txFullTableContainer tbody .tx-desc-title')]
          .map(element => element.textContent.trim()),
        tableText: document.getElementById('txFullTableContainer').textContent
      })
    `);

    const expectedDescriptions = month => {
      const filterExpression = month === 'all'
        ? 'true'
        : `t.date && t.date.slice(0, 7) === ${JSON.stringify(month)}`;
      return page.evalJs(`
        (() => {
          const transactions = JSON.parse(localStorage.getItem('centsible_state_v1')).transactions;
          return transactions
            .filter(t => ${filterExpression})
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(t => t.desc);
        })()
      `);
    };

    const expectedCount = month => page.evalJs(`
      (() => {
        const transactions = JSON.parse(localStorage.getItem('centsible_state_v1')).transactions;
        return ${month === 'all'
          ? 'transactions.length'
          : `transactions.filter(t => t.date && t.date.slice(0, 7) === ${JSON.stringify(month)}).length`};
      })()
    `);

    // Start from the clean demo state, then add manual records in two other months.
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");

    const seededCount = await page.evalJs(`
      (() => {
        const key = 'centsible_state_v1';
        const seeded = JSON.parse(localStorage.getItem(key));
        seeded.transactions.push(
          {
            id: 'tx-manual-sep',
            type: 'expense',
            amount: 321,
            date: '2026-09-15',
            category: 'Travel',
            desc: 'Manual September metro',
            payment: 'Cash'
          },
          {
            id: 'tx-manual-aug',
            type: 'income',
            amount: 1500,
            date: '2026-08-05',
            category: 'Freelance',
            desc: 'Manual August stipend',
            payment: 'UPI'
          }
        );
        localStorage.setItem(key, JSON.stringify(seeded));
        return seeded.transactions.length;
      })()
    `);
    assert.strictEqual(seededCount, 15);
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");

    await openTransactions();
    await page.waitFor("document.getElementById('txMonthFilter') && document.querySelectorAll('#txFullTableContainer tbody tr').length > 0");

    const initial = await snapshot();
    assert.strictEqual(initial.month, 'all', 'Transactions must default to All time');
    assert.strictEqual(initial.rowCount, seededCount, 'All time must show every stored transaction');
    assert.deepStrictEqual(initial.descriptions, await expectedDescriptions('all'));
    assert.ok(initial.monthOptions.some(option => option.value === '2026-10'));
    assert.ok(initial.monthOptions.some(option => option.value === '2026-09'));
    assert.ok(initial.monthOptions.some(option => option.value === '2026-08'));
    assert.ok(/across all time/i.test(initial.countText));
    await page.screenshot('transaction-history-all-time.png');
    console.log('✓ Transactions from several months appear under All time by default, newest first');

    const dashboardBeforeFilters = await page.evalJs("document.getElementById('dashExpenseTotal').textContent");

    await setSelect('txMonthFilter', '2026-09');
    const september = await snapshot();
    assert.strictEqual(september.month, '2026-09');
    assert.strictEqual(september.rowCount, await expectedCount('2026-09'));
    assert.deepStrictEqual(september.descriptions, ['Manual September metro']);
    assert.ok(/September 2026/.test(september.countText));
    await page.screenshot('transaction-history-september.png');
    console.log('✓ Selecting one month shows only that month');

    await setSearch('metro');
    const septemberSearch = await snapshot();
    assert.strictEqual(septemberSearch.rowCount, 1);
    assert.ok(septemberSearch.tableText.includes('Manual September metro'));

    await setSearch('');
    await setSelect('txCategoryFilter', 'Travel');
    const septemberTravel = await snapshot();
    assert.strictEqual(septemberTravel.rowCount, 1);
    assert.deepStrictEqual(septemberTravel.descriptions, ['Manual September metro']);

    await setSelect('txMonthFilter', 'all');
    const allTravel = await snapshot();
    const expectedTravel = await page.evalJs(`
      JSON.parse(localStorage.getItem('centsible_state_v1')).transactions
        .filter(transaction => transaction.category === 'Travel').length
    `);
    assert.strictEqual(allTravel.rowCount, expectedTravel);
    assert.ok(allTravel.descriptions.includes('Manual September metro'));

    await page.evalJs("window.CentsibleApp.resetTxFilters(); true");
    await sleep(100);
    await setSelect('txTypeFilter', 'income');
    const allIncome = await snapshot();
    const expectedIncome = await page.evalJs(`
      JSON.parse(localStorage.getItem('centsible_state_v1')).transactions
        .filter(transaction => transaction.type === 'income').length
    `);
    assert.strictEqual(allIncome.rowCount, expectedIncome);
    assert.ok(allIncome.descriptions.includes('Manual August stipend'));
    assert.ok(!allIncome.descriptions.includes('Manual September metro'));

    await page.evalJs("window.CentsibleApp.resetTxFilters(); true");
    await sleep(100);
    assert.strictEqual(
      await page.evalJs("document.getElementById('dashExpenseTotal').textContent"),
      dashboardBeforeFilters,
      'Transaction filters must not change dashboard calculations'
    );
    console.log('✓ Search, category, and type filters work in monthly and All time views');

    const csvText = 'Date,Narration,Debit,Credit,Ref No\n15/07/2026,"CSV July purchase",777.00,,CSV-JUL-1\n';
    await openImporter();
    await injectCsv(csvText);
    await completeImport();

    const afterCsvState = await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1'))");
    assert.ok(afterCsvState.transactions.some(transaction => transaction.importRef === 'CSV-JUL-1'));
    const afterCsv = await snapshot();
    assert.strictEqual(afterCsv.month, 'all');
    assert.strictEqual(afterCsv.rowCount, await expectedCount('all'));
    assert.ok(afterCsv.tableText.includes('CSV July purchase'));
    assert.ok(afterCsv.monthOptions.some(option => option.value === '2026-07'));

    await openImporter();
    await injectPdf('synthetic-date-time-multiline.pdf');
    await completeImport();

    const afterPdfState = await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1'))");
    assert.ok(afterPdfState.transactions.some(transaction => transaction.importRef === 'SYNTH12345'));
    const afterPdf = await snapshot();
    assert.strictEqual(afterPdf.month, 'all');
    assert.strictEqual(afterPdf.rowCount, await expectedCount('all'));
    assert.ok(afterPdf.tableText.includes('SYNTHETIC CAFE'));
    assert.ok(afterPdf.tableText.includes('CSV July purchase'));
    console.log('✓ CSV- and PDF-imported transactions appear alongside manual transactions');

    await setSelect('txMonthFilter', '2026-07');
    const july = await snapshot();
    assert.strictEqual(july.rowCount, 1);
    assert.deepStrictEqual(july.descriptions, ['CSV July purchase']);
    assert.ok(/July 2026/.test(july.countText));

    await setSelect('txMonthFilter', '2026-10');
    const october = await snapshot();
    assert.strictEqual(october.rowCount, await expectedCount('2026-10'));
    assert.deepStrictEqual(october.descriptions, await expectedDescriptions('2026-10'));
    assert.ok(october.tableText.includes('SYNTHETIC CAFE'));
    assert.ok(!october.tableText.includes('CSV July purchase'));

    await setSearch('SYNTHETIC');
    const octoberSearch = await snapshot();
    const expectedPdfSearch = await page.evalJs(`
      JSON.parse(localStorage.getItem('centsible_state_v1')).transactions
        .filter(transaction => transaction.date && transaction.date.startsWith('2026-10'))
        .filter(transaction => {
          const haystack = [transaction.desc, transaction.category, transaction.payment].join(' ').toLowerCase();
          return haystack.includes('synthetic');
        }).length
    `);
    assert.strictEqual(octoberSearch.rowCount, expectedPdfSearch);
    assert.ok(expectedPdfSearch >= 4);

    await setSearch('');
    await setSelect('txMonthFilter', 'all');
    const restored = await snapshot();
    assert.strictEqual(restored.rowCount, await expectedCount('all'));
    assert.deepStrictEqual(restored.descriptions, await expectedDescriptions('all'));
    assert.ok(restored.tableText.includes('CSV July purchase'));
    assert.ok(restored.tableText.includes('SYNTHETIC CAFE'));
    await page.screenshot('transaction-history-imported-all-time.png');

    await setSearch('CSV July purchase');
    const csvSearch = await snapshot();
    assert.strictEqual(csvSearch.rowCount, 1);
    assert.ok(csvSearch.tableText.includes('CSV July purchase'));
    await setSearch('');
    console.log('✓ Monthly selection and All time both work after CSV/PDF imports');

    const stateKeys = await page.evalJs("Object.keys(JSON.parse(localStorage.getItem('centsible_state_v1'))).sort()");
    assert.deepStrictEqual(stateKeys, ['baseAllowance', 'budgets', 'goals', 'transactions', 'version']);
    assert.strictEqual(await page.evalJs("JSON.parse(localStorage.getItem('centsible_state_v1')).version"), 1);

    const externalRequests = page.requests.filter(url =>
      /^https?:\/\//i.test(url) && !url.startsWith(context.origin)
    );
    assert.deepStrictEqual(externalRequests, [], `Unexpected external requests: ${externalRequests.join(', ')}`);
    const runtimeErrors = page.runtimeErrors();
    assert.strictEqual(runtimeErrors.length, 0, `Runtime errors: ${JSON.stringify(runtimeErrors)}`);
    console.log('✓ localStorage schema unchanged; no external requests or runtime errors');

    // Restore the demo state for any later test group using this browser profile.
    await page.evalJs("localStorage.removeItem('centsible_state_v1'); true");
    await page.reload();
    await page.waitFor("document.getElementById('dashExpenseTotal')?.textContent === '₹7,380'");
  } finally {
    await page.close();
  }
};
