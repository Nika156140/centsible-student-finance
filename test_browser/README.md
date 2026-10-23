# Centsible browser regression tests

These tests exercise the real app, PDF.js module/worker, local fixture server, and
headless browser. They are separate from `node test_app.js` because they need a
browser and DOM.

## Requirements

- Node.js 22 or newer (uses the built-in global `WebSocket` and `fetch`)
- Microsoft Edge, Google Chrome, or Chromium installed locally
- No npm packages or network access

The runner starts and stops its own local HTTP server and headless browser. It
uses a temporary browser profile and writes screenshots to a temporary
artifacts directory. It does not modify the project or use a CDN.

## Run

From the repository root:

```powershell
node test_browser/run_pdf_browser_tests.js
```

To use a specific browser executable:

```powershell
$env:CENTSIBLE_BROWSER = 'C:\path\to\msedge.exe'
node test_browser/run_pdf_browser_tests.js
```

The runner prints the browser version, server origin, and screenshot directory
at startup, then stops both the browser and server when finished.

Individual compatibility entry points are also available at the repository root:

```powershell
node test_pdf_extraction.js
node test_pdf_app.js
node test_pdf_mobile.js
node test_pdf_file_protocol.js
```

Each starts its own browser/server session. Prefer the full runner for one
browser session covering all four groups.

## Test groups

1. `pdf_extraction.js` — PDF.js loading, table reconstruction, signed/Dr-Cr/
   ambiguous amounts, multipage, cover page, Date & Time multi-line rows,
   references, scanned/encrypted/corrupt/no-header errors, local-only network
   requests.
2. `pdf_app_workflow.js` — full import workflow, category edits, totals,
   Date & Time multi-line To/From classification, duplicate re-import,
   cancellation, persistence, limits, error cases, and CSV regression.
3. `pdf_mobile.js` — 390px modal and preview layout smoke test.
4. `pdf_file_protocol.js` — CSV works under `file://`; PDF explains the local
   HTTP requirement without changing data.

## Notes

- Screenshots are written under the system temporary directory, not the repo.
- The runner fails with a clear message if no supported browser is found.
- The browser test suite is intentionally not part of `node test_app.js`; run
  both commands for full coverage.
