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
- **Bank Statement Import (CSV + text-based PDF)**: Browser-only parsing with automatic column detection, manual mapping, preview review, category editing, invalid-row handling, duplicate warnings, and explicit confirmation before saving. PDF text extraction uses a locally hosted PDF.js build.
- **Monthly Budget Planner**: Visual progress indicators with green/amber/red threshold alerts for each category.
- **Savings Goals**: Set goals with target amounts, track visual percentage progress, and deposit/withdraw funds.
- **Smart Insights (100% Rule-Based & Transparent)**: Real-time math evaluating health status, highest spend drivers, budget overrun flags, and actionable college savings tips (no artificial AI claims).
- **Zero-Backend Local Persistence**: Fully offline-capable using browser `localStorage` with initial demo data, reset confirmation, and JSON backup export/import.

---

## 3. Technology Stack
- **HTML5**: Semantic tags, accessible forms, ARIA attributes, and dialog modals.
- **CSS3**: Modern navy blue (`#0f172a`) and emerald green (`#10b981`) fintech palette, responsive grid layouts, custom SVG charts, and mobile breakpoints.
- **Vanilla JavaScript (ES6+)**: Modular application architecture, event delegations, and dynamic recalculations.
- **PDF.js 4.10.38**: Locally hosted Apache-2.0 module and worker for text-based PDF extraction. No runtime CDN or external parsing service.
- **Browser localStorage**: Local client-side persistence (`centsible_state_v1`), not encrypted storage.

---

## 4. Project Structure
```text
Hacktoberfest/
├── index.html        # Semantic HTML application layout and dialog modals
├── styles.css        # Navy & emerald fintech design system and responsive styles
├── app.js            # Pure vanilla JavaScript application logic and state
├── statement_import.js # Pure CSV parsing, normalization, duplicate, and merge helpers
├── statement_pdf.js  # Local PDF text extraction and table reconstruction
├── vendor/pdfjs/     # Pinned PDF.js 4.10.38 module, worker, license, and notice
├── test_fixtures/    # Synthetic PDF fixtures and dependency-free PDF fixture generator
├── test_browser/     # Repeatable headless-browser PDF/CSV regression suite
├── test_app.js       # Node test suite verifying calculations, PDF/CSV import, and validation
├── rules.md          # Project agent guidelines and constraints
├── skills.md         # Procedural coding skills and acceptance checklists
└── README.md         # Documentation, run instructions, and pitch guide
```

---

## 5. How to Run Locally on Windows 11

Centsible is a static web application. You do not need Node.js packages, a database, or a build step to run the app.

**Recommended: Run with Python's local HTTP server**

This method supports both CSV and text-based PDF statement imports.

**Prerequisites:** Git and Python 3. If you already have the repository downloaded, skip the cloning commands.

1. Open PowerShell.
2. Clone the PDF-support branch:

   ```powershell
   git clone -b round2-pdf-support https://github.com/Nika156140/centsible-student-finance.git
   cd centsible-student-finance
   ```

   If you already have the project, open PowerShell in the folder containing `index.html` instead.

3. Start the server:

   ```powershell
   py -m http.server 8000
   ```

   If the `py` command is unavailable but Python is installed, use:

   ```powershell
   python -m http.server 8000
   ```

4. Open this address in your browser:

   **http://localhost:8000**

Keep the PowerShell window open while using Centsible. To stop the server, return to that window and press `Ctrl+C`.

### Alternative: VS Code Live Server

1. Open the Centsible project folder in VS Code.
2. Install the **Live Server** extension if it is not already installed.
3. In the Explorer pane, right-click `index.html` and select **Open with Live Server**.
4. Open the local HTTP address displayed by the extension.

Live Server provides HTTP hosting for the application, which is required for PDF module and worker loading.

### Limited option: Open index.html directly

You can double-click `index.html` in File Explorer to open Centsible without starting a server. Basic application functionality and CSV import can work in this mode, but **PDF statement import is not supported through direct `file://` opening**.

Use the Python server or VS Code Live Server when importing text-based PDF statements.

