# Next.js Rules

Use this doc for routes, pages, layouts, loading states, server/client boundaries, and framework behavior.

## Default Architecture

- Use the App Router conventions correctly.
- Prefer Server Components by default.
- Add `"use client"` only when interactivity, browser APIs, or client-only hooks truly require it.
- Keep `page.tsx` and `layout.tsx` thin.
- Put data access and business logic outside route entry files when it improves reuse and clarity.
- Never expose server-only secrets to client code.

## Routing and File Conventions

- Use the framework file conventions intentionally:
  - `page.tsx`
  - `layout.tsx`
  - `loading.tsx`
  - `error.tsx`
  - route-local `_components` when useful
- For new route work, read `NEW_ROUTE.md`.
- Do not hardcode paths inline when they belong in `lib/links.ts`.

## Loading and Suspense

- Prefer meaningful loading states over blank waits.
- Skeletons should mirror the real layout.
- Skeletons should not contain placeholder prose.
- Reuse existing skeleton components before creating new ones.
- If the page has static chrome and one main dynamic region, prefer the Shell pattern described in `NEW_ROUTE.md`.
- Avoid accidental data waterfalls. Start independent async work early and await it only when needed.

## Server and Client Boundaries

- Keep server-only logic on the server.
- Keep client components small and focused.
- Data crossing the server/client boundary must be serializable.
- Convert non-serializable values before crossing the boundary.
- Reconstruct richer client-side shapes only where actually needed.
- Minimize what is passed into client components.

## Query Parameters

- Use `nuqs` for query parameter state management.
- Do not hand-roll query param state with manual router or URL string manipulation unless there is a documented exception.
- Keep query state typed and intentional.

## Errors

- In SSR page components, render a controlled error UI instead of relying on a generic thrown render-time error page.
- Use route-level `error.tsx` boundaries for unexpected segment failures.
- Do not hide failures behind silent fallbacks.

## Data Fetching

- Fetch on the server when the content belongs in the initial render.
- Avoid duplicate fetching for the same data within the same route flow.
- Choose client fetching intentionally when the state is user-driven, rapidly changing, or hydration-dependent.
- Keep data ownership clear.
- Parallelize independent async operations.

## Framework Primitives

- Prefer `next/image` over raw `<img>` for app images unless a documented exception exists.
- Prefer `next/font` for app fonts.
- Use framework metadata APIs instead of hand-rolled head management.

## Project-Specific Rules

- All public base URL resolution lives in `lib/url.ts`.
- Do not read raw public URL env vars throughout the app.
- App-level modals must use the shared modal stack system from `MODALS.md`.
- For `/upload/*`, read `UPLOAD_ROUTES.md` before making changes.

## Review Checklist

Before finishing, check:

- Did I use Server Components by default?
- Did I add `"use client"` only where necessary?
- Is the route entry file thin?
- Did I use the right loading and error files?
- Is query param state handled with `nuqs`?
- Is all server/client boundary data safely serializable?
