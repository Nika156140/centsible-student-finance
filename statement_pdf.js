/**
 * Centsible — Text-Based PDF Statement Extraction
 *
 * Uses a locally hosted, pinned PDF.js build to extract text items and
 * reconstruct a simple bank-statement table. The output is deliberately the
 * same { headers, rows, rowNumbers } shape used by the CSV importer, so the
 * existing mapping, preview, duplicate, and import pipeline can be reused.
 *
 * This module does not perform OCR. Scanned/image-only PDFs are rejected.
 */

(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CentsibleStatementPdf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const MAX_PDF_BYTES = 10 * 1024 * 1024;
  const MAX_PDF_PAGES = 30;
  const MAX_PDF_TEXT_ITEMS = 60000;
  const MAX_PDF_ROWS = 2000;
  const LINE_Y_TOLERANCE = 3.5;
  const CELL_GAP = 8;
  const HEADER_SCAN_LIMIT = 40;
  const PDFJS_MODULE_PATH = 'vendor/pdfjs/pdf.min.mjs';
  const PDFJS_WORKER_PATH = 'vendor/pdfjs/pdf.worker.min.mjs';

  const DATE_LIKE_PATTERN = /(\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b|\b\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}\b|\b\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-]\d{2,4}\b|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})/i;

  function getCore() {
    if (root && root.CentsibleStatementImport) return root.CentsibleStatementImport;
    if (typeof require === 'function') {
      try {
        return require('./statement_import.js');
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  const core = getCore();

  let pdfjsPromise = null;

  function makeError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  function failure(code, message) {
    return { ok: false, code, error: message };
  }

  async function loadPdfJs() {
    if (pdfjsPromise) return pdfjsPromise;

    if (typeof document === 'undefined') {
      throw makeError('environment', 'PDF extraction requires a browser environment.');
    }

    if (document.location && document.location.protocol === 'file:') {
      throw makeError(
        'server-required',
        'PDF import needs the app to be served locally. Run "python -m http.server 8000" and open http://localhost:8000.'
      );
    }

    const moduleUrl = new URL(PDFJS_MODULE_PATH, document.baseURI).href;
    const workerUrl = new URL(PDFJS_WORKER_PATH, document.baseURI).href;

    pdfjsPromise = import(moduleUrl)
      .then(pdfjs => {
        if (!pdfjs || typeof pdfjs.getDocument !== 'function') {
          throw makeError('module-load', 'PDF.js did not load correctly.');
        }
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        return pdfjs;
      })
      .catch(() => {
        pdfjsPromise = null;
        throw makeError(
          'module-load',
          'PDF support could not load. Make sure the local PDF.js files are present and the app is served over http://localhost.'
        );
      });

    return pdfjsPromise;
  }

  function groupTextItemsByLine(items, tolerance) {
    const yTolerance = Number.isFinite(tolerance) ? tolerance : LINE_Y_TOLERANCE;
    if (!Array.isArray(items)) return [];

    const sorted = items
      .filter(item => item && typeof item.str === 'string' && item.str.trim())
      .slice()
      .sort((a, b) => (b.y - a.y) || (a.x - b.x));

    const lines = [];

    sorted.forEach(item => {
      let target = null;
      for (const line of lines) {
        if (Math.abs(line.y - item.y) <= yTolerance) {
          target = line;
          break;
        }
      }
      if (!target) {
        target = { y: item.y, items: [] };
        lines.push(target);
      }
      target.items.push(item);
    });

    lines.forEach(line => line.items.sort((a, b) => a.x - b.x));
    lines.sort((a, b) => b.y - a.y);
    return lines;
  }

  function mergeLineItemsByGap(items, gapThreshold) {
    const gap = Number.isFinite(gapThreshold) ? gapThreshold : CELL_GAP;
    const sorted = (items || []).slice().sort((a, b) => a.x - b.x);
    const cells = [];

    sorted.forEach(item => {
      const text = core ? core.cleanText(item.str) : String(item.str || '').trim();
      if (!text) return;

      const width = Number.isFinite(item.width) ? item.width : 0;
      const endX = item.x + width;
      const last = cells[cells.length - 1];

      if (last && item.x - last.endX <= gap) {
        last.text = core ? core.cleanText(`${last.text} ${text}`) : `${last.text} ${text}`.trim();
        last.endX = Math.max(last.endX, endX);
        last.width = last.endX - last.x;
        last.center = last.x + last.width / 2;
      } else {
        cells.push({
          text,
          x: item.x,
          endX,
          width,
          center: item.x + width / 2
        });
      }
    });

    return cells;
  }

  function detectHeaderLine(lines) {
    if (!core || !Array.isArray(lines)) return null;

    let best = null;
    const limit = Math.min(lines.length, HEADER_SCAN_LIMIT);

    for (let index = 0; index < limit; index += 1) {
      const cells = mergeLineItemsByGap(lines[index].items, CELL_GAP);
      if (cells.length < 3) continue;

      const labels = cells.map(cell => cell.text);
      const detected = core.detectColumnMapping(labels);
      const mapping = detected.mapping;
      const hasAmount = mapping.debit !== null || mapping.credit !== null || mapping.amount !== null;

      if (mapping.date !== null && mapping.description !== null && hasAmount) {
        let score = 8 + cells.length;
        if (mapping.balance !== null) score += 1;
        if (mapping.reference !== null) score += 1;
        if (mapping.indicator !== null) score += 1;

        if (!best || score > best.score) {
          best = { index, cells, labels, mapping, score };
        }
      }
    }

    return best;
  }

  function buildColumns(headerLine) {
    if (!core || !headerLine || !Array.isArray(headerLine.cells)) {
      return { ok: false };
    }

    const columns = headerLine.cells.map(cell => ({
      label: cell.text,
      x: cell.x,
      width: cell.width,
      center: cell.center
    }));

    const labels = columns.map(column => column.label);
    const detected = core.detectColumnMapping(labels);
    const hasAmount = detected.mapping.debit !== null
      || detected.mapping.credit !== null
      || detected.mapping.amount !== null;

    if (detected.mapping.date === null || detected.mapping.description === null || !hasAmount) {
      return { ok: false };
    }

    return {
      ok: true,
      columns,
      labels,
      mapping: detected.mapping
    };
  }

  function normalizedLabels(labels) {
    return (labels || []).map(label => (core ? core.normalizeHeader(label) : String(label).toLowerCase())).join('|');
  }

  function sameHeaderLabels(a, b) {
    return normalizedLabels(a) === normalizedLabels(b);
  }

  function isFooterLine(text) {
    const value = core ? core.cleanText(text) : String(text || '').trim();
    if (!value) return true;
    if (/^\d+$/.test(value)) return true;
    if (/^page\s+\d+(?:\s+(?:of|\/)\s*\d+)?$/i.test(value)) return true;
    if (/^(continued|statement continued)\b/i.test(value)) return true;
    if (/^this is a (?:computer|system)[ -]generated\b/i.test(value)) return true;
    return false;
  }

  function hasDateLikeText(text) {
    return DATE_LIKE_PATTERN.test(String(text || ''));
  }

  function assignItemsToColumns(items, columns) {
    const cells = columns.map(() => []);

    (items || []).forEach(item => {
      const center = item.x + (Number.isFinite(item.width) ? item.width : 0) / 2;
      let bestIndex = 0;
      let bestDistance = Infinity;

      columns.forEach((column, index) => {
        const distance = Math.abs(center - column.center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      cells[bestIndex].push(item.str);
    });

    return cells.map(parts => {
      const text = parts.join(' ');
      return core ? core.cleanText(text) : text.trim();
    });
  }

  function lineStartsNearDescription(line, columns, descriptionIndex) {
    if (!Array.isArray(line.items) || line.items.length === 0) return false;
    if (descriptionIndex === null || descriptionIndex === undefined) return false;
    const column = columns[descriptionIndex];
    if (!column) return false;

    const firstX = Math.min(...line.items.map(item => item.x));
    const lastX = Math.max(...line.items.map(item => item.x + (Number.isFinite(item.width) ? item.width : 0)));
    const lineCenter = (firstX + lastX) / 2;

    return Math.abs(lineCenter - column.center) <= 170;
  }

  // -------------------------------------------------------------------------
  // Format-specific adapter: Date & Time / Transaction Details / Amount /
  // Closing balance statements with multi-line transaction metadata.
  // -------------------------------------------------------------------------

  function isDateTimeTransactionHeader(labels) {
    if (!core || !Array.isArray(labels)) return false;
    const normalized = labels.map(label => core.normalizeHeader(label)).filter(Boolean);

    const hasDateTime = normalized.some(label =>
      label === 'date time'
      || label === 'date and time'
      || label.startsWith('date time ')
      || label.startsWith('date and time ')
    );
    const hasDetails = normalized.some(label =>
      label === 'transaction details' || label.startsWith('transaction details ')
    );
    const hasAmount = normalized.some(label =>
      label === 'amount' || label.startsWith('amount ')
    );
    const hasClosingBalance = normalized.some(label =>
      label === 'closing balance' || label.startsWith('closing balance ')
    );

    return hasDateTime && hasDetails && hasAmount && hasClosingBalance;
  }

  function findDateTimeHeaderLine(lines) {
    if (!Array.isArray(lines)) return null;
    const limit = Math.min(lines.length, HEADER_SCAN_LIMIT);

    for (let index = 0; index < limit; index += 1) {
      const cells = mergeLineItemsByGap(lines[index].items, 18);
      const labels = cells.map(cell => cell.text);
      if (isDateTimeTransactionHeader(labels)) {
        return { index, cells, labels };
      }
    }

    return null;
  }

  function extractTimeOnly(value) {
    const text = core.cleanText(value);
    const match = text.match(/^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)$/i);
    return match ? core.cleanText(match[1]) : '';
  }

  function extractTimeFromText(value) {
    const text = core.cleanText(value);
    const match = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    return match ? core.cleanText(match[1]) : '';
  }

  function extractTransactionReference(values) {
    const text = core.cleanText((values || []).join(' '));
    const transactionId = text.match(/\b(?:txn|transaction)\s*(?:id|no|number|ref(?:erence)?)\s*[:\-]?\s*([A-Za-z0-9._\/-]{4,})/i);
    if (transactionId) return transactionId[1];

    const utr = text.match(/\butr\s*[:\-]?\s*([A-Za-z0-9._\/-]{4,})/i);
    return utr ? utr[1] : '';
  }

  function directionFromDetails(details) {
    const text = core.cleanText(details);

    // Only the leading prefix is a direction signal. Do not search arbitrary
    // metadata, and do not infer from the amount sign.
    if (/^(?:to\s*[\/&]\s*from|from\s*[\/&]\s*to)\b/i.test(text)) return '';
    if (/^to\b/i.test(text)) return 'expense';
    if (/^from\b/i.test(text)) return 'income';
    return '';
  }

  function isSummaryOrFooterText(text) {
    const value = core.cleanText(text);
    if (!value || isFooterLine(value)) return true;

    return /^(opening|closing|available|ledger|statement)\s+balance\b/i.test(value)
      || /^(total|summary|grand\s+total)\b/i.test(value)
      || /^statement\s+(summary|period)\b/i.test(value);
  }

  function isLikelyMetadataLine(text) {
    const value = core.cleanText(text);
    if (!value) return false;

    return /\b(?:upi|txn|transaction|utr|rrn|reference|ref\s*(?:no|id))\b/i.test(value)
      || /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(value);
  }

  function finalizeDateTimeTransaction(current, dataRows) {
    if (!current) return;

    const descriptionParts = [];
    if (current.details) descriptionParts.push(current.details);
    if (current.time) descriptionParts.push(`Time: ${current.time}`);
    current.metadata.forEach(metadata => {
      if (metadata) descriptionParts.push(metadata);
    });

    const description = core.cleanText(descriptionParts.join(' | '));
    const reference = extractTransactionReference([current.details].concat(current.metadata));
    const direction = directionFromDetails(current.details);
    const type = direction === 'expense' ? 'DR' : (direction === 'income' ? 'CR' : '');

    dataRows.push([
      current.date,
      description,
      current.amount,
      current.balance,
      type,
      reference
    ]);
  }

  function assembleDateTimeTransactionTable(pageLines, headerPageIndex, firstHeader) {
    const firstColumns = buildColumns(firstHeader);
    if (!firstColumns.ok) {
      return failure('unsupported-layout', 'The Date & Time statement header is missing a required date, description, amount, or closing balance column.');
    }

    const headers = ['Date', 'Description', 'Amount', 'Closing Balance', 'Transaction Type', 'Reference'];
    const dataRows = [];
    let current = null;
    let skippedLines = 0;
    let usedPages = 0;

    const finalize = () => {
      finalizeDateTimeTransaction(current, dataRows);
      current = null;
    };

    for (let pageIndex = headerPageIndex; pageIndex < pageLines.length; pageIndex += 1) {
      const page = pageLines[pageIndex];
      let pageHeader = null;
      let pageHeaderIndex = -1;

      if (pageIndex === headerPageIndex) {
        pageHeader = firstHeader;
        pageHeaderIndex = firstHeader.index;
      } else {
        const repeatedHeader = findDateTimeHeaderLine(page.lines);
        if (repeatedHeader) {
          pageHeader = repeatedHeader;
          pageHeaderIndex = repeatedHeader.index;
        } else {
          const otherHeader = detectHeaderLine(page.lines);
          if (otherHeader && !isDateTimeTransactionHeader(otherHeader.labels)) {
            return failure(
              'unsupported-layout',
              'A later page uses a different table layout. Please export a CSV statement instead.'
            );
          }
        }
      }

      const pageColumnsInfo = pageHeader ? buildColumns(pageHeader) : firstColumns;
      if (!pageColumnsInfo.ok) {
        return failure('unsupported-layout', 'A later page has an incomplete Date & Time table header.');
      }

      const pageColumns = pageColumnsInfo.columns;
      const pageMapping = pageColumnsInfo.mapping;
      const startLine = pageHeaderIndex >= 0 ? pageHeaderIndex + 1 : 0;
      usedPages += 1;

      for (let lineIndex = startLine; lineIndex < page.lines.length; lineIndex += 1) {
        const line = page.lines[lineIndex];
        const merged = mergeLineItemsByGap(line.items, CELL_GAP);
        const lineText = core.cleanText(merged.map(cell => cell.text).join(' '));

        if (!lineText) continue;
        if (isSummaryOrFooterText(lineText)) {
          skippedLines += 1;
          continue;
        }
        if (findDateTimeHeaderLine([line])) {
          skippedLines += 1;
          continue;
        }

        const cells = assignItemsToColumns(line.items, pageColumns);
        const dateText = pageMapping.date !== null ? cells[pageMapping.date] || '' : '';
        const detailsText = pageMapping.description !== null ? cells[pageMapping.description] || '' : '';
        const amountText = pageMapping.amount !== null ? cells[pageMapping.amount] || '' : '';
        const balanceText = pageMapping.balance !== null ? cells[pageMapping.balance] || '' : '';

        const timeOnly = extractTimeOnly(lineText)
          || extractTimeOnly(dateText)
          || extractTimeOnly(detailsText);

        if (timeOnly) {
          if (current) current.time = current.time || timeOnly;
          else skippedLines += 1;
          continue;
        }

        const dateResult = core.parseStatementDate(dateText, 'auto');
        const amountResult = core.parseStatementAmount(amountText);
        const isTransactionStart = dateResult.ok
          && amountResult.ok
          && amountResult.value > 0
          && !/^(opening|closing|available|total|summary|grand\s+total)\b/i.test(detailsText);

        if (isTransactionStart) {
          finalize();
          current = {
            date: dateText,
            details: detailsText,
            amount: amountText,
            balance: balanceText,
            time: extractTimeFromText(dateText),
            metadata: []
          };
          continue;
        }

        if (current) {
          if (dateResult.ok || amountResult.ok) {
            // A date/amount fragment that did not form a complete transaction
            // start is a summary or incomplete line. Do not attach it as
            // metadata and do not import it.
            skippedLines += 1;
          } else if (
            isLikelyMetadataLine(lineText)
            || lineStartsNearDescription(line, pageColumns, pageMapping.description)
          ) {
            current.metadata.push(lineText);
          } else {
            skippedLines += 1;
          }
          continue;
        }

        skippedLines += 1;
      }
    }

    finalize();

    if (dataRows.length === 0) {
      return failure('no-rows', 'The PDF has a Date & Time transaction table, but no complete transaction rows were found.');
    }

    if (dataRows.length > MAX_PDF_ROWS) {
      return failure('too-many-rows', `This PDF contains more than ${MAX_PDF_ROWS.toLocaleString('en-IN')} transaction rows. Please split it into smaller files.`);
    }

    const rows = [headers].concat(dataRows);
    const warnings = [];
    if (skippedLines > 0) {
      warnings.push(`${skippedLines} non-transaction line${skippedLines === 1 ? '' : 's'} ignored`);
    }
    if (headerPageIndex > 0) {
      warnings.push('Content before the transaction table was skipped');
    }

    return {
      ok: true,
      headers,
      rows,
      rowNumbers: rows.map((row, index) => index + 1),
      headerRowIndex: 0,
      warnings,
      pageCount: pageLines.length,
      pagesWithTables: usedPages,
      extractedRowCount: dataRows.length
    };
  }

  function assembleTableFromPages(pages) {
    if (!core) {
      return failure('internal', 'Statement parsing helpers are unavailable. Refresh the page and try again.');
    }

    const pageLines = (pages || []).map(page => ({
      pageNumber: page.pageNumber,
      lines: groupTextItemsByLine(page.items, LINE_Y_TOLERANCE)
    }));

    // Recognize the Date & Time multi-line layout before the generic table
    // path. The adapter only activates for this exact header signature.
    for (let pageIndex = 0; pageIndex < pageLines.length; pageIndex += 1) {
      const dateTimeHeader = findDateTimeHeaderLine(pageLines[pageIndex].lines);
      if (dateTimeHeader) {
        return assembleDateTimeTransactionTable(pageLines, pageIndex, dateTimeHeader);
      }
    }

    let firstHeader = null;
    let headerPageIndex = -1;

    for (let index = 0; index < pageLines.length; index += 1) {
      const header = detectHeaderLine(pageLines[index].lines);
      if (header) {
        firstHeader = header;
        headerPageIndex = index;
        break;
      }
    }

    if (!firstHeader) {
      return failure(
        'unsupported-layout',
        'This PDF does not contain a recognizable transaction table header. Supported PDFs need selectable text with headers such as Date, Narration/Description, and Debit/Credit or Amount.'
      );
    }

    const firstColumns = buildColumns(firstHeader);
    if (!firstColumns.ok) {
      return failure('unsupported-layout', 'The detected PDF table header is missing a required date, description, or amount column.');
    }

    const headers = firstColumns.labels.slice();
    const dataRows = [];
    let nonTransactionLines = 0;
    let usedPages = 0;

    for (let pageIndex = 0; pageIndex < pageLines.length; pageIndex += 1) {
      const page = pageLines[pageIndex];
      if (pageIndex < headerPageIndex) {
        nonTransactionLines += page.lines.length;
        continue;
      }

      let pageHeader = null;
      let pageHeaderIndex = -1;

      if (pageIndex === headerPageIndex) {
        pageHeader = firstHeader;
        pageHeaderIndex = firstHeader.index;
      } else {
        const candidate = detectHeaderLine(page.lines);
        if (candidate) {
          const candidateColumns = buildColumns(candidate);
          if (!candidateColumns.ok) {
            return failure('unsupported-layout', 'A later page has an incomplete transaction table header.');
          }
          if (!sameHeaderLabels(candidateColumns.labels, headers)) {
            return failure(
              'unsupported-layout',
              'This PDF uses different table layouts on different pages. Please export a CSV statement instead.'
            );
          }
          pageHeader = candidate;
          pageHeaderIndex = candidate.index;
        }
      }

      const pageColumns = pageHeader ? buildColumns(pageHeader).columns : firstColumns.columns;
      const startLine = pageHeaderIndex >= 0 ? pageHeaderIndex + 1 : 0;
      const descriptionIndex = firstColumns.mapping.description;
      let previousRow = null;

      usedPages += 1;

      for (let lineIndex = startLine; lineIndex < page.lines.length; lineIndex += 1) {
        const line = page.lines[lineIndex];
        const merged = mergeLineItemsByGap(line.items, CELL_GAP);
        const lineText = core.cleanText(merged.map(cell => cell.text).join(' '));

        if (!lineText) continue;
        if (isFooterLine(lineText)) {
          nonTransactionLines += 1;
          continue;
        }

        const repeatedHeader = detectHeaderLine([line]);
        if (repeatedHeader) {
          nonTransactionLines += 1;
          continue;
        }

        const cells = assignItemsToColumns(line.items, pageColumns);
        const dateIndex = firstColumns.mapping.date;
        const dateText = dateIndex !== null && cells[dateIndex] ? cells[dateIndex] : '';
        const dateResult = core.parseStatementDate(dateText, 'auto');
        const hasDate = dateResult.ok || hasDateLikeText(lineText);

        const amountIndexes = ['debit', 'credit', 'amount', 'balance']
          .map(field => firstColumns.mapping[field])
          .filter(index => index !== null && index !== undefined);
        const hasAmount = amountIndexes.some(index => {
          const value = cells[index];
          return value && core.parseStatementAmount(value).ok;
        });
        const descriptionText = descriptionIndex !== null ? cells[descriptionIndex] : '';
        const summaryLike = /^(opening|closing|available|ledger|statement)\s+balance\b|balance\s+(b\/f|c\/f|forward)\b/i
          .test(descriptionText);

        // Include date-less rows when they still contain a description and a
        // transaction amount. This keeps malformed records visible as invalid
        // instead of silently dropping them. Pure summary/balance lines and
        // numeric-only footer fragments are ignored.
        if (hasDate || (hasAmount && descriptionText && !summaryLike)) {
          const row = cells.slice(0, headers.length);
          while (row.length < headers.length) row.push('');
          dataRows.push({
            cells: row,
            pageNumber: page.pageNumber,
            lineNumber: lineIndex + 1
          });
          previousRow = row;
          continue;
        }

        if (previousRow && !hasAmount && lineStartsNearDescription(line, pageColumns, descriptionIndex)) {
          previousRow[descriptionIndex] = core.cleanText(`${previousRow[descriptionIndex]} ${lineText}`);
          continue;
        }

        nonTransactionLines += 1;
      }
    }

    if (dataRows.length === 0) {
      return failure('no-rows', 'The PDF has a transaction table header, but no transaction rows were found.');
    }

    if (dataRows.length > MAX_PDF_ROWS) {
      return failure('too-many-rows', `This PDF contains more than ${MAX_PDF_ROWS.toLocaleString('en-IN')} transaction rows. Please split it into smaller files.`);
    }

    const rows = [headers].concat(dataRows.map(row => row.cells));
    const rowNumbers = rows.map((row, index) => index + 1);
    const warnings = [];

    if (nonTransactionLines > 0) {
      warnings.push(`${nonTransactionLines} non-transaction line${nonTransactionLines === 1 ? '' : 's'} ignored`);
    }
    if (headerPageIndex > 0) {
      warnings.push('Content before the transaction table was skipped');
    }

    return {
      ok: true,
      headers,
      rows,
      rowNumbers,
      headerRowIndex: 0,
      warnings,
      pageCount: pages.length,
      pagesWithTables: usedPages,
      extractedRowCount: dataRows.length
    };
  }

  async function extractPdfStatement(buffer) {
    if (!(buffer instanceof ArrayBuffer) && !(buffer instanceof Uint8Array)) {
      return failure('invalid-input', 'The selected PDF could not be read.');
    }

    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength > MAX_PDF_BYTES) {
      return failure('too-large', 'This PDF is larger than the 10 MB limit. Please choose a smaller statement.');
    }

    let pdf = null;

    try {
      const pdfjs = await loadPdfJs();
      const loadingTask = pdfjs.getDocument({
        data: bytes,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableFontFace: true,
        useSystemFonts: true,
        verbosity: 0
      });

      pdf = await loadingTask.promise;

      if (pdf.numPages > MAX_PDF_PAGES) {
        return failure('too-many-pages', `This PDF has more than ${MAX_PDF_PAGES} pages. Please split it into smaller files.`);
      }

      const pages = [];
      let totalChars = 0;
      let totalItems = 0;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent({
          includeMarkedContent: false,
          disableNormalization: false
        });

        const items = [];

        textContent.items.forEach(item => {
          if (!item || typeof item.str !== 'string' || !item.str.trim()) return;
          const transform = item.transform || [];
          items.push({
            str: item.str,
            x: Number(transform[4]) || 0,
            y: Number(transform[5]) || 0,
            width: Number(item.width) || 0,
            height: Number(item.height) || 0
          });
          totalItems += 1;
          totalChars += item.str.replace(/\s/g, '').length;
        });

        if (totalItems > MAX_PDF_TEXT_ITEMS) {
          return failure('too-many-items', 'This PDF contains too much text to process safely.');
        }

        pages.push({ pageNumber, items });

        if (typeof page.cleanup === 'function') page.cleanup();
      }

      if (totalChars < 20) {
        return failure(
          'scanned',
          'This PDF appears to be scanned or image-only. OCR is not supported. Please choose a text-based PDF or export a CSV from your bank.'
        );
      }

      const assembled = assembleTableFromPages(pages);
      if (!assembled.ok) return assembled;

      return {
        ...assembled,
        pageCount: pdf.numPages,
        totalTextItems: totalItems
      };
    } catch (err) {
      const code = err && err.code;
      const name = String(err && err.name || '');
      const message = String(err && err.message || '');

      if (['server-required', 'module-load', 'environment'].includes(code)) {
        return failure(code, err.message);
      }
      if (name === 'PasswordException' || /password/i.test(message) || /encrypted/i.test(message)) {
        return failure(
          'encrypted',
          'This PDF is password-protected or encrypted. Please unlock it in your PDF viewer and export an unprotected text-based PDF or CSV.'
        );
      }
      if (name === 'InvalidPDFException' || /invalid pdf/i.test(message) || /invalidpdf/i.test(message)) {
        return failure('invalid-pdf', 'This PDF could not be read. It may be corrupted or malformed.');
      }

      return failure('extract-failed', 'PDF text extraction failed. Please try another text-based PDF or export a CSV.');
    } finally {
      if (pdf && typeof pdf.destroy === 'function') {
        try {
          await pdf.destroy();
        } catch (err) {
          // Ignore cleanup failures.
        }
      }
    }
  }

  return {
    MAX_PDF_BYTES,
    MAX_PDF_PAGES,
    MAX_PDF_TEXT_ITEMS,
    MAX_PDF_ROWS,
    groupTextItemsByLine,
    mergeLineItemsByGap,
    detectHeaderLine,
    buildColumns,
    assignItemsToColumns,
    assembleTableFromPages,
    extractPdfStatement,
    loadPdfJs,
    isFooterLine,
    hasDateLikeText,
    sameHeaderLabels
  };
});
