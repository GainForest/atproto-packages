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
      logoUri: "https://preview.example.com/assets/logo.png?size=36",
      emailTemplateUri:
        "https://preview.example.com/assets/email/otp-template.html",
      tosUri: "https://preview.example.com/terms",
      policyUri: "https://preview.example.com/privacy",
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
      logo_uri:
        "https://preview.example.com/assets/logo.png?size=36&x-vercel-protection-bypass=preview+secret",
      email_template_uri:
        "https://preview.example.com/assets/email/otp-template.html?x-vercel-protection-bypass=preview+secret",
      tos_uri: "https://preview.example.com/terms",
      policy_uri: "https://preview.example.com/privacy",
      redirect_uris: ["https://preview.example.com/api/oauth/callback"],
    });
  });

  it("leaves external metadata resource URLs unchanged", async () => {
    const handler = createClientMetadataHandler("https://preview.example.com", {
      clientName: "Test App",
      logoUri: "https://cdn.example.com/assets/logo.png",
      emailTemplateUri: "https://templates.example.com/otp-template.html",
      vercelProtectionBypassSecret: "preview secret",
    });

    const response = handler(
      new NextRequest("https://preview.example.com/client-metadata.json"),
    );
    const metadata: unknown = await response.json();

    expect(metadata).toMatchObject({
      logo_uri: "https://cdn.example.com/assets/logo.png",
      email_template_uri: "https://templates.example.com/otp-template.html",
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
