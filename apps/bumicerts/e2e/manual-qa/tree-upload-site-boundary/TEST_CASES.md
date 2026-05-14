# Test cases: tree upload selected-site boundaries

Run these in order unless a case says it can be run independently. Record pass/fail, screenshots, and notes in `RESULTS_TEMPLATE.md` as working notes if useful, but publish the final report through `https://bumicerts-eval.vercel.app/skill.md` using the local eval repo at `C:\Users\infec\MyFolders\Documents\Work\Gainforest\donald-eval`.

Evidence is mandatory:

- Capture a screen recording of the browser QA session.
- Capture screenshots for the major assertions in each case.
- Store sanitized evidence in the eval report run's `assets/` directory.
- Do not include passwords, cookies, auth-state files, storage-state JSON, bearer tokens, or other secrets in the report or assets.

## TC-00 — Prepare test sites

Purpose: create controlled GeoJSON-backed sites for the rest of the suite.

Steps:

1. Sign in with the QA credentials provided in the task handoff. Do not persist or report the password.
2. Open `/upload/sites` while authenticated as an uploader organization.
3. Add a site named `QA Alpha <run id>` using `fixtures/site-alpha-boundary.geojson`.
4. Add a site named `QA Beta <run id>` using `fixtures/site-beta-overlap-boundary.geojson`.
5. If possible, make `QA Alpha <run id>` the default site.
6. Confirm both site cards are visible after reload.

Expected:

- Both sites save successfully.
- Both sites remain available after page reload.
- If Alpha is made default, it is marked as the default site.

## TC-01 — Selected Alpha upload skips invalid rows and uploads valid rows

Purpose: verify selected-site-only preview validation, on-boundary validity, near/out messaging, and skip-invalid/continue-valid upload behavior.

Steps:

1. Open `/upload/trees`.
2. Upload `fixtures/tree-upload-mixed-alpha-beta.csv`.
3. In `Site boundary`, select `QA Alpha <run id>`.
4. Verify the selected site panel says validation uses only this site boundary even if other site boundaries overlap.
5. Switch the site selector to `QA Beta <run id>`, then back to `QA Alpha <run id>`, to verify the selection is visible and changeable.
6. Choose `No dataset` for the dataset destination.
7. Continue to column mapping. Confirm required fields are mapped; map them manually if auto-mapping misses any required field.
8. Continue to preview.
9. Open the error details for invalid rows.
10. Upload the valid rows.
11. Wait for upload completion.
12. Open the rows-needing-attention details.

Expected:

- The file step cannot continue until a selected site with a loadable GeoJSON boundary is available.
- Preview shows `3 rows valid, 2 rows have errors`.
- Rows 1, 2, and 5 are valid.
- Row 3 error mentions `Near boundary`.
- Row 4 error mentions `Out of site`.
- The preview upload button says `Upload 3 Valid Rows`.
- Upload completes without a fatal error.
- Completion says 3 records saved and 2 failed/need attention.
- The per-row list shows rows 1, 2, and 5 saved; rows 3 and 4 remain failed with near/out-of-site messages.

## TC-02 — Selected Beta preview proves overlapping boundaries do not leak validation

Purpose: verify rows are validated against the selected site only when two site boundaries overlap.

Steps:

1. Start a fresh `/upload/trees` flow.
2. Upload `fixtures/tree-upload-mixed-alpha-beta.csv`.
3. Select `QA Beta <run id>` in `Site boundary`.
4. Choose `No dataset`.
5. Continue through column mapping to preview.
6. Do not upload unless the run intentionally wants additional persisted records.

Expected:

- Preview shows `4 rows valid, 1 row has errors`.
- Rows 2, 3, 4, and 5 are valid for Beta.
- Row 1 is invalid for Beta.
- Rows 3 and 4 are not accepted merely because Alpha exists; they are accepted here because Beta is selected.
- Switching back to Alpha returns the Alpha expectation from TC-01.

## TC-03 — Upload-time revalidation skips newly invalid rows and continues valid rows

Purpose: verify the final upload step rechecks the selected boundary and does not trust stale preview/session data.

Steps:

