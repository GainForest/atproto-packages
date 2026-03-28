/**
 * Certified Actor Profile query module.
 *
 * Fetches the certified actor profile from the indexer (app.certified.actor.profile),
 * and also fetches the Bluesky actor profile for fallback / "imported from" display.
 *
 * Params: { did: string }
 * Result: { certifiedProfile, bskyProfile } — both nullable
 *
 * Leaf: queries.certifiedProfile
 */

import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";
import { CertifiedActorProfileFragment } from "@/lib/graphql/fragments";
import { links } from "@/lib/links";
import type { QueryModule } from "@/lib/graphql/create-query";

// ── Documents ─────────────────────────────────────────────────────────────────

const profileDocument = graphql(
  `
    query CertifiedActorProfileByDid($did: String!) {
      certified {
        actor {
          profile(where: { did: $did }, limit: 1) {
            data {
              ...CertifiedActorProfileFields
            }
          }
        }
      }
    }
  `,
  [CertifiedActorProfileFragment]
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface BskyActorProfile {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
}

export interface CertifiedProfileRecord {
  displayName: string | null;
  description: string | null;
  pronouns: string | null;
  website: string | null;
  avatar: unknown; // JSON — blob ref or URI
  banner: unknown; // JSON — blob ref or URI
  createdAt: string | null;
}

export type Params = { did: string };

export type Result = {
  certifiedProfile: CertifiedProfileRecord | null;
  bskyProfile: BskyActorProfile | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchBskyProfile(did: string): Promise<BskyActorProfile | null> {
  try {
    const res = await globalThis.fetch(links.api.getProfile(did));
    if (!res.ok) return null;
    return res.json() as Promise<BskyActorProfile>;
  } catch {
    return null;
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  // Fetch both in parallel for speed
  const [indexerRes, bskyProfile] = await Promise.all([
    graphqlClient.request(profileDocument, { did: params.did }),
    fetchBskyProfile(params.did),
  ]);

  const item = indexerRes.certified?.actor?.profile?.data?.[0] ?? null;
  const certifiedProfile: CertifiedProfileRecord | null = item?.record
    ? {
        displayName: item.record.displayName ?? null,
        description: item.record.description ?? null,
        pronouns: item.record.pronouns ?? null,
        website: item.record.website ?? null,
        avatar: item.record.avatar,
        banner: item.record.banner,
        createdAt: item.record.createdAt ?? item.metadata?.createdAt ?? null,
      }
    : null;

  return { certifiedProfile, bskyProfile };
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000, // 1 minute
} satisfies QueryModule<Params, Result>["defaultOptions"];

// ── Enabled ───────────────────────────────────────────────────────────────────

export function enabled(params: Params): boolean {
  return !!params.did && params.did.startsWith("did:");
}
