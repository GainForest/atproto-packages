"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

/**
 * ATProto profile data from the Bluesky public API.
 */
export interface AtprotoProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

/**
 * Fetches an ATProto user profile from the Bluesky public API.
 */
async function fetchAtprotoProfile(
  did: string,
): Promise<AtprotoProfile | null> {
  try {
    const url = new URL(
      "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile",
    );
    url.searchParams.set("actor", did);
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return (await res.json()) as AtprotoProfile;
  } catch {
    return null;
  }
}

export interface UseProfileOptions {
  /**
   * Whether to enable the query (default: true).
   * Useful for conditional fetching (e.g., only fetch if DID is present).
   */
  enabled?: boolean;
}

/**
 * React Query hook to fetch and cache an ATProto user profile.
 * 
 * @param did - The DID to fetch the profile for
 * @param options - Query options (enabled, etc.)
 * @returns UseQueryResult with profile data
 * 
 * @example
 * ```tsx
 * const { data: profile, isLoading } = useProfile(did);
 * const displayName = profile?.displayName ?? profile?.handle ?? did;
 * ```
 */
export function useProfile(
  did: string | null | undefined,
  options?: UseProfileOptions,
): UseQueryResult<AtprotoProfile | null, Error> {
  const enabled = options?.enabled ?? true;
  
  return useQuery({
    queryKey: ["bsky-profile", did ?? ""],
    queryFn: () => {
      if (!did) return Promise.resolve(null);
      return fetchAtprotoProfile(did);
    },
    enabled: enabled && Boolean(did),
    staleTime: 5 * 60 * 1000, // 5 minutes — profiles are stable
    retry: false,
  });
}
