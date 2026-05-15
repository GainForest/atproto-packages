# Active Paths and Ownership Map

Use this doc when file ownership, placement, or search results are ambiguous.

## Hard Rules / Non-Negotiables

- Do not edit a deprecated file first when a canonical replacement exists here.
- If you land on a shim, wrapper, or compatibility file, trace to the owning implementation before editing.
- If a search result and this doc disagree, trust this doc and verify imports before changing anything.
- If the path you need is still ambiguous after this doc, stop and ask.

## Glossary

- `manage` is the historical internal name for the `/upload` area.
- `links.manage.*` still owns `/upload*` path helpers.
- Comments, symbols, or helper names containing `Manage` often refer to `/upload` behavior, not a separate product area.

## Route Entry Ownership

| Need | Canonical path | Notes |
|---|---|---|
| Public landing page UI | `app/(marketplace)/page.tsx` | Active homepage and marketplace landing content live here. |
| `/home` alias | `app/home/page.tsx` | Redirect only. Do not add landing-page UI here. |
| Marketplace route-group chrome | `app/(marketplace)/layout.tsx` | Owns marketplace layout wiring and shared shell behavior. |
| Marketplace header and nav context | `app/(marketplace)/_components/Header/*`, `app/(marketplace)/_components/Navbar/*` | Verify ownership here for header and top-nav concerns. |
| Upload auth gate and shell | `app/(upload)/layout.tsx`, `app/(upload)/_components/UploadLayoutClient.tsx` | Server auth gate plus upload route-group client shell. |
| Upload dashboard content | `app/(upload)/upload/_components/*` | Route-local upload dashboard UI and helpers live here. |
| Bumicert creation flow | `app/(marketplace)/bumicert/create/*` | Creation route and draft sub-route own this flow. |

## Navigation and Sidebar Ownership

- Canonical sidebar implementation lives in `components/layout/UnifiedSidebar/*`.
- Some files under `app/(marketplace)/_components/Navbar/*` remain active for top-nav and layout context work. Verify imports before editing, but do not treat older sidebar files there as the primary sidebar owner.
- Deprecated reference-only sidebar files include:
  - `app/(marketplace)/_components/Navbar/data.ts`
  - `app/(marketplace)/_components/Navbar/DesktopSidebar.tsx`
  - `app/(upload)/_components/Navbar/data.ts`
  - `app/(upload)/_components/Navbar/DesktopSidebar.tsx`
  - `components/ui/PlatformSwitcher.tsx`
  - `components/ui/SidebarTransitionOverlay.tsx`
- Only touch deprecated sidebar files when removing them or updating explicit compatibility references.

## Modal and Auth Ownership

| Need | Canonical path | Notes |
|---|---|---|
| Modal stack infrastructure | `components/ui/modal/*` | Context, wrapper, dialog/drawer switching, and modal primitives live here. |
| App-global modal content | `components/global/modals/*` | Global modal flows and content live here. |
| Global modal IDs | `components/global/modals/ids.ts` | Register every global modal ID here. |
| Auth modal compatibility entry | `components/auth/AuthModal.tsx` | Shim only. Do not start implementation edits here. |
| Active auth modal wrapper | `components/global/modals/auth/index.tsx` | Real auth modal wrapper used by the modal stack. |
| Auth modal body and login form UI | `components/auth/LoginModal.tsx` | Owns the login form content rendered inside the auth modal. |
| Standalone modal-like components that are not the modal stack | `components/modals/*` | Shared modal bodies can live here, but this folder does not own modal infrastructure. |

- For app-level modal behavior, do not start from `components/ui/dialog.tsx`. Check `components/ui/modal/*` and `agents/MODALS.md` first.
- For route-local modal flows that belong to one route only, prefer route-local `_components/*` ownership.

## Links and URL Ownership

| Need | Canonical path | Notes |
|---|---|---|
| App path helpers | `lib/links.ts` | Central owner for route strings and route builders. |
| Public base URL resolution | `lib/url.ts` | Central owner for public URL and domain resolution. |

- Do not hardcode paths or domains outside these modules when a helper should own them.

## When to Extend This Map

If another area repeatedly causes wrong-file edits, add it here after approval.
