# MaEarth Funding Round 3 — Bumicerts Application Plan

## Context

GainForest communities should be able to apply to MaEarth Funding Round 3 without re-writing project information already captured in Bumicerts/GainForest. The Bumicerts app should add:

1. A homepage banner/CTA: **“Apply for the MaEarth Funding Round 3”**.
2. A Bumicerts-hosted informational landing page tailored to GainForest communities.
3. An authenticated application handoff where a user chooses an existing Bumicert and is redirected to MaEarth’s importer.

## Sources reviewed

- MaEarth fundraise page: `https://maearth.com/fundraise`
- MaEarth Restor importer page: `https://maearth.com/restor`
- GainForest May 2026 newsletter: `https://mailchi.mp/gainforest/may2026`
- Existing Bumicerts code structure:
  - `app/page.tsx`
  - `app/(marketplace)/_components/Home/Hero.tsx`
  - `app/(marketplace)/_components/Navbar/TopNavbar.tsx`
  - `app/(marketplace)/bumicert/create/_components/MyBumicerts.tsx`
  - `lib/links.ts`

## Key facts to communicate

### Round summary

- MaEarth Funding Round 3 is a funding round for ecosystem health and community stewardship projects.
- The round has a **$500,000 matching pool**.
- Funding is community-backed: projects raise support from many individual supporters, and the matching pool amplifies that support.
- MaEarth describes the matching mechanism as quadratic funding: the number of unique supporters matters, not only the donation amount.

### Timeline

- MaEarth fundraise page says applications are due **May 31, 2026**.
- GainForest newsletter says applications close **June 1, 2026**.
- Applicants notified by **June 15, 2026**.
- Accepted projects join the round starting **July 1, 2026**.
- Round ends / funding paid around **July 21, 2026**.
- Project work should begin by **2027**.

Recommendation: use **“Apply by June 1, 2026”** in user-facing copy only if confirmed with MaEarth/GainForest, otherwise use **“Applications close at the end of May”** or show both as “May 31 / June 1 depending on timezone.”

### Eligible project types

- Restoration
- Conservation
- Agriculture
- Water
- Soil
- Biodiversity
- Community
- Education
- Energy
- Technology
- Disaster Relief

### Project requirements

Projects should be:

- Nature-based
- Comprehensive / holistic
- Connected to the steward’s lived work, passion, research, or traditional knowledge
- Community-oriented
- Feasible, with specific goals and a defined timeframe
- Seeking project-specific funding of **USD $2,000–$15,000**
- Verifiable, with authentic success claims and regular documentation/reporting
- In a Stripe-supported country or fiscally hosted by a host partner

### GainForest-specific positioning

Suggested framing:

- “Use your Bumicert as a funding-ready impact record.”
- “Apply with information you have already documented: project story, evidence, location, photos, organization, and impact claims.”
- “Bumicerts help bridge verified community work to funders.”

## Restor importer reference

Observed on `https://maearth.com/restor`:

- Hero: “Get funded for restoration — up to $15,000 in matching funds”
- Primary CTA: “Start application”
- Support copy: “Your Restor profile imports in about 5 minutes”
- Explanation: “Restor projects can apply to MaEarth’s funding round in minutes. Your Restor data flows straight into a fundraising-ready MaEarth profile.”
- Partnership copy: Restor, MaEarth, and UNCCD G20 Global Land Initiative.
- Clicking the top “Start application” begins MaEarth auth via `auth.certified.one` OAuth.

Bumicerts should mirror the pattern, adapted to GainForest:

- “Apply with your Bumicert in minutes.”
- “Your Bumicert data flows into a MaEarth application so you do not have to start from scratch.”
- “Choose the Bumicert that best represents the project seeking funding.”

## Proposed user flow

1. Visitor lands on Bumicerts homepage.
2. Homepage banner says **“Apply for the MaEarth Funding Round 3”** with a deadline cue and CTA.
3. CTA opens a new informational route, proposed: `/ma-earth-funding-round-3`.
4. Landing page explains:
   - what the round is;
   - who should apply;
   - funding range and matching pool;
   - deadline/timeline;
   - how Bumicerts reduce duplicate data entry;
   - what information will be shared with MaEarth.
5. User clicks **“Apply with your Bumicert”**.
6. If unauthenticated, open existing Bumicerts auth/account setup flow.
7. Authenticated user sees selectable Bumicert cards, reusing the existing `activities.list` -> `activitiesToBumicertDataArray` pattern from `MyBumicerts.tsx`.
8. User chooses one Bumicert.
9. Bumicerts redirects to the MaEarth importer with a signed or predictable handoff URL.
10. MaEarth completes the import/application experience.

## Proposed route and code shape

### Add links

Update `lib/links.ts` with internal paths and MaEarth external URLs instead of hardcoding paths inline.

Suggested additions:

- `links.maEarthFundingRound = "/ma-earth-funding-round-3"`
- `links.maEarthApply = "/ma-earth-funding-round-3/apply"` or a query-state variant on the landing page
- `links.external.maEarth.fundraise = "https://maearth.com/fundraise"`
- `links.external.maEarth.restor = "https://maearth.com/restor"`
- `links.external.maEarth.importBumicert(...)` once MaEarth confirms the importer contract

### Landing page

Suggested path:

