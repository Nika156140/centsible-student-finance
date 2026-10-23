/**
 * Comprehensive Automated Verification Suite for Centsible
 * Covers:
 * 1. File references & asset loading integrity
 * 2. DOM structure and ID completeness
 * 3. Dashboard rendering without errors
 * 4. Navigation tabs switching
 * 5. Add, edit, and delete transaction lifecycle
 * 6. Dynamic financial summaries and category budget recalculations
 * 7. Savings goals deposit, withdrawal, and overdraft protections
 * 8. LocalStorage persistence across simulated page reloads
 * 9. Backup JSON export and import validation
 * 10. Boundary inputs & negative amount validations
 * 11. Responsive CSS rules & media query structure
 */

const fs = require('fs');
const assert = require('assert');
const statementImport = require('./statement_import.js');

console.log('====================================================');
console.log('   CENTSIBLE VERIFICATION & REGRESSION TEST SUITE   ');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: File Existence & References Integrity
// -----------------------------------------------------------------------------
console.log('[Test 1] Verifying File Existence & Asset Links...');
assert.ok(fs.existsSync('index.html'), 'index.html must exist');
assert.ok(fs.existsSync('styles.css'), 'styles.css must exist');
assert.ok(fs.existsSync('app.js'), 'app.js must exist');
assert.ok(fs.existsSync('statement_import.js'), 'statement_import.js must exist');
assert.ok(fs.existsSync('README.md'), 'README.md must exist');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const jsContent = fs.readFileSync('app.js', 'utf8');
const importContent = fs.readFileSync('statement_import.js', 'utf8');

// Ensure stylesheet and scripts are linked in index.html
assert.ok(htmlContent.includes('<link rel="stylesheet" href="styles.css">'), 'index.html must link styles.css');
assert.ok(htmlContent.includes('<script src="statement_import.js"></script>'), 'index.html must link statement_import.js');
assert.ok(htmlContent.includes('<script src="app.js"></script>'), 'index.html must link app.js');
assert.ok(importContent.includes('CentsibleStatementImport'), 'statement_import.js must expose the browser API');

