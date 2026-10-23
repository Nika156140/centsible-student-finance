/**
 * Centsible — Make Every Rupee Count
 * Personal Finance Dashboard for College Students
 * Vanilla JavaScript (ES6+), Browser localStorage
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. CONSTANTS & METADATA
  // =========================================================================

  const STORAGE_KEY = 'centsible_state_v1';

  const EXPENSE_CATEGORIES = [
    { id: 'Food', label: 'Food & Dining', icon: '🍔', color: '#10b981' },
    { id: 'Travel', label: 'Travel & Commute', icon: '🚇', color: '#3b82f6' },
    { id: 'Shopping', label: 'Shopping', icon: '🛍️', color: '#f59e0b' },
    { id: 'Education', label: 'Education & Books', icon: '📚', color: '#8b5cf6' },
    { id: 'Entertainment', label: 'Entertainment', icon: '🎬', color: '#ec4899' },
    { id: 'Other', label: 'Other Expenses', icon: '⚡', color: '#64748b' }
  ];

  const INCOME_CATEGORIES = [
    { id: 'Allowance', label: 'Allowance from Parents', icon: '💵', color: '#10b981' },
    { id: 'Freelance', label: 'Freelance / Internship', icon: '💻', color: '#06b6d4' },
    { id: 'Scholarship', label: 'Scholarship / Grant', icon: '🎓', color: '#8b5cf6' },
    { id: 'Gift', label: 'Gift / Pocket Money', icon: '🎁', color: '#f59e0b' },
    { id: 'Other', label: 'Other Income', icon: '💰', color: '#34d399' }
  ];

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Default Initial Demo Dataset (Student life in October 2026)
  const INITIAL_DEMO_DATA = {
    version: 1,
    baseAllowance: 12000,
    budgets: {
      Food: 4500,
      Travel: 1800,
      Shopping: 2000,
      Education: 1500,
      Entertainment: 1500,
      Other: 1000
    },
    transactions: [
      {
        id: 'tx-001',
        type: 'income',
        amount: 12000,
        date: '2026-10-01',
        category: 'Allowance',
        desc: 'Monthly college allowance from parents',
        payment: 'UPI'
      },
      {
        id: 'tx-002',
        type: 'income',
        amount: 2500,
        date: '2026-10-10',
        category: 'Freelance',
        desc: 'Website redesign project stipend',
        payment: 'UPI'
      },
      {
        id: 'tx-003',
        type: 'expense',
        amount: 350,
        date: '2026-10-02',
        category: 'Food',
        desc: 'Campus cafeteria lunch & cold coffee',
        payment: 'UPI'
      },
      {
        id: 'tx-004',
        type: 'expense',
        amount: 850,
        date: '2026-10-04',
        category: 'Education',
        desc: 'Data Structures & Algorithms reference textbook',
        payment: 'Card'
      },
      {
        id: 'tx-005',
        type: 'expense',
        amount: 400,
        date: '2026-10-05',
        category: 'Travel',
        desc: 'Metro smart card monthly recharge',
        payment: 'UPI'
      },
      {
        id: 'tx-006',
        type: 'expense',
        amount: 980,
        date: '2026-10-08',
        category: 'Food',
        desc: 'Weekend team dinner at dosa joint',
        payment: 'UPI'
      },
      {
        id: 'tx-007',
        type: 'expense',
        amount: 1200,
        date: '2026-10-11',
        category: 'Entertainment',
        desc: 'IMAX movie ticket & popcorn with friends',
        payment: 'UPI'
      },
      {
        id: 'tx-008',
        type: 'expense',
        amount: 1450,
        date: '2026-10-13',
        category: 'Shopping',
        desc: 'College hoodie & graphic tee sale',
        payment: 'Card'
      },
      {
        id: 'tx-009',
        type: 'expense',
        amount: 280,
        date: '2026-10-15',
        category: 'Travel',
        desc: 'Auto-rickshaw share to Hackathon venue',
        payment: 'Cash'
      },
      {
        id: 'tx-010',
        type: 'expense',
        amount: 520,
        date: '2026-10-17',
        category: 'Food',
        desc: 'Late-night study snack order (Zomato)',
        payment: 'UPI'
      },
      {
        id: 'tx-011',
        type: 'expense',
        amount: 450,
        date: '2026-10-19',
        category: 'Other',
        desc: 'Hostel high-speed Wi-Fi monthly dues',
        payment: 'UPI'
      },
      {
        id: 'tx-012',
        type: 'expense',
        amount: 300,
        date: '2026-10-21',
        category: 'Education',
        desc: 'Engineering lab journal printing & binding',
        payment: 'Cash'
      },
      {
        id: 'tx-013',
        type: 'expense',
        amount: 600,
        date: '2026-10-22',
        category: 'Entertainment',
        desc: 'College music fest pass',
        payment: 'UPI'
      }
    ],
    goals: [
      {
        id: 'goal-001',
        name: 'Semester Break Goa Trip',
        target: 10000,
        current: 4500,
        targetDate: '2026-12-24'
      },
      {
        id: 'goal-002',
        name: 'ANC Wireless Headphones',
        target: 3500,
        current: 2800,
        targetDate: '2026-11-20'
      },
      {
        id: 'goal-003',
        name: 'Emergency Buffer Fund',
        target: 5000,
        current: 5000,
        targetDate: '2026-10-31'
      }
    ]
  };

  // =========================================================================
  // 2. STATE MANAGEMENT
  // =========================================================================

  let state = {
    version: 1,
    baseAllowance: 12000,
    budgets: {},
    transactions: [],
    goals: []
  };

  // Default active view date: October 2026 (matching system date)
  let activeYear = 2026;
  let activeMonth = 9; // 0-indexed (9 = October)

  // Filtering & Sorting State for Transactions View
  let txFilters = {
    search: '',
    type: 'all',
    category: 'all',
    sort: 'date-desc'
  };

  // Pending confirm callback
  let pendingConfirmAction = null;

  // =========================================================================
  // 3. PERSISTENCE & INITIALIZATION
  // =========================================================================

  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          state.baseAllowance = typeof parsed.baseAllowance === 'number' ? parsed.baseAllowance : INITIAL_DEMO_DATA.baseAllowance;
          state.budgets = (parsed.budgets && typeof parsed.budgets === 'object') ? parsed.budgets : Object.assign({}, INITIAL_DEMO_DATA.budgets);
          state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [...INITIAL_DEMO_DATA.transactions];
          state.goals = Array.isArray(parsed.goals) ? parsed.goals : [...INITIAL_DEMO_DATA.goals];
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to parse localStorage data. Falling back to demo data.', err);
    }
    // Default fallback
    resetToDemoData(false);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save state to localStorage:', err);
      showToast('Storage error: Unable to save locally.', 'error');
    }
  }

  function resetToDemoData(showFeedback = true) {
    state = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
    saveState();
    renderAll();
    if (showFeedback) {
      showToast('Demo data restored successfully.');
    }
  }

  function clearAllData() {
    state = {
      version: 1,
      baseAllowance: 0,
      budgets: {
        Food: 0,
        Travel: 0,
        Shopping: 0,
        Education: 0,
        Entertainment: 0,
        Other: 0
      },
      transactions: [],
      goals: []
    };
    saveState();
    renderAll();
    showToast('All transactions, budgets, and goals cleared.', 'info');
  }

  // =========================================================================
  // 4. FORMATTING & CALCULATION HELPERS
  // =========================================================================

  function formatINR(val) {
    const num = Number(val) || 0;
    // Format according to Indian Numbering System (Lakhs/Crores)
    return '₹' + num.toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  }

  function formatDateReadable(dateStr) {
    if (!dateStr) return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const year = parts[0];
      const monthShort = MONTH_NAMES[monthIdx] ? MONTH_NAMES[monthIdx].substring(0, 3) : '';
      return `${day} ${monthShort} ${year}`;
    }
    return dateStr;
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(`${dateStr}T00:00:00`);
    if (isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  function formatGoalTimeline(goal, isAchieved) {
    if (!goal.targetDate) return '';
    const base = `Target ${formatDateReadable(goal.targetDate)}`;
    if (isAchieved) return base;
    const days = getDaysUntil(goal.targetDate);
    if (days === null) return base;
    if (days < 0) return `${base} · target date passed`;
    if (days === 0) return `${base} · due today`;
    return `${base} · ${days} day${days === 1 ? '' : 's'} left`;
  }

  function getMonthKey(year, monthIndex) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    return `${year}-${mm}`;
  }

  // Presentation-only progress meter helper
  function setMeter(barEl, percentage, stateClass) {
    if (!barEl) return;
    const clamped = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
    barEl.style.width = `${clamped}%`;
    barEl.className = `metric-meter-fill ${stateClass}`;
    if (barEl.parentElement) {
      barEl.parentElement.setAttribute('aria-valuenow', String(clamped));
    }
  }

  function getCategoryMeta(catId, type = 'expense') {
    const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const found = list.find(c => c.id.toLowerCase() === (catId || '').toLowerCase());
    if (found) return found;

    // Fallback search across both lists
    const crossFound = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id.toLowerCase() === (catId || '').toLowerCase());
    if (crossFound) return crossFound;

    return { id: catId || 'Other', label: catId || 'Other', icon: '📌', color: '#64748b' };
  }

  // Filter transactions for active month
  function getActiveMonthTransactions() {
    const monthKey = getMonthKey(activeYear, activeMonth);
    return state.transactions.filter(t => t.date && t.date.startsWith(monthKey));
  }

  // Calculate dynamic dashboard stats
  function calculateMonthFinancials() {
    const monthTx = getActiveMonthTransactions();

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

    // Effective monthly income = base monthly allowance setting or logged allowance + extra income (freelance, gifts, etc.)
    const baseAllowance = Number(state.baseAllowance) || 0;
    const effectiveAllowance = Math.max(baseAllowance, allowanceIncome);
    const totalIncome = effectiveAllowance + extraIncome;
    const remainingBudget = totalIncome - totalExpense;

    // Total Savings accumulated across all goals
    let totalSaved = 0;
    let totalTarget = 0;
    state.goals.forEach(g => {
      totalSaved += Number(g.current) || 0;
      totalTarget += Number(g.target) || 0;
    });

    return {
      baseAllowance,
      allowanceIncome,
      effectiveAllowance,
      extraIncome,
      totalIncome,
      totalExpense,
      remainingBudget,
      categoryExpenses,
      monthTxCount: monthTx.length,
      totalSaved,
      totalTarget
    };
  }

  // =========================================================================
  // 5. RENDERING: DASHBOARD
  // =========================================================================

  function renderDashboard() {
    const fin = calculateMonthFinancials();

    // 1. Metric Cards
    const incomeEl = document.getElementById('dashIncomeTotal');
    const incomeBkEl = document.getElementById('dashIncomeBreakdown');
    const expenseEl = document.getElementById('dashExpenseTotal');
    const expenseCountEl = document.getElementById('dashExpenseCount');
    const remainingEl = document.getElementById('dashRemainingTotal');
    const remainingBadgeEl = document.getElementById('dashRemainingBadge');
    const remainingPctEl = document.getElementById('dashRemainingPct');
    const savingsEl = document.getElementById('dashSavingsTotal');
    const savingsTargetEl = document.getElementById('dashSavingsTarget');
    const expenseBarEl = document.getElementById('dashExpenseBar');
    const remainingBarEl = document.getElementById('dashRemainingBar');
    const savingsBarEl = document.getElementById('dashSavingsBar');

    if (incomeEl) incomeEl.textContent = formatINR(fin.totalIncome);
    if (incomeBkEl) {
      if (fin.effectiveAllowance > 0 && fin.extraIncome > 0) {
        incomeBkEl.textContent = `₹${fin.effectiveAllowance.toLocaleString('en-IN')} allowance + ₹${fin.extraIncome.toLocaleString('en-IN')} extra income`;
      } else if (fin.effectiveAllowance > 0) {
        incomeBkEl.textContent = `₹${fin.effectiveAllowance.toLocaleString('en-IN')} monthly allowance`;
      } else if (fin.extraIncome > 0) {
        incomeBkEl.textContent = `₹${fin.extraIncome.toLocaleString('en-IN')} logged income`;
      } else {
        incomeBkEl.textContent = '₹0 income recorded';
      }
    }

    if (expenseEl) expenseEl.textContent = formatINR(fin.totalExpense);
    if (expenseCountEl) {
      expenseCountEl.textContent = `${fin.monthTxCount} transactions recorded in ${MONTH_NAMES[activeMonth].substring(0, 3)}`;
    }

    if (remainingEl) remainingEl.textContent = formatINR(fin.remainingBudget);

    const remainingPct = fin.totalIncome > 0
      ? Math.round((fin.remainingBudget / fin.totalIncome) * 100)
      : 0;

    if (remainingBadgeEl) {
      if (fin.remainingBudget < 0) {
        remainingBadgeEl.textContent = 'Deficit';
        remainingBadgeEl.className = 'status-pill status-danger';
      } else if (remainingPct < 20) {
        remainingBadgeEl.textContent = 'Caution';
        remainingBadgeEl.className = 'status-pill status-warning';
      } else {
        remainingBadgeEl.textContent = 'Healthy';
        remainingBadgeEl.className = 'status-pill status-healthy';
      }
    }

    if (remainingPctEl) {
      if (fin.totalIncome <= 0) {
        remainingPctEl.textContent = 'No income recorded for this month';
      } else if (fin.remainingBudget < 0) {
        remainingPctEl.textContent = `${formatINR(Math.abs(fin.remainingBudget))} over your available income`;
      } else {
        remainingPctEl.textContent = `${formatINR(fin.remainingBudget)} left of ${formatINR(fin.totalIncome)} income`;
      }
    }

    // Visual pacing meters (presentation only)
    const expensePct = fin.totalIncome > 0
      ? Math.round((fin.totalExpense / fin.totalIncome) * 100)
      : (fin.totalExpense > 0 ? 100 : 0);
    const remainingPctClamped = fin.remainingBudget < 0 ? 100 : remainingPct;
    const savingsPct = fin.totalTarget > 0
      ? Math.round((fin.totalSaved / fin.totalTarget) * 100)
      : 0;

    setMeter(
      expenseBarEl,
      expensePct,
      expensePct >= 100 ? 'fill-red' : (expensePct >= 85 ? 'fill-amber' : 'fill-green')
    );
    setMeter(
      remainingBarEl,
      remainingPctClamped,
      fin.remainingBudget < 0 ? 'fill-red' : (remainingPct < 20 ? 'fill-amber' : 'fill-green')
    );
    setMeter(savingsBarEl, savingsPct, savingsPct >= 100 ? 'fill-green' : 'fill-purple');

    if (savingsEl) savingsEl.textContent = formatINR(fin.totalSaved);
    if (savingsTargetEl) {
      const activeGoalsCount = state.goals.length;
      const achievedGoalsCount = state.goals.filter(g => (Number(g.current) || 0) >= (Number(g.target) || 0)).length;
      if (activeGoalsCount === 0) {
        savingsTargetEl.textContent = 'No savings goals yet';
      } else {
        savingsTargetEl.textContent = `Target ${formatINR(fin.totalTarget)} · ${savingsPct}% funded` +
          (achievedGoalsCount > 0 ? ` · ${achievedGoalsCount} reached` : '');
      }
    }

    // 2. Spending Pulse Banner
    renderInsightBanner(fin);

    // 3. Category Donut Chart
    renderDonutChart(fin);

    // 4. Burn Rate & Budget Mini Bars
    renderBurnRateAndBudgets(fin);

    // 5. Recent Transactions
    renderRecentTransactions();
  }

  function renderInsightBanner(fin) {
    const textEl = document.getElementById('dashInsightText');
    if (!textEl) return;

    if (fin.totalExpense === 0) {
      textEl.textContent = 'No expenses logged for this month yet. Add your daily spending to see real-time insights!';
      return;
    }

    // Find top expense category
    let topCat = '';
    let topAmt = 0;
    for (const [cat, amt] of Object.entries(fin.categoryExpenses)) {
      if (amt > topAmt) {
        topAmt = amt;
        topCat = cat;
      }
    }

    const topPct = fin.totalExpense > 0 ? Math.round((topAmt / fin.totalExpense) * 100) : 0;
    const catMeta = getCategoryMeta(topCat);

    if (fin.remainingBudget < 0) {
      textEl.textContent = `Alert: Monthly expenses exceed allowance by ${formatINR(Math.abs(fin.remainingBudget))}. ${topCat} is your highest expense (${topPct}% of spending).`;
    } else {
      textEl.textContent = `${catMeta.icon} ${topCat} is your top expense category this month, taking ${topPct}% (${formatINR(topAmt)}) of total expenses.`;
    }
  }

  function renderDonutChart(fin) {
    const svg = document.getElementById('spendingDonutChart');
    const legendEl = document.getElementById('categoryLegend');
    const centerAmt = document.getElementById('donutCenterAmount');
    const chartMonthLabel = document.getElementById('chartMonthLabel');

    if (chartMonthLabel) {
      chartMonthLabel.textContent = `${MONTH_NAMES[activeMonth].substring(0, 3)} ${activeYear}`;
    }

    if (centerAmt) {
      centerAmt.textContent = formatINR(fin.totalExpense);
    }

    if (!svg || !legendEl) return;

    svg.innerHTML = '';
    legendEl.innerHTML = '';

    const total = fin.totalExpense;

    if (total === 0) {
      // Empty grey ring
      svg.innerHTML = `
        <circle cx="100" cy="100" r="70" fill="transparent" stroke="#1e293b" stroke-width="24"></circle>
      `;
      legendEl.innerHTML = `
        <div class="empty-state p-0" style="padding: 1.5rem 0;">
          <p class="text-secondary text-sm">No expenses logged for ${MONTH_NAMES[activeMonth]} yet.</p>
        </div>
      `;
      return;
    }

    const radius = 70;
    const circumference = 2 * Math.PI * radius; // ~439.82
    let accumulatedAngle = 0;

    // Filter categories with spending
    const activeCats = EXPENSE_CATEGORIES
      .map(c => ({
        ...c,
        amount: fin.categoryExpenses[c.id] || 0,
        pct: Math.round(((fin.categoryExpenses[c.id] || 0) / total) * 100)
      }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    activeCats.forEach(cat => {
      const sliceFraction = cat.amount / total;
      const strokeLength = sliceFraction * circumference;
      const strokeDashoffset = -accumulatedAngle;

      // Create SVG circle segment
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '100');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', cat.color);
      circle.setAttribute('stroke-width', '24');
      circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
      circle.setAttribute('stroke-dashoffset', strokeDashoffset);
      circle.setAttribute('style', 'transition: stroke-dashoffset 0.3s ease, stroke-width 0.2s ease;');

      // Tooltip title
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `${cat.label}: ${formatINR(cat.amount)} (${cat.pct}%)`;
      circle.appendChild(title);

      svg.appendChild(circle);

      accumulatedAngle += strokeLength;

      // Add to legend
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <div class="legend-left">
          <span class="legend-dot" style="background: ${cat.color};"></span>
          <span class="legend-name">${cat.icon} ${cat.id}</span>
        </div>
        <div class="legend-right">
          <span class="legend-pct">${cat.pct}%</span>
          <span class="legend-amount">${formatINR(cat.amount)}</span>
        </div>
      `;
      legendEl.appendChild(legendItem);
    });
  }

  function renderBurnRateAndBudgets(fin) {
    const burnRateEl = document.getElementById('dashBurnRate');
    const safeDailyEl = document.getElementById('dashSafeDaily');
    const daysRemainingEl = document.getElementById('dashDaysRemaining');
    const miniBudgetsListEl = document.getElementById('dashBudgetProgressList');

    // Calculate days passed and remaining for active month
    const totalDaysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();

    // Check if active month is the real current month
    const today = new Date();
    const isCurrentRealMonth = (today.getFullYear() === activeYear && today.getMonth() === activeMonth);

    const currentDay = isCurrentRealMonth ? today.getDate() : Math.min(23, totalDaysInMonth);
    const daysElapsed = Math.max(1, currentDay);
    const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed);

    const dailyBurnRate = Math.round(fin.totalExpense / daysElapsed);
    const safeDaily = daysRemaining > 0 && fin.remainingBudget > 0
      ? Math.round(fin.remainingBudget / daysRemaining)
      : 0;

    if (burnRateEl) burnRateEl.textContent = `${formatINR(dailyBurnRate)} / day`;
    if (safeDailyEl) {
      if (fin.remainingBudget <= 0) {
        safeDailyEl.textContent = '₹0 (Budget Exceeded)';
        safeDailyEl.className = 'burn-val text-danger';
      } else {
        safeDailyEl.textContent = `${formatINR(safeDaily)} / day`;
        safeDailyEl.className = 'burn-val text-brand';
      }
    }
    if (daysRemainingEl) daysRemainingEl.textContent = `${daysRemaining} days left`;

    // Render top 3 categories by spending progress
    if (miniBudgetsListEl) {
      miniBudgetsListEl.innerHTML = '';

      const items = EXPENSE_CATEGORIES.map(c => {
        const spent = fin.categoryExpenses[c.id] || 0;
        const limit = state.budgets[c.id] || 0;
        const pct = limit > 0 ? Math.round((spent / limit) * 100) : (spent > 0 ? 100 : 0);
        return { ...c, spent, limit, pct };
      }).sort((a, b) => b.pct - a.pct).slice(0, 3);

      items.forEach(item => {
        const hasLimit = item.limit > 0;
        const isOver = hasLimit && item.spent > item.limit;
        let barClass = 'fill-green';
        let statusClass = '';
        let statusText = '';

        if (isOver) {
          barClass = 'fill-red';
          statusClass = 'is-over';
          statusText = `⚠ Over by ${formatINR(item.spent - item.limit)}`;
        } else if (!hasLimit) {
          barClass = 'fill-amber';
          statusClass = 'is-warning';
          statusText = item.spent > 0 ? 'No monthly cap set' : 'No limit or spending yet';
        } else if (item.pct >= 75) {
          barClass = 'fill-amber';
          statusClass = 'is-warning';
          statusText = `⚠ ${formatINR(item.limit - item.spent)} left · ${item.pct}% used`;
        } else {
          statusText = `${formatINR(item.limit - item.spent)} left · ${item.pct}% used`;
        }

        const row = document.createElement('div');
        row.className = `mini-budget-item${isOver ? ' is-over' : ''}`;
        row.innerHTML = `
          <div class="mini-budget-top">
            <span class="mini-budget-name">${item.icon} ${item.label}</span>
            <span class="mini-budget-numbers">${formatINR(item.spent)} / ${formatINR(item.limit)}</span>
          </div>
          <div class="progress-bar-container" role="progressbar" aria-label="${escapeHtml(item.label)} budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, item.pct)}">
            <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(100, item.pct)}%;"></div>
          </div>
          <div class="mini-budget-status ${statusClass}">${statusText}</div>
        `;
        miniBudgetsListEl.appendChild(row);
      });
    }
  }

  function renderRecentTransactions() {
    const container = document.getElementById('dashRecentTxContainer');
    if (!container) return;

    const monthTx = getActiveMonthTransactions()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    if (monthTx.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💸</div>
          <h3 class="empty-state-title">No transactions yet</h3>
          <p class="empty-state-text">You haven't recorded any expenses or allowance for ${MONTH_NAMES[activeMonth]} ${activeYear}.</p>
          <button class="btn btn-primary btn-sm" onclick="window.CentsibleApp.openAddTransactionModal()">+ Add First Transaction</button>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    monthTx.forEach(tx => {
      const isExpense = tx.type !== 'income';
      const meta = getCategoryMeta(tx.category, tx.type);
      const amountClass = isExpense ? 'amount-expense' : 'amount-income';
      const prefix = isExpense ? '-' : '+';

      rowsHtml += `
        <tr>
          <td>
            <div class="tx-desc-cell">
              <span class="tx-icon" style="background: ${meta.color}18; color: ${meta.color};" aria-hidden="true">${meta.icon}</span>
              <div>
                <div class="tx-desc-title">${escapeHtml(tx.desc)}</div>
                <div class="tx-desc-date">${formatDateReadable(tx.date)}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="category-tag" data-cat="${escapeHtml(tx.category)}">${escapeHtml(tx.category)}</span>
            <span class="payment-tag">${escapeHtml(tx.payment || 'UPI')}</span>
          </td>
          <td class="tx-amount tx-amount-cell ${amountClass}">
            ${prefix}${formatINR(tx.amount)}
          </td>
          <td class="tx-actions-cell">
            <div class="tx-action-btns">
              <button class="icon-btn" title="Edit" aria-label="Edit transaction" onclick="window.CentsibleApp.openEditTransactionModal('${tx.id}')">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="icon-btn btn-delete" title="Delete" aria-label="Delete transaction" onclick="window.CentsibleApp.confirmDeleteTransaction('${tx.id}')">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <table class="tx-table">
        <thead>
          <tr>
            <th scope="col">Description &amp; Date</th>
            <th scope="col">Category &amp; Mode</th>
            <th scope="col" class="tx-col-amount">Amount</th>
            <th scope="col" class="tx-actions-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // =========================================================================
  // 6. RENDERING: TRANSACTIONS TAB
  // =========================================================================

  function renderTransactionsView() {
    const container = document.getElementById('txFullTableContainer');
    const filteredCountEl = document.getElementById('txFilteredCount');
    const filteredExpenseEl = document.getElementById('txFilteredExpense');
    const filteredIncomeEl = document.getElementById('txFilteredIncome');

    if (!container) return;

    let list = getActiveMonthTransactions();

    // 1. Search Filter
    if (txFilters.search.trim()) {
      const q = txFilters.search.toLowerCase().trim();
      list = list.filter(t =>
        (t.desc && t.desc.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.payment && t.payment.toLowerCase().includes(q))
      );
    }

    // 2. Type Filter
    if (txFilters.type !== 'all') {
      list = list.filter(t => t.type === txFilters.type);
    }

    // 3. Category Filter
    if (txFilters.category !== 'all') {
      list = list.filter(t => t.category.toLowerCase() === txFilters.category.toLowerCase());
    }

    // 4. Sort
    list.sort((a, b) => {
      if (txFilters.sort === 'date-asc') {
        return new Date(a.date) - new Date(b.date);
      } else if (txFilters.sort === 'amount-desc') {
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      } else if (txFilters.sort === 'amount-asc') {
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      } else {
        // default: date-desc
        return new Date(b.date) - new Date(a.date);
      }
    });

    // Calculate totals for filtered items
    let filteredExpense = 0;
    let filteredIncome = 0;
    list.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') filteredIncome += amt;
      else filteredExpense += amt;
    });

    if (filteredCountEl) {
      filteredCountEl.textContent = `Showing ${list.length} transactions for ${MONTH_NAMES[activeMonth]} ${activeYear}`;
    }
    if (filteredExpenseEl) filteredExpenseEl.textContent = formatINR(filteredExpense);
    if (filteredIncomeEl) filteredIncomeEl.textContent = formatINR(filteredIncome);

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3 class="empty-state-title">No matching transactions found</h3>
          <p class="empty-state-text">Try adjusting your filters, search keywords, or month selection.</p>
          <button class="btn btn-outline btn-sm" onclick="window.CentsibleApp.resetTxFilters()">Reset Filters</button>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    list.forEach(tx => {
      const isExpense = tx.type !== 'income';
      const meta = getCategoryMeta(tx.category, tx.type);
      const amountClass = isExpense ? 'amount-expense' : 'amount-income';
      const prefix = isExpense ? '-' : '+';

      rowsHtml += `
        <tr>
          <td>
            <div class="tx-desc-cell">
              <span class="tx-icon" style="background: ${meta.color}18; color: ${meta.color};" aria-hidden="true">${meta.icon}</span>
              <div>
                <div class="tx-desc-title">${escapeHtml(tx.desc)}</div>
                <div class="tx-desc-date">${formatDateReadable(tx.date)}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="category-tag" data-cat="${escapeHtml(tx.category)}">${escapeHtml(tx.category)}</span>
          </td>
          <td>
            <span class="payment-tag">${escapeHtml(tx.payment || 'UPI')}</span>
          </td>
          <td class="tx-amount tx-amount-cell ${amountClass}">
            ${prefix}${formatINR(tx.amount)}
          </td>
          <td class="tx-actions-cell">
            <div class="tx-action-btns">
              <button class="icon-btn" title="Edit" aria-label="Edit transaction" onclick="window.CentsibleApp.openEditTransactionModal('${tx.id}')">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="icon-btn btn-delete" title="Delete" aria-label="Delete transaction" onclick="window.CentsibleApp.confirmDeleteTransaction('${tx.id}')">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <table class="tx-table">
        <thead>
          <tr>
            <th scope="col">Description &amp; Date</th>
            <th scope="col">Category</th>
            <th scope="col">Payment Mode</th>
            <th scope="col" class="tx-col-amount">Amount</th>
            <th scope="col" class="tx-actions-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // =========================================================================
  // 7. RENDERING: BUDGETS TAB
  // =========================================================================

  function renderBudgetsView() {
    const grid = document.getElementById('budgetsGrid');
    const totalCapDisplay = document.getElementById('budgetTotalCapDisplay');
    const totalSpentDisplay = document.getElementById('budgetTotalSpentDisplay');
    const totalRemainingDisplay = document.getElementById('budgetTotalRemainingDisplay');
    const overallBar = document.getElementById('budgetOverallProgressBar');
    const overallPctText = document.getElementById('budgetOverallPctText');
    const overallBadge = document.getElementById('budgetOverallStatusBadge');

    const fin = calculateMonthFinancials();

    // Calculate total budget cap across all categories
    let totalCap = 0;
    EXPENSE_CATEGORIES.forEach(c => {
      totalCap += (Number(state.budgets[c.id]) || 0);
    });

    const totalSpent = fin.totalExpense;
    const overallRemaining = totalCap - totalSpent;
    const overallPct = totalCap > 0 ? Math.round((totalSpent / totalCap) * 100) : 0;
    const hasCaps = totalCap > 0;

    if (totalCapDisplay) totalCapDisplay.textContent = formatINR(totalCap);
    if (totalSpentDisplay) totalSpentDisplay.textContent = formatINR(totalSpent);
    if (totalRemainingDisplay) {
      if (!hasCaps) {
        totalRemainingDisplay.textContent = '₹0 cap';
        totalRemainingDisplay.className = 'text-secondary';
      } else if (overallRemaining < 0) {
        totalRemainingDisplay.textContent = `-${formatINR(Math.abs(overallRemaining))}`;
        totalRemainingDisplay.className = 'text-danger';
      } else {
        totalRemainingDisplay.textContent = formatINR(overallRemaining);
        totalRemainingDisplay.className = 'text-brand';
      }
    }

    if (overallBar) {
      overallBar.style.width = `${Math.min(100, overallPct)}%`;
      if (overallPct >= 100) {
        overallBar.className = 'progress-bar-fill fill-red';
      } else if (overallPct >= 75) {
        overallBar.className = 'progress-bar-fill fill-amber';
      } else {
        overallBar.className = 'progress-bar-fill fill-green';
      }
      if (overallBar.parentElement) {
        overallBar.parentElement.setAttribute('aria-valuenow', String(Math.min(100, overallPct)));
      }
    }

    if (overallPctText) {
      overallPctText.textContent = hasCaps
        ? `${overallPct}% used of total plan (${MONTH_NAMES[activeMonth]})`
        : 'No category caps set yet — use Edit Category Limits to plan your month';
    }

    if (overallBadge) {
      if (!hasCaps) {
        overallBadge.textContent = totalSpent > 0 ? 'Caps Not Set' : 'No Caps Set';
        overallBadge.className = `status-pill ${totalSpent > 0 ? 'status-warning' : 'status-healthy'}`;
      } else if (overallPct >= 100) {
        overallBadge.textContent = 'Exceeded Budget';
        overallBadge.className = 'status-pill status-danger';
      } else if (overallPct >= 75) {
        overallBadge.textContent = 'Approaching Cap';
        overallBadge.className = 'status-pill status-warning';
      } else {
        overallBadge.textContent = 'Within Budget';
        overallBadge.className = 'status-pill status-healthy';
      }
    }

    if (!grid) return;
    grid.innerHTML = '';

    EXPENSE_CATEGORIES.forEach(cat => {
      const limit = Number(state.budgets[cat.id]) || 0;
      const spent = fin.categoryExpenses[cat.id] || 0;
      const hasLimit = limit > 0;
      const pct = hasLimit ? Math.round((spent / limit) * 100) : (spent > 0 ? 100 : 0);
      const remaining = limit - spent;

      let barClass = 'fill-green';
      let statusBadge = '<span class="status-pill status-healthy">On Track</span>';
      let cardStateClass = '';
      let remainingText = `Remaining: <strong class="text-brand">${formatINR(remaining)}</strong>`;
      let alertText = '';
      let alertLevel = '';

      if (!hasLimit) {
        barClass = spent > 0 ? 'fill-amber' : 'fill-green';
        statusBadge = spent > 0
          ? '<span class="status-pill status-warning">No cap set</span>'
          : '<span class="status-pill status-healthy">Not set</span>';
        cardStateClass = spent > 0 ? 'budget-card-warning' : '';
        remainingText = 'No budget cap set';
        if (spent > 0) {
          alertText = `You have spent ${formatINR(spent)} without a cap. Set a limit to track this category.`;
          alertLevel = 'is-warning';
        }
      } else if (pct >= 100) {
        barClass = 'fill-red';
        statusBadge = '<span class="status-pill status-danger">Exceeded</span>';
        cardStateClass = 'budget-card-exceeded';
        remainingText = `Over by: <strong class="text-danger">${formatINR(Math.abs(remaining))}</strong>`;
        alertText = 'Cap exceeded — review this category to avoid further overrun.';
        alertLevel = 'is-over';
      } else if (pct >= 75) {
        barClass = 'fill-amber';
        statusBadge = '<span class="status-pill status-warning">Approaching</span>';
        cardStateClass = 'budget-card-warning';
        remainingText = `Remaining: <strong class="text-warning">${formatINR(remaining)}</strong>`;
        alertText = `Only ${formatINR(remaining)} left in this category for the month.`;
        alertLevel = 'is-warning';
      }

      const card = document.createElement('div');
      card.className = `budget-card ${cardStateClass}`;
      card.innerHTML = `
        <div>
          <div class="budget-card-header">
            <div class="budget-category-info">
              <div class="category-icon-box" style="background: ${cat.color}20; color: ${cat.color};">
                ${cat.icon}
              </div>
              <div>
                <h3 class="budget-category-name">${cat.label}</h3>
                <span class="budget-card-period">${MONTH_NAMES[activeMonth]} Plan</span>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="budget-comparison-triad">
            <div class="triad-col">
              <span class="triad-label">Spent</span>
              <span class="triad-val">${formatINR(spent)}</span>
            </div>
            <div class="triad-col">
              <span class="triad-label">Limit</span>
              <span class="triad-val text-secondary">${formatINR(limit)}</span>
            </div>
            <div class="triad-col">
              <span class="triad-label">${hasLimit && pct >= 100 ? 'Over' : 'Remaining'}</span>
              <span class="triad-val ${hasLimit && pct >= 100 ? 'text-danger' : (hasLimit && pct >= 75 ? 'text-warning' : 'text-brand')}">
                ${hasLimit && pct >= 100 ? '+' + formatINR(Math.abs(remaining)) : formatINR(Math.max(0, remaining))}
              </span>
            </div>
          </div>

          <div class="budget-bar-section">
            <div class="budget-bar-labels">
              <span class="text-xs text-secondary">Utilization</span>
              <span class="text-xs font-semibold ${hasLimit && pct >= 100 ? 'text-danger' : (hasLimit && pct >= 75 ? 'text-warning' : 'text-brand')}">${pct}%</span>
            </div>
            <div class="progress-bar-container" role="progressbar" aria-label="${escapeHtml(cat.label)} budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, pct)}">
              <div class="progress-bar-fill ${barClass}" style="width: ${Math.min(100, pct)}%;"></div>
            </div>
          </div>

          ${alertText ? `
            <div class="budget-alert-line ${alertLevel}">
              <span class="budget-alert-icon" aria-hidden="true">!</span>
              <span>${alertText}</span>
            </div>
          ` : ''}
        </div>

        <div class="budget-card-footer">
          <span>${remainingText}</span>
          <button class="btn btn-ghost btn-sm" onclick="window.CentsibleApp.openEditSingleBudget('${cat.id}')">Edit Cap</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // =========================================================================
  // 8. RENDERING: SAVINGS GOALS TAB
  // =========================================================================

  function renderSavingsView() {
    const grid = document.getElementById('goalsCardsGrid');
    const totalAccumulatedEl = document.getElementById('savingsTotalAccumulated');
    const totalTargetEl = document.getElementById('savingsTotalTarget');
    const overallProgressEl = document.getElementById('savingsOverallProgress');
    const overallBarEl = document.getElementById('savingsOverallBar');
    const overallCaptionEl = document.getElementById('savingsOverallCaption');

    let totalSaved = 0;
    let totalTarget = 0;

    state.goals.forEach(g => {
      totalSaved += Number(g.current) || 0;
      totalTarget += Number(g.target) || 0;
    });

    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    const achievedCount = state.goals.filter(g => (Number(g.current) || 0) >= (Number(g.target) || 0)).length;

    if (totalAccumulatedEl) totalAccumulatedEl.textContent = formatINR(totalSaved);
    if (totalTargetEl) totalTargetEl.textContent = formatINR(totalTarget);
    if (overallProgressEl) overallProgressEl.textContent = `${overallPct}%`;
    if (overallBarEl) {
      const clampedOverall = Math.max(0, Math.min(100, overallPct));
      overallBarEl.style.width = `${clampedOverall}%`;
      overallBarEl.className = `progress-bar-fill ${clampedOverall >= 100 ? 'fill-green' : 'fill-purple'}`;
      if (overallBarEl.parentElement) {
        overallBarEl.parentElement.setAttribute('aria-valuenow', String(clampedOverall));
      }
    }
    if (overallCaptionEl) {
      overallCaptionEl.textContent = state.goals.length > 0
        ? `${achievedCount} of ${state.goals.length} goal${state.goals.length === 1 ? '' : 's'} reached`
        : 'No goals yet';
    }

    if (!grid) return;
    grid.innerHTML = '';

    if (state.goals.length === 0) {
      grid.innerHTML = `
        <div class="empty-state full-width" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🎯</div>
          <h3 class="empty-state-title">No savings goals yet</h3>
          <p class="empty-state-text">College is full of exciting milestones! Set goals for trips, gadgets, or emergency savings.</p>
          <button class="btn btn-primary" onclick="window.CentsibleApp.openNewGoalModal()">+ Create Your First Goal</button>
        </div>
      `;
      return;
    }

    state.goals.forEach(goal => {
      const target = Number(goal.target) || 1;
      const current = Number(goal.current) || 0;
      const pct = Math.min(100, Math.round((current / target) * 100));
      const isAchieved = current >= target;
      const timeline = formatGoalTimeline(goal, isAchieved);

      const card = document.createElement('div');
      card.className = isAchieved ? 'goal-card goal-card-achieved' : 'goal-card';
      card.innerHTML = `
        <div>
          <div class="goal-header">
            <div>
              <h3 class="goal-title">${escapeHtml(goal.name)}</h3>
              ${timeline ? `<div class="goal-date">${escapeHtml(timeline)}</div>` : ''}
            </div>
            ${isAchieved
              ? '<span class="status-pill status-healthy">🎉 Goal reached</span>'
              : '<span class="status-pill status-info">In progress</span>'}
          </div>

          <div class="goal-body">
            <div class="goal-amount-block">
              <span class="goal-saved-val">${formatINR(current)}</span>
              <span class="goal-target-val">of ${formatINR(target)}</span>
            </div>
            <div class="progress-bar-container goal-progress-track" role="progressbar" aria-label="${escapeHtml(goal.name)} savings progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
              <div class="progress-bar-fill ${isAchieved ? 'fill-green' : 'fill-purple'}" style="width: ${pct}%;"></div>
            </div>
            <div class="goal-progress-meta">
              <span class="goal-progress-pct">${pct}% funded</span>
              <span class="goal-progress-remaining ${isAchieved ? 'text-brand' : ''}">
                ${isAchieved ? 'Target fully funded' : `${formatINR(target - current)} to go`}
              </span>
            </div>
          </div>
        </div>

        <div class="goal-actions">
          <button class="btn btn-outline btn-sm" onclick="window.CentsibleApp.openFundGoalModal('${goal.id}')">
            Update Funds
          </button>
          <button class="icon-btn" title="Edit goal" aria-label="Edit goal" onclick="window.CentsibleApp.openEditGoalModal('${goal.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn btn-delete" title="Delete goal" aria-label="Delete goal" onclick="window.CentsibleApp.confirmDeleteGoal('${goal.id}')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // =========================================================================
  // 9. RENDERING: SMART INSIGHTS TAB (Rule-Based, Transparent)
  // =========================================================================

  function renderInsightsView() {
    const fin = calculateMonthFinancials();

    // 1. Health Status
    const healthBadge = document.getElementById('insightHealthBadge');
    const healthSummary = document.getElementById('insightHealthSummary');
    const healthDetail = document.getElementById('insightHealthDetail');
    const healthDate = document.getElementById('insightHealthDate');
    const healthBar = document.getElementById('insightHealthBar');
    const healthSpendPct = document.getElementById('insightSpendPct');
    const healthMeterNote = document.getElementById('insightHealthMeterNote');

    if (healthDate) {
      healthDate.textContent = `${MONTH_NAMES[activeMonth]} ${activeYear} Spending Evaluation`;
    }

    const spendRatio = fin.totalIncome > 0 ? (fin.totalExpense / fin.totalIncome) : 0;

    if (healthBadge && healthSummary && healthDetail) {
      if (fin.totalExpense === 0) {
        healthBadge.textContent = 'No Spend';
        healthBadge.className = 'health-badge badge-blue';
        healthSummary.textContent = 'No expenditures logged yet';
        healthDetail.textContent = `You have full allowance of ${formatINR(fin.totalIncome)} available for ${MONTH_NAMES[activeMonth]}.`;
      } else if (fin.remainingBudget < 0) {
        healthBadge.textContent = 'Deficit';
        healthBadge.className = 'health-badge badge-red';
        healthSummary.textContent = `Overspent allowance by ${formatINR(Math.abs(fin.remainingBudget))}`;
        healthDetail.textContent = `Total expenses (${formatINR(fin.totalExpense)}) exceed your available income (${formatINR(fin.totalIncome)}) by ${Math.round((spendRatio - 1) * 100)}%. Immediate budget curtailment recommended.`;
      } else if (spendRatio > 0.85) {
        healthBadge.textContent = 'Tight';
        healthBadge.className = 'health-badge badge-amber';
        healthSummary.textContent = 'Allowance nearly exhausted';
        healthDetail.textContent = `You have used ${Math.round(spendRatio * 100)}% of your allowance with only ${formatINR(fin.remainingBudget)} remaining. Exercise restraint for upcoming days.`;
      } else {
        healthBadge.textContent = 'Healthy';
        healthBadge.className = 'health-badge badge-green';
        healthSummary.textContent = 'Sustainable spending pacing';
        healthDetail.textContent = `You have utilized ${Math.round(spendRatio * 100)}% of your monthly funds, leaving a comfortable cushion of ${formatINR(fin.remainingBudget)}.`;
      }
    }

    const spendPct = fin.totalIncome > 0
      ? Math.round((fin.totalExpense / fin.totalIncome) * 100)
      : (fin.totalExpense > 0 ? 100 : 0);
    if (healthSpendPct) {
      healthSpendPct.textContent = fin.totalIncome > 0 ? `${spendPct}%` : (fin.totalExpense > 0 ? 'No income' : '0%');
    }
    if (healthBar) {
      healthBar.style.width = `${Math.max(0, Math.min(100, spendPct))}%`;
      healthBar.className = `progress-bar-fill ${fin.remainingBudget < 0 ? 'fill-red' : (spendRatio > 0.85 ? 'fill-amber' : 'fill-green')}`;
      if (healthBar.parentElement) {
        healthBar.parentElement.setAttribute('aria-valuenow', String(Math.max(0, Math.min(100, spendPct))));
      }
    }
    if (healthMeterNote) {
      if (fin.totalIncome > 0) {
        healthMeterNote.textContent = `${formatINR(fin.totalExpense)} spent of ${formatINR(fin.totalIncome)} available this month.`;
      } else if (fin.totalExpense > 0) {
        healthMeterNote.textContent = 'Spending recorded, but no income is set for this month.';
      } else {
        healthMeterNote.textContent = 'No spending recorded yet.';
      }
    }

    // 2. Top Expense Drivers
    const topListEl = document.getElementById('insightTopCategoriesList');
    if (topListEl) {
      topListEl.innerHTML = '';

      if (fin.totalExpense === 0) {
        topListEl.innerHTML = '<p class="text-secondary text-sm">No expenses recorded for this month.</p>';
      } else {
        const sortedCats = EXPENSE_CATEGORIES
          .map(c => ({
            ...c,
            amount: fin.categoryExpenses[c.id] || 0,
            pct: Math.round(((fin.categoryExpenses[c.id] || 0) / fin.totalExpense) * 100)
          }))
          .filter(c => c.amount > 0)
          .sort((a, b) => b.amount - a.amount);

        sortedCats.slice(0, 4).forEach((item, index) => {
          const row = document.createElement('div');
          row.className = 'top-cat-item';
          row.innerHTML = `
            <div class="top-cat-header">
              <span><strong>#${index + 1}</strong> ${item.icon} ${item.label}</span>
              <span><strong>${formatINR(item.amount)}</strong> (${item.pct}%)</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill fill-green" style="background: ${item.color}; width: ${item.pct}%;"></div>
            </div>
          `;
          topListEl.appendChild(row);
        });
      }
    }

    // 3. Budget Alerts & Overrun Flags
    const alertsListEl = document.getElementById('insightAlertsList');
    if (alertsListEl) {
      alertsListEl.innerHTML = '';
      const alerts = [];

      EXPENSE_CATEGORIES.forEach(c => {
        const limit = Number(state.budgets[c.id]) || 0;
        const spent = fin.categoryExpenses[c.id] || 0;
        if (limit > 0) {
          const pct = Math.round((spent / limit) * 100);
          if (spent > limit) {
            alerts.push({
              level: 'danger',
              title: `${c.icon} ${c.label} Budget Exceeded`,
              text: `Spent ${formatINR(spent)} vs cap of ${formatINR(limit)} (${formatINR(spent - limit)} over budget).`
            });
          } else if (pct >= 80) {
            alerts.push({
              level: 'warning',
              title: `${c.icon} ${c.label} Approaching Limit`,
              text: `${pct}% of cap used (${formatINR(spent)} / ${formatINR(limit)}). Only ${formatINR(limit - spent)} left.`
            });
          }
        }
      });

      if (alerts.length === 0) {
        alertsListEl.innerHTML = `
          <div class="alert-item-box alert-healthy-box">
            <span>✅</span>
            <div><strong>All clear!</strong> None of your active category budgets have exceeded or approached critical thresholds.</div>
          </div>
        `;
      } else {
        alerts.forEach(al => {
          const item = document.createElement('div');
          item.className = `alert-item-box alert-${al.level}-box`;
          const icon = al.level === 'danger' ? '🚨' : '⚠️';
          item.innerHTML = `
            <span>${icon}</span>
            <div>
              <strong>${al.title}:</strong> ${al.text}
            </div>
          `;
          alertsListEl.appendChild(item);
        });
      }
    }

    // 4. Daily Spending & Runway Projection
    const runwayContainer = document.getElementById('insightRunwayContainer');
    if (runwayContainer) {
      const totalDays = new Date(activeYear, activeMonth + 1, 0).getDate();
      const today = new Date();
      const isCurrentRealMonth = (today.getFullYear() === activeYear && today.getMonth() === activeMonth);
      const currentDay = isCurrentRealMonth ? today.getDate() : Math.min(23, totalDays);
      const daysElapsed = Math.max(1, currentDay);
      const daysRemaining = Math.max(0, totalDays - daysElapsed);

      const dailySpend = Math.round(fin.totalExpense / daysElapsed);
      const safeDaily = daysRemaining > 0 && fin.remainingBudget > 0
        ? Math.round(fin.remainingBudget / daysRemaining)
        : 0;

      runwayContainer.innerHTML = `
        <div class="runway-tile">
          <span class="runway-tile-label">Current Daily Pace</span>
          <div class="runway-tile-value">${formatINR(dailySpend)} / day</div>
          <span class="runway-tile-sub">Over first ${daysElapsed} days of the month</span>
        </div>
        <div class="runway-tile">
          <span class="runway-tile-label">Safe Pacing Target</span>
          <div class="runway-tile-value ${fin.remainingBudget <= 0 ? 'text-danger' : 'text-brand'}">
            ${fin.remainingBudget <= 0 ? '₹0 / day' : `${formatINR(safeDaily)} / day`}
          </div>
          <span class="runway-tile-sub">For remaining ${daysRemaining} days in ${MONTH_NAMES[activeMonth].substring(0, 3)}</span>
        </div>
      `;
    }

    // 5. Actionable Student Savings Opportunities
    const tipsGridEl = document.getElementById('insightTipsGrid');
    if (tipsGridEl) {
      tipsGridEl.innerHTML = '';
      const tips = generateStudentSavingsTips(fin);

      tips.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tip-card';
        card.innerHTML = `
          <div>
            <div class="tip-card-top">
              <span class="tip-cat-badge">${escapeHtml(t.category)}</span>
            </div>
            <h4 class="tip-headline" style="margin-top: 0.5rem;">${escapeHtml(t.headline)}</h4>
            <p class="tip-body" style="margin-top: 0.35rem;">${escapeHtml(t.body)}</p>
          </div>
          <div class="tip-impact">
            <span>💡</span>
            <span>${escapeHtml(t.impact)}</span>
          </div>
        `;
        tipsGridEl.appendChild(card);
      });
    }
  }

  // Pure rule-based student financial tips
  function generateStudentSavingsTips(fin) {
    const tips = [];
    const foodSpend = fin.categoryExpenses['Food'] || 0;
    const foodPct = fin.totalExpense > 0 ? (foodSpend / fin.totalExpense) : 0;

    const shoppingSpend = fin.categoryExpenses['Shopping'] || 0;
    const shoppingPct = fin.totalExpense > 0 ? (shoppingSpend / fin.totalExpense) : 0;

    const travelSpend = fin.categoryExpenses['Travel'] || 0;
    const entSpend = fin.categoryExpenses['Entertainment'] || 0;

    // Rule 1: High food expenditure
    if (foodPct >= 0.35 || foodSpend > 3000) {
      tips.push({
        category: 'Food & Dining',
        headline: 'Optimize Campus Meals vs Delivery',
        body: `Food represents ${Math.round(foodPct * 100)}% of your expenses (${formatINR(foodSpend)}). Cutting 2-3 late night food delivery app orders in favor of hostel mess/canteen saves money without sacrificing nutrition.`,
        impact: `Potential savings: ~₹600 - ₹1,200 / month`
      });
    }

    // Rule 2: High shopping impulse
    if (shoppingPct >= 0.20 || shoppingSpend > 1500) {
      tips.push({
        category: 'Shopping',
        headline: 'Implement the 48-Hour Wishlist Rule',
        body: 'When shopping online, add items to your cart and wait 48 hours before paying. Up to 60% of student impulsive purchases are avoided once the initial dopamine rush fades.',
        impact: 'Cuts unnecessary apparel & gadget spends'
      });
    }

    // Rule 3: Commute & Travel pass
    if (travelSpend > 1000) {
      tips.push({
        category: 'Travel',
        headline: 'Student Metro / Bus Concessions',
        body: `You have spent ${formatINR(travelSpend)} on travel this month. Applying for your official student transit pass or carpooling to college can significantly lower daily transit rates.`,
        impact: 'Saves 25-40% on daily commute fares'
      });
    }

    // Rule 4: Entertainment & Group Activities
    if (entSpend > 1200) {
      tips.push({
        category: 'Entertainment',
        headline: 'Student Discounts on Entertainment',
        body: 'Check for student discounts on movie ticket bookings (weekday matinees) and music streaming subscriptions (Spotify/Apple Music student plans are just ₹59/month).',
        impact: 'Keep entertainment enjoyable within budget'
      });
    }

    // Rule 5: Healthy savings habit
    if (fin.remainingBudget > 1500) {
      tips.push({
        category: 'Savings Habit',
        headline: 'Automate a Small Rupee Transfer',
        body: `You currently have ${formatINR(fin.remainingBudget)} remaining this month. Allocating even ₹500 to one of your savings goals today accelerates your goal completion.`,
        impact: 'Builds financial discipline early'
      });
    }

    // Always ensure at least 3 tips are presented
    if (tips.length < 3) {
      tips.push({
        category: 'Student Finance',
        headline: 'Track Micro-Expenses Daily',
        body: 'Small daily UPI payments (chai, snacks, photocopies) quietly add up to 20% of student allowances. Logging them immediately keeps your numbers accurate and surprises low.',
        impact: 'Zero unaccounted monthly leaks'
      });
    }

    return tips.slice(0, 3);
  }

  // =========================================================================
  // 10. MODAL HANDLING & FORMS
  // =========================================================================

  function populateCategoryDropdown(selectEl, type) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icon} ${c.label}`;
      selectEl.appendChild(opt);
    });
  }

  function openAddTransactionModal(initialType = 'expense') {
    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    const title = document.getElementById('txModalTitle');
    const idInput = document.getElementById('txIdInput');
    const amountInput = document.getElementById('txAmountInput');
    const dateInput = document.getElementById('txDateInput');
    const descInput = document.getElementById('txDescInput');
    const catSelect = document.getElementById('txCategorySelect');
    const paymentSelect = document.getElementById('txPaymentSelect');

    hideAllFieldErrors();
    form.reset();
    idInput.value = '';
    title.textContent = 'Record Transaction';

    // Set radio
    const radio = form.querySelector(`input[name="txType"][value="${initialType}"]`);
    if (radio) radio.checked = true;

    populateCategoryDropdown(catSelect, initialType);

    // Default date to current active month day
    const today = new Date();
    let day = '15';
    if (today.getFullYear() === activeYear && today.getMonth() === activeMonth) {
      day = String(today.getDate()).padStart(2, '0');
    }
    dateInput.value = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}-${day}`;

    modal.classList.remove('hidden');
    amountInput.focus();
  }

  function openEditTransactionModal(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    const modal = document.getElementById('transactionModal');
    const form = document.getElementById('transactionForm');
    const title = document.getElementById('txModalTitle');
    const idInput = document.getElementById('txIdInput');
    const amountInput = document.getElementById('txAmountInput');
    const dateInput = document.getElementById('txDateInput');
    const descInput = document.getElementById('txDescInput');
    const catSelect = document.getElementById('txCategorySelect');
    const paymentSelect = document.getElementById('txPaymentSelect');

    hideAllFieldErrors();
    form.reset();

    idInput.value = tx.id;
    title.textContent = 'Edit Transaction';

    const radio = form.querySelector(`input[name="txType"][value="${tx.type}"]`);
    if (radio) radio.checked = true;

    populateCategoryDropdown(catSelect, tx.type);
    catSelect.value = tx.category;

    amountInput.value = tx.amount;
    dateInput.value = tx.date;
    descInput.value = tx.desc || '';
    if (paymentSelect) paymentSelect.value = tx.payment || 'UPI';

    modal.classList.remove('hidden');
    amountInput.focus();
  }

  function handleTransactionFormSubmit(e) {
    e.preventDefault();
    hideAllFieldErrors();

    const form = document.getElementById('transactionForm');
    const id = document.getElementById('txIdInput').value;
    const typeRadio = form.querySelector('input[name="txType"]:checked');
    const type = typeRadio ? typeRadio.value : 'expense';
    const amountInput = document.getElementById('txAmountInput');
    const dateInput = document.getElementById('txDateInput');
    const categoryInput = document.getElementById('txCategorySelect');
    const descInput = document.getElementById('txDescInput');
    const amountVal = parseFloat(amountInput.value);
    const dateVal = dateInput.value;
    const catVal = categoryInput.value;
    const descVal = descInput.value.trim();
    const paymentVal = document.getElementById('txPaymentSelect').value;

    let hasError = false;

    if (isNaN(amountVal) || amountVal <= 0 || !isFinite(amountVal)) {
      showFieldError('txAmountError', amountInput);
      hasError = true;
    }

    if (!dateVal) {
      showFieldError('txDateError', dateInput);
      hasError = true;
    }

    if (!catVal) {
      showFieldError('txCategoryError', categoryInput);
      hasError = true;
    }

    if (!descVal) {
      showFieldError('txDescError', descInput);
      hasError = true;
    }

    if (hasError) return;

    if (id) {
      // Edit
      const index = state.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        state.transactions[index] = {
          id,
          type,
          amount: Math.round(amountVal * 100) / 100,
          date: dateVal,
          category: catVal,
          desc: descVal,
          payment: paymentVal
        };
        showToast('Transaction updated successfully.');
      }
    } else {
      // Add New
      const newTx = {
        id: 'tx-' + Date.now(),
        type,
        amount: Math.round(amountVal * 100) / 100,
        date: dateVal,
        category: catVal,
        desc: descVal,
        payment: paymentVal
      };
      state.transactions.unshift(newTx);
      showToast('Transaction added.');
    }

    saveState();
    closeModal('transactionModal');
    renderAll();
  }

  function confirmDeleteTransaction(id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    openConfirmModal(
      `Delete "${tx.desc}" (${formatINR(tx.amount)})? This action cannot be undone.`,
      () => {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        renderAll();
        showToast('Transaction deleted.', 'info');
      }
    );
  }

  // Budgets Modal
  function openBudgetsModal() {
    const modal = document.getElementById('budgetsModal');
    const container = document.getElementById('categoryBudgetsInputs');
    if (!container) return;

    container.innerHTML = '';

    EXPENSE_CATEGORIES.forEach(cat => {
      const currentVal = state.budgets[cat.id] || 0;
      const row = document.createElement('div');
      row.className = 'budget-input-row';
      row.innerHTML = `
        <label for="budget_input_${cat.id}" class="budget-input-label">
          <span>${cat.icon}</span>
          <span>${cat.label}</span>
        </label>
        <div class="input-prefix-wrap" style="width: 160px;">
          <span class="input-prefix">₹</span>
          <input type="number" id="budget_input_${cat.id}" data-cat="${cat.id}" class="form-input" min="0" step="100" value="${currentVal}">
        </div>
      `;
      container.appendChild(row);
    });

    modal.classList.remove('hidden');
  }

  function handleBudgetsFormSubmit(e) {
    e.preventDefault();
    const inputs = document.querySelectorAll('#categoryBudgetsInputs input[data-cat]');
    inputs.forEach(inp => {
      const cat = inp.dataset.cat;
      const val = Math.max(0, parseFloat(inp.value) || 0);
      state.budgets[cat] = Math.round(val);
    });

    saveState();
    closeModal('budgetsModal');
    renderAll();
    showToast('Monthly category budgets updated.');
  }

  function openEditSingleBudget(catId) {
    openBudgetsModal();
    setTimeout(() => {
      const targetInput = document.getElementById(`budget_input_${catId}`);
      if (targetInput) {
        targetInput.focus();
        targetInput.select();
      }
    }, 50);
  }

  // Base Allowance Modal
  function openAllowanceModal() {
    const modal = document.getElementById('allowanceModal');
    const inp = document.getElementById('baseAllowanceInput');
    const err = document.getElementById('allowanceError');
    if (err) err.classList.add('hidden');
    inp.value = state.baseAllowance || 0;
    modal.classList.remove('hidden');
    inp.focus();
  }

  function handleAllowanceFormSubmit(e) {
    e.preventDefault();
    const inp = document.getElementById('baseAllowanceInput');
    const val = parseFloat(inp.value);

    if (isNaN(val) || val < 0 || !isFinite(val)) {
      showFieldError('allowanceError', inp);
      return;
    }

    state.baseAllowance = Math.round(val);
    saveState();
    closeModal('allowanceModal');
    renderAll();
    showToast('Base monthly allowance updated.');
  }

  // Savings Goals Modals
  function openNewGoalModal() {
    const modal = document.getElementById('goalModal');
    const form = document.getElementById('goalForm');
    const title = document.getElementById('goalModalTitle');
    const idInput = document.getElementById('goalIdInput');
    const nameInput = document.getElementById('goalNameInput');

    hideAllFieldErrors();
    form.reset();
    idInput.value = '';
    title.textContent = 'Create Savings Goal';

    modal.classList.remove('hidden');
    nameInput.focus();
  }

  function openEditGoalModal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    const modal = document.getElementById('goalModal');
    const form = document.getElementById('goalForm');
    const title = document.getElementById('goalModalTitle');
    const idInput = document.getElementById('goalIdInput');
    const nameInput = document.getElementById('goalNameInput');
    const targetInput = document.getElementById('goalTargetInput');
    const currentInput = document.getElementById('goalCurrentInput');
    const dateInput = document.getElementById('goalTargetDateInput');

    hideAllFieldErrors();
    form.reset();

    idInput.value = goal.id;
    title.textContent = 'Edit Savings Goal';
    nameInput.value = goal.name;
    targetInput.value = goal.target;
    currentInput.value = goal.current;
    dateInput.value = goal.targetDate || '';

    modal.classList.remove('hidden');
    nameInput.focus();
  }

  function handleGoalFormSubmit(e) {
    e.preventDefault();
    hideAllFieldErrors();

    const id = document.getElementById('goalIdInput').value;
    const nameInput = document.getElementById('goalNameInput');
    const targetInput = document.getElementById('goalTargetInput');
    const currentInput = document.getElementById('goalCurrentInput');
    const nameVal = nameInput.value.trim();
    const targetVal = parseFloat(targetInput.value);
    const currentVal = parseFloat(currentInput.value) || 0;
    const dateVal = document.getElementById('goalTargetDateInput').value;

    let hasError = false;

    if (!nameVal) {
      showFieldError('goalNameError', nameInput);
      hasError = true;
    }

    if (isNaN(targetVal) || targetVal <= 0 || !isFinite(targetVal)) {
      showFieldError('goalTargetError', targetInput);
      hasError = true;
    }

    if (isNaN(currentVal) || currentVal < 0 || !isFinite(currentVal)) {
      showFieldError('goalCurrentError', currentInput);
      hasError = true;
    }

    if (hasError) return;

    if (id) {
      const idx = state.goals.findIndex(g => g.id === id);
      if (idx !== -1) {
        state.goals[idx] = {
          id,
          name: nameVal,
          target: Math.round(targetVal),
          current: Math.round(currentVal),
          targetDate: dateVal || null
        };
        showToast('Savings goal updated.');
      }
    } else {
      const newGoal = {
        id: 'goal-' + Date.now(),
        name: nameVal,
        target: Math.round(targetVal),
        current: Math.round(currentVal),
        targetDate: dateVal || null
      };
      state.goals.push(newGoal);
      showToast('New savings goal created!');
    }

    saveState();
    closeModal('goalModal');
    renderAll();
  }

  function openFundGoalModal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    const modal = document.getElementById('fundGoalModal');
    const form = document.getElementById('fundGoalForm');
    const prompt = document.getElementById('fundGoalPrompt');
    const idInput = document.getElementById('fundGoalIdInput');
    const amountInput = document.getElementById('fundAmountInput');
    const err = document.getElementById('fundAmountError');

    if (err) err.classList.add('hidden');
    form.reset();

    idInput.value = goal.id;
    if (prompt) {
      prompt.textContent = `Goal: "${goal.name}". Currently saved: ${formatINR(goal.current)} of ${formatINR(goal.target)}.`;
    }

    modal.classList.remove('hidden');
    amountInput.focus();
  }

  function handleFundGoalFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('fundGoalIdInput').value;
    const actionRadio = document.querySelector('input[name="fundActionType"]:checked');
    const action = actionRadio ? actionRadio.value : 'deposit';
    const amountInput = document.getElementById('fundAmountInput');
    const amountVal = parseFloat(amountInput.value);
    const err = document.getElementById('fundAmountError');

    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    if (isNaN(amountVal) || amountVal <= 0 || !isFinite(amountVal)) {
      if (err) err.textContent = 'Please enter a valid amount greater than ₹0';
      showFieldError('fundAmountError', amountInput);
      return;
    }

    if (action === 'withdraw') {
      if (amountVal > goal.current) {
        if (err) err.textContent = `Cannot withdraw more than currently saved (${formatINR(goal.current)})`;
        showFieldError('fundAmountError', amountInput);
        return;
      }
      goal.current = Math.max(0, goal.current - amountVal);
      showToast(`Withdrew ${formatINR(amountVal)} from "${goal.name}".`, 'info');
    } else {
      goal.current += amountVal;
      showToast(`Deposited ${formatINR(amountVal)} into "${goal.name}"!`);
    }

    saveState();
    closeModal('fundGoalModal');
    renderAll();
  }

  function confirmDeleteGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    openConfirmModal(
      `Delete goal "${goal.name}"? Saved progress (${formatINR(goal.current)}) will be removed.`,
      () => {
        state.goals = state.goals.filter(g => g.id !== id);
        saveState();
        renderAll();
        showToast('Savings goal deleted.', 'info');
      }
    );
  }

  // Confirmation Modal
  function openConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const msgEl = document.getElementById('confirmModalMessage');
    const okBtn = document.getElementById('confirmOkBtn');

    if (msgEl) msgEl.textContent = message;
    pendingConfirmAction = onConfirm;
    modal.classList.remove('hidden');
    if (okBtn) okBtn.focus();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  function showFieldError(errorId, fieldEl) {
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.classList.remove('hidden');
    if (fieldEl) {
      fieldEl.classList.add('input-error');
      fieldEl.setAttribute('aria-invalid', 'true');
    }
  }

  function clearFieldError(fieldEl, errorId) {
    if (fieldEl) {
      fieldEl.classList.remove('input-error');
      fieldEl.removeAttribute('aria-invalid');
    }
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.classList.add('hidden');
  }

  function hideAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.input-error').forEach(el => {
      el.classList.remove('input-error');
      el.removeAttribute('aria-invalid');
    });
  }

  // Backup & Restore
  function downloadBackupJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `centsible_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON downloaded successfully.');
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && typeof parsed === 'object') {
          state.baseAllowance = typeof parsed.baseAllowance === 'number' ? parsed.baseAllowance : 12000;
          state.budgets = (parsed.budgets && typeof parsed.budgets === 'object') ? parsed.budgets : Object.assign({}, INITIAL_DEMO_DATA.budgets);
          state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
          state.goals = Array.isArray(parsed.goals) ? parsed.goals : [];

          saveState();
          closeModal('backupModal');
          renderAll();
          showToast('Data restored from backup file!');
        } else {
          throw new Error('Invalid structure');
        }
      } catch (err) {
        const errEl = document.getElementById('importFileError');
        if (errEl) errEl.classList.remove('hidden');
      }
    };
    reader.readAsText(file);
  }

  // =========================================================================
  // 11. NAVIGATION & TABS
  // =========================================================================

  function switchTab(tabId) {
    // Nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isTarget = tab.id === `tab-${tabId}`;
      tab.classList.toggle('active', isTarget);
      tab.setAttribute('aria-selected', isTarget);
    });

    // Content views
    document.querySelectorAll('.tab-view').forEach(view => {
      const isTarget = view.id === `view-${tabId}`;
      view.classList.toggle('active', isTarget);
    });

    // Re-render relevant view
    if (tabId === 'dashboard') renderDashboard();
    else if (tabId === 'transactions') renderTransactionsView();
    else if (tabId === 'budgets') renderBudgetsView();
    else if (tabId === 'savings') renderSavingsView();
    else if (tabId === 'insights') renderInsightsView();
  }

  function changeMonth(delta) {
    activeMonth += delta;
    if (activeMonth > 11) {
      activeMonth = 0;
      activeYear += 1;
    } else if (activeMonth < 0) {
      activeMonth = 11;
      activeYear -= 1;
    }

    updateMonthDisplay();
    renderAll();
  }

  function updateMonthDisplay() {
    const el = document.getElementById('currentMonthDisplay');
    if (el) {
      el.textContent = `${MONTH_NAMES[activeMonth]} ${activeYear}`;
    }
  }

  // =========================================================================
  // 12. TOAST NOTIFICATIONS
  // =========================================================================

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `
      <span style="font-weight: 700;">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // 13. MASTER RENDER & EVENT BINDINGS
  // =========================================================================

  function renderAll() {
    updateMonthDisplay();
    renderDashboard();
    renderTransactionsView();
    renderBudgetsView();
    renderSavingsView();
    renderInsightsView();
  }

  function bindEvents() {
    // Nav tabs
    ['dashboard', 'transactions', 'budgets', 'savings', 'insights'].forEach(id => {
      const btn = document.getElementById(`tab-${id}`);
      if (btn) btn.addEventListener('click', () => switchTab(id));
    });

    // Month navigation
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

    // Header Quick Add
    const openAddTxBtn = document.getElementById('openAddTransactionBtn');
    if (openAddTxBtn) openAddTxBtn.addEventListener('click', () => openAddTransactionModal('expense'));

    const quickAddTxBtn = document.getElementById('quickAddTxBtn');
    if (quickAddTxBtn) quickAddTxBtn.addEventListener('click', () => openAddTransactionModal('expense'));

    const txViewAddBtn = document.getElementById('txViewAddBtn');
    if (txViewAddBtn) txViewAddBtn.addEventListener('click', () => openAddTransactionModal('expense'));

    // Data dropdown menu
    const dataMenuBtn = document.getElementById('dataMenuBtn');
    const dataMenuDropdown = document.getElementById('dataMenuDropdown');
    if (dataMenuBtn && dataMenuDropdown) {
      dataMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dataMenuDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        dataMenuDropdown.classList.add('hidden');
      });
    }

    const resetDemoBtn = document.getElementById('resetDemoDataBtn');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        openConfirmModal('Reset all transactions, budgets, and savings goals back to initial demo data?', () => {
          resetToDemoData(true);
        });
      });
    }

    const clearAllBtn = document.getElementById('clearAllDataBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        openConfirmModal('Are you sure you want to clear ALL data? This will remove all transactions and goals.', () => {
          clearAllData();
        });
      });
    }

    function openBackupModal() {
      const modal = document.getElementById('backupModal');
      const errEl = document.getElementById('importFileError');
      const fileInp = document.getElementById('importFileInput');
      if (errEl) errEl.classList.add('hidden');
      if (fileInp) fileInp.value = '';
      if (modal) modal.classList.remove('hidden');
    }

    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', openBackupModal);
    }

    const importBtn = document.getElementById('importDataBtn');
    if (importBtn) {
      importBtn.addEventListener('click', openBackupModal);
    }

    const downloadJsonBtn = document.getElementById('downloadJsonBtn');
    if (downloadJsonBtn) downloadJsonBtn.addEventListener('click', downloadBackupJson);

    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImportFile(e.target.files[0]);
        }
      });
    }

    // Modal Close buttons
    document.querySelectorAll('.modal-close-btn, .modal-footer .btn-ghost').forEach(btn => {
      btn.addEventListener('click', () => {
        const overlay = btn.closest('.modal-overlay');
        if (overlay) overlay.classList.add('hidden');
      });
    });

    // Close modal on escape or backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.add('hidden'));
        if (dataMenuDropdown) dataMenuDropdown.classList.add('hidden');
      }
    });

    // Form Submissions
    const txForm = document.getElementById('transactionForm');
    if (txForm) txForm.addEventListener('submit', handleTransactionFormSubmit);

    // Dynamic category selector in Add/Edit Tx based on radio
    const txRadios = document.querySelectorAll('input[name="txType"]');
    txRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const select = document.getElementById('txCategorySelect');
        populateCategoryDropdown(select, e.target.value);
      });
    });

    // Clear a field's inline error as soon as the user corrects it
    const fieldErrorPairs = [
      ['txAmountInput', 'txAmountError'],
      ['txDateInput', 'txDateError'],
      ['txCategorySelect', 'txCategoryError'],
      ['txDescInput', 'txDescError'],
      ['goalNameInput', 'goalNameError'],
      ['goalTargetInput', 'goalTargetError'],
      ['goalCurrentInput', 'goalCurrentError'],
      ['fundAmountInput', 'fundAmountError'],
      ['baseAllowanceInput', 'allowanceError']
    ];
    fieldErrorPairs.forEach(([fieldId, errorId]) => {
      const field = document.getElementById(fieldId);
      if (!field) return;
      const clear = () => clearFieldError(field, errorId);
      field.addEventListener('input', clear);
      field.addEventListener('change', clear);
    });

    // Budgets Form
    const budgetsForm = document.getElementById('budgetsForm');
    if (budgetsForm) budgetsForm.addEventListener('submit', handleBudgetsFormSubmit);

    const openAllBudgetsBtn = document.getElementById('openAllBudgetsModalBtn');
    if (openAllBudgetsBtn) openAllBudgetsBtn.addEventListener('click', openBudgetsModal);

    const manageBudgetsBtn = document.getElementById('manageBudgetsBtn');
    if (manageBudgetsBtn) manageBudgetsBtn.addEventListener('click', openBudgetsModal);

    // Allowance Form
    const allowanceForm = document.getElementById('allowanceForm');
    if (allowanceForm) allowanceForm.addEventListener('submit', handleAllowanceFormSubmit);

    const openAllowanceModalBtn = document.getElementById('openAllowanceModalBtn');
    if (openAllowanceModalBtn) openAllowanceModalBtn.addEventListener('click', openAllowanceModal);

    // Goals Form
    const goalForm = document.getElementById('goalForm');
    if (goalForm) goalForm.addEventListener('submit', handleGoalFormSubmit);

    const openNewGoalModalBtn = document.getElementById('openNewGoalModalBtn');
    if (openNewGoalModalBtn) openNewGoalModalBtn.addEventListener('click', openNewGoalModal);

    const fundGoalForm = document.getElementById('fundGoalForm');
    if (fundGoalForm) fundGoalForm.addEventListener('submit', handleFundGoalFormSubmit);

    // Quick Preset Chips for Fund Goal Modal
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const amtInput = document.getElementById('fundAmountInput');
        if (amtInput) {
          amtInput.value = chip.dataset.preset;
          amtInput.focus();
        }
      });
    });

    // Confirm Modal Ok
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    if (confirmOkBtn) {
      confirmOkBtn.addEventListener('click', () => {
        closeModal('confirmModal');
        if (typeof pendingConfirmAction === 'function') {
          pendingConfirmAction();
          pendingConfirmAction = null;
        }
      });
    }

    // Cross-Tab navigation shortcuts
    const viewAllInsightsBtn = document.getElementById('viewAllInsightsBtn');
    if (viewAllInsightsBtn) viewAllInsightsBtn.addEventListener('click', () => switchTab('insights'));

    const viewAllTxBtn = document.getElementById('viewAllTxBtn');
    if (viewAllTxBtn) viewAllTxBtn.addEventListener('click', () => switchTab('transactions'));

    // Transactions View Filters
    const searchInput = document.getElementById('txSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        txFilters.search = e.target.value;
        renderTransactionsView();
      });
    }

    const typeFilter = document.getElementById('txTypeFilter');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        txFilters.type = e.target.value;
        renderTransactionsView();
      });
    }

    const catFilter = document.getElementById('txCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        txFilters.category = e.target.value;
        renderTransactionsView();
      });
    }

    const sortOrder = document.getElementById('txSortOrder');
    if (sortOrder) {
      sortOrder.addEventListener('change', (e) => {
        txFilters.sort = e.target.value;
        renderTransactionsView();
      });
    }
  }

  // Reset filters helper
  function resetTxFilters() {
    txFilters = {
      search: '',
      type: 'all',
      category: 'all',
      sort: 'date-desc'
    };
    const sInp = document.getElementById('txSearchInput');
    const tSel = document.getElementById('txTypeFilter');
    const cSel = document.getElementById('txCategoryFilter');
    const oSel = document.getElementById('txSortOrder');
    if (sInp) sInp.value = '';
    if (tSel) tSel.value = 'all';
    if (cSel) cSel.value = 'all';
    if (oSel) oSel.value = 'date-desc';
    renderTransactionsView();
  }

  // =========================================================================
  // 14. EXPOSE PUBLIC INTERFACE FOR INLINE CLICKS
  // =========================================================================

  window.CentsibleApp = {
    openAddTransactionModal,
    openEditTransactionModal,
    confirmDeleteTransaction,
    openNewGoalModal,
    openEditGoalModal,
    openFundGoalModal,
    confirmDeleteGoal,
    openEditSingleBudget,
    resetTxFilters
  };

  // =========================================================================
  // 15. INITIAL BOOTSTRAP
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    bindEvents();
    renderAll();
  });

})();
