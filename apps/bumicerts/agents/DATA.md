# Data Rules

Use this doc for validation, forms, env, queries, mutations, API boundaries, and persistent data flows.

## Core Principle

TypeScript is not runtime validation.

For Bumicerts, “type-safe” means:

- compile-time type safety
- runtime validation at every external boundary

## Validate at Boundaries

Validate all external or untrusted input, including:

- environment variables
- route params
- search params
- form submissions
- cookies
- headers
- local storage payloads
- server action input
- API request bodies
- API responses
- webhook payloads
- database JSON fields
- third-party SDK responses

## Boundary Pattern

- Parse once at the boundary.
- Narrow unknown data into a validated shape.
- Convert validated transport data into the internal shape the feature actually needs.
- Do not pass raw unvalidated data deep into the app.

## Data Model Separation

Keep these concerns distinct:

- domain model
- transport model
- form model
- UI/view model

Do not leak raw remote shapes everywhere if the app needs a cleaner internal contract.

## Queries and Server Data

- Server data should have a clear source of truth.
- Do not mirror query results into local state without a strong reason.
- Prefer derived view values over synchronized copies.
- Keep query ownership close to the feature that depends on it.
- Reuse query keys and query flows consistently.

## Mutations

- Keep mutations focused.
- One mutation should do one coherent job.
- Validate mutation input before the write.
- Return predictable success and error shapes.
- Prefer optimistic UI only when it improves immediate user experience and the reconciliation path is clear.
- Do not let optimistic state silently diverge forever.

## Forms

- Prefer schema-driven form validation.
- Infer form types from the validation schema where possible.
- Validate again on the server.
- Normalize values intentionally before persistence.
- Keep field errors, submission errors, and system errors distinct.

## Auth and Authorization

- Authentication and authorization checks belong on the server.
- Never trust privilege or identity values sent from the client.
- Do not rely on hidden client state for access control.

## Environment and Configuration

- Centralize env access.
- Do not scatter raw `process.env` reads throughout the app.
- Keep required and optional configuration explicit.
- Use dedicated modules for shared config and URL resolution.

## Project-Specific Rules

- For app base URL logic, use `lib/url.ts`.
- For app paths, use `lib/links.ts`.
- For ATProto writes, choose `update` vs `upsert` intentionally.
- For `/upload/*` mutation details and write-surface rules, read `UPLOAD_ROUTES.md`.

## Review Checklist

Before finishing, check:

- Did I validate external input at the boundary?
- Did I avoid passing raw unknown data too far inward?
- Is the mutation and query ownership clear?
- Did I avoid duplicating server data into local state?
- Are success and error shapes predictable?
