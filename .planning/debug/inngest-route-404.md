---
status: diagnosed
trigger: "Inngest serve route at /api/inngest responds with function registry — returns 404"
created: 2026-03-04T21:30:00Z
updated: 2026-03-04T21:32:00Z
---

## Current Focus

hypothesis: User typed /api/ingest (missing 'n') instead of /api/inngest — typo in test report, not a real bug
test: curl both URLs — /api/inngest (correct) and /api/ingest (typo)
expecting: /api/inngest returns 200, /api/ingest returns 404
next_action: return diagnosis — this is a false positive

## Symptoms

expected: Navigate to /api/inngest in browser, endpoint responds with Inngest function registry
actual: "https://1on1.surmont.co/api/ingest returns 404"
errors: 404 Not Found
reproduction: Navigate to /api/ingest (typo) in browser
started: Discovered during UAT test 7

## Eliminated

- hypothesis: "Inngest route was removed as part of commit f9946b4 (replace Inngest with direct execution)"
  evidence: src/app/api/inngest/route.ts still exists on disk, inngest package still in package.json and node_modules, route file unchanged since original creation (commit 204d402)
  timestamp: 2026-03-04T21:31:00Z

- hypothesis: "Inngest route exists but fails to respond (broken imports, missing deps)"
  evidence: curl http://localhost:4300/api/inngest returns 200; curl https://1on1.surmont.co/api/inngest also returns 200
  timestamp: 2026-03-04T21:31:30Z

## Evidence

- timestamp: 2026-03-04T21:30:30Z
  checked: src/app/api/inngest/route.ts existence
  found: File exists, imports inngest client and functions, exports GET/POST/PUT via serve()
  implication: Route was NOT removed during the Inngest replacement

- timestamp: 2026-03-04T21:30:45Z
  checked: commit f9946b4 diff stat
  found: Commit modified 9 files but src/app/api/inngest/route.ts was NOT among them
  implication: Route was intentionally preserved — only the callers were changed to use direct pipeline

- timestamp: 2026-03-04T21:31:00Z
  checked: package.json for inngest dependency
  found: inngest (^3.52.6) and inngest-cli (^1.17.1) still in dependencies
  implication: Inngest SDK still installed, serve route can function

- timestamp: 2026-03-04T21:31:30Z
  checked: curl https://1on1.surmont.co/api/inngest (correct URL)
  found: HTTP 200 response
  implication: Route works perfectly fine via reverse proxy

- timestamp: 2026-03-04T21:31:45Z
  checked: curl https://1on1.surmont.co/api/ingest (user's reported URL — typo)
  found: HTTP 404 response
  implication: User's 404 is because they typed /api/ingest (missing 'n'), not /api/inngest

## Resolution

root_cause: False positive — user typo in URL. The UAT report says "https://1on1.surmont.co/api/ingest" (missing the 'n' in 'inngest'). The correct route /api/inngest responds with HTTP 200. The route file exists, the Inngest SDK is installed, and the serve endpoint works correctly both locally and via the reverse proxy.
fix: N/A — no code change needed. UAT test should be re-run with correct URL /api/inngest.
verification: curl https://1on1.surmont.co/api/inngest returns 200
files_changed: []
