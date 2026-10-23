'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { spawn, spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startStaticServer(root) {
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://127.0.0.1');
      const pathname = decodeURIComponent(requestUrl.pathname);
      const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const filePath = path.resolve(root, relativePath);
      const relative = path.relative(root, filePath);

      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
      }

      fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
          response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Not found');
          return;
        }

        const extension = path.extname(filePath).toLowerCase();
        response.writeHead(200, {
          'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
          'Content-Length': stats.size,
          'Cache-Control': 'no-store'
        });
        fs.createReadStream(filePath).pipe(response);
      });
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Server error');
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise(closeResolve => {
          try {
            if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
          } catch (error) {
            // Ignore connection cleanup failures.
          }
          server.close(() => closeResolve());
        })
      });
    });
  });
}

function findBrowser() {
  if (process.env.CENTSIBLE_BROWSER) {
    const configured = process.env.CENTSIBLE_BROWSER;
    if (!fs.existsSync(configured)) {
      throw new Error(`CENTSIBLE_BROWSER does not exist: ${configured}`);
    }
    return configured;
  }

  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ]
    : process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ]
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/usr/bin/microsoft-edge'
        ];

  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      'No supported Chrome/Edge browser was found. Set CENTSIBLE_BROWSER to the browser executable path.'
    );
  }
  return found;
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForJson(url, timeoutMs) {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }

  throw new Error(`Timed out waiting for browser endpoint ${url}: ${lastError ? lastError.message : 'unknown error'}`);
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve(true);
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

function forceKill(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGKILL');
    }
  } catch (error) {
    // Cleanup is best-effort.
  }
}

async function launchBrowser() {
  if (typeof WebSocket !== 'function') {
    throw new Error('This browser suite requires Node.js 22+ with a global WebSocket implementation.');
  }

  const browserPath = findBrowser();
  const debuggingPort = await getFreePort();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centsible-browser-profile-'));
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'centsible-browser-artifacts-'));

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--disable-default-apps',
    '--mute-audio',
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,1200',
    'about:blank'
  ];

  const child = spawn(browserPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  let browserLog = '';
  child.stdout.on('data', chunk => { browserLog += chunk.toString(); });
  child.stderr.on('data', chunk => { browserLog += chunk.toString(); });

  let version;
  try {
    version = await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`, 20000);
  } catch (error) {
    forceKill(child);
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (cleanupError) {
      // Ignore cleanup failures.
    }
    throw new Error(`${error.message}\nBrowser log:\n${browserLog.slice(-2000)}`);
  }

  return {
    path: browserPath,
    version: version.Browser || 'unknown browser',
    httpUrl: `http://127.0.0.1:${debuggingPort}`,
    artifactsDir,
    createPage: (options) => createPage({
      httpUrl: `http://127.0.0.1:${debuggingPort}`,
      artifactsDir
    }, options),
    close: async () => {
      try {
        const browserSocket = new WebSocket(version.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          browserSocket.onopen = resolve;
          browserSocket.onerror = reject;
        });
        browserSocket.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
        await sleep(300);
        browserSocket.close();
      } catch (error) {
        // Fall back to process termination.
      }

      const exited = await waitForExit(child, 4000);
      if (!exited) forceKill(child);
      await sleep(200);

      try {
        fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch (error) {
        console.warn(`Could not remove temporary browser profile: ${profileDir}`);
      }
    }
  };
}

async function createPage(browser, options) {
  const settings = options || {};
  const width = settings.width || 1440;
  const height = settings.height || 1200;
  const mobile = !!settings.mobile;
  const url = settings.url;

  if (!url) throw new Error('createPage requires a url.');

  const target = await fetch(
    `${browser.httpUrl}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' }
  ).then(response => response.json());

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const requests = [];
  const events = [];
  let id = 0;

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handlers.reject(new Error(JSON.stringify(message.error)));
      else handlers.resolve(message.result);
    } else if (message.method === 'Network.requestWillBeSent') {
      requests.push(message.params.request.url);
    } else if (message.method === 'Runtime.exceptionThrown' || message.method === 'Log.entryAdded') {
      events.push(message);
    }
  };

  ws.onclose = () => {
    pending.forEach(handlers => handlers.reject(new Error('Browser page WebSocket closed.')));
    pending.clear();
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  });

  const evalJs = async expression => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || 'Runtime evaluation failed');
    }
    return result.result.value;
  };

  const waitFor = async (expression, timeoutMs = 12000) => {
    const started = Date.now();
    let lastError = null;
    while (Date.now() - started < timeoutMs) {
      try {
        if (await evalJs(expression)) return true;
      } catch (error) {
        lastError = error;
      }
      await sleep(150);
    }
    throw new Error(`Timed out waiting for ${expression}${lastError ? `: ${lastError.message}` : ''}`);
  };

  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const filename = name.replace(/[^a-z0-9_.-]+/gi, '-');
    const file = path.join(browser.artifactsDir, filename);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  screenshot: ${file}`);
    return file;
  };

  const navigate = async targetUrl => {
    await send('Page.navigate', { url: targetUrl });
    await waitFor("document.readyState === 'complete'", 15000);
  };

  const reload = async () => {
    await send('Page.reload', { ignoreCache: true });
    await waitFor("document.readyState === 'complete'", 15000);
  };

  const close = async () => {
    try {
      await send('Page.close');
    } catch (error) {
      // The page may already be closed.
    }
    ws.close();
  };

  await navigate(url);

  return {
    send,
    evalJs,
    waitFor,
    screenshot,
    navigate,
    reload,
    close,
    requests,
    events,
    runtimeErrors: () => events.filter(event =>
      event.method === 'Runtime.exceptionThrown' ||
      (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error')
    )
  };
}

module.exports = {
  sleep,
  startStaticServer,
  findBrowser,
  launchBrowser,
  createPage,
  pathToFileURL
};