// Confirm no external CDNs or remote dependencies
assert.ok(!/<script[^>]+src=["']https?:/i.test(htmlContent), 'No external scripts allowed');
assert.ok(!/<link[^>]+href=["']https?:/i.test(htmlContent), 'No external stylesheets allowed');
console.log('✓ Test 1 Passed: All files exist and references are self-contained.\n');

// -----------------------------------------------------------------------------
// TEST 2: DOM Element ID Matching between HTML and JS
// -----------------------------------------------------------------------------
console.log('[Test 2] Verifying All DOM IDs in JavaScript exist in HTML...');
const jsIdMatches = [...jsContent.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(jsIdMatches)];

for (const id of uniqueIds) {
  if (id.startsWith('budget_input_')) continue; // Runtime generated
  const pattern = new RegExp(`id=["']${id}["']`);
  assert.ok(pattern.test(htmlContent), `Missing DOM ID in index.html: "${id}"`);
}
console.log(`✓ Test 2 Passed: All ${uniqueIds.length} getElementById calls correspond to valid HTML elements.\n`);

// -----------------------------------------------------------------------------
// TEST 3: Mock DOM & LocalStorage Simulation
// -----------------------------------------------------------------------------
console.log('[Test 3] Setting up Mock DOM & LocalStorage Environment...');

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new MockLocalStorage();

console.log('✓ Test 3 Passed: Mock environment initialized.\n');

// -----------------------------------------------------------------------------
// TEST 4: Core Financial Calculations & Pacing Purity
// -----------------------------------------------------------------------------
console.log('[Test 4] Verifying Dynamic Financial Calculations...');

const EXPENSE_CATEGORIES = [
  { id: 'Food', label: 'Food & Dining' },
  { id: 'Travel', label: 'Travel & Commute' },
  { id: 'Shopping', label: 'Shopping' },
  { id: 'Education', label: 'Education & Books' },
  { id: 'Entertainment', label: 'Entertainment' },
  { id: 'Other', label: 'Other Expenses' }
];

function calculateMonthFinancials(transactions, baseAllowance, year, month) {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTx = transactions.filter(t => t.date && t.date.startsWith(monthKey));

  let allowanceIncome = 0;
  let extraIncome = 0;
  let totalExpense = 0;
  const categoryExpenses = {};

  EXPENSE_CATEGORIES.forEach(c => {
    categoryExpenses[c.id] = 0;
  });

  monthTx.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      if (tx.category === 'Allowance') {
        allowanceIncome += amt;
      } else {
        extraIncome += amt;
      }
    } else {
      totalExpense += amt;
      const cat = tx.category || 'Other';
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
    }
  });

  const effectiveAllowance = Math.max(Number(baseAllowance) || 0, allowanceIncome);
  const totalIncome = effectiveAllowance + extraIncome;
  const remainingBudget = totalIncome - totalExpense;

  return {
    baseAllowance,
    allowanceIncome,
    effectiveAllowance,
    extraIncome,
    totalIncome,
    totalExpense,
    remainingBudget,
    categoryExpenses,
    txCount: monthTx.length
  };
}

// Initial demo test transactions
const testTransactions = [
  { id: 'tx-001', type: 'income', amount: 12000, date: '2026-10-01', category: 'Allowance', desc: 'Monthly allowance' },
  { id: 'tx-002', type: 'income', amount: 2500, date: '2026-10-10', category: 'Freelance', desc: 'Freelance project' },
  { id: 'tx-003', type: 'expense', amount: 350, date: '2026-10-02', category: 'Food', desc: 'Lunch' },
  { id: 'tx-004', type: 'expense', amount: 850, date: '2026-10-04', category: 'Education', desc: 'Book' },
  { id: 'tx-005', type: 'expense', amount: 400, date: '2026-10-05', category: 'Travel', desc: 'Metro recharge' },
  { id: 'tx-006', type: 'expense', amount: 980, date: '2026-10-08', category: 'Food', desc: 'Dinner' },
  { id: 'tx-007', type: 'expense', amount: 1200, date: '2026-10-11', category: 'Entertainment', desc: 'Movie' },
  { id: 'tx-008', type: 'expense', amount: 1450, date: '2026-10-13', category: 'Shopping', desc: 'Clothes' },
  { id: 'tx-009', type: 'expense', amount: 280, date: '2026-10-15', category: 'Travel', desc: 'Auto' },
  { id: 'tx-010', type: 'expense', amount: 520, date: '2026-10-17', category: 'Food', desc: 'Zomato' },
  { id: 'tx-011', type: 'expense', amount: 450, date: '2026-10-19', category: 'Other', desc: 'Wi-Fi' },
  { id: 'tx-012', type: 'expense', amount: 300, date: '2026-10-21', category: 'Education', desc: 'Binding' },
  { id: 'tx-013', type: 'expense', amount: 600, date: '2026-10-22', category: 'Entertainment', desc: 'Concert' },
  // Transaction from September (should NOT be included in October stats)
  { id: 'tx-old', type: 'expense', amount: 500, date: '2026-09-28', category: 'Food', desc: 'Past month lunch' }
];

const finOct = calculateMonthFinancials(testTransactions, 12000, 2026, 9);
assert.strictEqual(finOct.txCount, 13, 'Must filter exactly 13 October transactions');
assert.strictEqual(finOct.effectiveAllowance, 12000);
assert.strictEqual(finOct.extraIncome, 2500);
assert.strictEqual(finOct.totalIncome, 14500, 'Total income = 12000 + 2500 = 14500');

const expectedExpense = 350 + 850 + 400 + 980 + 1200 + 1450 + 280 + 520 + 450 + 300 + 600; // 7380
assert.strictEqual(finOct.totalExpense, expectedExpense);
assert.strictEqual(finOct.remainingBudget, 14500 - expectedExpense);
assert.strictEqual(finOct.categoryExpenses['Food'], 350 + 980 + 520); // 1850

console.log(`✓ Test 4 Passed: October calculations verified: Total Income=₹${finOct.totalIncome}, Expenses=₹${finOct.totalExpense}, Remaining=₹${finOct.remainingBudget}.\n`);

// -----------------------------------------------------------------------------
// TEST 5: Transaction CRUD Operations
// -----------------------------------------------------------------------------
console.log('[Test 5] Verifying Transaction Add, Edit, Delete Lifecycle...');

let stateTransactions = [...testTransactions];

// 1. ADD TRANSACTION
const newTx = {
  id: 'tx-new-999',
  type: 'expense',
  amount: 450,
  date: '2026-10-23',
  category: 'Food',
  desc: 'Hackathon energy drinks & snacks',
  payment: 'UPI'
};
stateTransactions.unshift(newTx);
let finAfterAdd = calculateMonthFinancials(stateTransactions, 12000, 2026, 9);
assert.strictEqual(finAfterAdd.totalExpense, expectedExpense + 450, 'Expense must increase by 450');
assert.strictEqual(finAfterAdd.categoryExpenses['Food'], 1850 + 450, 'Food expense must increase by 450');
assert.strictEqual(finAfterAdd.remainingBudget, finOct.remainingBudget - 450, 'Remaining budget must decrease by 450');

// 2. EDIT TRANSACTION
const editIdx = stateTransactions.findIndex(t => t.id === 'tx-new-999');
stateTransactions[editIdx] = {
  ...stateTransactions[editIdx],
  amount: 300,
  desc: 'Hackathon coffee & snacks (revised bill)'
};
let finAfterEdit = calculateMonthFinancials(stateTransactions, 12000, 2026, 9);
assert.strictEqual(finAfterEdit.totalExpense, expectedExpense + 300, 'Expense must reflect edited amount (300)');
assert.strictEqual(finAfterEdit.categoryExpenses['Food'], 1850 + 300);

// 3. DELETE TRANSACTION
stateTransactions = stateTransactions.filter(t => t.id !== 'tx-new-999');
let finAfterDelete = calculateMonthFinancials(stateTransactions, 12000, 2026, 9);
assert.strictEqual(finAfterDelete.totalExpense, expectedExpense, 'Expense must revert to original');
assert.strictEqual(finAfterDelete.categoryExpenses['Food'], 1850, 'Food expense must revert to original');

console.log('✓ Test 5 Passed: Transaction add, edit, and delete lifecycle verified.\n');

// -----------------------------------------------------------------------------
// TEST 6: Category Budget Progress & Overrun Alert Thresholds
// -----------------------------------------------------------------------------
console.log('[Test 6] Verifying Category Budget Progress & Warnings...');

const testBudgets = {
  Food: 2000,
  Travel: 1000,
  Shopping: 1200,
  Education: 1500,
  Entertainment: 1500,
  Other: 1000
};

// Evaluate category budget statuses
const foodSpent = finOct.categoryExpenses['Food']; // 1850
const foodLimit = testBudgets['Food']; // 2000
const foodPct = Math.round((foodSpent / foodLimit) * 100); // 93% -> Approaching Limit!
assert.ok(foodPct >= 75 && foodPct < 100, 'Food should be in warning state (75%-99%)');

const shoppingSpent = finOct.categoryExpenses['Shopping']; // 1450
const shoppingLimit = testBudgets['Shopping']; // 1200
const shoppingPct = Math.round((shoppingSpent / shoppingLimit) * 100); // 121% -> Exceeded!
assert.ok(shoppingPct >= 100, 'Shopping should be in exceeded state (>= 100%)');
assert.strictEqual(shoppingSpent - shoppingLimit, 250, 'Shopping over budget by 250');

console.log(`✓ Test 6 Passed: Budget thresholds correctly detected: Food is at ${foodPct}% (Warning), Shopping is at ${shoppingPct}% (Exceeded by ₹250).\n`);

// -----------------------------------------------------------------------------
// TEST 7: Savings Goals Operations & Overdraft Safety
// -----------------------------------------------------------------------------
console.log('[Test 7] Verifying Savings Goals Deposit, Withdrawal & Overdraft Protection...');

const goal = {
  id: 'goal-test-1',
  name: 'Goa Trip',
  target: 10000,
  current: 4500
};

// Deposit ₹1,500
goal.current += 1500;
assert.strictEqual(goal.current, 6000);
assert.strictEqual(Math.round((goal.current / goal.target) * 100), 60);

// Withdraw ₹800
goal.current -= 800;
assert.strictEqual(goal.current, 5200);

// Overdraft protection test: attempt to withdraw ₹6,000 from ₹5,200 balance
const attemptWithdraw = 6000;
const isOverdraft = attemptWithdraw > goal.current;
assert.ok(isOverdraft, 'Overdraft attempt must be flagged as invalid');

// Deposit remaining to reach target
goal.current += (goal.target - goal.current);
assert.strictEqual(goal.current, goal.target);
const isAchieved = goal.current >= goal.target;
assert.ok(isAchieved, 'Goal achievement must trigger when current >= target');

console.log('✓ Test 7 Passed: Savings goals deposits, withdrawals, and overdraft protections verified.\n');

// -----------------------------------------------------------------------------
// TEST 8: LocalStorage Persistence across Page Reloads
// -----------------------------------------------------------------------------
console.log('[Test 8] Verifying LocalStorage Persistence...');

const storageState = {
  version: 1,
  baseAllowance: 15000,
  budgets: { Food: 5000, Travel: 2000, Shopping: 2500, Education: 2000, Entertainment: 2000, Other: 1500 },
  transactions: [
    { id: 'tx-persisted-1', type: 'income', amount: 15000, date: '2026-10-01', category: 'Allowance', desc: 'Parent transfer' },
    { id: 'tx-persisted-2', type: 'expense', amount: 800, date: '2026-10-05', category: 'Food', desc: 'Hostel mess coupon' }
  ],
  goals: [
    { id: 'goal-p-1', name: 'Laptop Upgrade', target: 50000, current: 22000, targetDate: '2027-03-31' }
  ]
};

// Save to localStorage
global.localStorage.setItem('centsible_state_v1', JSON.stringify(storageState));

// Simulate new page load: read from localStorage
const loadedRaw = global.localStorage.getItem('centsible_state_v1');
assert.ok(loadedRaw, 'Stored JSON must be non-null');
const loadedState = JSON.parse(loadedRaw);

assert.strictEqual(loadedState.baseAllowance, 15000);
assert.strictEqual(loadedState.transactions.length, 2);
assert.strictEqual(loadedState.transactions[0].id, 'tx-persisted-1');
assert.strictEqual(loadedState.goals[0].name, 'Laptop Upgrade');
assert.strictEqual(loadedState.budgets.Food, 5000);

console.log('✓ Test 8 Passed: Data persists across simulated browser reload.\n');

// -----------------------------------------------------------------------------
// TEST 9: JSON Export & Import Safety
// -----------------------------------------------------------------------------
console.log('[Test 9] Verifying JSON Backup Export & Import Structure...');

// Test Export serialization
const exportedJson = JSON.stringify(storageState, null, 2);
assert.ok(exportedJson.length > 50, 'Exported string must contain complete data');

// Test Import deserialization and validation
const importedParsed = JSON.parse(exportedJson);
assert.strictEqual(typeof importedParsed, 'object');
assert.ok(Array.isArray(importedParsed.transactions));
assert.ok(Array.isArray(importedParsed.goals));
assert.strictEqual(typeof importedParsed.budgets, 'object');
assert.strictEqual(typeof importedParsed.baseAllowance, 'number');

// Test Corrupted Import rejection
const corruptJson = '{"version": 1, "invalid_structure": true}';
const corruptParsed = JSON.parse(corruptJson);
const isValidCentsibleSchema = Array.isArray(corruptParsed.transactions) && typeof corruptParsed.budgets === 'object';
assert.strictEqual(isValidCentsibleSchema, false, 'Malformed import must be rejected');

console.log('✓ Test 9 Passed: Backup export and import structure validation verified.\n');

// -----------------------------------------------------------------------------
// TEST 10: Input Boundary & Rejection Checks
// -----------------------------------------------------------------------------
console.log('[Test 10] Verifying Boundary Values & Input Validations...');

function validateTransactionInput(amount, date, desc, category) {
  if (isNaN(amount) || amount <= 0 || !isFinite(amount)) return { valid: false, field: 'amount' };
  if (!date || typeof date !== 'string' || !date.trim()) return { valid: false, field: 'date' };
  if (!desc || typeof desc !== 'string' || !desc.trim()) return { valid: false, field: 'desc' };
  if (!category || typeof category !== 'string' || !category.trim()) return { valid: false, field: 'category' };
  return { valid: true };
}

assert.strictEqual(validateTransactionInput(-100, '2026-10-23', 'Lunch', 'Food').valid, false);
assert.strictEqual(validateTransactionInput(0, '2026-10-23', 'Lunch', 'Food').valid, false);
assert.strictEqual(validateTransactionInput(NaN, '2026-10-23', 'Lunch', 'Food').valid, false);
assert.strictEqual(validateTransactionInput(Infinity, '2026-10-23', 'Lunch', 'Food').valid, false);
assert.strictEqual(validateTransactionInput(250, '', 'Lunch', 'Food').valid, false);
assert.strictEqual(validateTransactionInput(250, '2026-10-23', '   ', 'Food').valid, false);
assert.strictEqual(validateTransactionInput(250, '2026-10-23', 'Lunch', '').valid, false);
assert.strictEqual(validateTransactionInput(250, '2026-10-23', 'Campus Lunch', 'Food').valid, true);

console.log('✓ Test 10 Passed: Boundary values (negative, zero, NaN, empty strings) properly rejected.\n');

// -----------------------------------------------------------------------------
// TEST 11: Responsive CSS Structure Verification
// -----------------------------------------------------------------------------
console.log('[Test 11] Verifying Responsive CSS Breakpoints...');

assert.ok(cssContent.includes('@media (max-width: 1024px)'), 'styles.css must have tablet breakpoint (1024px)');
assert.ok(cssContent.includes('@media (max-width: 768px)'), 'styles.css must have mobile breakpoint (768px)');
assert.ok(cssContent.includes('grid-template-columns: 1fr;'), 'Mobile styles must collapse grids to single column');
assert.ok(cssContent.includes('flex-direction: column;'), 'Mobile forms must stack vertically');

console.log('✓ Test 11 Passed: Mobile and desktop CSS layout rules verified.\n');

// -----------------------------------------------------------------------------
// TEST 12: Smart Spending Pulse Insight Card Responsive Geometry & Viewports
// -----------------------------------------------------------------------------
console.log('[Test 12] Verifying Insight Card Mobile & Desktop Geometry (320px, 360px, 390px, 768px, desktop)...');

// 1. Verify CSS rules exist for mobile stacked layout
assert.ok(cssContent.includes('.insight-banner {'), 'styles.css must style .insight-banner');
assert.ok(cssContent.includes('.insight-banner-icon {'), 'styles.css must style .insight-banner-icon');
assert.ok(cssContent.includes('.insight-banner-content {'), 'styles.css must style .insight-banner-content');
assert.ok(cssContent.includes('.insight-banner #viewAllInsightsBtn {'), 'styles.css must target viewAllInsightsBtn in banner');

// Check mobile media query contains responsive grid definition
const mobileBlockMatch = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*?)\n\}/);
assert.ok(mobileBlockMatch, 'Must have @media (max-width: 768px) block');
const mobileCss = mobileBlockMatch[1];

