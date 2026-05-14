import { describe, expect, test } from "bun:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key";
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??= "test-project";

describe("timeline feed view model", () => {
  test("infers common external document previews from URL extensions", async () => {
    const { buildTimelineFeedTiles } = await import("./timelineFeedViewModel");
    const [pdfTile, imageTile] = buildTimelineFeedTiles({
      entryId: "entry-1",
      references: [],
      content: [
        {
          $type: "org.hypercerts.defs#uri",
          uri: "https://example.org/report.pdf",
        },
        {
          $type: "org.hypercerts.defs#uri",
          uri: "https://example.org/photo.webp",
        },
      ],
    });

    expect(pdfTile?.preview?.kind).toBe("pdf");
    expect(imageTile?.preview?.kind).toBe("image");
  });

  test("preserves site previews for already attached location records", async () => {
    const { buildTimelineFeedTiles } = await import("./timelineFeedViewModel");
    const [siteTile] = buildTimelineFeedTiles({
      entryId: "entry-1",
      references: [
        {
          id: "at://did:plc:test/app.certified.location/location-1",
          kind: "location",
          title: "Forest site",
          description: "Site evidence",
          actionHref: "https://example.org/site-map",
          actionLabel: "Open site map",
        },
      ],
      content: [
        {
          $type: "org.hypercerts.defs#uri",
          uri: "at://did:plc:test/app.certified.location/location-1",
        },
      ],
    });

    expect(siteTile?.kind).toBe("site");
    expect(siteTile?.preview?.kind).toBe("site");
    expect(siteTile?.preview?.title).toBe("Forest site");
  });
});
