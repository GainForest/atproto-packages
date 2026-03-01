import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { resolvePublicUrl, isLoopback } from "../url";

describe("resolvePublicUrl", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    process.env = { ...originalEnv };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = originalEnv.NODE_ENV;
  });

  it("returns explicitUrl when provided, stripped of trailing slash", () => {
    expect(resolvePublicUrl("https://example.com/")).toBe("https://example.com");
    expect(resolvePublicUrl("https://example.com")).toBe("https://example.com");
  });

  it("prefers explicitUrl over env vars", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://other.com";
    expect(resolvePublicUrl("https://explicit.com")).toBe("https://explicit.com");
  });

  it("uses NEXT_PUBLIC_BASE_URL when set (strips trailing slash)", () => {
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://myapp.com/";
    expect(resolvePublicUrl()).toBe("https://myapp.com");
  });

  it("uses VERCEL_BRANCH_URL when set", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_URL;
    process.env.VERCEL_BRANCH_URL = "my-app-git-main.vercel.app";
    expect(resolvePublicUrl()).toBe("https://my-app-git-main.vercel.app");
  });

  it("falls back to VERCEL_URL when VERCEL_BRANCH_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_BRANCH_URL;
    process.env.VERCEL_URL = "my-app.vercel.app";
    expect(resolvePublicUrl()).toBe("https://my-app.vercel.app");
  });

  it("returns loopback URL in development when no Vercel env vars set", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = "development";
    process.env.PORT = "3001";
    expect(resolvePublicUrl()).toBe("http://127.0.0.1:3001");
  });

  it("defaults to port 3000 in development when PORT is not set", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.VERCEL_BRANCH_URL;
    delete process.env.VERCEL_URL;
    delete process.env.PORT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = "development";
    expect(resolvePublicUrl()).toBe("http://127.0.0.1:3000");
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
