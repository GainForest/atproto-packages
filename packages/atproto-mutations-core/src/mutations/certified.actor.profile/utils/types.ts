// ---------------------------------------------------------------------------
// Re-export generated types — single source of truth, no manual duplication.
// ---------------------------------------------------------------------------

export type { Main as CertifiedActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";

export type { SerializableFile, FileOrBlobRef } from "../../../blob/types";

// ---------------------------------------------------------------------------
// Entity-specific derived types
// ---------------------------------------------------------------------------

import type { Main as CertifiedActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";
import type {
  SingletonMutationResult,
  SingletonCreateInput,
  SingletonUpdateInput,
} from "../../../utils/shared/types";

/** Input for createCertifiedActorProfile. */
export type CreateCertifiedActorProfileInput = SingletonCreateInput<CertifiedActorProfileRecord>;

/** Input for updateCertifiedActorProfile. */
export type UpdateCertifiedActorProfileInput = SingletonUpdateInput<CertifiedActorProfileRecord>;

/** Returned by create, update, and upsert on success. */
export type CertifiedActorProfileMutationResult = SingletonMutationResult<CertifiedActorProfileRecord>;