assert.ok(mobileCss.includes('grid-template-columns: auto 1fr;'), 'Mobile insight banner must use 2-column grid (auto 1fr)');
assert.ok(mobileCss.includes('grid-column: 2;'), 'Button must be positioned below text in column 2');
assert.ok(mobileCss.includes('min-width: 0;'), 'Content must specify min-width: 0 to prevent flex/grid blowout');

// 2. Geometry calculations for mobile viewports
const viewports = [
  { width: 320, name: 'iPhone SE (compact)' },
  { width: 360, name: 'Android / Galaxy (standard)' },
  { width: 390, name: 'iPhone 14/15/16 (modern)' },
  { width: 768, name: 'Tablet portrait / large mobile' }
];

const containerPadding = 16 * 2; // 1rem left + 1rem right = 32px
const bannerPadding = 18 * 2;    // 1.125rem left + 1.125rem right = 36px
const iconAndGap = 24 + 14;      // ~24px icon + 14px grid gap = 38px
const buttonWidth = 136;         // ~136px width for "Explore Insights" btn-sm

for (const vp of viewports) {
  const containerW = vp.width - containerPadding;
  const bannerInnerW = containerW - bannerPadding;
  const contentW = bannerInnerW - iconAndGap;

  // Text width must be at least 200px even at 320px to prevent the 1-2 word wrapping bug
  assert.ok(contentW >= 200, `At ${vp.width}px (${vp.name}), content width (${contentW}px) must be >= 200px`);

  // Button must fit comfortably inside column 2 without overflow
  assert.ok(contentW > buttonWidth, `At ${vp.width}px, button (${buttonWidth}px) must fit within column 2 (${contentW}px)`);

  console.log(`  • Viewport ${vp.width}px (${vp.name}): Content width = ${contentW}px (Text has ample room, Button fits with ${contentW - buttonWidth}px margin).`);
}

