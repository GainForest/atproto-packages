import { describe, it, expect } from "bun:test";
import { Effect } from "effect";
import { AtprotoAgent } from "../src/services/AtprotoAgent";
import { makeCredentialAgentLayer, CredentialLoginError } from "../src/layers/credential";

// ---------------------------------------------------------------------------
// Credentials — set these in packages/atproto-mutations-core/.env.test
//
//   ATPROTO_SERVICE=bsky.social
//   ATPROTO_IDENTIFIER=your-handle.bsky.social
//   ATPROTO_PASSWORD=your-app-password
//
// Bun loads .env automatically. Never commit real credentials.
// ---------------------------------------------------------------------------

const service    = process.env["ATPROTO_SERVICE"]    ?? "";
const identifier = process.env["ATPROTO_IDENTIFIER"] ?? "";
const password   = process.env["ATPROTO_PASSWORD"]   ?? "";

const credentialsProvided = service !== "" && identifier !== "" && password !== "";

describe("makeCredentialAgentLayer", () => {
  it("resolves an authenticated Agent with valid credentials", async () => {
    if (!credentialsProvided) {
      console.log(
        "[skip] Set ATPROTO_SERVICE, ATPROTO_IDENTIFIER, ATPROTO_PASSWORD in " +
        "packages/atproto-mutations-core/.env.test to run this test."
      );
      return;
    }

    const program = Effect.gen(function* () {
      const agent = yield* AtprotoAgent;
      // Confirm we can make an authenticated read — describeRepo resolves
      // the DID's PDS record, which requires a valid session.
      const response = yield* Effect.tryPromise(() =>
        agent.com.atproto.repo.describeRepo({ repo: identifier })
      );
      return response.data;
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(makeCredentialAgentLayer({ service, identifier, password }))
      )
    );

    expect(result.did).toBeString();
    expect(result.handle).toBe(identifier);
    console.log(`[ok] Logged in as ${result.handle} (${result.did})`);
  });

  it("fails with CredentialLoginError on wrong password", async () => {
    if (!credentialsProvided) {
      console.log("[skip] Credentials not set — skipping failure path test.");
      return;
    }

    const program = Effect.gen(function* () {
      return yield* AtprotoAgent;
    });

    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(
          makeCredentialAgentLayer({ service, identifier, password: "wrong-password" })
        ),
        Effect.either
      )
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left).toBeInstanceOf(CredentialLoginError);
      expect(result.left._tag).toBe("CredentialLoginError");
      console.log(`[ok] Got expected CredentialLoginError: ${result.left.message}`);
    }
  });
});
