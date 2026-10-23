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
- **Transaction Manager**: Fast logging of expenses and income with Indian Rupee formatting (`₹`), UPI/Cash/Card tags, category filters, and live search.
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
├── test_app.js       # Automated test suite verifying calculations and validation
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
All unit tests and logic verifications will run and report status in your terminal.

---

## 7. What to Demonstrate to Hackathon Judges

1. **Dashboard Overview**:
   - Point out the **Monthly Allowance** (`₹14,500`), **Expenses** (`₹6,900`), and **Remaining Cushion** (`₹7,600`).
   - Highlight the **Donut Chart** breaking down Food (canteen + Zomato), Shopping, Entertainment, and Education.
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

6. **Persistence & Reset**:
   - Reload the browser page (`F5`) to prove that all data persists via `localStorage`.
   - Click the options menu (`...`) in the header to demonstrate **Reset to Demo Data** or **Export Data (JSON)**.

---

## 8. Limitations & Scope Notes
- **Local Storage Scope**: Data is stored securely in the browser's `localStorage` for privacy without exposing bank credentials or requiring cloud servers.
- **Solo Hackathon Scope**: No external paid APIs or backend servers were used, keeping the application lightweight, fast, and 100% reliable during offline judging demos.
