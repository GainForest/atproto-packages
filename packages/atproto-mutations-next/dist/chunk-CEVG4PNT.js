// src/server/index.ts
import { Data, Effect, Layer } from "effect";
import { Agent } from "@atproto/api";
import { AtprotoAgent } from "@gainforest/atproto-mutations-core";
import { getSession } from "@gainforest/atproto-auth-next/server";
var UnauthorizedError = class extends Data.TaggedError("UnauthorizedError") {
};
var SessionExpiredError = class extends Data.TaggedError("SessionExpiredError") {
};
function makeUserAgentLayer(config) {
  const { oauthClient, sessionConfig } = config;
  return Layer.effect(
    AtprotoAgent,
    Effect.gen(function* () {
      const session = yield* Effect.promise(() => getSession(sessionConfig));
      if (!session.isLoggedIn) {
        return yield* Effect.fail(
          new UnauthorizedError({ message: "No active session \u2014 user is not logged in" })
        );
      }
      const oauthSession = yield* Effect.tryPromise({
        try: () => oauthClient.restore(session.did),
        catch: (cause) => new SessionExpiredError({
          message: `Failed to restore OAuth session for ${session.did}: ${String(cause)}`
        })
      });
      if (!oauthSession) {
        return yield* Effect.fail(
          new SessionExpiredError({ message: "OAuth session not found \u2014 please log in again" })
        );
      }
      return new Agent(oauthSession);
    })
  );
}
function makeServiceAgentLayer(agent) {
  return Layer.succeed(AtprotoAgent, agent);
}

export {
  UnauthorizedError,
  SessionExpiredError,
  makeUserAgentLayer,
  makeServiceAgentLayer
};
//# sourceMappingURL=chunk-CEVG4PNT.js.map