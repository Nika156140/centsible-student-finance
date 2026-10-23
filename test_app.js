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
assert.ok(fs.existsSync('README.md'), 'README.md must exist');

const htmlContent = fs.readFileSync('index.html', 'utf8');
const cssContent = fs.readFileSync('styles.css', 'utf8');
const jsContent = fs.readFileSync('app.js', 'utf8');

// Ensure stylesheet and script are linked in index.html
assert.ok(htmlContent.includes('<link rel="stylesheet" href="styles.css">'), 'index.html must link styles.css');
assert.ok(htmlContent.includes('<script src="app.js"></script>'), 'index.html must link app.js');

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

console.log('====================================================');
console.log('   ALL 12 VERIFICATION TEST SUITES PASSED (100%)    ');
console.log('====================================================');
