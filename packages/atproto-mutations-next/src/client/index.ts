// @gainforest/atproto-mutations-next/client
//
// Client-facing mutations namespace with the same structure as core:
//
//   import { createMutations } from "@gainforest/atproto-mutations-next/client";
//   const mutations = createMutations(agentLayer);
//
//   mutations.organization.info.create(input);
//   mutations.claim.activity.upsert(input);
//
// Every function is the adapt()-wrapped version of its corresponding core
// operation. This means:
//   - It returns TData directly on success (not wrapped in MutationResult).
//   - It throws MutationError on failure, so React Query's onError fires
//     with a typed, structured error — not a generic Error.
//
// Because server actions in this package require an agent layer (injected at
// call time so there are no hidden env reads), the mutations namespace is
// created via a factory — call createMutations(agentLayer) once in your
// app's server layer setup, then import the resulting `mutations` object in
// client components.
//
// Typical setup in lib/mutations.ts in the consuming app:
//
//   import { createMutations } from "@gainforest/atproto-mutations-next/client";
//   import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
//   import { auth } from "@/lib/auth";
//
//   export const mutations = createMutations(makeUserAgentLayer(auth));
//
// Then in a client component:
//
//   import { mutations } from "~/lib/mutations";
//   import { MutationError } from "@gainforest/atproto-mutations-next/client";
//
//   const { mutate } = useMutation({
//     mutationFn: mutations.organization.info.upsert,
//     onSuccess: (result) => toast.success("Saved"),
//     onError: (e) => {
//       if (MutationError.isCode(e, "UNAUTHORIZED")) redirectToLogin();
//       if (MutationError.is(e)) toast.error(e.code);
//     },
//   });
//
// DO NOT use this on the server — import from ./actions or ./server instead.

