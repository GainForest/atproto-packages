import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { createClientMetadataHandler } from "../metadata";

describe("createClientMetadataHandler", () => {
  it("emits epds_skip_consent_on_signup when configured", async () => {
    const handler = createClientMetadataHandler("https://example.com", {
      clientName: "Example",
      epdsSkipConsentOnSignup: true,
    });

    const response = handler(new NextRequest("https://example.com/client-metadata.json"));
    const body = await response.json();

    expect(body).toMatchObject({
      epds_skip_consent_on_signup: true,
    });
  });

  it("emits epds_handle_login_url when configured", async () => {
    const handler = createClientMetadataHandler("https://example.com", {
      clientName: "Example",
      epdsHandleLoginUrl: "/api/oauth/epds/login",
    });

    const response = handler(new NextRequest("https://preview.example.com/client-metadata.json"));
    const body = await response.json();

    expect(body).toMatchObject({
      epds_handle_login_url: "https://preview.example.com/api/oauth/epds/login",
    });
  });

  it("omits epds_skip_consent_on_signup by default", async () => {
    const handler = createClientMetadataHandler("https://example.com", {
      clientName: "Example",
    });

    const response = handler(new NextRequest("https://example.com/client-metadata.json"));
    const body = await response.json();

    expect(body).not.toHaveProperty("epds_skip_consent_on_signup");
  });
});