### Privacy and limitations

CSV and supported text-based PDF statements are processed locally in your browser. The app does not require uploading your statements to an external parsing service. Scanned/image-only and password-protected PDFs are not supported.

---

## 6. How to Run the Automated Test Suite
Open PowerShell in the workspace and execute:
```powershell
node test_app.js
```
The Node suite currently runs 22 verification groups covering existing calculations plus CSV parsing, PDF line/table reconstruction, the multi-line Date & Time format, normalization, duplicate detection, merge safety, persistence, responsive CSS, local PDF.js assets, and synthetic fixture integrity. It uses synthetic fixtures only.

The repository also includes a repeatable headless-browser suite for real PDF.js extraction and the full import UI:

```powershell
node test_browser/run_pdf_browser_tests.js
```

It requires Node.js 22+ and a local Chrome/Edge/Chromium installation. The runner starts and stops its own local HTTP server and headless browser, uses a temporary profile, writes screenshots to a temporary artifacts directory, and makes no external API calls. See `test_browser/README.md`.

The root entry points `test_pdf_extraction.js`, `test_pdf_app.js`, `test_pdf_mobile.js`, and `test_pdf_file_protocol.js` run individual groups for compatibility.

Regenerate all synthetic PDFs with:

```powershell
node test_fixtures/generate_pdfs.js
```

The password-protected fixture is synthetic and regenerated by the same generator from embedded bytes for error-path testing.

---

## 7. How to Import a Bank Statement (CSV or PDF)

### Open the importer

Use either entry point:

1. Open the **Transactions** tab and click **Import Statement**.
2. Or open the header **data menu (`...`)** and choose **Import Bank Statement (CSV / PDF)**.

### Workflow

1. **Choose file** — select a `.csv` or text-based `.pdf` statement. Files stay in the browser.
2. **Map columns** — Centsible auto-detects common headers. Review and adjust the date, description, debit, credit, single amount, reference, balance, and Dr/Cr mappings. PDF column positions are reconstructed from the table header before mapping.
3. **Confirm amount interpretation** — if the statement uses one amount column, explicitly choose signed amounts, all expenses, all income, or a Dr/Cr indicator column. Centsible will not guess.
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

### Supported PDF layouts

PDF import supports **text-based PDFs with selectable text and a recognizable transaction-table header**. The extractor reconstructs lines and columns from PDF text coordinates, then feeds the resulting table into the same mapping and preview pipeline.

Reliably supported:

- Single-page and multipage statement tables.
- Repeated table headers on later pages.
- Cover/summary pages before the transaction table (the skipped content is reported).
- Separate debit and credit columns.
- A single amount column, including negative values; the user still chooses the interpretation.
- A single amount column plus a Dr/Cr indicator column.
- The recognized multi-line format with headers `Date & Time`, `Transaction Details`, `Amount`, and `Closing balance`.
  - Time and metadata lines such as UPI ID, Txn ID, and UTR are combined with the associated transaction.
  - `To ...` is treated as an outgoing expense and `From ...` as incoming income only for this recognized format.
  - Missing/unknown prefixes remain invalid for review; no direction is guessed from the amount.
  - A Txn ID or UTR is preserved as the transaction reference for duplicate detection.
- Optional reference and running-balance columns.
- Description lines wrapped onto a following line without another date/amount.
- Page footers and page numbering.

Explicitly not supported:

- Scanned or image-only PDFs. **OCR is not implemented.**
- Password-protected or encrypted PDFs.
- PDFs without a recognizable table header.
- PDFs where page layouts change significantly between pages.
- Highly complex multi-column or multi-line transaction layouts.
- PDF.js module loading when the app is opened directly through `file://`.

PDF import must be tested and used through a local HTTP server. CSV import continues to work with either direct file opening or an HTTP server.

### Duplicate handling

Centsible warns about:

- A matching imported reference/transaction ID.
- A repeated reference inside the same file.
- The same normalized date, type, amount, and description as an existing transaction.

