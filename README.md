# Centsible — Make Every Rupee Count

> **A modern, responsive personal finance wellness web app designed specifically for college students in India.**

---

## 1. Problem Statement
College students frequently struggle to manage their pocket money and monthly allowances. Spending on canteen food, late-night food deliveries, books, festival passes, and shared travel adds up quickly. Without an intuitive, student-centric tool, balances disappear without clarity, budgets are breached, and savings goals remain unfulfilled.

---

## 2. Solution: Centsible
**Centsible** helps students take control of their finances with:
- **Dynamic Financial Dashboard**: Real-time summary cards for Monthly Allowance/Income, Total Expenses, Remaining Budget, and Active Savings.
- **Interactive Visual Breakdown**: Category spending donut chart and burn rate pacing indicator.
- **Transaction Manager**: Fast logging of expenses and income with Indian Rupee formatting (`₹`), UPI/Cash/Card/Bank tags, category filters, and live search.
- **CSV Bank Statement Import**: Browser-only parsing with automatic column detection, manual mapping, preview review, category editing, invalid-row handling, duplicate warnings, and explicit confirmation before saving.
- **Monthly Budget Planner**: Visual progress indicators with green/amber/red threshold alerts for each category.
- **Savings Goals**: Set goals with target amounts, track visual percentage progress, and deposit/withdraw funds.
- **Smart Insights (100% Rule-Based & Transparent)**: Real-time math evaluating health status, highest spend drivers, budget overrun flags, and actionable college savings tips (no artificial AI claims).
- **Zero-Backend Local Persistence**: Fully offline-capable using browser `localStorage` with initial demo data, reset confirmation, and JSON backup export/import.

---

## 3. Technology Stack
- **HTML5**: Semantic tags, accessible forms, ARIA attributes, and dialog modals.
- **CSS3**: Modern navy blue (`#0f172a`) and emerald green (`#10b981`) fintech palette, responsive grid layouts, custom SVG charts, and mobile breakpoints.
- **Vanilla JavaScript (ES6+)**: Modular application architecture, event delegations, and dynamic recalculations.
- **Browser localStorage**: Reliable client-side persistence (`centsible_state_v1`).

---

## 4. Project Structure
```text
Hacktoberfest/
├── index.html        # Semantic HTML application layout and dialog modals
├── styles.css        # Navy & emerald fintech design system and responsive styles
├── app.js            # Pure vanilla JavaScript application logic and state
├── statement_import.js # Pure CSV parsing, normalization, duplicate, and merge helpers
├── test_app.js       # Automated test suite verifying calculations, import, and validation
├── rules.md          # Project agent guidelines and constraints
├── skills.md         # Procedural coding skills and acceptance checklists
└── README.md         # Documentation, run instructions, and pitch guide
```

---

## 5. How to Run Locally on Windows 11

### Option 1: Direct File Opening (No Installation Needed)
1. Open File Explorer to `C:\Users\Dhruv S\Hacktoberfest`.
2. Double-click `index.html` to open it in Microsoft Edge, Google Chrome, or any modern web browser.

### Option 2: VS Code Live Server
1. Open the project folder in VS Code (`File` > `Open Folder...` > `C:\Users\Dhruv S\Hacktoberfest`).
2. If installed, right-click `index.html` in the explorer pane and select **Open with Live Server**.

### Option 3: Python Built-In HTTP Server
Open PowerShell in the project directory:
```powershell
python -m http.server 8000
```
Open your browser and navigate to `http://localhost:8000`.

---

## 6. How to Run the Automated Test Suite
Open PowerShell in the workspace and execute:
```powershell
node test_app.js
```
The suite currently runs 18 verification groups covering existing calculations plus CSV parsing, normalization, duplicate detection, merge safety, persistence, and responsive CSS. It uses synthetic fixtures only.

---

## 7. How to Import a Bank Statement (CSV)

### Open the importer

Use either entry point:

1. Open the **Transactions** tab and click **Import Statement**.
2. Or open the header **data menu (`...`)** and choose **Import Bank Statement (CSV)**.

### Workflow

1. **Choose CSV** — select a `.csv` file exported by your bank. Files stay in the browser.
2. **Map columns** — Centsible auto-detects common headers. Review and adjust the date, description, debit, credit, single amount, reference, balance, and Dr/Cr mappings.
3. **Confirm amount interpretation** — if the file uses one amount column, explicitly choose signed amounts, all expenses, all income, or a Dr/Cr indicator column. Centsible will not guess.
4. **Review** — inspect dates, descriptions, proposed types and categories, invalid rows, and suspected duplicates. Edit categories or types, deselect rows, or select duplicates you know are legitimate.
5. **Import** — click the primary button. Existing transactions, budgets, allowance, and goals are preserved; imported transactions are added to the same transaction manager.

