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
        ├── upsert.ts
        ├── delete.ts             — present in most cases, omit only if the record is immutable
        ├── utils/                — entity-local helpers (validation, transforms, mappers)
        │   ├── types.ts
        │   └── errors.ts
        └── tests/                — integration tests co-located with the entity
            ├── create.test.ts
            ├── update.test.ts
            ├── upsert.test.ts
            └── delete.test.ts    — present when delete.ts is present

tests/
├── .env.test-credentials         — gitignored, copy from .env.test-credentials.example
├── .env.test-credentials.example — committed template
└── credential-login.test.ts      — package-level auth layer tests
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
import type { CreateOrganizationInfoInput, OrganizationInfoRecord } from "./utils/types";

export const createOrganizationInfo = (
  input: CreateOrganizationInfoInput
): Effect.Effect<OrganizationInfoRecord, CreateOrganizationInfoError, AtprotoAgent> =>
  Effect.gen(function* () {
    const agent = yield* AtprotoAgent;
    // ... PDS call
  });
```

**`update.ts`** — updates an existing record by `rkey` or AT-URI. Always present.

**`upsert.ts`** — upsert. Tries to fetch the existing record; creates if absent, updates if found. Always present — callers should prefer this over manually sequencing `create` + `update` unless they explicitly need one or the other.

**`delete.ts`** — deletes a record. Present in almost every entity. Omit only when the record type is intentionally immutable (e.g. `literal:self` singletons, append-only log entries). If you're unsure, include it.

**`utils/`** — anything that isn't one of the four operations above:
- `types.ts` — input/output types, derived from the generated record type (see below)
- `errors.ts` — typed error definitions for this entity

Nothing in `utils/` should make PDS calls directly. PDS calls belong in the operation files.

**`tests/`** — integration tests co-located with the entity. One file per operation: `create.test.ts`, `update.test.ts`, `upsert.test.ts`, `delete.test.ts`. Tests reference `../utils/types`, `../utils/errors`, and `../create` etc. with relative imports. They load credentials from the package-level `tests/.env.test-credentials` via `new URL("../../../../tests/.env.test-credentials", import.meta.url)`. The layer import is `../../../layers/credential` (3 levels up from `tests/` to `src/`).

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

Validation uses the `$parse` function exported by the `@gainforest/generated` lexicon types — **not Zod**. The generated types include a validator built from the lexicon definition, so validation is always in sync with the schema.

Validate at the top of each operation, before any PDS call:

```ts
import { $parse } from "@gainforest/generated/app/gainforest/organization/info.defs";
import { OrganizationInfoValidationError } from "./utils/errors";

const record = yield* Effect.try({
  try: () => $parse(candidate),
  catch: (cause) =>
    new OrganizationInfoValidationError({
      message: `organization.info record failed lexicon validation: ${String(cause)}`,
      cause,
    }),
});
```

For `create`, run validation **before** the existence check — invalid input should be rejected immediately without making any PDS calls.

---

## Type authoring rules

Types in `utils/types.ts` must be **derived** from the generated record type — never manually written or duplicated.

### Re-export without re-declaring

```ts
// ✅ correct — import then re-export; no manual type body
export type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";
export type { Richtext } from "@gainforest/generated/app/gainforest/common/defs.defs";

// ❌ wrong — manually declaring a type that already exists in generated types
export type Richtext = { text: string; facets?: ... };
```

### Derive input types from the record type

```ts
import type { Main as OrganizationInfoRecord } from "@gainforest/generated/app/gainforest/organization/info.defs";

// ✅ correct — computed from the record, stays in sync automatically
export type CreateOrganizationInfoInput = Omit<OrganizationInfoRecord, "$type" | "createdAt">;
export type UpdateOrganizationInfoInput = Partial<CreateOrganizationInfoInput>;

// ✅ correct — extract enum values from the record type
export type Objective = OrganizationInfoRecord["objectives"][number];

// ❌ wrong — manually duplicating the union
export type Objective = "Conservation" | "Research" | "Education" | "Community" | "Other";
```

The only types that may be written by hand in `utils/types.ts` are shapes that genuinely don't exist in the generated types — e.g. the operation's return type `{ uri: string; cid: string; record: OrganizationInfoRecord }`.

---

## Exporting from src/index.ts

`src/index.ts` is the only public surface. It re-exports everything consumers need — operation functions, error classes, and types. Nothing is imported directly from deep paths by consumers.

Add new entity exports in a grouped block:

```ts
// organization.info
export { createOrganizationInfo } from "./mutations/organization.info/create";
export { updateOrganizationInfo } from "./mutations/organization.info/update";
export { upsertOrganizationInfo } from "./mutations/organization.info/upsert";
export type { UpsertOrganizationInfoInput } from "./mutations/organization.info/upsert";
export { deleteOrganizationInfo } from "./mutations/organization.info/delete";

export {
  OrganizationInfoAlreadyExistsError,
  OrganizationInfoNotFoundError,
  OrganizationInfoPdsError,
  OrganizationInfoValidationError,
} from "./mutations/organization.info/utils/errors";

export type {
  CreateOrganizationInfoInput,
  UpdateOrganizationInfoInput,
  OrganizationInfoMutationResult,
  OrganizationInfoRecord,
  // re-exported sub-types callers may need
  Richtext,
  LinearDocument,
  SmallImage,
  Objective,
} from "./mutations/organization.info/utils/types";
```

---

## Checklist for adding a new entity

- [ ] Create `src/mutations/<entity>/utils/types.ts` — re-export generated types; derive input types from the record type
- [ ] Create `src/mutations/<entity>/utils/errors.ts` — tagged error classes, prefixed with entity name
- [ ] Create `src/mutations/<entity>/create.ts`
- [ ] Create `src/mutations/<entity>/update.ts`
- [ ] Create `src/mutations/<entity>/upsert.ts`
- [ ] Create `src/mutations/<entity>/delete.ts` (skip only if the record is explicitly immutable)
- [ ] Create `src/mutations/<entity>/tests/create.test.ts`
- [ ] Create `src/mutations/<entity>/tests/update.test.ts`
- [ ] Create `src/mutations/<entity>/tests/upsert.test.ts`
- [ ] Create `src/mutations/<entity>/tests/delete.test.ts` (when delete.ts is present)
- [ ] Export everything from `src/index.ts` in a named block

---

## What does NOT belong here

- Nothing that imports `next/headers`, `next/cache`, or `next/navigation`
- No `"use server"` directives
- No React imports
- No HTTP framework code
- No `@atproto/oauth-client-node` — OAuth session construction is `atproto-mutations-next` territory
- No tRPC — deliberately dropped
- No Zod — use `$parse` / `$validate` from `@gainforest/generated` instead

---

## Dependency budget

Keep deps lean. Expected full set:

```json
{
  "dependencies": {
    "@atproto/api": "...",
    "@atproto/lex": "...",
    "@gainforest/generated": "workspace:*",
    "effect": "..."
  }
}
```