import { Effect } from "effect";
import type { Layer } from "effect";
import { adapt, mutations as coreMutations } from "@gainforest/atproto-mutations-core";
import type { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import type { UnauthorizedError, SessionExpiredError } from "../server";

import {
  createOrganizationInfoAction,
  updateOrganizationInfoAction,
  upsertOrganizationInfoAction,
  createClaimActivityAction,
  updateClaimActivityAction,
  upsertClaimActivityAction,
  deleteClaimActivityAction,
  uploadBlobAction,
  createCertifiedLocationAction,
  updateCertifiedLocationAction,
  upsertCertifiedLocationAction,
  deleteCertifiedLocationAction,
  setDefaultSiteAction,
  createLayerAction,
  updateLayerAction,
  upsertLayerAction,
  deleteLayerAction,
  createAudioRecordingAction,
  updateAudioRecordingAction,
  upsertAudioRecordingAction,
  deleteAudioRecordingAction,
} from "../actions";

export type AgentLayer = Layer.Layer<AtprotoAgent, UnauthorizedError | SessionExpiredError>;

// ---------------------------------------------------------------------------
// Infer return types from core mutations for type safety
// ---------------------------------------------------------------------------

type InferEffectSuccess<T> = T extends Effect.Effect<infer A, any, any> ? A : never;

// organization.info
type OrganizationInfoCreateResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.info.create>>;
type OrganizationInfoUpdateResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.info.update>>;
type OrganizationInfoUpsertResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.info.upsert>>;

// organization.defaultSite
type DefaultSiteSetResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.defaultSite.set>>;

// organization.layer
type LayerCreateResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.layer.create>>;
type LayerUpdateResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.layer.update>>;
type LayerUpsertResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.layer.upsert>>;
type LayerDeleteResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.layer.delete>>;

// organization.recordings.audio
type AudioCreateResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.recordings.audio.create>>;
type AudioUpdateResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.recordings.audio.update>>;
type AudioUpsertResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.recordings.audio.upsert>>;
type AudioDeleteResult = InferEffectSuccess<ReturnType<typeof coreMutations.organization.recordings.audio.delete>>;

// claim.activity
type ClaimActivityCreateResult = InferEffectSuccess<ReturnType<typeof coreMutations.claim.activity.create>>;
type ClaimActivityUpdateResult = InferEffectSuccess<ReturnType<typeof coreMutations.claim.activity.update>>;
type ClaimActivityUpsertResult = InferEffectSuccess<ReturnType<typeof coreMutations.claim.activity.upsert>>;
type ClaimActivityDeleteResult = InferEffectSuccess<ReturnType<typeof coreMutations.claim.activity.delete>>;

// certified.location
type CertifiedLocationCreateResult = InferEffectSuccess<ReturnType<typeof coreMutations.certified.location.create>>;
type CertifiedLocationUpdateResult = InferEffectSuccess<ReturnType<typeof coreMutations.certified.location.update>>;
type CertifiedLocationUpsertResult = InferEffectSuccess<ReturnType<typeof coreMutations.certified.location.upsert>>;
type CertifiedLocationDeleteResult = InferEffectSuccess<ReturnType<typeof coreMutations.certified.location.delete>>;

// blob
type BlobUploadResult = InferEffectSuccess<ReturnType<typeof coreMutations.blob.upload>>;

// ---------------------------------------------------------------------------
// Infer input types from core mutations
// ---------------------------------------------------------------------------

type InferInput<T> = T extends (input: infer I) => any ? I : never;

// ---------------------------------------------------------------------------
// Mutations type (mirrors core namespace structure)
// ---------------------------------------------------------------------------

export type Mutations = {
  organization: {
    info: {
      create: (input: InferInput<typeof coreMutations.organization.info.create>) => Promise<OrganizationInfoCreateResult>;
      update: (input: InferInput<typeof coreMutations.organization.info.update>) => Promise<OrganizationInfoUpdateResult>;
      upsert: (input: InferInput<typeof coreMutations.organization.info.upsert>) => Promise<OrganizationInfoUpsertResult>;
    };
    defaultSite: {
      set: (input: InferInput<typeof coreMutations.organization.defaultSite.set>) => Promise<DefaultSiteSetResult>;
    };
    layer: {
      create: (input: InferInput<typeof coreMutations.organization.layer.create>) => Promise<LayerCreateResult>;
      update: (input: InferInput<typeof coreMutations.organization.layer.update>) => Promise<LayerUpdateResult>;
      upsert: (input: InferInput<typeof coreMutations.organization.layer.upsert>) => Promise<LayerUpsertResult>;
      delete: (input: InferInput<typeof coreMutations.organization.layer.delete>) => Promise<LayerDeleteResult>;
    };
    recordings: {
      audio: {
        create: (input: InferInput<typeof coreMutations.organization.recordings.audio.create>) => Promise<AudioCreateResult>;
        update: (input: InferInput<typeof coreMutations.organization.recordings.audio.update>) => Promise<AudioUpdateResult>;
        upsert: (input: InferInput<typeof coreMutations.organization.recordings.audio.upsert>) => Promise<AudioUpsertResult>;
        delete: (input: InferInput<typeof coreMutations.organization.recordings.audio.delete>) => Promise<AudioDeleteResult>;
      };
    };
  };
  claim: {
    activity: {
      create: (input: InferInput<typeof coreMutations.claim.activity.create>) => Promise<ClaimActivityCreateResult>;
      update: (input: InferInput<typeof coreMutations.claim.activity.update>) => Promise<ClaimActivityUpdateResult>;
      upsert: (input: InferInput<typeof coreMutations.claim.activity.upsert>) => Promise<ClaimActivityUpsertResult>;
      delete: (input: InferInput<typeof coreMutations.claim.activity.delete>) => Promise<ClaimActivityDeleteResult>;
    };
  };
  certified: {
    location: {
      create: (input: InferInput<typeof coreMutations.certified.location.create>) => Promise<CertifiedLocationCreateResult>;
      update: (input: InferInput<typeof coreMutations.certified.location.update>) => Promise<CertifiedLocationUpdateResult>;
      upsert: (input: InferInput<typeof coreMutations.certified.location.upsert>) => Promise<CertifiedLocationUpsertResult>;
      delete: (input: InferInput<typeof coreMutations.certified.location.delete>) => Promise<CertifiedLocationDeleteResult>;
    };
  };
  blob: {
    upload: (input: InferInput<typeof coreMutations.blob.upload>) => Promise<BlobUploadResult>;
  };
};

/**
 * Create the client-side mutations namespace.
 *
 * Pass the agent layer that should be used for all mutations — typically
 * `makeUserAgentLayer({ oauthClient, sessionConfig })` from the server module.
 *
 * Call this once in your app's `lib/mutations.ts` and re-export the result.
 * Do not call it inside components or hooks — it captures the layer at creation
 * time and is stable across renders.
 */
export function createMutations(agentLayer: AgentLayer): Mutations {
  return {
    organization: {
      info: {
        /**
         * Create a new app.gainforest.organization.info record.
         * Throws MutationError with code ALREADY_EXISTS if one already exists.
         * Prefer upsert for idempotent writes.
         */
        create: adapt((input) => createOrganizationInfoAction(input, agentLayer)),

        /**
         * Update an existing app.gainforest.organization.info record (partial patch).
         * Throws MutationError with code NOT_FOUND if no record exists.
         * Prefer upsert if you want create-or-update semantics.
         */
        update: adapt((input) => updateOrganizationInfoAction(input, agentLayer)),

        /**
         * Upsert an app.gainforest.organization.info record.
         * Creates if absent, fully replaces if present (preserving original createdAt).
         */
        upsert: adapt((input) => upsertOrganizationInfoAction(input, agentLayer)),
      },
      defaultSite: {
        /**
         * Set (upsert) the app.gainforest.organization.defaultSite singleton.
         * Creates if absent, replaces if present.
         * Validates that the referenced certified.location exists.
         */
        set: adapt((input) => setDefaultSiteAction(input, agentLayer)),
      },
      layer: {
        /** Create a new app.gainforest.organization.layer record. */
        create: adapt((input) => createLayerAction(input, agentLayer)),

        /**
         * Update an existing app.gainforest.organization.layer record (partial patch).
         * Throws MutationError with code NOT_FOUND if no record exists.
         */
        update: adapt((input) => updateLayerAction(input, agentLayer)),

        /**
         * Upsert an app.gainforest.organization.layer record.
         * Creates if absent, fully replaces if present.
         */
        upsert: adapt((input) => upsertLayerAction(input, agentLayer)),

        /**
         * Delete an app.gainforest.organization.layer record.
         * Throws MutationError with code NOT_FOUND if no record exists.
         */
        delete: adapt((input) => deleteLayerAction(input, agentLayer)),
      },
      recordings: {
        audio: {
          /**
           * Create a new app.gainforest.organization.recordings.audio record.
           */
          create: adapt((input) => createAudioRecordingAction(input, agentLayer)),

          /**
           * Update an existing audio recording (partial patch).
           * Throws MutationError with code NOT_FOUND if no record exists.
           */
          update: adapt((input) => updateAudioRecordingAction(input, agentLayer)),

          /**
           * Upsert an audio recording.
           * Creates if absent, fully replaces if present.
           */
          upsert: adapt((input) => upsertAudioRecordingAction(input, agentLayer)),

          /**
           * Delete an audio recording.
           * Throws MutationError with code NOT_FOUND if no record exists.
           */
          delete: adapt((input) => deleteAudioRecordingAction(input, agentLayer)),
        },
      },
    },
    claim: {
      activity: {
        /**
         * Create a new org.hypercerts.claim.activity record.
         * rkey is optional — a TID is generated if not provided.
         */
        create: adapt((input) => createClaimActivityAction(input, agentLayer)),

        /**
         * Update an existing claim.activity record (partial patch).
         * Throws MutationError with code NOT_FOUND if no record exists.
         */
        update: adapt((input) => updateClaimActivityAction(input, agentLayer)),

        /**
         * Upsert a claim.activity record.
         * No rkey → always creates. rkey present → creates or replaces.
         */
        upsert: adapt((input) => upsertClaimActivityAction(input, agentLayer)),

        /**
         * Delete a claim.activity record.
         * Throws MutationError with code NOT_FOUND if no record exists.
         */
        delete: adapt((input) => deleteClaimActivityAction(input, agentLayer)),
      },
    },
    certified: {
      location: {
        /**
         * Create a new app.certified.location record.
         * Validates the GeoJSON shapefile before uploading.
         */
        create: adapt((input) => createCertifiedLocationAction(input, agentLayer)),

        /**
         * Update an existing certified.location record (partial patch).
         * Throws MutationError with code NOT_FOUND if no record exists.
         */
        update: adapt((input) => updateCertifiedLocationAction(input, agentLayer)),

        /**
         * Upsert a certified.location record.
         * Creates if absent, fully replaces if present.
         */
        upsert: adapt((input) => upsertCertifiedLocationAction(input, agentLayer)),

        /**
         * Delete a certified.location record.
         * Throws IS_DEFAULT if this is the current default site.
         * Throws NOT_FOUND if no record exists.
         */
        delete: adapt((input) => deleteCertifiedLocationAction(input, agentLayer)),
      },
    },
    blob: {
      /**
       * Upload a blob to the authenticated user's PDS.
       * Returns the BlobRef that can be embedded in subsequent record writes.
       */
      upload: adapt((input) => uploadBlobAction(input, agentLayer)),
    },
  } as const;
}

// Re-export adapt and MutationError so consumers don't need a separate import
// from core just to handle errors or wrap their own actions.
export { adapt } from "@gainforest/atproto-mutations-core";
export { MutationError } from "@gainforest/atproto-mutations-core";
