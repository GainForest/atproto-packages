import { Agent } from '@atproto/api';

type SessionData = {
    did: string;
    handle: string;
    isLoggedIn: true;
};
type EmptySession = {
    isLoggedIn: false;
};
type AnySession = SessionData | EmptySession;

/**
 * Profile fetching utilities.
 *
 * Fetches the user's profile by trying two record collections in priority order:
 *   1. app.certified.profile — GainForest's certified profile (if it exists)
 *   2. app.bsky.actor.profile — Standard ATProto/Bluesky profile (fallback)
 *
 * Both are fetched in parallel and the first non-null result is used.
 */

/** Profile data returned from ATProto. */
type ProfileData = {
    handle: string;
    displayName?: string;
    description?: string;
    /** Avatar URL (resolved blob URL from the PDS). */
    avatar?: string;
};
/** Typed error returned when the caller is not authorized to view this DID's profile. */
type ProfileAuthError = {
    error: "unauthorized";
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
declare function fetchProfile(agent: Agent, did: string, handle: string): Promise<ProfileData | null>;

export { type AnySession as A, type EmptySession as E, type ProfileAuthError as P, type SessionData as S, type ProfileData as a, fetchProfile as f };