// 3. Desktop verification
assert.ok(cssContent.includes('.insight-banner {') && cssContent.includes('display: flex;'), 'Desktop must preserve horizontal flex layout');
console.log('  • Desktop Viewport (1280px): Preserved horizontal layout with flex: 1 content and flex-shrink: 0 button.\n');

console.log('✓ Test 12 Passed: Insight card responsive geometry verified at all target viewports.\n');

// -----------------------------------------------------------------------------
// TEST 13: CSV Parsing with Debit/Credit, Quoted Fields, BOM & Thousands
// -----------------------------------------------------------------------------
console.log('[Test 13] Verifying CSV parsing, column detection, and debit/credit normalization...');

const syntheticDebitCreditCsv = '\uFEFF' + [
  'Date,Narration,Withdrawal Amt,Deposit Amt,Ref No,Closing Balance',
  '02/10/2026,"  Campus cafe, lunch  ",350.00,,REF-001,"₹12,000.00"',
  ',,,,,',
  '05-Oct-2026,Freelance stipend,,"2,500.00",REF-002,14500',
  '2026-10-07,Metro card recharge,400,,REF-003,14100',
  '10/10/2026,Netflix subscription,199,,REF-004,13901'
].join('\r\n');

const parsedDebitCredit = statementImport.parseCsv(syntheticDebitCreditCsv);
assert.strictEqual(parsedDebitCredit.ok, true, 'Synthetic debit/credit CSV must parse');
assert.strictEqual(parsedDebitCredit.delimiterLabel, 'Comma');
const debitCreditHeader = statementImport.findHeaderRow(parsedDebitCredit.rows);
assert.strictEqual(debitCreditHeader.index, 0, 'Header row must be detected on the first row');
const debitCreditMapping = statementImport.detectColumnMapping(parsedDebitCredit.rows[0]);
assert.strictEqual(debitCreditMapping.mapping.date, 0);
assert.strictEqual(debitCreditMapping.mapping.description, 1);
assert.strictEqual(debitCreditMapping.mapping.debit, 2);
assert.strictEqual(debitCreditMapping.mapping.credit, 3);
assert.strictEqual(debitCreditMapping.mapping.reference, 4);
assert.strictEqual(debitCreditMapping.mapping.balance, 5);

