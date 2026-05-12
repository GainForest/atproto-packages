import { describe, expect, test } from "bun:test";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key";
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??= "test-project";

describe("evidence attachment registry", () => {
  test("does not expose sites as an attachable evidence tab", async () => {
    const { EVIDENCE_TABS, getEvidenceAttachmentDefaults } = await import(
      "./evidenceRegistry"
    );
    const tabIds = EVIDENCE_TABS.map((tab) => tab.id);

    expect(tabIds).toEqual(["audio", "trees", "biodiversity", "files"]);
    expect(tabIds).not.toContain("sites");
    expect(
      EVIDENCE_TABS.map((tab) => getEvidenceAttachmentDefaults(tab.id).contentType),
    ).not.toContain("location");
  });
});