### Supported CSV patterns

- Separate **debit/withdrawal** and **credit/deposit** columns.
- A single **signed amount** column (negative = expense, positive = income).
- A single unsigned amount column with an explicit interpretation chosen by the user.
- A single amount column plus a **Dr/Cr**, debit/credit, or transaction-type indicator column.
- Optional transaction reference/ID and running balance columns. Running balances are informational and never counted as income or expense.

Common header names are recognized, including variations such as `Date`, `Txn Date`, `Value Date`, `Narration`, `Particulars`, `Description`, `Withdrawal Amt`, `Deposit Amt`, `Amount`, `Ref No`, `UTR`, `Debit/Credit`, and `Closing Balance`.

Parsing handles quoted fields, commas inside quotes, CRLF/LF/CR line endings, blank rows, UTF-8 BOMs, common debit/credit indicators, Indian currency symbols, and thousands separators. Ambiguous numeric dates default to day-first (`DD/MM/YYYY`) and the date format can be overridden.

### Duplicate handling

Centsible warns about:

- A matching imported reference/transaction ID.
- A repeated reference inside the same file.
- The same normalized date, type, amount, and description as an existing transaction.

Suspected duplicates start **unselected** but are never silently discarded. Review and select any that are legitimate repeated purchases. Importing the same file again should produce duplicate warnings instead of silently doubling records.

### Limits and privacy

- Maximum file size: **2 MB**.
- Maximum transaction rows: **2,000**.
- Files are read entirely in the browser. No upload, backend, AI API, or external service is used.
- Imported records are saved under the existing `localStorage` key (`centsible_state_v1`). Browser `localStorage` is local but **not encrypted**, not a secure vault for highly sensitive financial records, and has no cloud synchronization.
- The original CSV is not stored; only the confirmed transaction rows are saved.

### PDF

PDF import is **not implemented** in this phase. There is no PDF upload control, OCR, or PDF parser. The architecture keeps `statement_import.js` separate from the UI so a future PDF parser can emit the same intermediate rows into the existing normalization, preview, duplicate, and import pipeline.

---

## 8. What to Demonstrate to Hackathon Judges

1. **Dashboard Overview**:
   - Point out the **Monthly Allowance** (`₹14,500`), **Expenses** (`₹7,380`), and **Remaining Allowance** (`₹7,120`).
   - Highlight the **Donut Chart** breaking down Food (canteen + Zomato), Entertainment, Shopping, and Education.
   - Show the **Daily Burn Rate** and **Safe Daily Allowance** indicators.

2. **Add an Expense**:
   - Click **+ Add Transaction**.
   - Record a Food expense of `₹350` paid via UPI.
   - Watch the dashboard metrics, remaining budget, chart, and recent transaction table update instantly.

3. **Check Budget Planner**:
   - Switch to the **Budgets** tab.
   - Show how progress bars turn amber (warning) or red (exceeded) when approaching spending caps.
   - Edit a category budget to demonstrate dynamic recalculation.

4. **Savings Goals**:
   - Switch to **Savings Goals**.
   - Show goals like "Semester Break Goa Trip" and "ANC Wireless Headphones".
   - Click **Update Funds** to deposit `₹500` and watch the progress bar advance.

5. **Smart Insights**:
   - Switch to **Smart Insights**.
   - Explain to the judges: *"Our insights are 100% transparent and rule-based—no AI hallucinations. It accurately calculates our top expense drivers, flags overbudget categories, and suggests student-friendly ways to save money."*

6. **Import a Bank Statement**:
   - Prepare a synthetic CSV with date, narration, debit, and credit columns.
   - Open **Transactions → Import Statement**.
   - Show column auto-mapping, the preview, invalid-row and duplicate warnings, category editing, and explicit import confirmation.
   - Re-import the same synthetic file to demonstrate duplicate warnings without saving a second copy.

7. **Persistence & Reset**:
   - Reload the browser page (`F5`) to prove that all data persists via `localStorage`.
   - Click the options menu (`...`) in the header to demonstrate **Reset to Demo Data** or **Export Data (JSON)**.

---

## 9. Limitations & Scope Notes
- **Local Storage Scope**: Data remains in the browser's `localStorage`. It is local-only, not encrypted, and not suitable for highly sensitive financial records. There are no bank credentials, account synchronization, or cloud backups.
- **CSV Import Only**: Bank statement import supports CSV. PDF extraction, OCR, and AI-based statement parsing are not implemented.
- **Demo Data**: Bundled transactions, budgets, and goals are synthetic sample data for demonstration.
- **Solo Hackathon Scope**: No backend, paid APIs, or external services are used, keeping the application lightweight and offline-capable.