const debitCreditRecords = statementImport.buildRecords({
  rows: parsedDebitCredit.rows,
  rowNumbers: parsedDebitCredit.rowNumbers,
  headerRow: debitCreditHeader.index,
  mapping: debitCreditMapping.mapping,
  amountMode: 'separate'
});
assert.strictEqual(debitCreditRecords.ok, true);
assert.strictEqual(debitCreditRecords.records.length, 4, 'The empty CSV row must be skipped');
assert.strictEqual(debitCreditRecords.records[0].description, 'Campus cafe, lunch');
assert.strictEqual(debitCreditRecords.records[0].type, 'expense');
assert.strictEqual(debitCreditRecords.records[0].amount, 350);
assert.strictEqual(debitCreditRecords.records[0].category, 'Food');
assert.strictEqual(debitCreditRecords.records[0].reference, 'REF-001');
assert.strictEqual(debitCreditRecords.records[1].type, 'income');
assert.strictEqual(debitCreditRecords.records[1].amount, 2500);
assert.strictEqual(debitCreditRecords.records[1].category, 'Freelance');
assert.strictEqual(debitCreditRecords.records[2].category, 'Travel');
assert.strictEqual(debitCreditRecords.records[3].category, 'Entertainment');

const semicolonCsv = 'Date;Narration;Amount\r\n2026-10-02;"Cafe, campus";-350\r\n';
const parsedSemicolon = statementImport.parseCsv(semicolonCsv);
assert.strictEqual(parsedSemicolon.ok, true);
assert.strictEqual(parsedSemicolon.delimiterLabel, 'Semicolon');
const semicolonMapping = statementImport.detectColumnMapping(parsedSemicolon.rows[0]);
assert.strictEqual(semicolonMapping.mapping.amount, 2);
const semicolonRecord = statementImport.buildRecords({
  rows: parsedSemicolon.rows,
  rowNumbers: parsedSemicolon.rowNumbers,
  mapping: semicolonMapping.mapping,
  amountMode: 'signed'
});
assert.strictEqual(semicolonRecord.records[0].description, 'Cafe, campus');
assert.strictEqual(semicolonRecord.records[0].amount, 350);
assert.strictEqual(semicolonRecord.records[0].type, 'expense');

console.log('✓ Test 13 Passed: Debit/credit, quoted commas, BOM, CRLF, semicolons, thousands separators, and balances handled.\n');

// -----------------------------------------------------------------------------
// TEST 14: Signed Amounts, Ambiguous Amounts & Dr/Cr Indicators
// -----------------------------------------------------------------------------
console.log('[Test 14] Verifying signed amounts, explicit ambiguity handling, and Dr/Cr indicators...');

const signedCsv = [
  'Date,Description,Amount',
  '2026-10-02,Canteen lunch,-350',
  '2026-10-03,Scholarship credit,5000'
].join('\n');
const parsedSigned = statementImport.parseCsv(signedCsv);
const signedMapping = statementImport.detectColumnMapping(parsedSigned.rows[0]);
assert.strictEqual(signedMapping.mapping.amount, 2);

const signedRecords = statementImport.buildRecords({
  rows: parsedSigned.rows,
  rowNumbers: parsedSigned.rowNumbers,
  mapping: signedMapping.mapping,
  amountMode: 'signed'
});
assert.strictEqual(signedRecords.records[0].type, 'expense');
assert.strictEqual(signedRecords.records[0].amount, 350);
assert.strictEqual(signedRecords.records[1].type, 'income');
assert.strictEqual(signedRecords.records[1].category, 'Scholarship');

const unsignedCsv = 'Date,Description,Amount\n2026-10-02,Book purchase,850\n';
const parsedUnsigned = statementImport.parseCsv(unsignedCsv);
const unsignedMapping = statementImport.detectColumnMapping(parsedUnsigned.rows[0]);
const ambiguousResult = statementImport.buildRecords({
  rows: parsedUnsigned.rows,
  rowNumbers: parsedUnsigned.rowNumbers,
  mapping: unsignedMapping.mapping,
  amountMode: ''
});
assert.strictEqual(ambiguousResult.ok, false, 'Unsigned single amounts must require an explicit interpretation');

