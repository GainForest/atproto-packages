# @gainforest/atproto-mutations-core — Agent Guide

## What this package is

Framework-agnostic ATProto mutation primitives. Zero framework dependencies — no Next.js, no React. The foundation that `@gainforest/atproto-mutations-next` builds on, but also independently usable in plain Node/Bun scripts, workers, or any non-Next.js backend.

---

## Package layout

```
src/
├── index.ts                      — public export surface (re-exports only)
├── result.ts                     — MutationResult<TData, TCode>, ok(), err()
├── error.ts                      — MutationError class + static guards
├── adapt.ts                      — adapt() for wrapping actions into mutationFn
├── services/
│   └── AtprotoAgent.ts           — Context.Tag — the abstract agent dependency
├── layers/
│   └── credential.ts             — makeCredentialAgentLayer (username/password)
└── mutations/
    └── <entity>/                 — one directory per entity (see below)
        ├── create.ts
        ├── update.ts
        ├── update-or-create.ts
        ├── delete.ts             — present in most cases, omit only if the record is immutable
        └── utils/                — entity-local helpers (validation, transforms, mappers)
            └── *.ts

tests/
├── .env.test-credentials         — gitignored, copy from .env.test-credentials.example
├── .env.test-credentials.example — committed template
└── *.test.ts
```

---

## The mutations directory

Every entity that needs CRUD lives under `src/mutations/<entity>/`. The entity name mirrors the ATProto NSID path — dots replaced with slashes.

### Naming convention

| NSID | Directory |
|------|-----------|
| `app.gainforest.organization.info` | `src/mutations/organization.info/` |
| `org.hypercerts.claim.activity`    | `src/mutations/claim.activity/`    |
| `app.gainforest.dwc.event`         | `src/mutations/dwc.event/`         |

Use the leaf portion of the NSID (everything after the org/app prefix). Keep it lowercase, dot-separated.

### Files in each entity directory

**`create.ts`** — creates a new record. Always present.

```ts
// src/mutations/organization.info/create.ts
import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import type { CreateOrganizationInfoInput, OrganizationInfoRecord } from "./types";

export const createOrganizationInfo = (
  input: CreateOrganizationInfoInput
): Effect.Effect<OrganizationInfoRecord, CreateOrganizationInfoError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    // ... PDS call
  });
```

**`update.ts`** — updates an existing record by `rkey` or AT-URI. Always present.

**`update-or-create.ts`** — upsert. Tries to fetch the existing record; creates if absent, updates if found. Always present — callers should prefer this over manually sequencing `create` + `update` unless they explicitly need one or the other.

**`delete.ts`** — deletes a record. Present in almost every entity. Omit only when the record type is intentionally immutable (e.g. an append-only log entry). If you're unsure, include it.

**`utils/`** — anything that isn't one of the four operations above:
- Input/output type definitions (`types.ts`)
- Zod schemas (`schema.ts`)
- Record serialization/deserialization helpers
- Ownership or validation checks shared across operations
- Typed error definitions for this entity

Nothing in `utils/` should make PDS calls directly. PDS calls belong in the operation files.

### What each operation file exports

Each file exports exactly two things:

1. **The operation function** — an `Effect.Effect<TData, TError, AtprotoAgent>`
2. **The typed error class(es) specific to that operation**

```ts
// Exports from create.ts
export { createOrganizationInfo };
export { CreateOrganizationInfoError };
```

Types shared across operations (input shapes, output shapes, the record type itself) live in `utils/types.ts` and are imported by the operation files — never defined inside an operation file.

---

## Effect conventions

### Errors live in the error channel — never thrown

```ts
// ✅ correct
return yield* Effect.fail(new RecordNotFoundError({ rkey }));

// ❌ wrong
throw new Error("record not found");
```

### Typed errors per entity

Define errors in `utils/errors.ts` for each entity. Use `Data.TaggedError`:

```ts
import { Data } from "effect";

export class RecordNotFoundError extends Data.TaggedError("RecordNotFoundError")<{
  rkey: string;
}> {}

export class InvalidRecordError extends Data.TaggedError("InvalidRecordError")<{
  message: string;
}> {}
```

