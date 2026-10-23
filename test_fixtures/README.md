# Synthetic PDF test fixtures

All files here are fictional. They contain no real bank, account, customer, or
transaction data.

## Generate the standard fixtures

```powershell
node test_fixtures/generate_pdfs.js
```

This writes all fixtures, including the single-page, multipage, ambiguous,
invalid, cover-page, no-header, scanned, corrupt, page-limit,
Date & Time multi-line, and password-protected PDFs.

## Password-protected fixture

`synthetic-encrypted.pdf` is written by the generator from an embedded,
synthetic byte sequence. It uses the user password `synthetic-user` and owner
password `synthetic-owner`. The embedded bytes keep fixture regeneration
dependency-free; no Python or encryption package is required. It is included
only to test that the app rejects encrypted/password-protected PDFs with a
clear message and is not used for normal import testing.

## Privacy

The fixtures are deliberately tiny (all under 50 KB) and contain only made-up
names, dates, references, and amounts. Do not replace them with real bank
statements.
