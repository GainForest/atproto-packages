"use server";

/**
 * Server Actions for Bumicert (claim.activity) operations.
 *
 * These actions wrap the mutations package and can be called from client components.
 */

import { mutations } from "@/lib/mutations";
import type { SerializableFile } from "@gainforest/atproto-mutations-core";

/**
 * Create a new bumicert (claim.activity record).
 */
export async function createBumicertAction(input: {
  title: string;
  shortDescription: string;
  description?: string;
  workScope?: {
    $type: "org.hypercerts.claim.activity#workScopeString";
    scope: string;
  };
  startDate?: string;
  endDate?: string;
  contributors?: Array<{
    contributorIdentity: {
      $type: "org.hypercerts.claim.activity#contributorIdentity";
      identity: string;
    };
  }>;
  locations?: Array<{
    uri: string;
    cid: string;
  }>;
  image?: {
    $type: "org.hypercerts.defs#smallImage";
    image: SerializableFile;
  };
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mutations.claim.activity.create(input as any);
}
