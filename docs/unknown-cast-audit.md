# `as unknown as` Audit

Scope: monorepo-wide search for `as unknown as`.

## Priority 0 (fixed in this change)

- `apps/bumicerts/app/(upload)/upload/_components/UploadDashboardClient.tsx`
  - Replaced `edits.longDescription as unknown as LinearDocument` with lexicon parse (`$parse`) after blob-ref normalization.

## Priority 1 (user-facing mutation boundaries)

- `apps/bumicerts/app/(upload)/upload/_components/UploadDashboardClient.tsx`
  - `resolvedFacets as unknown as Richtext["facets"]`
  - `rec.longDescription as unknown as OrganizationData["longDescription"]`
- `apps/bumicerts/app/(upload)/upload/_components/EditableHero/index.tsx`
  - `shortDescriptionFacets as unknown as app.bsky.richtext.facet.Main[]`
  - `facets as unknown as Facet[]`
- `apps/bumicerts/app/(marketplace)/organization/[did]/_components/OrgSetupPage.tsx`
  - `form.longDescription as unknown as LinearDocument`
- `apps/bumicerts/app/(marketplace)/bumicert/create/[draftId]/_components/Steps/Step5/index.tsx`
  - `step2FormValues.description as unknown as LinearDocument`
- `apps/bumicerts/app/onboarding/api/onboard/route.ts`
  - `... as unknown as LinearDocument`

Recommended remediation:
- Convert lexical boundary casts to parser-backed conversions (`$parse`) or explicit mappers.
- Keep any unavoidable cast in one utility function with runtime guards and unit tests.

## Priority 2 (shared libraries and data pipelines)

- `packages/atproto-mutations-core/src/blob/helpers.ts`
  - Generic recursion casts (`... as unknown as T`) at blob/file transformation boundaries.
- `packages/atproto-mutations-core/src/geojson/validate.ts`
  - GeoJSON validation return casts.
- `apps/indexer/src/tap/blobs.ts`
  - Generic record normalization casts (`as unknown as T`).

Recommended remediation:
- Replace with typed helper overloads or branded helper return types.
- Narrow `T` with constraints where possible to reduce unchecked generic casts.

## Priority 3 (framework/runtime interop and adapters)

- `apps/bumicerts/lib/trpc/indexer/client.ts`
- `apps/bumicerts/lib/supabase/client.ts`
- `apps/bumicerts/lib/supabase/server.ts`
- `apps/indexer/src/db/queries.ts`
- `apps/bumicerts/components/ui/bsky-richtext-editor.tsx`
- `packages/leaflet-react/src/richtext/RichTextEditor.tsx`
- `apps/bumicerts/components/global/modals/funding/config.tsx`
- `apps/bumicerts/app/api/supabase/drafts/bumicert/route.ts`
- `apps/indexer/src/labeller/backfill.ts`
- `apps/indexer/src/labeller/scoring-worker.ts`
- `packages/atproto-auth-next/src/session/cookie.ts`

Recommended remediation:
- Keep interop casts localized (single module) and document why runtime invariants hold.
- Prefer tiny runtime guards over direct unknown-casts in component code.

## Notes

- One grep hit in `apps/bumicerts/AGENTS.md` is documentation text, not executable code.
- This audit intentionally excludes plain `as SomeType` casts; it is focused only on double-casts through `unknown`.
