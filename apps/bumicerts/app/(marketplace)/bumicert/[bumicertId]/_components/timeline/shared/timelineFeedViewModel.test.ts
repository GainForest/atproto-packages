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
});