1. Add a new site named `QA Revalidation <run id>` using `fixtures/site-alpha-boundary.geojson`.
2. Start a fresh `/upload/trees` flow.
3. Upload `fixtures/tree-upload-mixed-alpha-beta.csv`.
4. Select `QA Revalidation <run id>`.
5. Choose `No dataset`.
6. Continue through column mapping to preview.
7. Confirm preview initially shows the Alpha expectation: `3 rows valid, 2 rows have errors`.
8. Before clicking the preview upload button, open `/upload/sites` separately and edit `QA Revalidation <run id>`.
9. Replace its boundary with `fixtures/site-alpha-row1-only-boundary.geojson` and save.
10. Return to the still-open preview and proceed with the upload.
11. Wait for completion and open rows-needing-attention details.

Expected:

- The revalidation site boundary edit saves because no trees are linked to that site yet.
- The upload step revalidates against the changed boundary.
- Upload completes without a fatal error.
- Row 1 is saved.
- Rows 2, 3, 4, and 5 are skipped/failed because they no longer match the selected site's current boundary.
- Completion says 1 record saved and 4 failed/need attention.
- Photo queues, progress, and completion counts only reflect uploadable rows.

## TC-04 — Photo URL upload and manual photo attachment keep working with selected site

Purpose: verify selected `siteRef` flows through fetched photos and manual photo uploads from the upload result UI.

Steps:

1. Start a fresh `/upload/trees` flow.
2. Upload `fixtures/tree-upload-valid-alpha-with-photo-url.csv`.
3. Select `QA Alpha <run id>`.
4. Choose `No dataset`.
5. Continue through mapping to preview. Ensure the `photoUrl` column is mapped to `Photo URL` if auto-mapping misses it.
6. Confirm preview shows 1 valid row and a photo count for that row.
7. Upload the row.
8. Wait for tree upload and background photo upload to finish.
9. On the completed upload row, use `Add Photo`.
10. Attach `apps/bumicerts/public/assets/media/images/bumicert-image-placeholder.jpg` and upload it.
11. If network payloads or indexed records are inspected, confirm multimedia records include the selected Alpha site URI as `siteRef`.

Expected:

- The upload saves 1 tree record.
- Photo upload progress appears and completes.
- Photo progress reports 1 uploaded of 1 photo attachment.
- The row photo count increments after the fetched photo.
- Manual `Add Photo` succeeds and increments the row photo count again.
- No photo upload path reports a missing selected site or validation error.

## TC-05 — Linked-tree boundary edit is blocked when it would exclude linked trees

Purpose: verify site boundary edits cannot save a boundary that would exclude trees already linked to that site.

Steps:

1. Ensure TC-01 has saved rows linked to `QA Alpha <run id>`.
2. Open `/upload/sites`.
3. Edit `QA Alpha <run id>`.
4. Replace the boundary with `fixtures/site-alpha-shrunken-excludes-uploaded.geojson`.
5. Save.
6. Observe the modal state and error message.
7. Reload `/upload/sites` and re-open or inspect `QA Alpha <run id>` if needed.

Expected:

- Save enters a checking/saving state and then stops with an error.
- The modal does not show `Site updated successfully`.
- The error mentions that the boundary would exclude linked trees, or that linked trees could not be checked because coordinates are missing.
- The original Alpha boundary remains the active boundary after reload.

## TC-06 — Dataset paths still respect selected site

Purpose: verify selected `siteRef` does not regress when using dataset modes.

Steps:

1. Start a fresh `/upload/trees` flow with `fixtures/tree-upload-mixed-alpha-beta.csv`.
2. Select `QA Alpha <run id>`.
3. Choose `Create new dataset` and use a unique dataset name, for example `QA Site Boundary Dataset <run id>`.
4. Continue through preview.
5. Upload the 3 valid Alpha rows.
6. Use the completion action to view the dataset in Tree Manager.
7. If an existing dataset is available, run a separate upload using `Add to existing dataset` and the same selected Alpha site.

Expected:

- New dataset upload completes with 3 saved rows and 2 failed rows.
- The dataset view opens from the completion CTA.
- Appending to an existing dataset, when tested, also skips invalid rows and saves only selected-site-valid rows.
- If record details/network payloads are inspected, created occurrence records include the selected Alpha URI as `siteRef`.

## Final exploratory checks

- Refresh during non-final steps and confirm stale site selections are not silently accepted.
- Check browser console and page errors after each upload and site edit.
- Verify all user-facing failure copy is understandable and identifies whether rows are near boundary, out of site, missing site selection, or blocked by linked trees.
- Confirm the eval report includes the required screen recording and screenshots before marking QA complete.
