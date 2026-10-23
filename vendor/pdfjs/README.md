# PDF.js vendor assets

Pinned library: **PDF.js 4.10.38** (legacy module build)

Source package: `pdfjs-dist@4.10.38` from the npm registry
- Package: https://www.npmjs.com/package/pdfjs-dist/v/4.10.38
- Upstream project: https://github.com/mozilla/pdf.js
- License: Apache License 2.0 (see `LICENSE`)

Files:
- `pdf.min.mjs` — `legacy/build/pdf.min.mjs`
- `pdf.worker.min.mjs` — `legacy/build/pdf.worker.min.mjs`
- `LICENSE` — PDF.js license

SHA-256:
- `pdf.min.mjs`: `44EC6F011027EE77791386B66C14876A5FC29E20BF0433C07C6726FFF7212B72`
- `pdf.worker.min.mjs`: `BD88805178A26C729DB8C0107A5B630CB900EC070F4D8C7529A3E45530AFD41D`

These files are served locally by Centsible. No CDN or third-party parsing
service is used at runtime. The files are loaded lazily only after the user
selects a PDF statement.

The app must be served over `http://localhost` for PDF import because the
PDF.js module and worker are ES modules. Opening `index.html` directly via
`file://` continues to support CSV import, but PDF import will show a clear
"serve the app locally" message.
