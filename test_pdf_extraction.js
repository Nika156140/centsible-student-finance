'use strict';

// Compatibility entry point for the permanent PDF browser suite.
// Full suite: node test_browser/run_pdf_browser_tests.js
process.argv.push('--only=extraction');
require('./test_browser/run_pdf_browser_tests');
