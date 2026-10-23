# Centsible — Agent Rules

These rules apply to every coding task in this repository.

## 1. Project Identity
- App name: **Centsible**
- Tagline: **Make Every Rupee Count.**
- Purpose: help college students in India track expenses, manage budgets, understand spending, and work toward savings goals.
- Use Indian Rupee formatting (`₹`) wherever money is displayed.
- Keep branding consistent across the app title, browser tab, header, visible UI, and project documentation.

## 2. Main Objective
Build a polished, reliable, responsive hackathon prototype. A small set of working features is better than many incomplete features.

## 3. Technology Constraints
- Use HTML, CSS, and vanilla JavaScript.
- Main files: `index.html`, `styles.css`, and `app.js`, unless the existing project already has a sensible structure.
- Use browser `localStorage` for persistence.
- Do not add a backend, authentication, bank connections, paid APIs, or complex frameworks unless the user explicitly changes the scope.
- Do not add dependencies unless necessary and the reason is explained.
- Keep local setup simple.

## 4. Required Features
Maintain these features when they exist:
1. Dashboard with monthly income/allowance, expenses, remaining budget, and savings progress.
2. Transactions that can be added, edited, and deleted, with amount, date, category, and description.
3. Categories such as Food, Travel, Shopping, Education, Entertainment, and Other.
4. Category budgets, progress indicators, and overspending warnings.
5. Savings goals with a name, target amount, current amount, and progress.
6. Smart Insights derived from transaction data using transparent, rule-based logic.
7. Persistent data using `localStorage`.
8. Clearly identified demo data, useful empty states, input validation, and a safe reset option.
9. Responsive desktop and mobile layouts.

Do not remove an existing feature just because it is not listed here. Inspect the project first.

## 5. Data and Calculation Integrity
- Calculate totals from actual stored transactions; never hardcode dashboard totals.
- Keep calculations consistent across dashboard cards, charts, budgets, and insights.
- Define income and expense transactions clearly and handle them consistently.
- Validate required fields and ensure amounts are finite and greater than zero.
- Handle empty data, invalid values, deleted transactions, and month/category filtering safely.
- Avoid overwriting saved user data unexpectedly.
- When changing the data structure, provide a safe migration or fallback for existing `localStorage` data.
- Ensure savings calculations are consistent with the app's stated definition.

## 6. Smart Insights and Honesty
- Insights must be based on available transaction data and explainable rules.
- Do not claim the app uses a real AI model unless one is actually integrated.
- Do not claim bank integrations, account synchronization, encryption, or cloud backup unless implemented and verified.
- Label sample transactions as demo data.
- Never invent user statistics, testimonials, financial outcomes, or test results.
- Do not present suggestions as professional financial advice.

## 7. UI and Accessibility
- Maintain a clean, modern navy-and-green fintech style.
- Prioritize readability, clear hierarchy, consistent spacing, and usable forms.
- Use semantic HTML and labels for form controls.
- Provide visible focus states and sufficient color contrast.
- Do not rely on color alone to communicate warnings or status.
- Ensure buttons and links have clear labels.
- Keep layouts usable on narrow mobile screens as well as desktop.
- Avoid unrelated redesigns during a bug fix.

## 8. Required Workflow for Every Task
1. Inspect relevant files and understand the existing implementation.
2. State a short plan before broad changes.
3. Make the smallest targeted changes that solve the task.
4. Preserve working behavior and existing user data.
5. Run the app or available checks when possible.
6. Test affected user flows and inspect errors when available.
7. Fix regressions caused by the changes.
8. Summarize files changed, tests actually performed, results, and remaining limitations.

Do not claim to have run a command, opened a browser, or passed a test unless that action actually happened.

## 9. Change Control
- Do not rewrite the entire application to make a small change.
- Do not change the framework, architecture, storage keys, or data model without a clear need.
- Do not add unrelated features or polish during a narrowly scoped task.
- For UI-only work, do not change calculations, data models, or storage behavior.
- For calculation-only work, avoid unnecessary visual changes.
- Ask before destructive changes or deleting user data.
- For a rename to Centsible, update visible branding without rebuilding the app.

## 10. Security and Privacy
- Do not request, store, or expose bank credentials, passwords, API keys, or secrets.
- Do not add real bank integrations as a shortcut or represent mock integrations as real.
- Treat locally stored financial data as sensitive; explain that browser `localStorage` is not secure storage for highly sensitive information.
- Do not log personal transaction details unnecessarily.

## 11. Completion Report
At the end of a task, provide:
- What changed.
- Files created or modified.
- How to run the app, if relevant.
- Tests actually performed and their results.
- Tests not performed.
- Known limitations or follow-up work.
