---
status: diagnosed
trigger: "CSV saves but encoding is all wrong — Romanian characters garbled: Aplica»õie finalizatƒÉ etc."
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: CSV is returned as a plain UTF-8 string with no BOM; Excel (and Windows file associations) default to Windows-1252 and misinterpret the multi-byte sequences for Romanian characters (ș ț ă î â)
test: Inspected Content-Type header and Response body construction in export route
expecting: Missing UTF-8 BOM is the root cause; Content-Type header is present but insufficient for Excel
next_action: Add UTF-8 BOM (\uFEFF) to the start of the CSV string in generateCSV or in the export route response

## Symptoms

expected: Romanian characters (ș ț ă î â) render correctly in Excel after download
actual: Characters garbled as Latin-1 mojibake — e.g. "Aplica»õie finalizatƒÉ"
errors: No runtime error — purely a character encoding display problem
reproduction: Export any CSV that contains Romanian text (names, AI summaries, template names, category labels)
started: Always — no BOM has ever been added

## Eliminated

- hypothesis: Content-Type charset missing
  evidence: Line 273 of export route explicitly sets "Content-Type": "text/csv; charset=utf-8" — header is correct
  timestamp: 2026-03-04

- hypothesis: generateCSV produces non-UTF-8 output
  evidence: JavaScript strings are UTF-16 internally; Response() serialises them as UTF-8 — content itself is valid UTF-8
  timestamp: 2026-03-04

- hypothesis: fetch/blob pipeline corrupts encoding
  evidence: res.blob() in csv-export-button.tsx preserves raw bytes exactly; URL.createObjectURL is byte-transparent
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: src/app/api/analytics/export/route.ts line 271-276
  found: Response constructed with plain string result.csv — no BOM prepended; Content-Type header present with charset=utf-8
  implication: Browser treats the byte stream as UTF-8 correctly, but Excel (and many Windows apps) ignores the HTTP header once the file is saved to disk and relies on BOM detection to distinguish UTF-8 from Latin-1

- timestamp: 2026-03-04
  checked: src/lib/analytics/csv.ts — generateCSV function
  found: Returns a plain JS string with no BOM prefix; strings are joined with "\n" (correct line endings for CSV)
  implication: Every downstream consumer of generateCSV will emit BOM-less CSV

- timestamp: 2026-03-04
  checked: src/components/analytics/csv-export-button.tsx line 57
  found: res.blob() called without specifying a MIME type override — blob inherits server Content-Type
  implication: If the blob were constructed with explicit { type: "text/csv;charset=utf-8" } it still would not fix Excel's BOM requirement; fix must be server-side

## Resolution

root_cause: The CSV response body has no UTF-8 BOM (\xEF\xBB\xBF). Excel and Windows file associations do not honour the HTTP Content-Type charset declaration when opening a saved file — they rely on the BOM to detect encoding. Without it, Excel defaults to the system code page (Windows-1252 in Romanian/most European locales), misinterpreting the multi-byte UTF-8 sequences for Romanian diacritics (ș U+0219, ț U+021B, ă U+0103, î U+00EE, â U+00E2) as Latin-1 garbage.

fix: Prepend the UTF-8 BOM string "\uFEFF" to the CSV content immediately before returning the Response. The correct place is the export route (line 271) or inside generateCSV itself. The route is preferred so it stays in one place and generateCSV stays a pure utility.

verification: not yet applied — diagnose-only mode

files_changed: []
