'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { startStaticServer, launchBrowser } = require('./harness');

const TESTS = [
  { key: 'extraction', name: 'PDF extraction', file: './tests/pdf_extraction.js' },
  { key: 'app', name: 'PDF app workflow', file: './tests/pdf_app_workflow.js' },
  { key: 'mobile', name: 'PDF mobile layout', file: './tests/pdf_mobile.js' },
  { key: 'file', name: 'File-protocol CSV/PDF behavior', file: './tests/pdf_file_protocol.js' }
];

async function main() {
  const onlyArg = process.argv.find(argument => argument.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length) : null;
  const selectedTests = only ? TESTS.filter(test => test.key === only) : TESTS;

  if (selectedTests.length === 0) {
    throw new Error(`Unknown --only value "${only}". Available: ${TESTS.map(test => test.key).join(', ')}`);
  }

  const repoRoot = path.resolve(__dirname, '..');
  const server = await startStaticServer(repoRoot);
  let browser = null;

  try {
    browser = await launchBrowser();
    const context = {
      repoRoot,
      origin: server.origin,
      pageUrl: `${server.origin}/index.html`,
      fileUrl: pathToFileURL(path.join(repoRoot, 'index.html')).href,
      browser,
      createPage: options => browser.createPage(options)
    };

    console.log(`PDF browser tests`);
    console.log(`Server: ${server.origin}`);
    console.log(`Browser: ${browser.version}`);
    console.log(`Browser path: ${browser.path}`);
    console.log(`Artifacts: ${browser.artifactsDir}`);
    console.log('');

    let failures = 0;

    for (const test of selectedTests) {
      console.log(`=== ${test.name} ===`);
      try {
        const run = require(test.file);
        await run(context);
        console.log(`✓ ${test.name} PASSED\n`);
      } catch (error) {
        failures += 1;
        console.error(`✗ ${test.name} FAILED`);
        console.error(error && error.stack ? error.stack : error);
        console.error('');
      }
    }

    if (failures > 0) {
      console.error(`${failures} browser test group(s) failed.`);
      process.exitCode = 1;
      return;
    }

    console.log('ALL PDF BROWSER TEST GROUPS PASSED');
  } finally {
    if (browser) {
      await browser.close();
    }
    await server.close();
  }
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
