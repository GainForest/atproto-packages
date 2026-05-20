import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { createClientMetadataHandler } from "../metadata";

describe("createClientMetadataHandler", () => {
  it("emits epds_skip_consent_on_signup when configured", async () => {
    const handler = createClientMetadataHandler("https://example.com", {
      clientName: "Example",
      epdsSkipConsentOnSignup: true,
    });

    const response = handler(
      new NextRequest("https://example.com/client-metadata.json"),
    );
    const body: unknown = await response.json();

    expect(body).toMatchObject({
      epds_skip_consent_on_signup: true,
    });
  });

  it("omits epds_skip_consent_on_signup by default", async () => {
    const handler = createClientMetadataHandler("https://example.com", {
      clientName: "Example",
    });

    const response = handler(
      new NextRequest("https://example.com/client-metadata.json"),
    );
    const body: unknown = await response.json();

    expect(body).not.toHaveProperty("epds_skip_consent_on_signup");
  });

  it("includes Vercel protection bypass on server-fetched web metadata endpoints", async () => {
    const handler = createClientMetadataHandler("https://preview.example.com", {
      clientName: "Test App",
      vercelProtectionBypassSecret: "preview secret",
    });

    const response = handler(
      new NextRequest("https://preview.example.com/client-metadata.json"),
    );
    const metadata: unknown = await response.json();

    expect(metadata).toMatchObject({
      client_id:
        "https://preview.example.com/client-metadata.json?x-vercel-protection-bypass=preview+secret",
      jwks_uri:
        "https://preview.example.com/.well-known/jwks.json?x-vercel-protection-bypass=preview+secret",
      redirect_uris: ["https://preview.example.com/api/oauth/callback"],
    });
  });

  it("does not include Vercel protection bypass on loopback metadata", async () => {
    const handler = createClientMetadataHandler("http://127.0.0.1:3001", {
      clientName: "Test App",
      vercelProtectionBypassSecret: "preview secret",
    });

    const response = handler(
      new NextRequest("http://localhost:3001/client-metadata.json"),
    );
    const metadata: unknown = await response.json();

    expect(metadata).toMatchObject({
      jwks_uri: "http://127.0.0.1:3001/.well-known/jwks.json",
      redirect_uris: ["http://127.0.0.1:3001/api/oauth/callback"],
    });
  });
});
