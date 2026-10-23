/**
 * Generate small synthetic, text-based PDF fixtures for Centsible PDF tests.
 * All names, dates, references, and amounts are fictional.
 *
 * Run: node test_fixtures/generate_pdfs.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

function escapePdfText(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function textOp(x, y, text, size = 9) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function pageContent(lines) {
  return ['0.95 g 40 40 515 760 re S', ...lines].join('\n');
}

function buildPdf(pages) {
  const objects = [];
  const pageObjectNumbers = [];
  const contentObjectNumbers = [];
  const firstPageObject = 4;

  pages.forEach((page, index) => {
    pageObjectNumbers.push(firstPageObject + index * 2);
    contentObjectNumbers.push(firstPageObject + index * 2 + 1);
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map(number => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((page, index) => {
    const pageObj = firstPageObject + index * 2;
    const contentObj = pageObj + 1;
    const content = pageContent(Array.isArray(page) ? page : page.lines);
    const contentBuffer = Buffer.from(content, 'ascii');

    objects[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${contentBuffer.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 1; index < objects.length; index += 1) {
    if (!objects[index]) continue;
    offsets[index] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < objects.length; index += 1) {
    const offset = offsets[index] || 0;
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

function writeFixture(name, pages) {
  const file = path.join(OUTPUT_DIR, name);
  fs.writeFileSync(file, buildPdf(pages));
  console.log(`wrote ${file}`);
}

function cellLines(cells, y) {
  return cells.map(cell => textOp(cell.x, y, cell.text));
}

const debitCreditPage = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional statement for testing only'),
  ...cellLines([
    { x: 50, text: 'Date' },
    { x: 120, text: 'Narration' },
    { x: 330, text: 'Debit' },
    { x: 400, text: 'Credit' },
    { x: 480, text: 'Balance' },
    { x: 555, text: 'Ref No' }
  ], 770),
  ...cellLines([
    { x: 50, text: '02/10/2026' },
    { x: 120, text: 'Campus cafe, lunch' },
    { x: 330, text: '350.00' },
    { x: 400, text: '' },
    { x: 480, text: '12,000.00' },
    { x: 555, text: 'DUP-001' }
  ], 748),
  ...cellLines([
    { x: 50, text: '05-Oct-2026' },
    { x: 120, text: 'Synthetic freelance stipend' },
    { x: 330, text: '' },
    { x: 400, text: '2,500.00' },
    { x: 480, text: '14,500.00' },
    { x: 555, text: 'SYN-002' }
  ], 728),
  ...cellLines([
    { x: 50, text: '07/10/2026' },
    { x: 120, text: 'Metro card recharge' },
    { x: 330, text: '400.00' },
    { x: 400, text: '' },
    { x: 480, text: '14,100.00' },
    { x: 555, text: 'SYN-003' }
  ], 708),
  ...cellLines([
    { x: 50, text: '08/10/2026' },
    { x: 120, text: 'Synthetic online course purchase' },
    { x: 330, text: '1,234.50' },
    { x: 400, text: '' },
    { x: 480, text: '12,865.50' },
    { x: 555, text: 'SYN-004' }
  ], 688),
  textOp(120, 676, 'with wrapped synthetic description'),
  ...cellLines([
    { x: 50, text: '10/10/2026' },
    { x: 120, text: 'Synthetic book purchase' },
    { x: 330, text: '850.00' },
    { x: 400, text: '' },
    { x: 480, text: '12,015.50' },
    { x: 555, text: 'SYN-005' }
  ], 656),
  textOp(50, 40, 'Page 1 of 1')
];

const signedPage = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional signed-amount statement'),
  ...cellLines([
    { x: 50, text: 'Date' },
    { x: 120, text: 'Description' },
    { x: 350, text: 'Amount' },
    { x: 470, text: 'Balance' }
  ], 770),
  ...cellLines([
    { x: 50, text: '2026-10-02' },
    { x: 120, text: 'Canteen lunch' },
    { x: 350, text: '-350.00' },
    { x: 470, text: '11,650.00' }
  ], 748),
  ...cellLines([
    { x: 50, text: '2026-10-03' },
    { x: 120, text: 'Scholarship credit' },
    { x: 350, text: '5,000.00' },
    { x: 470, text: '16,650.00' }
  ], 728),
  ...cellLines([
    { x: 50, text: '2026-10-04' },
    { x: 120, text: 'Synthetic movie ticket' },
    { x: 350, text: '-1,200.50' },
    { x: 470, text: '15,449.50' }
  ], 708),
  textOp(50, 40, 'Page 1 of 1')
];

const indicatorPage = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional Dr/Cr statement'),
  ...cellLines([
    { x: 50, text: 'Date' },
    { x: 120, text: 'Narration' },
    { x: 350, text: 'Amount' },
    { x: 430, text: 'Dr/Cr' },
    { x: 500, text: 'Balance' }
  ], 770),
  ...cellLines([
    { x: 50, text: '02/10/2026' },
    { x: 120, text: 'Synthetic book purchase' },
    { x: 350, text: '850.00' },
    { x: 430, text: 'DR' },
    { x: 500, text: '11,150.00' }
  ], 748),
  ...cellLines([
    { x: 50, text: '03/10/2026' },
    { x: 120, text: 'Gift from family' },
    { x: 350, text: '1,000.00' },
    { x: 430, text: 'CR' },
    { x: 500, text: '12,150.00' }
  ], 728),
  textOp(50, 40, 'Page 1 of 1')
];

const ambiguousPage = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional unsigned-amount statement'),
  ...cellLines([
    { x: 50, text: 'Date' },
    { x: 120, text: 'Description' },
    { x: 350, text: 'Amount' }
  ], 770),
  ...cellLines([
    { x: 50, text: '02/10/2026' },
    { x: 120, text: 'Synthetic book purchase' },
    { x: 350, text: '850.00' }
  ], 748),
  textOp(50, 40, 'Page 1 of 1')
];

const invalidPage = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional invalid-row statement'),
  ...cellLines([
    { x: 50, text: 'Date' },
    { x: 120, text: 'Description' },
    { x: 350, text: 'Amount' }
  ], 770),
  ...cellLines([
    { x: 50, text: '31/02/2026' },
    { x: 120, text: 'Synthetic impossible date' },
    { x: 350, text: '-100.00' }
  ], 748),
  ...cellLines([
    { x: 50, text: 'not-a-date' },
    { x: 120, text: 'Synthetic invalid date' },
    { x: 350, text: '-50.00' }
  ], 728),
  ...cellLines([
    { x: 50, text: '2026-10-02' },
    { x: 120, text: 'Synthetic good row' },
    { x: 350, text: '-10.00' }
  ], 708),
  textOp(50, 40, 'Page 1 of 1')
];

const multipagePages = [
  [
    textOp(50, 805, 'Synthetic Student Bank', 14),
    textOp(50, 788, 'Fictional multipage statement'),
    ...cellLines([
      { x: 50, text: 'Date' },
      { x: 120, text: 'Narration' },
      { x: 350, text: 'Debit' },
      { x: 430, text: 'Credit' },
      { x: 500, text: 'Balance' }
    ], 770),
    ...cellLines([
      { x: 50, text: '02/10/2026' },
      { x: 120, text: 'Synthetic page one lunch' },
      { x: 350, text: '350.00' },
      { x: 430, text: '' },
      { x: 500, text: '12,000.00' }
    ], 748),
    ...cellLines([
      { x: 50, text: '03/10/2026' },
      { x: 120, text: 'Synthetic page one credit' },
      { x: 350, text: '' },
      { x: 430, text: '2,500.00' },
      { x: 500, text: '14,500.00' }
    ], 728),
    textOp(50, 40, 'Page 1 of 2')
  ],
  [
    textOp(50, 805, 'Synthetic Student Bank', 14),
    textOp(50, 788, 'Fictional multipage statement continued'),
    ...cellLines([
      { x: 50, text: 'Date' },
      { x: 120, text: 'Narration' },
      { x: 350, text: 'Debit' },
      { x: 430, text: 'Credit' },
      { x: 500, text: 'Balance' }
    ], 770),
    ...cellLines([
      { x: 50, text: '04/10/2026' },
      { x: 120, text: 'Synthetic page two metro' },
      { x: 350, text: '400.00' },
      { x: 430, text: '' },
      { x: 500, text: '14,100.00' }
    ], 748),
    ...cellLines([
      { x: 50, text: '05/10/2026' },
      { x: 120, text: 'Synthetic page two book' },
      { x: 350, text: '850.00' },
      { x: 430, text: '' },
      { x: 500, text: '13,250.00' }
    ], 728),
    textOp(50, 40, 'Page 2 of 2')
  ]
];

const coverPlusTablePages = [
  [
    textOp(50, 805, 'Synthetic Student Bank', 14),
    textOp(50, 788, 'Fictional cover page'),
    textOp(50, 760, 'This page contains no transaction table.'),
    textOp(50, 40, 'Page 1 of 2')
  ],
  [
    textOp(50, 805, 'Synthetic Student Bank', 14),
    textOp(50, 788, 'Fictional statement page'),
    ...cellLines([
      { x: 50, text: 'Date' },
      { x: 120, text: 'Narration' },
      { x: 350, text: 'Debit' },
      { x: 430, text: 'Credit' },
      { x: 500, text: 'Balance' }
    ], 770),
    ...cellLines([
      { x: 50, text: '06/10/2026' },
      { x: 120, text: 'Synthetic after cover page' },
      { x: 350, text: '120.00' },
      { x: 430, text: '' },
      { x: 500, text: '9,880.00' }
    ], 748),
    textOp(50, 40, 'Page 2 of 2')
  ]
];

const noHeaderPage = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  ...cellLines([
    { x: 50, text: '02/10/2026' },
    { x: 120, text: 'No header row here' },
    { x: 350, text: '100.00' }
  ], 760),
  textOp(50, 40, 'Page 1 of 1')
];

const scannedPage = [
  '0.8 g 120 300 350 240 re f',
  textOp(50, 40, '')
];

const dateTimePageOne = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional Date & Time statement'),
  textOp(50, 780, 'Opening balance 50,000.00'),
  ...cellLines([
    { x: 50, text: 'Date & Time' },
    { x: 160, text: 'Transaction Details' },
    { x: 360, text: 'Amount' },
    { x: 480, text: 'Closing balance' }
  ], 760),
  ...cellLines([
    { x: 50, text: '27/10/2026' },
    { x: 160, text: 'To UPI/SYNTHETIC CAFE' },
    { x: 340, text: '1,200.00' },
    { x: 460, text: '48,800.00' }
  ], 738),
  textOp(50, 726, '10:42 AM'),
  textOp(160, 714, 'UPI ID: synthetic@upi'),
  textOp(160, 702, 'Txn ID: SYNTH12345'),
  textOp(160, 690, 'UTR: 123456789012'),
  ...cellLines([
    { x: 50, text: '28-Oct-2026' },
    { x: 160, text: 'From SYNTHETIC EMPLOYER' },
    { x: 340, text: '5,000.00' },
    { x: 460, text: '53,800.00' }
  ], 666),
  textOp(50, 654, '11:15 AM'),
  ...cellLines([
    { x: 50, text: '29/10/2026' },
    { x: 160, text: 'To SYNTHETIC METRO' },
    { x: 340, text: '400.00' },
    { x: 460, text: '' }
  ], 630),
  textOp(50, 618, '12:05 PM'),
  ...cellLines([
    { x: 50, text: '30/10/2026' },
    { x: 160, text: 'Synthetic unknown transfer' },
    { x: 340, text: '250.00' },
    { x: 460, text: '53,150.00' }
  ], 594),
  textOp(50, 582, '03:20 PM'),
  textOp(50, 40, 'Page 1 of 2')
];

const dateTimePageTwo = [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional Date & Time statement continued'),
  ...cellLines([
    { x: 50, text: 'Date & Time' },
    { x: 160, text: 'Transaction Details' },
    { x: 360, text: 'Amount' },
    { x: 480, text: 'Closing balance' }
  ], 770),
  ...cellLines([
    { x: 50, text: '31-Oct-2026' },
    { x: 160, text: 'From SYNTHETIC SCHOLARSHIP' },
    { x: 340, text: '2,000.00' },
    { x: 460, text: '55,150.00' }
  ], 748),
  textOp(50, 736, '09:05 AM'),
  textOp(160, 724, 'Txn ID: SYNTH67890'),
  textOp(160, 700, 'Total Debit 1,850.00'),
  textOp(160, 688, 'Closing balance 55,150.00'),
  textOp(50, 40, 'Page 2 of 2')
];

writeFixture('synthetic-debit-credit.pdf', [debitCreditPage]);
writeFixture('synthetic-signed-amount.pdf', [signedPage]);
writeFixture('synthetic-indicator.pdf', [indicatorPage]);
writeFixture('synthetic-ambiguous.pdf', [ambiguousPage]);
writeFixture('synthetic-invalid.pdf', [invalidPage]);
writeFixture('synthetic-multipage.pdf', multipagePages);
writeFixture('synthetic-cover-page.pdf', coverPlusTablePages);
const manyPages = Array.from({ length: 31 }, (_, index) => [
  textOp(50, 805, 'Synthetic Student Bank', 14),
  textOp(50, 788, 'Fictional page-count limit fixture'),
  textOp(50, 40, `Page ${index + 1} of 31`)
]);

writeFixture('synthetic-no-header.pdf', [noHeaderPage]);
writeFixture('synthetic-scanned.pdf', [scannedPage]);
writeFixture('synthetic-many-pages.pdf', manyPages);
writeFixture('synthetic-date-time-multiline.pdf', [dateTimePageOne, dateTimePageTwo]);

// The password-protected fixture is synthetic and embedded so regeneration
// remains dependency-free. It was generated from synthetic-debit-credit.pdf
// with pypdf using user password "synthetic-user" and owner password
// "synthetic-owner". It is used only to test encrypted-PDF error handling.
const ENCRYPTED_FIXTURE_BASE64 = [
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgPGMxYzIwNzc3OTU+Cj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBl',
  'IC9QYWdlcwovQ291bnQgMQovS2lkcyBbIDQgMCBSIF0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2Vz',
  'IDIgMCBSCi9PdXRsaW5lcyA3IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovTWVkaWFCb3ggWyAwIDAgNTk1',
  'IDg0MiBdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDUgMCBSCj4+Cj4+Ci9Db250ZW50cyA2IDAgUgovUGFyZW50IDIgMCBS',
  'Cj4+CmVuZG9iago1IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+Pgpl',
  'bmRvYmoKNiAwIG9iago8PAovTGVuZ3RoIDE3MjAKPj4Kc3RyZWFtCpn1exLLY9UsWHGSp0G3N9FDz/5UjLCTXmtoqfFXXRZVLLz4',
  'rZoaAyFmE0kghKaoZC3FPcgvw9IRfiypk/iGY86q2xWRHtp5DZM4GLKptYi3IN1DgX+4gs5LQaW9bJBBvH/CkB/plCnHB26KjO/V',
  '/qGpXBxh9s60svZvfQHVDDh/OFf9b5qq6ONdbOaZrAy65u83LtjYMhy5oQ64HhAHlSRW2Rw0GSt76b0W6YMZ/TTa95sqMyVKeBOD',
  'zkJxZytA1ZN1lLQFQCIoGNIHZ+VLnk7d+CTkwZ/Due3YmqYijKZxvACLQ/YTdGN9JRGBHilTrFmlZ1a1eFo2KGZ9I2cX8SGhXDba',
  'IxxmTojOUfMoexagk8/xVsW4YU68zLVQYrVXKF+xvMyHBwX5EXNUG5V+5JbRtiJhIetWRhJra7fv/HsKeCzTIRNUux/gm6ffdIbE',
  '6XX8xj9mF30wHqsWRlXhhEy2vcqpEymqtWqlSxqB7oIgHGBgFW/g+b1oadgr6xPeSvpW/OCZMjlC2qQzz81G4BMkPzYrs5vSgStn',
  'Mbl1O7UZ2Cwpbb+IXflth98DziQJcucWdgYVUGnj+94kAwOi8cGjGO/AapcW2QrF7CiG6ZpnYFucPBqoILTWyjzJuPNQC+HUQlvA',
  'eQAkGR+lWJMDSxGhX6vm/Ujq81iD0wX0DM1QDsdlaLgKljOWaw48feJAD8XDmhFmSa1//TySG44h6cxYi1+OC4J9B1aRMnj+vJ++',
  'uQ6aC0Qb6HKnzL2f/n7vTGTaxacn11YHVRvEqFkWfJ0UdTWgrNXz/YpoVR5+B1Ay6waUI3l5nd3+3UU5IbnPWlJrIJhZTHzgMKj/',
  '8gn4PwzbhZ4UEp3FhU8+RPo1lDz91hZLIHbTR4GeU5R+4FbhEa2V/7maafmrG1xdziyr/11pYXfHhssfh/WAjRkGGXWS2LazhkSV',
  'Hpfv0ZXKnYNwqf5wKRFKFpKp638xkekl4x74yxwSbzxS0P5sAMjNa/rRYjQ1GR5+uCTD01b0z5BdrpcgElUDHD9wqfmUt1tMizgi',
  'tTlUVF9On8Fcc7r5IOUdLGNWw+ua+w39Dvu0XJKJh9KIkHkIkYa516OyqupMLVk5+sfCc04ogq08CgGWrKt7ysoJ039rDI1L/WNt',
  'afWoamIEB212xpNqa38U5jQMHOE94CSnBhQ31xrExJS+JwZrQ4pLgvIis/q9jM3u9lL7tqafLi75+NDGwHlsY1yHfAHMJIyUEPe6',
  'j3IfbMinDLkJJDhEow5XWYvs7yELWTk1tmVu+/+G+IOBySsIwPHegHwDlRLRY9G0HXu1amADLR5U/8zojVonOxMWRu5mvLuXhyHZ',
  'c3iCzDzNF+URsVOv6bBTwnB+ONsRnv0CumanDKD4MG4hpj/Cv5EHejS6TwSPcxbTnyDb0bpOwUHqouHN7W1smm5Qqk+B31aUSeGX',
  'Y8IITJVtwvTQScyAuUqhaYbf4ZNiPHUHX7fbUtPD3cc3MWc/X1+SybE6mMHP0ngzi1pn//PR6iLH5Z4pO8/GtIdvU6F1cqfk0now',
  '8K1Fot6aN3LfUqKltewYsIv10ovxrkPsXOaehDrNFlHJCgEzqBfKLu9wBSBEzlM7QPoOXShisQ7bK+U4c4b19AxUPrhc7iRjP4RE',
  'jnYKgT8xbell/tCsCWI8fIx0TglM7++2IOFascxBrEQiFdi89xyps/MhL88ExFcK60hfHMwWYHluhlAhv9f3CAQsL+1WKNyyKewX',
  'id9ZldcTHJBpTaSwsRRmRzac5UzLnv5e+8kIABd4eqIgHa2DKq+vE8Z9j+9aXiOhgH21z95TaliR/wHXAqJ2mn7E27geWBSGfWog',
  'VtOd63E1XJkVi8L9GqlrF1ux0QaOyfWp8Q7+ZCe8t+NkmbVl/A3OUTOMQqFqEPpYoeOUADQn3N1QaIbxU0rYjdhb30PmeIK1Eg8F',
  'nyO2rGCh4GSNX78TrQfLpr5phd5S85DU36uEnH6wUe+yoh3x8YuPNQqSRVOSVi9f3i8Xmc6M0cA2ydfgHzjtALbs0THqUAhKp7Vz',
  'pp0vYk+UwWWtwVfgkTQKuCg8hs2vHWnmZkIL8nNtXs/dplJ64+IVZAImNlKBcgiZu3LsBdiI9lYnwKhxFSEJelhI7udiKRH8EY7m',
  'tY/wUg4aKKJ77FUTY/15SbkYdvQ+wrkuMRmZHMjxBCLoEZQW9jbj2vyTImCSlW1iZpBDdL/2Ci7HE/su0A1HtXSWnqdasTYjtDd+',
  'MTj+COQJGks7Bo/FXgTSP4mrLYp3VoFSQtRm+uC97McUM3cKZW5kc3RyZWFtCmVuZG9iago3IDAgb2JqCjw8Cj4+CmVuZG9iago4',
  'IDAgb2JqCjw8Ci9WIDIKL1IgMwovTGVuZ3RoIDEyOAovUCA0Mjk0OTY3MjkyCi9GaWx0ZXIgL1N0YW5kYXJkCi9PIDxjZTljY2Qz',
  'YjRlYWU4YTUyOTMwNDhhZDliZjhjNjBmYTQ2MGI5MWZmOTAxMWYzZjhmNmMyZGY2N2Q3YjljOTNjPgovVSA8MDk0YzNmZTFhNTI0',
  'OWIyMjBkZTBmOGQ4NzU0YTRiZmIyOGJmNGU1ZTRlNzU4YTQxNjQwMDRlNTZmZmZhMDEwOD4KPj4KZW5kb2JqCnhyZWYKMCA5CjAw',
  'MDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDU5IDAwMDAwIG4gCjAwMDAwMDAxMTggMDAwMDAg',
  'biAKMDAwMDAwMDE4MyAwMDAwMCBuIAowMDAwMDAwMzExIDAwMDAwIG4gCjAwMDAwMDAzODEgMDAwMDAgbiAKMDAwMDAwMjE1MyAw',
  'MDAwMCBuIAowMDAwMDAyMTc0IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgOQovUm9vdCAzIDAgUgovSW5mbyAxIDAgUgovSUQg',
  'WyA8NjQ2MTY2MzUzOTMyNjUzNzYxMzMzODMzNjUzMjYzMzIzOTYxNjUzNzMyNjMzODY0MzI2NTM5Mzg2MTM5MzE2Nj4gPDY0NjE2',
  'NjM1MzkzMjY1Mzc2MTMzMzgzMzY1MzI2MzMyMzk2MTY1MzczMjYzMzg2NDMyNjUzOTM4NjEzOTMxNjY+IF0KL0VuY3J5cHQgOCAw',
  'IFIKPj4Kc3RhcnR4cmVmCjIzODkKJSVFT0YK',
].join('');

fs.writeFileSync(path.join(OUTPUT_DIR, 'synthetic-encrypted.pdf'), Buffer.from(ENCRYPTED_FIXTURE_BASE64, 'base64'));
console.log(`wrote ${path.join(OUTPUT_DIR, 'synthetic-encrypted.pdf')}`);

fs.writeFileSync(path.join(OUTPUT_DIR, 'synthetic-corrupt.pdf'), '%PDF-1.4\nThis is not a valid PDF.\n%%EOF\n');
console.log(`wrote ${path.join(OUTPUT_DIR, 'synthetic-corrupt.pdf')}`);
