# Manual browser QA: tree upload site boundaries

Use these cases to QA the selected-site tree upload behavior in a browser.
They are written for a browser-capable QA agent and intentionally describe what to test, not how to operate the browser tool.

## Scope

Validate the UI behavior for:

- Required visible site selection on `/upload/trees`.
- Default/only site auto-selection that remains changeable.
- Boundary validation against only the selected site, including overlapping boundaries.
- Preview-time and upload-time skipping of invalid rows while valid rows continue.
- `siteRef` propagation through tree uploads and photo uploads as far as the UI/network surface can verify.
- Linked-tree-safe site boundary edits on `/upload/sites`.

## Preconditions

- The Bumicerts app is running and reachable in the browser.
- Use an authenticated uploader account with organization/write access.
- Authenticate with the QA credentials provided in the task handoff; do not write the password into this repository, screenshots, reports, or logs.
- Use unique site names for each run, for example:
  - `QA Alpha <run id>`
  - `QA Beta <run id>`
  - `QA Revalidation <run id>`
- Capture a screen recording of the browser session and screenshots as required evidence.
- Keep screenshots or notes for each expected assertion and any unexpected console/page errors.

## Required reporting and evidence

The QA agent must publish the final report through the Bumicerts Eval workflow:

1. Read and follow `https://bumicerts-eval.vercel.app/skill.md` before creating the report or evidence artifacts.
2. Use the local evaluation repo at `C:\Users\infec\MyFolders\Documents\Work\Gainforest\donald-eval`.
3. Create the report under `reports/bumicerts/<run-slug>/` using the eval repo scaffolder described by the skill.
4. Include a browser screen recording of the QA session in the report assets.
5. Include screenshots for the major assertions in the report assets.
6. Sanitize all evidence: no passwords, cookies, auth-state files, bearer tokens, storage-state JSON, or private data.
7. The final handoff must link or identify the eval report run slug and list the screen recording and screenshot artifact paths.

## Test data

Fixtures live in `fixtures/`:

- `site-alpha-boundary.geojson` — selected site A.
- `site-beta-overlap-boundary.geojson` — overlapping site B.
- `site-alpha-row1-only-boundary.geojson` — modified boundary used to test upload-time revalidation.
- `site-alpha-shrunken-excludes-uploaded.geojson` — modified boundary used to test linked-tree edit blocking.
- `tree-upload-mixed-alpha-beta.csv` — five tree rows covering inside, overlap, near-boundary, out-of-site, and on-boundary cases.
- `tree-upload-valid-alpha-with-photo-url.csv` — one valid Alpha row with a public photo URL.

For manual photo attachment, use an existing local image such as `apps/bumicerts/public/assets/media/images/bumicert-image-placeholder.jpg`.

## Expected coordinate behavior

When `site-alpha-boundary.geojson` is selected for `tree-upload-mixed-alpha-beta.csv`:

- Rows 1, 2, and 5 are valid.
- Row 3 is invalid as `near boundary`.
- Row 4 is invalid as `out of site`.

When `site-beta-overlap-boundary.geojson` is selected for the same CSV:

- Rows 2, 3, 4, and 5 are valid.
- Row 1 is invalid as outside Beta.

These expectations prove validation uses only the selected site instead of accepting a row because it fits another overlapping site.

## Files to read next

- `TEST_CASES.md` — executable QA cases.
- `RESULTS_TEMPLATE.md` — optional notes template; the final publishable report must be created through the Bumicerts Eval workflow above.
