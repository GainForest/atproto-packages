import { describe, expect, test } from "bun:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key";
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??= "test-project";

describe("resolveGreenGlobePreviewBaseUrl", () => {
  test("uses localhost outside the production Vercel environment", async () => {
    const { resolveGreenGlobePreviewBaseUrl } = await import("./links");

    expect(resolveGreenGlobePreviewBaseUrl({ vercelEnv: undefined })).toBe(
      "http://localhost:8910",
    );
    expect(resolveGreenGlobePreviewBaseUrl({ vercelEnv: "preview" })).toBe(
      "http://localhost:8910",
    );
  });

  test("uses production only for production Vercel environment", async () => {
    const { resolveGreenGlobePreviewBaseUrl } = await import("./links");

    expect(resolveGreenGlobePreviewBaseUrl({ vercelEnv: "production" })).toBe(
      "https://gainforest.app",
    );
  });

  test("uses explicit configured URL before environment defaults", async () => {
    const { resolveGreenGlobePreviewBaseUrl } = await import("./links");

    expect(
      resolveGreenGlobePreviewBaseUrl({
        configuredUrl: "https://green.example/",
        vercelEnv: "production",
      }),
    ).toBe("https://green.example");
  });
});

describe("links.external.greenGlobeTreePreview", () => {
  test("emits repeated dataset-ref query params for multiple dataset refs", async () => {
    const { links } = await import("./links");

    const href = links.external.greenGlobeTreePreview("did:plc:org", {
      datasetRefs: ["dataset-1", "dataset-2"],
    });
    const url = new URL(href);

    expect(url.origin).toBe("http://localhost:8910");
    expect(url.pathname).toBe("/embed/did%3Aplc%3Aorg");
    expect(url.searchParams.getAll("dataset-ref")).toEqual([
      "dataset-1",
      "dataset-2",
    ]);
  });
});
