/**
 * Profile fetching utilities.
 *
 * Fetches the user's profile by trying two sources in priority order:
 *   1. app.certified.profile — GainForest's certified profile (if it exists)
 *   2. Bluesky public API — Standard ATProto/Bluesky profile (fallback)
 *
 * Fields are merged individually: certified values take priority, with
 * Bluesky filling in any gaps (especially avatar).
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

/** Response shape from the Bluesky public API. */
type BskyPublicProfile = {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string; // Always a resolved CDN URL
};

/**
 * Fetch a resolved avatar URL from the Bluesky public API.
 *
 * Unlike `getRecord`, the public API returns fully resolved CDN URLs
 * (e.g. `https://cdn.bsky.app/...`) rather than blob refs.
 */
async function fetchBskyPublicProfile(
  did: string,
): Promise<BskyPublicProfile | null> {
  try {
    const url = new URL(
      "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile",
    );
    url.searchParams.set("actor", did);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as BskyPublicProfile;
  } catch {
    return null;
  }
}

/**
 * Extract a usable avatar URL from a raw profile record.
 *
 * Returns the avatar if it's a pre-resolved string URL (e.g. from a CDN),
 * or undefined if it's a blob ref object (which can't be resolved without
 * the PDS host).
 */
function extractAvatarUrl(
  raw: RawProfileRecord | null,
): string | undefined {
  if (raw && typeof raw.avatar === "string") {
    return raw.avatar;
  }
  return undefined;
}

/**
 * Fetch the user's profile by DID.
 *
 * Tries `app.certified.profile` first for all fields. For avatar specifically,
 * if the certified profile doesn't have a usable avatar URL, falls back to the
 * Bluesky public API which returns resolved CDN URLs.
 *
 * Both sources are fetched in parallel for speed.
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

  const [certifiedProfile, bskyPublicProfile] = await Promise.all([
    fetchRecord("app.certified.profile"),
    fetchBskyPublicProfile(did),
  ]);

  if (!certifiedProfile && !bskyPublicProfile) {
    debug.log("[profile] No profile found", { did });
    return null;
  }

  // Resolve avatar: prefer certified profile, fall back to Bluesky public API.
  // The certified profile avatar may be a string URL or a blob ref — only
  // string URLs are usable. The Bluesky public API always returns resolved
  // CDN URLs, making it a reliable fallback.
  const certifiedAvatarUrl = extractAvatarUrl(certifiedProfile);
  const bskyAvatarUrl = bskyPublicProfile?.avatar;
  const avatarUrl = certifiedAvatarUrl ?? bskyAvatarUrl;

  const avatarSource = certifiedAvatarUrl
    ? "certified"
    : bskyAvatarUrl
      ? "bsky"
      : "none";

  // Merge remaining fields: prefer certified, fall back to bsky public API.
  const displayName =
    certifiedProfile?.displayName ?? bskyPublicProfile?.displayName;
  const description =
    certifiedProfile?.description ?? bskyPublicProfile?.description;

  debug.log("[profile] Profile fetched", {
    did,
    hasDisplayName: !!displayName,
    hasAvatar: !!avatarUrl,
    avatarSource,
  });

  return {
    handle,
    displayName,
    description,
    avatar: avatarUrl,
  };
}
