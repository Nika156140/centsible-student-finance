/**
 * Centsible — Bank Statement Import Core
 * Pure, dependency-free parsing, normalization, validation, and merge helpers.
 *
 * CSV parsing lives here. statement_pdf.js extracts text-based PDF tables and
 * feeds the same { headers, rows } shape into this shared pipeline. This module
 * deliberately contains no DOM or localStorage access so it remains testable
 * in Node.
 */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CentsibleStatementImport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------------

  const MAX_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_RECORDS = 2000;
  const MAX_HEADER_SCAN = 25;

  const EXPENSE_CATEGORY_IDS = ['Food', 'Travel', 'Shopping', 'Education', 'Entertainment', 'Other'];
  const INCOME_CATEGORY_IDS = ['Allowance', 'Freelance', 'Scholarship', 'Gift', 'Other'];

  const FIELD_ALIASES = {
    date: [
      'transaction date', 'txn date', 'value date', 'posting date', 'post date',
      'date of transaction', 'date'
    ],
    description: [
      'transaction description', 'transaction details', 'transaction narration',
      'narration', 'particulars', 'description', 'details', 'remarks', 'memo',
      'transaction remarks', 'transaction'
    ],
    debit: [
      'withdrawal amount', 'withdrawal amt', 'debit amount', 'debit amt',
      'withdrawals', 'withdrawal', 'debit', 'paid out', 'outflow', 'dr'
    ],
    credit: [
      'deposit amount', 'deposit amt', 'credit amount', 'credit amt',
      'deposits', 'deposit', 'credit', 'paid in', 'inflow', 'cr'
    ],
    amount: [
      'transaction amount', 'amount', 'amt', 'value'
    ],
    reference: [
      'transaction reference', 'reference number', 'reference no', 'ref no',
      'ref number', 'transaction id', 'txn id', 'utr', 'cheque no', 'chq no',
      'cheque number', 'reference'
    ],
    balance: [
      'closing balance', 'running balance', 'available balance', 'balance'
    ],
    indicator: [
      'debit credit', 'dr cr', 'dr/cr', 'transaction type', 'type', 'indicator'
    ]
  };

  const MONTH_LOOKUP = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  const CATEGORY_RULES = [
    {
      category: 'Entertainment',
      keywords: ['netflix', 'spotify', 'prime video', 'hotstar', 'disney', 'cinema', 'movie', 'pvr', 'inox', 'concert', 'gaming', 'game']
    },
    {
      category: 'Education',
      keywords: ['college', 'university', 'tuition', 'exam', 'book', 'stationery', 'lab', 'course', 'udemy', 'coursera', 'semester', 'library']
    },
    {
      category: 'Travel',
      keywords: ['metro', 'uber', 'ola', 'auto', 'cab', 'bus', 'train', 'railway', 'irctc', 'petrol', 'fuel', 'parking', 'toll', 'rapido', 'travel']
    },
    {
      category: 'Food',
      keywords: ['zomato', 'swiggy', 'restaurant', 'cafe', 'coffee', 'canteen', 'mess', 'food', 'bakery', 'grocery', 'groceries', 'lunch', 'dinner', 'breakfast', 'snack', 'snacks', 'chai', 'pizza']
    },
    {
      category: 'Shopping',
      keywords: ['amazon', 'flipkart', 'myntra', 'mall', 'store', 'shopping', 'clothes', 'clothing', 'shoes', 'electronics', 'decathlon', 'apparel']
    }
  ];

  // -------------------------------------------------------------------------
  // Generic helpers
  // -------------------------------------------------------------------------

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeHeader(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function isValidIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, month) {
    const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return days[month - 1] || 0;
  }

  function normalizeYear(yearValue) {
    const year = Number(yearValue);
    if (String(yearValue).length === 2) return 2000 + year;
    return year;
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  // -------------------------------------------------------------------------
  // File format & decoding
  // -------------------------------------------------------------------------

  function detectFileFormat(fileName, mimeType) {
    const name = String(fileName || '').toLowerCase();
    const mime = String(mimeType || '').toLowerCase();

    if (name.endsWith('.pdf') || mime === 'application/pdf') {
      return { ok: true, format: 'pdf' };
    }

    if (name.endsWith('.csv') || mime === 'text/csv') {
      return { ok: true, format: 'csv' };
    }

    return {
      ok: false,
      format: 'unsupported',
      error: 'Please choose a .csv or text-based .pdf bank statement.'
    };
  }

  function decodeStatementBuffer(buffer) {
    let bytes;
    if (buffer instanceof Uint8Array) {
      bytes = buffer;
    } else if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer);
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(buffer)) {
      bytes = new Uint8Array(buffer);
    } else {
      throw new Error('Unsupported file data.');
    }

    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '');
    }

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(bytes).replace(/^\uFEFF/, '');
    }

    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(bytes).replace(/^\uFEFF/, '');
    }

    const utf8 = new TextDecoder('utf-8').decode(bytes);
    if (!utf8.includes('\uFFFD')) return utf8;

    // Fall back to a common single-byte encoding for older bank exports.
    try {
      const fallback = new TextDecoder('windows-1252').decode(bytes);
      if (!fallback.includes('\uFFFD')) return fallback;
    } catch (err) {
      // TextDecoder may not expose windows-1252 in every environment.
    }

    return utf8;
  }

  // -------------------------------------------------------------------------
  // CSV parsing
  // -------------------------------------------------------------------------

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"' && field.trim() === '') {
        field = '';
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }

    if (inQuotes) {
      return { ok: false, error: 'The CSV contains an unclosed quoted field.' };
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return { ok: true, rows };
  }

  function countNonEmpty(rows) {
    return rows.filter(row => row.some(cell => cleanText(cell) !== '')).length;
  }

  function detectDelimiter(text) {
    const candidates = [',', ';', '\t', '|'];
    let best = { delimiter: ',', score: -1, fieldCount: 0 };

    candidates.forEach(delimiter => {
      const parsed = parseDelimited(text, delimiter);
      if (!parsed.ok) return;

      const usefulRows = parsed.rows
        .filter(row => row.some(cell => cleanText(cell) !== ''))
        .slice(0, 20);

      if (usefulRows.length === 0) return;

      const counts = usefulRows.map(row => row.length).filter(count => count > 1);
      if (counts.length === 0) return;

      const frequencies = {};
      counts.forEach(count => { frequencies[count] = (frequencies[count] || 0) + 1; });
      const modalCount = Number(Object.keys(frequencies).sort((a, b) => frequencies[b] - frequencies[a])[0]);
      const consistentRows = counts.filter(count => count === modalCount).length;
      const consistency = consistentRows / usefulRows.length;
      const score = modalCount * 10 + consistency * 20 + counts.length;

      if (score > best.score) {
        best = { delimiter, score, fieldCount: modalCount };
      }
    });

    return best;
  }

  function parseCsv(text) {
    if (typeof text !== 'string') {
      return { ok: false, error: 'The selected file could not be read as text.' };
    }

    const source = text.replace(/^\uFEFF/, '');
    if (!source.trim()) {
      return { ok: false, error: 'The selected CSV file is empty.' };
    }

    const delimiterInfo = detectDelimiter(source);
    const parsed = parseDelimited(source, delimiterInfo.delimiter);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const rows = [];
    const rowNumbers = [];
    parsed.rows.forEach((row, index) => {
      if (row.some(cell => cleanText(cell) !== '')) {
        rows.push(row.map(cell => String(cell)));
        rowNumbers.push(index + 1);
      }
    });

    if (rows.length === 0) {
      return { ok: false, error: 'The selected CSV file does not contain any data rows.' };
    }

    if (rows.length > MAX_RECORDS + 100) {
      return {
        ok: false,
        error: `This CSV has more than ${MAX_RECORDS.toLocaleString('en-IN')} rows. Please split the statement into smaller files.`
      };
    }

    if (countNonEmpty(rows) === 0) {
      return { ok: false, error: 'The selected CSV file does not contain any data rows.' };
    }

    return {
      ok: true,
      rows,
      rowNumbers,
      delimiter: delimiterInfo.delimiter,
      delimiterLabel: delimiterInfo.delimiter === '\t' ? 'Tab' : delimiterInfo.delimiter === ';' ? 'Semicolon' : delimiterInfo.delimiter === '|' ? 'Pipe' : 'Comma',
      fieldCount: delimiterInfo.fieldCount
    };
  }

  // -------------------------------------------------------------------------
  // Header detection & column mapping
  // -------------------------------------------------------------------------

  function aliasScore(header, aliases) {
    let best = 0;
    aliases.forEach(alias => {
      if (header === alias) {
        best = Math.max(best, 1);
      } else if (header.includes(alias) && alias.length >= 3) {
        best = Math.max(best, 0.82);
      }
    });
    return best;
  }

  function identifyHeaderField(cell) {
    const header = normalizeHeader(cell);
    if (!header) return null;

    let best = { field: null, score: 0 };
    Object.keys(FIELD_ALIASES).forEach(field => {
      const score = aliasScore(header, FIELD_ALIASES[field]);
      if (score > best.score) best = { field, score };
    });

    return best.score >= 0.82 ? best.field : null;
  }

  function findHeaderRow(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { index: 0, score: 0, fields: [] };
    }

    let best = { index: 0, score: 0, fields: [] };
    const limit = Math.min(rows.length, MAX_HEADER_SCAN);

    for (let index = 0; index < limit; index += 1) {
      const fields = new Set();
      rows[index].forEach(cell => {
        const field = identifyHeaderField(cell);
        if (field) fields.add(field);
      });

      let score = 0;
      fields.forEach(field => {
        score += (field === 'date' || field === 'description') ? 3 : 2;
      });
      if (fields.has('date')) score += 2;
      if (fields.has('description')) score += 2;
      if (fields.has('debit') || fields.has('credit') || fields.has('amount')) score += 2;

      if (score > best.score) {
        best = { index, score, fields: Array.from(fields) };
      }
    }

    return best;
  }

  function detectColumnMapping(headers) {
    const mapping = {
      date: null,
      description: null,
      debit: null,
      credit: null,
      amount: null,
      reference: null,
      balance: null,
      indicator: null
    };
    const used = new Set();

    if (!Array.isArray(headers)) {
      return { mapping, mappedFields: [], missingRequired: ['date', 'description'], confidence: 'low' };
    }

    const normalized = headers.map(normalizeHeader);
    // Indicator first so headers such as "Debit/Credit" or "Dr/Cr" are not
    // mistaken for a debit/credit amount column.
    const fieldOrder = ['indicator', 'date', 'description', 'debit', 'credit', 'amount', 'reference', 'balance'];

    fieldOrder.forEach(field => {
      let bestIndex = null;
      let bestScore = 0;

      normalized.forEach((header, index) => {
        if (used.has(index) || !header) return;
        const score = aliasScore(header, FIELD_ALIASES[field]);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });

      if (bestIndex !== null && bestScore >= 0.82) {
        mapping[field] = bestIndex;
        used.add(bestIndex);
      }
    });

    const mappedFields = Object.keys(mapping).filter(field => mapping[field] !== null);
    const missingRequired = [];
    if (mapping.date === null) missingRequired.push('date');
    if (mapping.description === null) missingRequired.push('description');

    let confidence = 'low';
    if (mapping.date !== null && mapping.description !== null) {
      confidence = (mapping.debit !== null || mapping.credit !== null || mapping.amount !== null) ? 'high' : 'medium';
    }

    return { mapping, mappedFields, missingRequired, confidence };
  }

  function getDefaultAmountMode(mapping) {
    if (!mapping) return '';
    if (mapping.debit !== null || mapping.credit !== null) return 'separate';
    if (mapping.amount !== null && mapping.indicator !== null) return 'indicator';
    return '';
  }

  function getHeaderLabels(headers) {
    return (headers || []).map((header, index) => {
      const label = cleanText(header);
      return label || `Column ${index + 1}`;
    });
  }

  // -------------------------------------------------------------------------
  // Date parsing
  // -------------------------------------------------------------------------

  function invalidDate(reason) {
    return { ok: false, reason, iso: null };
  }

  function parseStatementDate(rawValue, format) {
    let value = cleanText(rawValue);
    const selectedFormat = format || 'auto';

    if (!value) return invalidDate('Date is empty');

    value = value.replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*[,\s]+/i, '');
    value = value.replace(/[T\s]\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?$/i, '').trim();

    let day = null;
    let month = null;
    let year = null;
    let assumedDayFirst = false;
    let formatUsed = selectedFormat;

    const isoMatch = value.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
      formatUsed = 'YMD';
    }

    if (day === null) {
      const dayMonthNameMatch = value.match(/^(\d{1,2})[\s\-\/]+([A-Za-z]{3,9})[\s\-\/,]+(\d{2,4})$/);
      if (dayMonthNameMatch) {
        day = Number(dayMonthNameMatch[1]);
        month = MONTH_LOOKUP[dayMonthNameMatch[2].toLowerCase()] || null;
        year = normalizeYear(dayMonthNameMatch[3]);
        formatUsed = 'DMY';
      }
    }

    if (day === null) {
      const monthNameDayMatch = value.match(/^([A-Za-z]{3,9})[\s\-\/]+(\d{1,2}),?[\s\-\/,]+(\d{2,4})$/);
      if (monthNameDayMatch) {
        month = MONTH_LOOKUP[monthNameDayMatch[1].toLowerCase()] || null;
        day = Number(monthNameDayMatch[2]);
        year = normalizeYear(monthNameDayMatch[3]);
        formatUsed = 'MDY';
      }
    }

    if (day === null) {
      const numericMatch = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
      if (numericMatch) {
        const first = Number(numericMatch[1]);
        const second = Number(numericMatch[2]);
        year = normalizeYear(numericMatch[3]);

        let mode = selectedFormat;
        if (mode === 'auto') {
          if (first > 12) mode = 'DMY';
          else if (second > 12) mode = 'MDY';
          else {
            mode = 'DMY';
            assumedDayFirst = true;
          }
        }

        if (mode === 'MDY') {
          month = first;
          day = second;
        } else {
          day = first;
          month = second;
        }
        formatUsed = mode === 'auto' ? 'DMY' : mode;
      }
    }

    if (day === null || month === null || year === null) {
      return invalidDate('Unrecognized date format');
    }

    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
      return invalidDate('Invalid date');
    }
    if (year < 1900 || year > 2100) return invalidDate('Date year is out of range');
    if (month < 1 || month > 12) return invalidDate('Date month is invalid');
    if (day < 1 || day > daysInMonth(year, month)) return invalidDate('Date does not exist');

    return {
      ok: true,
      iso: `${year}-${pad2(month)}-${pad2(day)}`,
      assumedDayFirst,
      formatUsed
    };
  }

  // -------------------------------------------------------------------------
  // Amount parsing
  // -------------------------------------------------------------------------

  function parseDrCr(value) {
    const text = cleanText(value).toLowerCase();
    if (!text) return null;
    if (/^(dr|debit|debit amount|withdrawal|withdrawals)$/.test(text)) return 'DR';
    if (/^(cr|credit|credit amount|deposit|deposits)$/.test(text)) return 'CR';
    if (/^d$/.test(text)) return 'DR';
    if (/^c$/.test(text)) return 'CR';
    return null;
  }

  function parseStatementAmount(rawValue) {
    let text = cleanText(rawValue);
    if (!text || /^[-–—]$/.test(text)) {
      return { ok: false, empty: true, reason: 'Amount is empty' };
    }

    let negative = false;
    if (/^\(.*\)$/.test(text)) {
      negative = true;
      text = text.slice(1, -1).trim();
    }

    let indicator = null;
    const suffix = text.match(/(dr|cr|debit|credit)\s*$/i);
    if (suffix) {
      indicator = /^(dr|debit)$/i.test(suffix[1]) ? 'DR' : 'CR';
      text = text.slice(0, suffix.index).trim();
    } else {
      const prefix = text.match(/^(dr|cr|debit|credit)\s+/i);
      if (prefix) {
        indicator = /^(dr|debit)$/i.test(prefix[1]) ? 'DR' : 'CR';
        text = text.slice(prefix[0].length).trim();
      }
    }

    text = text
      .replace(/₹|inr|rs\.?/gi, '')
      .replace(/[,\s']/g, '')
      .replace(/\+/g, '');

    if (text.startsWith('-')) {
      negative = true;
      text = text.slice(1);
    }

    if (!/^\d+(?:\.\d+)?$/.test(text)) {
      return { ok: false, reason: 'Could not read amount' };
    }

    const value = Number(text);
    if (!Number.isFinite(value)) {
      return { ok: false, reason: 'Amount is not a finite number' };
    }

    return {
      ok: true,
      value: Math.round(value * 100) / 100,
      negative,
      indicator
    };
  }

  // -------------------------------------------------------------------------
  // Category suggestions
  // -------------------------------------------------------------------------

  function classifyDescription(description, type) {
    const text = cleanText(description).toLowerCase();
    if (!text) return { category: 'Other', keyword: null };

    if (type === 'income') {
      const incomeRules = [
        { category: 'Scholarship', keywords: ['scholarship', 'grant', 'fellowship'] },
        { category: 'Allowance', keywords: ['allowance', 'pocket money', 'parents', 'father', 'mother'] },
        { category: 'Freelance', keywords: ['freelance', 'internship', 'stipend', 'salary', 'wages', 'project payment'] },
        { category: 'Gift', keywords: ['gift', 'birthday', 'reward'] }
      ];

      for (const rule of incomeRules) {
        const keyword = rule.keywords.find(word => text.includes(word));
        if (keyword) return { category: rule.category, keyword };
      }

      return { category: 'Other', keyword: null };
    }

    for (const rule of CATEGORY_RULES) {
      const keyword = rule.keywords.find(word => text.includes(word));
      if (keyword) return { category: rule.category, keyword };
    }

    return { category: 'Other', keyword: null };
  }

  function suggestCategory(description, type) {
    return classifyDescription(description, type).category;
  }

  // -------------------------------------------------------------------------
  // Normalization & validation
  // -------------------------------------------------------------------------

  function validateRecord(record) {
    if (!record || typeof record !== 'object') {
      return { valid: false, reason: 'Invalid record' };
    }
    if (!isValidIsoDate(record.date)) {
      return { valid: false, reason: 'Invalid date' };
    }
    if (!record.description || !cleanText(record.description)) {
      return { valid: false, reason: 'Description is empty' };
    }
    if (record.type !== 'income' && record.type !== 'expense') {
      return { valid: false, reason: 'Invalid transaction type' };
    }
    if (!Number.isFinite(record.amount) || record.amount <= 0) {
      return { valid: false, reason: 'Amount must be greater than zero' };
    }
    const allowed = record.type === 'income' ? INCOME_CATEGORY_IDS : EXPENSE_CATEGORY_IDS;
    if (!allowed.includes(record.category)) {
      return { valid: false, reason: 'Invalid category' };
    }
    return { valid: true, reason: null };
  }

  function buildRecords(input) {
    const options = input || {};
    const rows = options.rows;
    const rowNumbers = options.rowNumbers || [];
    const headerRow = Number.isInteger(options.headerRow) ? options.headerRow : 0;
    const mapping = options.mapping || {};
    const dateFormat = options.dateFormat || 'auto';
    const amountMode = options.amountMode || '';

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: 'No CSV rows are available.' };
    }
    if (mapping.date === null || mapping.date === undefined) {
      return { ok: false, error: 'Please map a date column.' };
    }
    if (mapping.description === null || mapping.description === undefined) {
      return { ok: false, error: 'Please map a description column.' };
    }
    if (amountMode === 'separate') {
      if (mapping.debit === null && mapping.credit === null) {
        return { ok: false, error: 'Map at least one debit or credit column.' };
      }
    } else if (amountMode === 'indicator') {
      if (mapping.amount === null || mapping.indicator === null) {
        return { ok: false, error: 'Map both an amount column and a Dr/Cr indicator column.' };
      }
    } else if (['signed', 'debit', 'credit'].includes(amountMode)) {
      if (mapping.amount === null) {
        return { ok: false, error: 'Please map an amount column.' };
      }
    } else {
      return { ok: false, error: 'Please confirm how single amount values should be interpreted.' };
    }

    const dataRows = rows.slice(headerRow + 1);
    if (dataRows.length > MAX_RECORDS) {
      return { ok: false, error: `This statement has more than ${MAX_RECORDS.toLocaleString('en-IN')} transaction rows.` };
    }

    const records = [];
    let emptyRows = 0;
    let invalidRows = 0;

    dataRows.forEach((cells, dataIndex) => {
      if (!cells.some(cell => cleanText(cell) !== '')) {
        emptyRows += 1;
        return;
      }

      const valueAt = index => (index === null || index === undefined ? '' : cleanText(cells[index]));
      const rowNumber = rowNumbers[headerRow + 1 + dataIndex] || headerRow + dataIndex + 2;

      const raw = {
        date: valueAt(mapping.date),
        description: valueAt(mapping.description),
        debit: valueAt(mapping.debit),
        credit: valueAt(mapping.credit),
        amount: valueAt(mapping.amount),
        reference: valueAt(mapping.reference),
        balance: valueAt(mapping.balance),
        indicator: valueAt(mapping.indicator)
      };

      const errors = [];
      const descriptions = cleanText(raw.description);
      if (!descriptions) errors.push('Description is empty');

      const dateResult = parseStatementDate(raw.date, dateFormat);
      if (!dateResult.ok) errors.push(`Date: ${dateResult.reason}`);

      let type = null;
      let amount = null;

      if (amountMode === 'separate') {
        const debit = parseStatementAmount(raw.debit);
        const credit = parseStatementAmount(raw.credit);
        const hasDebit = debit.ok && debit.value > 0;
        const hasCredit = credit.ok && credit.value > 0;
        const debitHasValue = !debit.empty && raw.debit !== '';
        const creditHasValue = !credit.empty && raw.credit !== '';

        if (hasDebit && hasCredit) {
          errors.push('Both debit and credit values are present');
        } else if (hasDebit) {
          type = 'expense';
          amount = debit.value;
        } else if (hasCredit) {
          type = 'income';
          amount = credit.value;
        } else {
          if (debitHasValue && !debit.ok) errors.push(`Debit: ${debit.reason}`);
          if (creditHasValue && !credit.ok) errors.push(`Credit: ${credit.reason}`);
          if ((debitHasValue && !debit.ok) || (creditHasValue && !credit.ok)) {
            // Specific parsing error already added.
          } else {
            errors.push('No debit or credit amount');
          }
        }
      } else {
        const amountResult = parseStatementAmount(raw.amount);
        if (amountResult.ok && amountResult.value > 0) {
          if (amountMode === 'signed') {
            if (amountResult.indicator === 'DR' && !amountResult.negative) {
              errors.push('Signed amount conflicts with a DR indicator');
            } else if (amountResult.indicator === 'CR' && amountResult.negative) {
              errors.push('Signed amount conflicts with a CR indicator');
            } else {
              type = amountResult.negative ? 'expense' : 'income';
              amount = amountResult.value;
            }
          } else if (amountMode === 'debit') {
            type = 'expense';
            amount = amountResult.value;
          } else if (amountMode === 'credit') {
            type = 'income';
            amount = amountResult.value;
          } else if (amountMode === 'indicator') {
            const indicator = parseDrCr(raw.indicator) || amountResult.indicator;
            if (!indicator) {
              errors.push('Dr/Cr indicator is missing or unrecognized');
            } else {
              type = indicator === 'DR' ? 'expense' : 'income';
              amount = amountResult.value;
            }
          }
        } else {
          errors.push(`Amount: ${amountResult.reason || 'must be greater than zero'}`);
        }
      }

      if (amount !== null && amount <= 0) errors.push('Amount must be greater than zero');

      let category = 'Other';
      if (type) category = suggestCategory(descriptions, type);

      const record = {
        rowNumber,
        rawDate: raw.date,
        rawDescription: raw.description,
        rawDebit: raw.debit,
        rawCredit: raw.credit,
        rawAmount: raw.amount,
        rawReference: raw.reference,
        rawBalance: raw.balance,
        rawIndicator: raw.indicator,
        date: dateResult.ok ? dateResult.iso : null,
        description: descriptions,
        type,
        amount,
        category,
        reference: cleanText(raw.reference),
        balance: cleanText(raw.balance),
        direction: type === 'income' ? 'Credit' : (type === 'expense' ? 'Debit' : ''),
        valid: false,
        reason: null,
        warnings: []
      };

      const validation = validateRecord(record);
      if (validation.valid && errors.length === 0) {
        record.valid = true;
        record.reason = null;
      } else {
        record.valid = false;
        record.reason = errors.length > 0 ? errors.join('; ') : validation.reason;
        invalidRows += 1;
      }

      if (dateResult.assumedDayFirst) {
        record.warnings.push('Ambiguous numeric date interpreted as day-first');
      }

      records.push(record);
    });

    return {
      ok: true,
      records,
      counts: {
        total: records.length,
        valid: records.filter(record => record.valid).length,
        invalid: invalidRows,
        emptyRows
      }
    };
  }

  // -------------------------------------------------------------------------
  // Duplicate detection & import helpers
  // -------------------------------------------------------------------------

  function normalizeDescriptionForMatch(description) {
    return cleanText(description)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function recordDuplicateKey(record) {
    const amount = Number(record.amount);
    return [
      record.date || '',
      record.type || '',
      Number.isFinite(amount) ? amount.toFixed(2) : '',
      normalizeDescriptionForMatch(record.description)
    ].join('|');
  }

  function transactionDuplicateKey(transaction) {
    const amount = Number(transaction.amount);
    return [
      transaction.date || '',
      transaction.type || '',
      Number.isFinite(amount) ? amount.toFixed(2) : '',
      normalizeDescriptionForMatch(transaction.desc)
    ].join('|');
  }

  function annotateDuplicates(records, existingTransactions) {
    const existing = Array.isArray(existingTransactions) ? existingTransactions : [];
    const referenceMap = new Map();
    const keyMap = new Map();

    existing.forEach(transaction => {
      const reference = cleanText(transaction.importRef || transaction.reference).toLowerCase();
      if (reference) referenceMap.set(reference, (referenceMap.get(reference) || 0) + 1);
      const key = transactionDuplicateKey(transaction);
      keyMap.set(key, (keyMap.get(key) || 0) + 1);
    });

    const fileReferenceCounts = new Map();
    records.forEach(record => {
      const reference = cleanText(record.reference).toLowerCase();
      if (reference) fileReferenceCounts.set(reference, (fileReferenceCounts.get(reference) || 0) + 1);
    });

    return records.map(record => {
      const reasons = [];

      if (record.valid) {
        const reference = cleanText(record.reference).toLowerCase();
        if (reference && referenceMap.has(reference)) {
          reasons.push('Reference matches an existing transaction');
        }
        if (reference && fileReferenceCounts.get(reference) > 1) {
          reasons.push('Reference appears more than once in this file');
        }
        if (keyMap.has(recordDuplicateKey(record))) {
          reasons.push('Same date, amount, type, and description as an existing transaction');
        }
      }

      return {
        ...record,
        duplicate: reasons.length > 0,
        duplicateReasons: reasons,
        duplicateReason: reasons.join(' · ')
      };
    });
  }

  function toCentsibleTransaction(record, id) {
    const validation = validateRecord(record);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const transaction = {
      id,
      type: record.type,
      amount: Math.round(Number(record.amount) * 100) / 100,
      date: record.date,
      category: record.category,
      desc: cleanText(record.description),
      payment: 'Bank'
    };

    if (record.reference) transaction.importRef = cleanText(record.reference);
    return transaction;
  }

  function buildImportedTransactions(records, existingTransactions, options) {
    const existing = Array.isArray(existingTransactions) ? existingTransactions : [];
    const baseTimestamp = options && Number.isFinite(options.now) ? options.now : Date.now();
    const usedIds = new Set(existing.map(transaction => transaction.id));
    const accepted = [];
    const rejected = [];

    (records || []).forEach((record, index) => {
      const validation = validateRecord(record);
      if (!validation.valid) {
        rejected.push({ record, reason: validation.reason });
        return;
      }

      let id = `tx-${baseTimestamp}-${index + 1}`;
      while (usedIds.has(id)) id += '-x';
      usedIds.add(id);

      accepted.push(toCentsibleTransaction(record, id));
    });

    return { transactions: accepted, rejected };
  }

  function mergeImportedTransactions(existingTransactions, importedTransactions) {
    const existing = Array.isArray(existingTransactions) ? existingTransactions : [];
    const imported = Array.isArray(importedTransactions) ? importedTransactions : [];
    return imported.concat(existing);
  }

  function summarizeRecords(records, selectedIndexes) {
    const list = Array.isArray(records) ? records : [];
    const selectedSet = new Set(Array.isArray(selectedIndexes) ? selectedIndexes : []);
    const valid = list.filter(record => record.valid).length;
    const invalid = list.length - valid;
    const duplicates = list.filter(record => record.valid && record.duplicate).length;
    const selected = list.filter((record, index) => record.valid && selectedSet.has(index)).length;

    return {
      total: list.length,
      valid,
      invalid,
      duplicates,
      selected,
      skipped: list.length - selected
    };
  }

  return {
    MAX_FILE_BYTES,
    MAX_RECORDS,
    EXPENSE_CATEGORY_IDS,
    INCOME_CATEGORY_IDS,
    detectFileFormat,
    decodeStatementBuffer,
    parseCsv,
    parseDelimited,
    detectDelimiter,
    findHeaderRow,
    detectColumnMapping,
    getDefaultAmountMode,
    getHeaderLabels,
    identifyHeaderField,
    normalizeHeader,
    parseStatementDate,
    parseStatementAmount,
    parseDrCr,
    classifyDescription,
    suggestCategory,
    validateRecord,
    buildRecords,
    normalizeDescriptionForMatch,
    recordDuplicateKey,
    transactionDuplicateKey,
    annotateDuplicates,
    toCentsibleTransaction,
    buildImportedTransactions,
    mergeImportedTransactions,
    summarizeRecords,
    cleanText
  };
});