- `app/(marketplace)/ma-earth-funding-round-3/page.tsx`

Suggested sections:

1. Hero with matching pool, deadline, and CTA.
2. “Why apply with a Bumicert?”
3. “Who is eligible?”
4. “How matching funding works.”
5. “Timeline.”
6. “What gets imported.”
7. CTA panel: “Apply with your Bumicert.”

### Bumicert chooser

Options:

- Keep it on the landing route as a client component revealed after auth.
- Or create a dedicated route: `app/(marketplace)/ma-earth-funding-round-3/apply/page.tsx`.

Preferred for urgency: dedicated apply route, because it keeps informational content static/server-rendered and isolates auth/client querying.

Reuse existing pieces/patterns:

- `useAtprotoStore` for auth state.
- `indexerTrpc.activities.list.useQuery` to fetch the user’s activities.
- `activitiesToBumicertDataArray` to transform activities into display cards.
- `BumicertCardVisual` / `BumicertCardSkeleton` for selection UI.
- Existing shared auth wrapper or modal flow used by authenticated pages.

## Data handoff proposal

MaEarth needs to confirm the exact importer URL and required payload. Bumicerts can support either:

### Option A — URL parameter handoff

Redirect to a MaEarth URL with identifiers:

```txt
https://maearth.com/gainforest/import?did=<actorDid>&bumicert=<bumicertId-or-at-uri>&source=bumicerts
```

Pros: quickest to implement.
Cons: MaEarth must fetch public data by identifier; avoid putting sensitive data in the URL.

### Option B — short-lived server-generated token

Bumicerts creates a short-lived import token and redirects:

```txt
https://maearth.com/gainforest/import?token=<signed-token>
```

Pros: cleaner privacy and integrity story.
Cons: needs a small API route and MaEarth verification agreement.

### Option C — POST/export API

Bumicerts exposes an API route MaEarth calls after auth:

```txt
GET /api/ma-earth/bumicert-import?did=<did>&bumicert=<id>
```

Pros: extensible and avoids large URLs.
Cons: more coordination and auth design needed.

Recommended urgent MVP: **Option A** if the relevant Bumicert/project data is already public and MaEarth can resolve it; otherwise **Option B**.

## Candidate fields to import

From Bumicert / activity data:

- Bumicert ID or AT URI
- Organization DID / handle / display name
- Bumicert title
- Short and long descriptions
- Objectives / impact claims
- Project/category tags if available
- Cover image / logo
- Evidence photos and timeline references
- Location / geospatial references if available
- Public Bumicert URL

Do not send private drafts, wallets, donor information, or hidden account details.

## Copy draft

### Homepage banner

Title: **Apply for the MaEarth Funding Round 3**

Body: **GainForest communities can apply for MaEarth’s $500,000 matching funding round using a Bumicert, so your verified project story and evidence can travel with you.**

CTA: **Apply with your Bumicert**

Secondary: **Learn about the round**

### Landing hero

Title: **Bring your Bumicert to MaEarth Funding Round 3**

Body: **MaEarth is running a community-backed funding round with a $500,000 matching pool for nature-based projects. If your organization already documents impact through Bumicerts, you can choose a Bumicert and import key project information into MaEarth instead of starting from scratch.**

CTA: **Apply with your Bumicert**

### Import explainer

**What your Bumicert can pre-fill:** project story, organization details, photos, evidence, location, and impact claims already documented in GainForest/Bumicerts.

## Open questions / blockers

1. Confirm the public deadline wording: May 31, June 1, or timezone-specific copy.
2. Confirm MaEarth’s final importer URL for Bumicerts/GainForest.
3. Confirm whether MaEarth expects a Bumicert ID, AT URI, actor DID, signed token, or exported JSON.
4. Confirm whether MaEarth can fetch Bumicert data publicly or needs a Bumicerts API endpoint.
5. Confirm whether only published Bumicerts are eligible, or whether drafts can be used.
6. Confirm whether the chooser should show all Bumicerts or only organization-owned Bumicerts.
7. Confirm consent copy for sharing data with MaEarth.
8. Confirm whether the landing page should use MaEarth branding/logos and whether assets are available/approved.

## Implementation checklist

- [ ] Add `links` entries for the new internal route and external MaEarth URLs.
- [ ] Add homepage banner component near the hero.
- [ ] Add informational landing route.
- [ ] Add authenticated apply/chooser route or client section.
- [ ] Reuse Bumicert card/loading/error patterns from `MyBumicerts.tsx`.
- [ ] Add empty state: “Create a Bumicert first.”
- [ ] Add redirect builder for MaEarth importer once contract is confirmed.
- [ ] Add privacy/consent text before redirect.
- [ ] Add metadata for the landing page.
- [ ] Add targeted tests if application handoff logic is non-trivial.
- [ ] Run `bun run lint` and, for route changes, `bun run build`.

## Suggested MVP cut for urgency

1. Static landing page plus homepage banner.
2. Apply page requiring auth.
3. Bumicert chooser listing existing published Bumicerts.
4. Redirect to a configurable MaEarth importer URL with `did`, `bumicertId`, and `source=bumicerts` query params.
5. Display a short consent note before redirect.

This can be built independently while MaEarth implements the importer, as long as the redirect base URL is configured or centralized in `lib/links.ts`.