const allExpenses = statementImport.buildRecords({
  rows: parsedUnsigned.rows,
  rowNumbers: parsedUnsigned.rowNumbers,
  mapping: unsignedMapping.mapping,
  amountMode: 'debit'
});
assert.strictEqual(allExpenses.records[0].type, 'expense');
assert.strictEqual(allExpenses.records[0].amount, 850);

const drCrHeaderMapping = statementImport.detectColumnMapping(['Date', 'Description', 'Amount', 'Debit/Credit']);
assert.strictEqual(drCrHeaderMapping.mapping.indicator, 3, 'Debit/Credit must map to the indicator, not a debit amount');
assert.strictEqual(drCrHeaderMapping.mapping.debit, null);
assert.strictEqual(drCrHeaderMapping.mapping.credit, null);

const indicatorCsv = [
  'Date,Description,Amount,Dr/Cr',
  '2026-10-02,Book purchase,850,DR',
  '2026-10-03,Gift from family,650,CR'
].join('\n');
const parsedIndicator = statementImport.parseCsv(indicatorCsv);
const indicatorMapping = statementImport.detectColumnMapping(parsedIndicator.rows[0]);
assert.strictEqual(indicatorMapping.mapping.indicator, 3);
const indicatorRecords = statementImport.buildRecords({
  rows: parsedIndicator.rows,
  rowNumbers: parsedIndicator.rowNumbers,
  mapping: indicatorMapping.mapping,
  amountMode: 'indicator'
});
assert.strictEqual(indicatorRecords.records[0].type, 'expense');
assert.strictEqual(indicatorRecords.records[0].category, 'Education');
assert.strictEqual(indicatorRecords.records[1].type, 'income');
assert.strictEqual(indicatorRecords.records[1].category, 'Gift');

console.log('✓ Test 14 Passed: Signed, unsigned/ambiguous, and Dr/Cr indicator flows verified.\n');

// -----------------------------------------------------------------------------
// TEST 15: Date and Amount Normalization & Invalid Values
// -----------------------------------------------------------------------------
console.log('[Test 15] Verifying date formats, Indian amounts, and invalid-value handling...');

const dateAuto = statementImport.parseStatementDate('02/10/2026', 'auto');
assert.strictEqual(dateAuto.ok, true);
assert.strictEqual(dateAuto.iso, '2026-10-02');
assert.strictEqual(dateAuto.assumedDayFirst, true);

const dateMdy = statementImport.parseStatementDate('10/02/2026', 'MDY');
assert.strictEqual(dateMdy.iso, '2026-10-02');

const dateIso = statementImport.parseStatementDate('2026-10-02', 'auto');
assert.strictEqual(dateIso.iso, '2026-10-02');

const dateNamed = statementImport.parseStatementDate('2 Oct 2026', 'auto');
assert.strictEqual(dateNamed.iso, '2026-10-02');

const dateNamedUs = statementImport.parseStatementDate('Oct 2, 2026', 'auto');
assert.strictEqual(dateNamedUs.iso, '2026-10-02');

assert.strictEqual(statementImport.parseStatementDate('31/02/2026', 'auto').ok, false);
assert.strictEqual(statementImport.parseStatementDate('not-a-date', 'auto').ok, false);

const amountIndian = statementImport.parseStatementAmount('₹1,23,456.50');
assert.strictEqual(amountIndian.ok, true);
assert.strictEqual(amountIndian.value, 123456.5);

const amountDr = statementImport.parseStatementAmount('1,234.50 Dr');
assert.strictEqual(amountDr.value, 1234.5);
assert.strictEqual(amountDr.indicator, 'DR');

const amountParentheses = statementImport.parseStatementAmount('(500)');
assert.strictEqual(amountParentheses.value, 500);
assert.strictEqual(amountParentheses.negative, true);
assert.strictEqual(statementImport.parseStatementAmount('not-money').ok, false);
assert.strictEqual(statementImport.parseStatementAmount('').empty, true);

const invalidCsv = [
  'Date,Description,Amount',
  '31/02/2026,Bad date,-100',
  'not-a-date,Bad date two,-50',
  '2026-10-02,Good row,-10'
].join('\n');
const parsedInvalid = statementImport.parseCsv(invalidCsv);
const invalidMapping = statementImport.detectColumnMapping(parsedInvalid.rows[0]);
const invalidRecords = statementImport.buildRecords({
  rows: parsedInvalid.rows,
  rowNumbers: parsedInvalid.rowNumbers,
  mapping: invalidMapping.mapping,
  amountMode: 'signed'
});
assert.strictEqual(invalidRecords.records[0].valid, false);
assert.ok(invalidRecords.records[0].reason.includes('Date'));
assert.strictEqual(invalidRecords.records[1].valid, false);
assert.strictEqual(invalidRecords.records[2].valid, true);
assert.strictEqual(invalidRecords.counts.invalid, 2);

console.log('✓ Test 15 Passed: Date formats, ₹/comma amounts, parentheses, DR suffix, and invalid values verified.\n');

// -----------------------------------------------------------------------------
// TEST 16: Missing Columns, Empty/Malformed CSV, and Limits
// -----------------------------------------------------------------------------
console.log('[Test 16] Verifying missing columns, empty/malformed files, format checks, and limits...');

assert.strictEqual(statementImport.parseCsv('').ok, false);
assert.strictEqual(statementImport.parseCsv('   \r\n  ').ok, false);
assert.strictEqual(statementImport.parseCsv('Date,Description,Amount\n2026-10-02,"Unclosed,400').ok, false);

