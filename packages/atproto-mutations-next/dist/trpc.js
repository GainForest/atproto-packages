import {
  makeUserAgentLayer
} from "./chunk-CEVG4PNT.js";

// src/trpc/router.ts
import { mutations } from "@gainforest/atproto-mutations-core";

// src/trpc/init.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Include the original Effect error tag if available for debugging
        effectTag: error.cause && typeof error.cause === "object" && "_tag" in error.cause ? error.cause._tag : void 0
      }
    };
  }
});
var router = t.router;
var publicProcedure = t.procedure;
var middleware = t.middleware;

// src/trpc/effect-adapter.ts
import { Effect } from "effect";

// src/trpc/error-mapper.ts
import { TRPCError } from "@trpc/server";
function mapEffectErrorToTRPC(error) {
  if (error && typeof error === "object" && "_tag" in error) {
    const tag = error._tag;
    const message2 = "message" in error ? String(error.message) : tag;
    if (tag.includes("NotFound")) {
      return new TRPCError({ code: "NOT_FOUND", message: message2, cause: error });
    }
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new TRPCError({ code: "BAD_REQUEST", message: message2, cause: error });
    }
    if (tag.includes("AlreadyExists")) {
      return new TRPCError({ code: "CONFLICT", message: message2, cause: error });
    }
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new TRPCError({ code: "UNAUTHORIZED", message: message2, cause: error });
    }
    if (tag.includes("IsDefault")) {
      return new TRPCError({ code: "PRECONDITION_FAILED", message: message2, cause: error });
    }
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: message2, cause: error });
    }
    if (tag.includes("GeoJson")) {
      return new TRPCError({ code: "BAD_REQUEST", message: message2, cause: error });
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: error });
}

// src/trpc/effect-adapter.ts
function effectMutation(mutation) {
  return t.procedure.input((input) => input).mutation(async ({ input, ctx }) => {
    const agentLayer = ctx.agentLayer;
    try {
      return await Effect.runPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation(input).pipe(
          Effect.provide(agentLayer)
        )
      );
    } catch (error) {
      throw mapEffectErrorToTRPC(error);
    }
  });
}

// src/trpc/entity-router.ts
function entityRouter(entity) {
  const procedures = {};
  if (entity.create) procedures.create = effectMutation(entity.create);
  if (entity.update) procedures.update = effectMutation(entity.update);
  if (entity.upsert) procedures.upsert = effectMutation(entity.upsert);
  if (entity.delete) procedures.delete = effectMutation(entity.delete);
  return router(procedures);
}

// src/trpc/router.ts
var appRouter = router({
  organization: router({
    info: entityRouter(mutations.organization.info),
    defaultSite: router({
      set: effectMutation(mutations.organization.defaultSite.set)
    }),
    layer: entityRouter(mutations.organization.layer),
    recordings: router({
      audio: entityRouter(mutations.organization.recordings.audio)
    })
  }),
  claim: router({
    activity: entityRouter(mutations.claim.activity)
  }),
  certified: router({
    location: entityRouter(mutations.certified.location)
  }),
  funding: router({
    config: entityRouter(mutations.funding.config),
    receipt: router({
      create: effectMutation(mutations.funding.receipt.create)
    })
  }),
  link: router({
    evm: router({
      create: effectMutation(mutations.link.evm.create),
      update: effectMutation(mutations.link.evm.update),
      delete: effectMutation(mutations.link.evm.delete)
    })
  }),
  blob: router({
    upload: effectMutation(mutations.blob.upload)
  })
});

// src/trpc/context.ts
function createContextFactory(auth) {
  return async () => {
    return {
      agentLayer: makeUserAgentLayer(auth)
    };
  };
}

// src/trpc/next-helpers.ts
import { cache } from "react";
function createServerCaller(auth) {
  const createContext = createContextFactory(auth);
  return cache(async () => {
    const ctx = await createContext();
    return appRouter.createCaller(ctx);
  });
}
export {
  appRouter,
  createContextFactory,
  createServerCaller,
  effectMutation,
  entityRouter,
  mapEffectErrorToTRPC,
  middleware,
  publicProcedure,
  router,
  t
};
//# sourceMappingURL=trpc.js.map