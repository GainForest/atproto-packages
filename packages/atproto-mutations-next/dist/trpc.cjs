"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/trpc/index.ts
var trpc_exports = {};
__export(trpc_exports, {
  appRouter: () => appRouter,
  createContextFactory: () => createContextFactory,
  createServerCaller: () => createServerCaller,
  effectMutation: () => effectMutation,
  entityRouter: () => entityRouter,
  mapEffectErrorToTRPC: () => mapEffectErrorToTRPC,
  middleware: () => middleware,
  publicProcedure: () => publicProcedure,
  router: () => router,
  t: () => t
});
module.exports = __toCommonJS(trpc_exports);

// src/trpc/router.ts
var import_atproto_mutations_core = require("@gainforest/atproto-mutations-core");

// src/trpc/init.ts
var import_server = require("@trpc/server");
var import_superjson = __toESM(require("superjson"), 1);
var t = import_server.initTRPC.context().create({
  transformer: import_superjson.default,
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
var import_effect = require("effect");

// src/trpc/error-mapper.ts
var import_server2 = require("@trpc/server");
function mapEffectErrorToTRPC(error) {
  if (error && typeof error === "object" && "_tag" in error) {
    const tag = error._tag;
    const message2 = "message" in error ? String(error.message) : tag;
    if (tag.includes("NotFound")) {
      return new import_server2.TRPCError({ code: "NOT_FOUND", message: message2, cause: error });
    }
    if (tag.includes("Validation") || tag.includes("Invalid") || tag.includes("Constraint")) {
      return new import_server2.TRPCError({ code: "BAD_REQUEST", message: message2, cause: error });
    }
    if (tag.includes("AlreadyExists")) {
      return new import_server2.TRPCError({ code: "CONFLICT", message: message2, cause: error });
    }
    if (tag.includes("Unauthorized") || tag.includes("SessionExpired")) {
      return new import_server2.TRPCError({ code: "UNAUTHORIZED", message: message2, cause: error });
    }
    if (tag.includes("IsDefault")) {
      return new import_server2.TRPCError({ code: "PRECONDITION_FAILED", message: message2, cause: error });
    }
    if (tag.includes("PdsError") || tag.includes("BlobUpload")) {
      return new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message: message2, cause: error });
    }
    if (tag.includes("GeoJson")) {
      return new import_server2.TRPCError({ code: "BAD_REQUEST", message: message2, cause: error });
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return new import_server2.TRPCError({ code: "INTERNAL_SERVER_ERROR", message, cause: error });
}

// src/trpc/effect-adapter.ts
function effectMutation(mutation) {
  return t.procedure.input((input) => input).mutation(async ({ input, ctx }) => {
    const agentLayer = ctx.agentLayer;
    try {
      return await import_effect.Effect.runPromise(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation(input).pipe(
          import_effect.Effect.provide(agentLayer)
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
    info: entityRouter(import_atproto_mutations_core.mutations.organization.info),
    defaultSite: router({
      set: effectMutation(import_atproto_mutations_core.mutations.organization.defaultSite.set)
    }),
    layer: entityRouter(import_atproto_mutations_core.mutations.organization.layer),
    recordings: router({
      audio: entityRouter(import_atproto_mutations_core.mutations.organization.recordings.audio)
    })
  }),
  claim: router({
    activity: entityRouter(import_atproto_mutations_core.mutations.claim.activity)
  }),
  certified: router({
    location: entityRouter(import_atproto_mutations_core.mutations.certified.location)
  }),
  funding: router({
    config: entityRouter(import_atproto_mutations_core.mutations.funding.config),
    receipt: router({
      create: effectMutation(import_atproto_mutations_core.mutations.funding.receipt.create)
    })
  }),
  link: router({
    evm: router({
      create: effectMutation(import_atproto_mutations_core.mutations.link.evm.create),
      update: effectMutation(import_atproto_mutations_core.mutations.link.evm.update),
      delete: effectMutation(import_atproto_mutations_core.mutations.link.evm.delete)
    })
  }),
  blob: router({
    upload: effectMutation(import_atproto_mutations_core.mutations.blob.upload)
  })
});

// src/server/index.ts
var import_effect2 = require("effect");
var import_api = require("@atproto/api");
var import_atproto_mutations_core2 = require("@gainforest/atproto-mutations-core");
var import_server3 = require("@gainforest/atproto-auth-next/server");
var UnauthorizedError = class extends import_effect2.Data.TaggedError("UnauthorizedError") {
};
var SessionExpiredError = class extends import_effect2.Data.TaggedError("SessionExpiredError") {
};
function makeUserAgentLayer(config) {
  const { oauthClient, sessionConfig } = config;
  return import_effect2.Layer.effect(
    import_atproto_mutations_core2.AtprotoAgent,
    import_effect2.Effect.gen(function* () {
      const session = yield* import_effect2.Effect.promise(() => (0, import_server3.getSession)(sessionConfig));
      if (!session.isLoggedIn) {
        return yield* import_effect2.Effect.fail(
          new UnauthorizedError({ message: "No active session \u2014 user is not logged in" })
        );
      }
      const oauthSession = yield* import_effect2.Effect.tryPromise({
        try: () => oauthClient.restore(session.did),
        catch: (cause) => new SessionExpiredError({
          message: `Failed to restore OAuth session for ${session.did}: ${String(cause)}`
        })
      });
      if (!oauthSession) {
        return yield* import_effect2.Effect.fail(
          new SessionExpiredError({ message: "OAuth session not found \u2014 please log in again" })
        );
      }
      return new import_api.Agent(oauthSession);
    })
  );
}

// src/trpc/context.ts
function createContextFactory(auth) {
  return async () => {
    return {
      agentLayer: makeUserAgentLayer(auth)
    };
  };
}

// src/trpc/next-helpers.ts
var import_react = require("react");
function createServerCaller(auth) {
  const createContext = createContextFactory(auth);
  return (0, import_react.cache)(async () => {
    const ctx = await createContext();
    return appRouter.createCaller(ctx);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=trpc.cjs.map