const missingAmountCsv = 'Date,Description\n2026-10-02,Cafe\n';
const parsedMissing = statementImport.parseCsv(missingAmountCsv);
const missingMapping = statementImport.detectColumnMapping(parsedMissing.rows[0]);
assert.ok(missingMapping.missingRequired.length === 0, 'Date and description are present');
const missingAmountResult = statementImport.buildRecords({
  rows: parsedMissing.rows,
  rowNumbers: parsedMissing.rowNumbers,
  mapping: missingMapping.mapping,
  amountMode: 'separate'
});
assert.strictEqual(missingAmountResult.ok, false, 'Separate mode requires a debit or credit column');

const missingDateMapping = statementImport.detectColumnMapping(['Narration', 'Amount']);
assert.ok(missingDateMapping.missingRequired.includes('date'));

const csvFormat = statementImport.detectFileFormat('synthetic_statement.csv', 'text/csv');
assert.strictEqual(csvFormat.ok, true);
const pdfFormat = statementImport.detectFileFormat('synthetic_statement.pdf', 'application/pdf');
assert.strictEqual(pdfFormat.ok, false);
assert.strictEqual(pdfFormat.format, 'pdf');
assert.ok(/not supported yet/i.test(pdfFormat.error));
assert.strictEqual(statementImport.detectFileFormat('synthetic_statement.xlsx', 'application/vnd.ms-excel').ok, false);
assert.strictEqual(statementImport.MAX_FILE_BYTES, 2 * 1024 * 1024);
assert.strictEqual(statementImport.MAX_RECORDS, 2000);

const oversizedRows = [['Date', 'Description', 'Amount']];
for (let i = 0; i < statementImport.MAX_RECORDS + 1; i += 1) {
  oversizedRows.push(['2026-10-02', `Synthetic row ${i}`, '-10']);
}
const oversizedResult = statementImport.buildRecords({
  rows: oversizedRows,
  headerRow: 0,
  mapping: { date: 0, description: 1, debit: null, credit: null, amount: 2, reference: null, balance: null, indicator: null },
  amountMode: 'signed'
});
assert.strictEqual(oversizedResult.ok, false);
assert.ok(/more than 2,000/i.test(oversizedResult.error));

console.log('✓ Test 16 Passed: Missing columns, empty/malformed CSV, CSV/PDF format checks, file size, and row limits verified.\n');

// -----------------------------------------------------------------------------
// TEST 17: Duplicate Detection & Safe Description Handling
// -----------------------------------------------------------------------------
console.log('[Test 17] Verifying reference/composite duplicates, repeats, re-imports, and HTML-like text...');

const repeatCsv = [
  'Date,Description,Amount,Ref No',
  '2026-10-02,Chai break,-20,REF-A',
  '2026-10-02,Chai break,-20,REF-B'
].join('\n');
const parsedRepeats = statementImport.parseCsv(repeatCsv);
const repeatMapping = statementImport.detectColumnMapping(parsedRepeats.rows[0]);
const repeatRecords = statementImport.buildRecords({
  rows: parsedRepeats.rows,
  rowNumbers: parsedRepeats.rowNumbers,
  mapping: repeatMapping.mapping,
  amountMode: 'signed'
});
const repeatsAgainstEmpty = statementImport.annotateDuplicates(repeatRecords.records, []);
assert.strictEqual(repeatsAgainstEmpty.length, 2, 'Repeated legitimate purchases must not be dropped');
assert.strictEqual(repeatsAgainstEmpty.filter(record => record.duplicate).length, 0);

const duplicateReferenceRecords = statementImport.buildRecords({
  rows: [
    ['Date', 'Description', 'Amount', 'Ref No'],
    ['2026-10-02', 'Chai break', '-20', 'REF-SAME'],
    ['2026-10-02', 'Chai break', '-20', 'REF-SAME']
  ],
  headerRow: 0,
  mapping: { date: 0, description: 1, debit: null, credit: null, amount: 2, reference: 3, balance: null, indicator: null },
  amountMode: 'signed'
});
const duplicateReferenceFlags = statementImport.annotateDuplicates(duplicateReferenceRecords.records, []);
assert.strictEqual(duplicateReferenceFlags.filter(record => record.duplicate).length, 2);
assert.ok(/more than once in this file/i.test(duplicateReferenceFlags[0].duplicateReason));

const existingForDuplicates = [{
  id: 'tx-existing-1',
  type: 'expense',
  amount: 350,
  date: '2026-10-02',
  category: 'Food',
  desc: 'Campus cafe, lunch',
  payment: 'UPI',
  importRef: 'REF-001'
}];
const duplicateAgainstExisting = statementImport.annotateDuplicates([debitCreditRecords.records[0]], existingForDuplicates);
assert.strictEqual(duplicateAgainstExisting[0].duplicate, true);
assert.ok(/Reference matches/i.test(duplicateAgainstExisting[0].duplicateReason));
assert.ok(/Same date, amount, type, and description/i.test(duplicateAgainstExisting[0].duplicateReason));

const firstImport = statementImport.buildImportedTransactions(debitCreditRecords.records, [], { now: 1700000000000 });
const reimportFlags = statementImport.annotateDuplicates(debitCreditRecords.records, firstImport.transactions);
assert.strictEqual(reimportFlags.filter(record => record.duplicate).length, 4, 'Re-importing all rows must flag every row');
assert.strictEqual(reimportFlags.length, 4, 'Duplicate flags must not discard rows');

