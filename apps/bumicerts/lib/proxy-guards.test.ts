import { describe, expect, test } from "bun:test";
import { getProxyBlockResult, isBlockedBotUserAgent } from "./proxy-guards";

describe("isBlockedBotUserAgent", () => {
  test("blocks known AI crawler user agents", () => {
    expect(isBlockedBotUserAgent("Mozilla/5.0 ClaudeBot/1.0")).toBe(true);
    expect(isBlockedBotUserAgent("ChatGPT-User/1.0")).toBe(true);
  });

  test("allows trusted link preview bots", () => {
    expect(
      isBlockedBotUserAgent(
        "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      ),
    ).toBe(false);
    expect(isBlockedBotUserAgent("facebookexternalhit/1.1")).toBe(false);
  });
});

describe("getProxyBlockResult", () => {
  test("skips API routes", () => {
    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/api/health",
        userAgent: "ClaudeBot/1.0",
      }),
    ).toBeNull();

    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/bumicert/create/api/generate-short-description",
        userAgent: "ClaudeBot/1.0",
      }),
    ).toBeNull();
  });

  test("rejects malformed account route identifiers", () => {
    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/account/not-a-did",
        userAgent: "Mozilla/5.0",
      }),
    ).toEqual({
      status: 404,
      reason: "invalid-account-did",
    });
  });

  test("rejects malformed bumicert draft identifiers", () => {
    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/bumicert/create/not-a-number",
        userAgent: "Mozilla/5.0",
      }),
    ).toEqual({
      status: 404,
      reason: "invalid-bumicert-draft-id",
    });
  });

  test("allows encoded account and bumicert route identifiers", () => {
    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/account/did%3Aplc%3Aalice123",
        userAgent: "Mozilla/5.0",
      }),
    ).toBeNull();

    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/bumicert/did%3Aplc%3Aalice123-rkey_123~value",
        userAgent: "Mozilla/5.0",
      }),
    ).toBeNull();
  });

  test("rejects malformed bumicert detail identifiers", () => {
    expect(
      getProxyBlockResult({
        method: "GET",
        pathname: "/bumicert/not-a-bumicert-id",
        userAgent: "Mozilla/5.0",
      }),
    ).toEqual({
      status: 404,
      reason: "invalid-bumicert-id",
    });
  });
});
