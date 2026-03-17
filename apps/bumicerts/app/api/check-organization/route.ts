import { type NextRequest, NextResponse } from "next/server";
import { queries } from "@/lib/graphql/queries/index";

/**
 * GET /api/check-organization?did=<did>
 *
 * Checks whether a given DID is indexed as a Gainforest organization.
 * Used by the mention tooltip to decide whether to show a "View profile" link.
 *
 * Returns: { isOrganization: boolean }
 *
 * Always returns 200 — the boolean tells the caller what it needs to know.
 * Errors are treated as "not an organization" to fail gracefully.
 */
export async function GET(req: NextRequest) {
  const did = req.nextUrl.searchParams.get("did");

  if (!did || !did.startsWith("did:")) {
    return NextResponse.json({ isOrganization: false });
  }

  try {
    const result = await queries.organization.fetch({ did });
    // The discriminated return type: { did } params → { org, activities }
    const isOrganization = "org" in result && result.org !== null;
    return NextResponse.json({ isOrganization });
  } catch {
    // Network/indexer errors → treat as not found
    return NextResponse.json({ isOrganization: false });
  }
}