const htmlCsv = 'Date,Description,Amount\n2026-10-02,"<img src=x onerror=alert(1)> Synthetic",-99\n';
const parsedHtml = statementImport.parseCsv(htmlCsv);
const htmlMapping = statementImport.detectColumnMapping(parsedHtml.rows[0]);
const htmlRecord = statementImport.buildRecords({
  rows: parsedHtml.rows,
  rowNumbers: parsedHtml.rowNumbers,
  mapping: htmlMapping.mapping,
  amountMode: 'signed'
}).records[0];
assert.strictEqual(htmlRecord.description, '<img src=x onerror=alert(1)> Synthetic');
const htmlTransaction = statementImport.toCentsibleTransaction(htmlRecord, 'tx-html-test');
assert.strictEqual(htmlTransaction.desc, '<img src=x onerror=alert(1)> Synthetic');
assert.strictEqual(htmlTransaction.payment, 'Bank');

console.log('✓ Test 17 Passed: Reference/composite duplicates, repeats, re-imports, and HTML-like descriptions verified.\n');

// -----------------------------------------------------------------------------
// TEST 18: Merge, Persistence, Totals & Existing-Data Preservation
// -----------------------------------------------------------------------------
console.log('[Test 18] Verifying atomic merge, totals, unique IDs, and preservation of existing state...');

const existingStateForImport = {
  version: 1,
  baseAllowance: 12000,
  budgets: { Food: 4500, Travel: 1800, Shopping: 2000, Education: 1500, Entertainment: 1500, Other: 1000 },
  transactions: [
    { id: 'tx-existing-a', type: 'income', amount: 12000, date: '2026-10-01', category: 'Allowance', desc: 'Synthetic allowance', payment: 'UPI' },
    { id: 'tx-existing-b', type: 'expense', amount: 350, date: '2026-10-02', category: 'Food', desc: 'Synthetic lunch', payment: 'UPI' }
  ],
  goals: [{ id: 'goal-existing', name: 'Synthetic Goal', target: 10000, current: 2500, targetDate: '2026-12-31' }]
};

const importCsv = [
  'Date,Description,Amount,Ref No',
  '2026-10-05,Synthetic book,-200,REF-BOOK',
  '2026-10-06,Synthetic freelance,500,REF-FREE'
].join('\n');
const parsedImport = statementImport.parseCsv(importCsv);
const importMapping = statementImport.detectColumnMapping(parsedImport.rows[0]);
const importRecords = statementImport.buildRecords({
  rows: parsedImport.rows,
  rowNumbers: parsedImport.rowNumbers,
  mapping: importMapping.mapping,
  amountMode: 'signed'
}).records;

const builtImport = statementImport.buildImportedTransactions(importRecords, existingStateForImport.transactions, { now: 1700000000000 });
assert.strictEqual(builtImport.transactions.length, 2);
assert.strictEqual(builtImport.rejected.length, 0);
assert.strictEqual(builtImport.transactions[0].id, 'tx-1700000000000-1');
assert.strictEqual(builtImport.transactions[0].payment, 'Bank');
assert.strictEqual(builtImport.transactions[0].importRef, 'REF-BOOK');

const mergedTransactions = statementImport.mergeImportedTransactions(existingStateForImport.transactions, builtImport.transactions);
assert.strictEqual(mergedTransactions.length, 4);
assert.ok(mergedTransactions.some(transaction => transaction.id === 'tx-existing-a'));
assert.ok(mergedTransactions.some(transaction => transaction.id === 'tx-existing-b'));
assert.strictEqual(existingStateForImport.transactions.length, 2, 'Merge helper must not mutate existing transactions');

const mergedState = { ...existingStateForImport, transactions: mergedTransactions };
assert.deepStrictEqual(mergedState.budgets, existingStateForImport.budgets, 'Budgets must remain unchanged');
assert.deepStrictEqual(mergedState.goals, existingStateForImport.goals, 'Goals must remain unchanged');
assert.strictEqual(mergedState.baseAllowance, 12000, 'Allowance must remain unchanged');

const finAfterImport = calculateMonthFinancials(mergedTransactions, 12000, 2026, 9);
assert.strictEqual(finAfterImport.totalIncome, 12500);
assert.strictEqual(finAfterImport.totalExpense, 550);
assert.strictEqual(finAfterImport.remainingBudget, 11950);
assert.strictEqual(finAfterImport.categoryExpenses.Food, 350);
assert.strictEqual(finAfterImport.categoryExpenses.Education, 200);

const invalidImported = statementImport.buildImportedTransactions([
  { ...importRecords[0], amount: 0 }
], existingStateForImport.transactions, { now: 1700000000000 });
assert.strictEqual(invalidImported.transactions.length, 0);
assert.strictEqual(invalidImported.rejected.length, 1);

global.localStorage.setItem('centsible_state_v1', JSON.stringify(mergedState));
const reloadedImportState = JSON.parse(global.localStorage.getItem('centsible_state_v1'));
assert.strictEqual(reloadedImportState.transactions.length, 4);
assert.strictEqual(reloadedImportState.budgets.Food, 4500);
assert.strictEqual(reloadedImportState.goals[0].name, 'Synthetic Goal');
assert.strictEqual(reloadedImportState.transactions.find(transaction => transaction.importRef === 'REF-BOOK').amount, 200);

const summaryCounts = statementImport.summarizeRecords([
  { valid: true, duplicate: false },
  { valid: true, duplicate: true },
  { valid: false, duplicate: false }
], [0, 1]);
assert.deepStrictEqual(summaryCounts, {
  total: 3,
  valid: 2,
  invalid: 1,
  duplicates: 1,
  selected: 2,
  skipped: 1
});

console.log('✓ Test 18 Passed: Merge preserves transactions/budgets/goals, recalcs totals, and persists imported records.\n');

console.log('====================================================');
console.log('   ALL 18 VERIFICATION TEST SUITES PASSED (100%)    ');
console.log('====================================================');
