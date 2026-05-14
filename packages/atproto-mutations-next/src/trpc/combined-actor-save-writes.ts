import type { Main as ActorOrganizationRecord } from "@gainforest/generated/app/certified/actor/organization.defs";
import type { Main as ActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";

const PROFILE_COLLECTION = "app.certified.actor.profile";
const ORGANIZATION_COLLECTION = "app.certified.actor.organization";
const RKEY = "self";

type ApplyWritesWrite =
  | {
      $type: "com.atproto.repo.applyWrites#create";
      collection: string;
      rkey: string;
      value: ActorProfileRecord | ActorOrganizationRecord;
    }
  | {
      $type: "com.atproto.repo.applyWrites#update";
      collection: string;
      rkey: string;
      value: ActorProfileRecord | ActorOrganizationRecord;
    };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeForRecordComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForRecordComparison);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeForRecordComparison(entry)]),
    );
  }

  return value;
}

export function areRecordsEquivalent(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeForRecordComparison(left)) ===
    JSON.stringify(normalizeForRecordComparison(right))
  );
}

export function buildCombinedActorSaveWrites(args: {
  existingProfile: ActorProfileRecord;
  profileRecord: ActorProfileRecord;
  existingOrganization: ActorOrganizationRecord | null;
  organizationRecord: ActorOrganizationRecord;
  organizationCreated: boolean;
}): ApplyWritesWrite[] {
  const writes: ApplyWritesWrite[] = [];

  if (!areRecordsEquivalent(args.existingProfile, args.profileRecord)) {
    writes.push({
      $type: "com.atproto.repo.applyWrites#update",
      collection: PROFILE_COLLECTION,
      rkey: RKEY,
      value: args.profileRecord,
    });
  }

  if (args.organizationCreated) {
    writes.push({
      $type: "com.atproto.repo.applyWrites#create",
      collection: ORGANIZATION_COLLECTION,
      rkey: RKEY,
      value: args.organizationRecord,
    });
  } else if (
    args.existingOrganization !== null &&
    !areRecordsEquivalent(args.existingOrganization, args.organizationRecord)
  ) {
    writes.push({
      $type: "com.atproto.repo.applyWrites#update",
      collection: ORGANIZATION_COLLECTION,
      rkey: RKEY,
      value: args.organizationRecord,
    });
  }

  return writes;
}