Tag names are globally unique strings — prefix with the entity name to avoid collisions across entities:

```ts
// ✅ unambiguous across the whole package
class OrganizationInfoNotFoundError extends Data.TaggedError("OrganizationInfoNotFoundError")

// ❌ too generic — collides if another entity also has this
class NotFoundError extends Data.TaggedError("NotFoundError")
```

### AtprotoAgent is always the only Requirement (R)

Operation functions must not introduce additional service dependencies beyond `AtprotoAgent`. If a helper is needed, pass it as a plain argument — do not make it an Effect service.

```ts
// ✅ correct — helper is a plain function argument
export const createOrganizationInfo = (
  input: CreateOrganizationInfoInput,
  config: { collection: string }
): Effect.Effect<OrganizationInfoRecord, CreateOrganizationInfoError, AtprotoAgent>

// ❌ wrong — adding a second service to R couples callers to two layers
): Effect.Effect<OrganizationInfoRecord, CreateOrganizationInfoError, AtprotoAgent | SomeOtherService>
```

---

## Input validation

Every operation input is validated with Zod before the PDS call. The schema lives in `utils/schema.ts`. Types are inferred from schemas — never manually duplicated.

```ts
// utils/schema.ts
import { z } from "zod";

export const CreateOrganizationInfoSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
});

export type CreateOrganizationInfoInput = z.infer<typeof CreateOrganizationInfoSchema>;
```

Parse at the top of the operation, before any Effect work:

```ts
export const createOrganizationInfo = (
  rawInput: unknown
): Effect.Effect<...> =>
  Effect.gen(function* () {
    const input = yield* Effect.try({
      try: () => CreateOrganizationInfoSchema.parse(rawInput),
      catch: (e) => new InvalidRecordError({ message: String(e) }),
    });
    // proceed with validated input
  });
```

---

## Exporting from src/index.ts

`src/index.ts` is the only public surface. It re-exports everything consumers need — operation functions, error classes, schemas, and types. Nothing is imported directly from deep paths by consumers.

Add new entity exports in a grouped block:

```ts
// organization.info
export { createOrganizationInfo } from "./mutations/organization.info/create";
export { updateOrganizationInfo } from "./mutations/organization.info/update";
export { upsertOrganizationInfo } from "./mutations/organization.info/update-or-create";
export { deleteOrganizationInfo } from "./mutations/organization.info/delete";
export type { OrganizationInfoRecord, CreateOrganizationInfoInput } from "./mutations/organization.info/utils/types";
export { CreateOrganizationInfoSchema } from "./mutations/organization.info/utils/schema";
```

---

## Checklist for adding a new entity

- [ ] Create `src/mutations/<entity>/utils/types.ts` — input/output types inferred from Zod schemas
- [ ] Create `src/mutations/<entity>/utils/schema.ts` — Zod schemas
- [ ] Create `src/mutations/<entity>/utils/errors.ts` — tagged error classes, prefixed with entity name
- [ ] Create `src/mutations/<entity>/create.ts`
- [ ] Create `src/mutations/<entity>/update.ts`
- [ ] Create `src/mutations/<entity>/update-or-create.ts`
- [ ] Create `src/mutations/<entity>/delete.ts` (skip only if the record is explicitly immutable)
- [ ] Export everything from `src/index.ts` in a named block
- [ ] Add a test in `tests/` that exercises at least the happy path of each operation

---

## What does NOT belong here

- Nothing that imports `next/headers`, `next/cache`, or `next/navigation`
- No `"use server"` directives
- No React imports
- No HTTP framework code
- No `@atproto/oauth-client-node` — OAuth session construction is `atproto-mutations-next` territory
- No tRPC — deliberately dropped

---

## Dependency budget

Keep deps lean. Expected full set:

```json
{
  "dependencies": {
    "@atproto/api": "...",
    "effect": "...",
    "zod": "..."
  }
}
```

`zod` is not yet installed — add it when the first real mutation is implemented.
