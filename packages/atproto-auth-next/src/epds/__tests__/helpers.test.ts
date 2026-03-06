/**
 * ePDS handler smoke tests.
 *
 * The manual PKCE/DPoP/PAR implementation was replaced by delegating to the
 * @atproto/oauth-client-node SDK (client.authorize / client.callback).
 * All cryptographic correctness is covered by the SDK's own test suite.
 *
 * These tests verify the handler factories export correctly.
 */

import { describe, it, expect } from "bun:test";
import {
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
} from "../index";

describe("epds handler exports", () => {
  it("createEpdsLoginHandler is a function", () => {
    expect(typeof createEpdsLoginHandler).toBe("function");
  });

  it("createEpdsCallbackHandler is a function", () => {
    expect(typeof createEpdsCallbackHandler).toBe("function");
  });
});