Suspected duplicates start **unselected** but are never silently discarded. Review and select any that are legitimate repeated purchases. Importing the same file again should produce duplicate warnings instead of silently doubling records.

### Limits and privacy

- CSV maximum file size: **2 MB**.
- PDF maximum file size: **10 MB**, maximum **30 pages**, and maximum **60,000 extracted text items**.
- Maximum transaction rows: **2,000**.
- Files are read entirely in the browser. No upload, backend, AI API, or external parsing service is used.
- PDF text extraction uses the locally hosted PDF.js module and worker. No runtime CDN request is made.
- Imported records are saved under the existing `localStorage` key (`centsible_state_v1`). Browser `localStorage` is local but **not encrypted**, not a secure vault for highly sensitive financial records, and has no cloud synchronization.
- The original CSV/PDF is not stored; only confirmed transaction rows are saved.
- Statement contents and account numbers are not logged by the importer.

### PDF.js library and license

- **PDF.js 4.10.38**, legacy module build.
- Local files:
  - `vendor/pdfjs/pdf.min.mjs`
  - `vendor/pdfjs/pdf.worker.min.mjs`
  - `vendor/pdfjs/LICENSE`
  - `vendor/pdfjs/README.md`
- License: **Apache License 2.0**.
- The assets were copied from the pinned `pdfjs-dist@4.10.38` package; see `vendor/pdfjs/README.md` for hashes and source details.
- The PDF.js module and worker are loaded lazily only after a PDF is selected.

### Test the importer locally with synthetic fixtures

Start the local server:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`, then use **Transactions → Import Statement** with fixtures from `test_fixtures/`:

- `synthetic-debit-credit.pdf` — single-page debit/credit table with references and wrapped description.
- `synthetic-signed-amount.pdf` — single signed amount column.
- `synthetic-ambiguous.pdf` — unsigned single amount requiring interpretation.
- `synthetic-indicator.pdf` — amount plus Dr/Cr column.
- `synthetic-date-time-multiline.pdf` — multi-line Date & Time metadata, To/From direction, missing balances, repeated headers, and multipage rows.
- `synthetic-invalid.pdf` — invalid date/amount rows.
- `synthetic-multipage.pdf` — repeated headers across two pages.
- `synthetic-cover-page.pdf` — cover page before the table.
- `synthetic-no-header.pdf` — unsupported layout.
- `synthetic-scanned.pdf` — image-only/blank page.
- `synthetic-encrypted.pdf` — password-protected PDF.
- `synthetic-corrupt.pdf` — malformed PDF.
- `synthetic-many-pages.pdf` — page-count limit.

All fixture data is fictional. The generated PDFs can be recreated with `node test_fixtures/generate_pdfs.js`; the small password-protected fixture is pre-generated for error-path testing.

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
   - For PDF, serve the app via `python -m http.server 8000` and use a synthetic text-based PDF. Highlight that scanned and encrypted PDFs are rejected with clear explanations.

7. **Persistence & Reset**:
   - Reload the browser page (`F5`) to prove that all data persists via `localStorage`.
   - Click the options menu (`...`) in the header to demonstrate **Reset to Demo Data** or **Export Data (JSON)**.

---

## 9. Limitations & Scope Notes
- **Local Storage Scope**: Data remains in the browser's `localStorage`. It is local-only, not encrypted, and not suitable for highly sensitive financial records. There are no bank credentials, account synchronization, or cloud backups.
- **Text-Based PDF Only**: PDF import requires selectable text and a recognizable table header. Scanned/image-only PDFs, password-protected PDFs, and unusual layouts are rejected. OCR is not implemented.
- **CSV and PDF Formats Only**: Excel workbooks and proprietary bank formats are not supported.
- **PDF Requires Local HTTP**: PDF.js module/worker loading is blocked by some browsers under `file://`; use a local HTTP server for PDF import. CSV import still works in direct-file mode.
- **Demo Data**: Bundled transactions, budgets, goals, and all test fixtures are synthetic sample data for demonstration.
- **Solo Hackathon Scope**: No backend, paid APIs, or external services are used, keeping the application lightweight and offline-capable.
