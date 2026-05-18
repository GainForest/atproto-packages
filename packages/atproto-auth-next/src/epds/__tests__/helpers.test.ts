/**
 * ePDS handler tests.
 *
 * The manual PKCE/DPoP/PAR implementation delegates to the
 * @atproto/oauth-client-node SDK (client.authorize / client.callback).
 * These tests verify the handler factories export correctly and the login
 * handler chooses the right OAuth target for email vs handle flows.
 */

import { describe, it, expect } from "bun:test";
import { NextRequest } from "next/server";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import {
  createEpdsLoginHandler,
  createEpdsCallbackHandler,
} from "../index";

const scope = "atproto transition:generic";

describe("epds handler exports", () => {
  it("createEpdsLoginHandler is a function", () => {
    expect(typeof createEpdsLoginHandler).toBe("function");
  });

  it("createEpdsCallbackHandler is a function", () => {
    expect(typeof createEpdsCallbackHandler).toBe("function");
  });
});

describe("createEpdsLoginHandler", () => {
  it("starts the ePDS email flow when only email is provided", async () => {
    const calls: Array<{ target: string; options: Record<string, unknown> }> = [];
    const oauthClient = {
      authorize: async (target: string, options: Record<string, unknown>) => {
        calls.push({ target, options });
        return new URL("https://epds.example/oauth?request_uri=urn%3Aepds");
      },
    } as unknown as NodeOAuthClient;

    const handler = createEpdsLoginHandler({
      oauthClient,
      epdsUrl: "https://epds.example",
      scope,
    });

    const response = await handler(
      new NextRequest("https://app.example.com/api/oauth/epds/login?email=user%40example.com"),
    );

    expect(calls).toEqual([
      {
        target: "https://epds.example",
        options: { scope, prompt: "login" },
      },
    ]);
    expect(response.headers.get("location")).toBe(
      "https://epds.example/oauth?request_uri=urn%3Aepds&login_hint=user%40example.com",
    );
  });

  it("starts handle OAuth when handle is provided", async () => {
    const calls: Array<{ target: string; options: Record<string, unknown> }> = [];
    const oauthClient = {
      authorize: async (target: string, options: Record<string, unknown>) => {
        calls.push({ target, options });
        return new URL("https://pds.example/oauth?request_uri=urn%3Ahandle");
      },
    } as unknown as NodeOAuthClient;

    const handler = createEpdsLoginHandler({
      oauthClient,
      epdsUrl: "https://epds.example",
      scope,
      defaultPdsDomain: "gainforest.id",
    });

    const response = await handler(
      new NextRequest(
        "https://app.example.com/api/oauth/epds/login?handle=alice&email=user%40example.com",
      ),
    );

    expect(calls).toEqual([
      {
        target: "alice.gainforest.id",
        options: { scope },
      },
    ]);
    expect(response.headers.get("location")).toBe(
      "https://pds.example/oauth?request_uri=urn%3Ahandle",
    );
  });
});
