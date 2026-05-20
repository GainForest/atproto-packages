import { describe, expect, it } from "bun:test";
import {
  isLoopback,
  PLACEHOLDER_URL,
  resolvePublicUrl,
  resolveRequestPublicUrl,
  VERCEL_PROTECTION_BYPASS_QUERY_PARAM,
  withVercelProtectionBypass,
} from "../url";

describe("resolvePublicUrl", () => {
  it("returns explicitUrl when provided, stripped of trailing slash", () => {
    expect(resolvePublicUrl("https://example.com/")).toBe("https://example.com");
    expect(resolvePublicUrl("https://example.com")).toBe("https://example.com");
  });

  it("returns the placeholder when no explicitUrl is provided", () => {
    expect(resolvePublicUrl()).toBe(PLACEHOLDER_URL);
  });
});

describe("withVercelProtectionBypass", () => {
  it("returns the URL unchanged when no secret is configured", () => {
    expect(
      withVercelProtectionBypass("https://example.com/client-metadata.json"),
    ).toBe("https://example.com/client-metadata.json");
  });

  it("adds the bypass query parameter", () => {
    const url = withVercelProtectionBypass(
      "https://example.com/client-metadata.json",
      "preview secret",
    );

    expect(url).toBe(
      "https://example.com/client-metadata.json?x-vercel-protection-bypass=preview+secret",
    );
  });

  it("preserves existing query parameters", () => {
    const url = withVercelProtectionBypass(
      "https://example.com/.well-known/jwks.json?cache=miss",
      "staging-secret",
    );
    const parsed = new URL(url);

    expect(parsed.searchParams.get("cache")).toBe("miss");
    expect(parsed.searchParams.get(VERCEL_PROTECTION_BYPASS_QUERY_PARAM)).toBe(
      "staging-secret",
    );
  });
});

describe("resolveRequestPublicUrl", () => {
  it("returns the origin of the request URL", () => {
    expect(
      resolveRequestPublicUrl(
        { url: "http://127.0.0.1:3001/api/oauth/epds/login" },
        "http://127.0.0.1:3000",
      ),
    ).toBe("http://127.0.0.1:3001");
  });

  it("normalises localhost to 127.0.0.1", () => {
    expect(
      resolveRequestPublicUrl(
        { url: "http://localhost:3001/api/oauth/epds/login" },
        "http://127.0.0.1:3000",
      ),
    ).toBe("http://127.0.0.1:3001");
  });

  it("normalises localhost without a port", () => {
    expect(
      resolveRequestPublicUrl(
        { url: "http://localhost/api/oauth/epds/login" },
        "http://127.0.0.1:3000",
      ),
    ).toBe("http://127.0.0.1");
  });

  it("does not modify production URLs", () => {
    expect(
      resolveRequestPublicUrl(
        { url: "https://bumicerts.com/api/oauth/epds/login" },
        "https://bumicerts.com",
      ),
    ).toBe("https://bumicerts.com");
  });

  it("falls back to fallbackPublicUrl on an unparseable URL", () => {
    expect(
      resolveRequestPublicUrl(
        { url: "not-a-url" },
        "http://127.0.0.1:3001",
      ),
    ).toBe("http://127.0.0.1:3001");
  });
});

describe("isLoopback", () => {
  it("returns true for 127.0.0.1 URLs", () => {
    expect(isLoopback("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopback("http://127.0.0.1")).toBe(true);
  });

  it("returns true for localhost URLs", () => {
    expect(isLoopback("http://localhost:3000")).toBe(true);
    expect(isLoopback("http://localhost")).toBe(true);
  });

  it("returns false for public URLs", () => {
    expect(isLoopback("https://example.com")).toBe(false);
    expect(isLoopback("https://climateai.org")).toBe(false);
    expect(isLoopback("https://my-app.vercel.app")).toBe(false);
  });

  it("returns false for ngrok/tunnel URLs even if used in development", () => {
    expect(isLoopback("https://abc123.ngrok.io")).toBe(false);
    expect(isLoopback("https://myapp.loca.lt")).toBe(false);
  });
});
