/**
 * Profile fetching utilities.
 *
 * Fetches the user's profile by trying two record collections in priority order:
 *   1. app.certified.profile — GainForest's certified profile (if it exists)
 *   2. app.bsky.actor.profile — Standard ATProto/Bluesky profile (fallback)
 *
 * Both are fetched in parallel and the first non-null result is used.
 */

import type { Agent } from "@atproto/api";
import { debug } from "../utils/debug";

/** Profile data returned from ATProto. */
export type ProfileData = {
  handle: string;
  displayName?: string;
  description?: string;
  /** Avatar URL (resolved blob URL from the PDS). */
  avatar?: string;
};

/** Typed error returned when the caller is not authorized to view this DID's profile. */
export type ProfileAuthError = { error: "unauthorized" };

type RawProfileRecord = {
  displayName?: string;
  description?: string;
  avatar?: string | { ref?: { $link?: string }; mimeType?: string };
};

/**
 * Fetch the user's profile by DID.
 *
 * Tries `app.certified.profile` first, falls back to `app.bsky.actor.profile`.
 * Both are fetched in parallel for speed.
 *
 * @param agent - An authenticated Agent for the user's DID
 * @param did   - The user's DID
 * @param handle - The user's handle (used as fallback if profile has no handle field)
 * @returns ProfileData, or null if neither profile is found / agent unavailable
 */
export async function fetchProfile(
  agent: Agent,
  did: string,
  handle: string,
): Promise<ProfileData | null> {
  const fetchRecord = async (
    collection: string,
  ): Promise<RawProfileRecord | null> => {
    try {
      const res = await agent.com.atproto.repo.getRecord({
        repo: did,
        collection,
        rkey: "self",
      });
      return (res.data.value as RawProfileRecord) ?? null;
    } catch {
      return null;
    }
  };

  debug.log("[profile] Fetching profiles in parallel", { did });

  const [certifiedProfile, bskyProfile] = await Promise.all([
    fetchRecord("app.certified.profile"),
    fetchRecord("app.bsky.actor.profile"),
  ]);

  const raw = certifiedProfile ?? bskyProfile;
  if (!raw) {
    debug.log("[profile] No profile found", { did });
    return null;
  }

  // Avatar may be a pre-resolved string URL (e.g. from a CDN)
  // or a blob ref object { ref: { $link: "<cid>" }, mimeType: "..." }.
  // For blob refs, we can't resolve the URL without knowing the PDS host,
  // so we return undefined. Callers that need blob URLs can construct them
  // via: `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`
  let avatarUrl: string | undefined;
  if (typeof raw.avatar === "string") {
    avatarUrl = raw.avatar;
  }

  debug.log("[profile] Profile fetched", {
    did,
    source: certifiedProfile ? "certified" : "bsky",
    hasDisplayName: !!raw.displayName,
    hasAvatar: !!avatarUrl,
  });

  return {
    handle,
    displayName: raw.displayName,
    description: raw.description,
    avatar: avatarUrl,
  };
}
