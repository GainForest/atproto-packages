"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/index.ts
var server_exports = {};
__export(server_exports, {
  SessionExpiredError: () => SessionExpiredError,
  UnauthorizedError: () => UnauthorizedError,
  makeServiceAgentLayer: () => makeServiceAgentLayer,
  makeUserAgentLayer: () => makeUserAgentLayer
});
module.exports = __toCommonJS(server_exports);
var import_effect = require("effect");
var import_api = require("@atproto/api");
var import_atproto_mutations_core = require("@gainforest/atproto-mutations-core");
var import_server = require("@gainforest/atproto-auth-next/server");
var UnauthorizedError = class extends import_effect.Data.TaggedError("UnauthorizedError") {
};
var SessionExpiredError = class extends import_effect.Data.TaggedError("SessionExpiredError") {
};
function makeUserAgentLayer(config) {
  const { oauthClient, sessionConfig } = config;
  return import_effect.Layer.effect(
    import_atproto_mutations_core.AtprotoAgent,
    import_effect.Effect.gen(function* () {
      const session = yield* import_effect.Effect.promise(() => (0, import_server.getSession)(sessionConfig));
      if (!session.isLoggedIn) {
        return yield* import_effect.Effect.fail(
          new UnauthorizedError({ message: "No active session \u2014 user is not logged in" })
        );
      }
      const oauthSession = yield* import_effect.Effect.tryPromise({
        try: () => oauthClient.restore(session.did),
        catch: (cause) => new SessionExpiredError({
          message: `Failed to restore OAuth session for ${session.did}: ${String(cause)}`
        })
      });
      if (!oauthSession) {
        return yield* import_effect.Effect.fail(
          new SessionExpiredError({ message: "OAuth session not found \u2014 please log in again" })
        );
      }
      return new import_api.Agent(oauthSession);
    })
  );
}
function makeServiceAgentLayer(agent) {
  return import_effect.Layer.succeed(import_atproto_mutations_core.AtprotoAgent, agent);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SessionExpiredError,
  UnauthorizedError,
  makeServiceAgentLayer,
  makeUserAgentLayer
});
//# sourceMappingURL=server.cjs.map