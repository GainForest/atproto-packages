import { afterEach, describe, expect, test } from "bun:test";

process.env.SKIP_ENV_VALIDATION ??= "true";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key";
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??= "test-project";

const originalFetch = globalThis.fetch;
const hyperlabelModule = import("./_hyperlabel");

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function mockFetch(handler: (input: FetchInput, init?: FetchInit) => Response) {
  const replacement = Object.assign(
    async (input: FetchInput, init?: FetchInit) => handler(input, init),
    { preconnect: originalFetch.preconnect },
  );
  globalThis.fetch = replacement;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchHyperlabelActivitiesForTier", () => {
  test("validates and normalizes hyperlabel activities", async () => {
    const { fetchHyperlabelActivitiesForTier } = await hyperlabelModule;
    let requestedUrl = "";

    mockFetch((input) => {
      requestedUrl = String(input);
      return Response.json({
        activities: [
          {
            id: 1,
            did: "did:plc:alice",
            rkey: null,
            uri: "at://did:plc:alice/org.hypercerts.claim.activity/one",
            title: "Ignored transport field",
            score: 85,
            tier: "high-quality",
            labeledAt: null,
          },
        ],
        total: 1,
      });
    });

    await expect(
      fetchHyperlabelActivitiesForTier("high-quality"),
    ).resolves.toEqual([
      {
        did: "did:plc:alice",
        rkey: null,
        uri: "at://did:plc:alice/org.hypercerts.claim.activity/one",
        tier: "high-quality",
        labeledAt: null,
      },
    ]);
    expect(requestedUrl).toContain("tier=high-quality");
  });

  test("does not call hyperlabel for unsupported tiers", async () => {
    const { fetchHyperlabelActivitiesForTier } = await hyperlabelModule;
    let requestCount = 0;

    mockFetch(() => {
      requestCount += 1;
      return Response.json({ activities: [], total: 0 });
    });

    await expect(fetchHyperlabelActivitiesForTier("not-a-tier")).resolves.toEqual(
      [],
    );
    expect(requestCount).toBe(0);
  });

  test("rejects invalid hyperlabel responses", async () => {
    const { fetchHyperlabelActivitiesForTier } = await hyperlabelModule;

    mockFetch(() =>
      Response.json({
        activities: [{ did: "", tier: "draft", labeledAt: null }],
        total: 1,
      }),
    );

    await expect(fetchHyperlabelActivitiesForTier("draft")).rejects.toThrow(
      "Hyperlabel request failed for recent activities",
    );
  });
});
