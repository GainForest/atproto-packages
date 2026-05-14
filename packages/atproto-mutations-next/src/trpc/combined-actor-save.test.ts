import { describe, expect, it } from "bun:test";
import type { Main as ActorOrganizationRecord } from "@gainforest/generated/app/certified/actor/organization.defs";
import type { Main as ActorProfileRecord } from "@gainforest/generated/app/certified/actor/profile.defs";
import {
  areRecordsEquivalent,
  buildCombinedActorSaveWrites,
} from "./combined-actor-save-writes";

const profile = (overrides: Partial<ActorProfileRecord> = {}): ActorProfileRecord => ({
  $type: "app.certified.actor.profile",
  displayName: "Original profile",
  createdAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

const organization = (
  overrides: Partial<ActorOrganizationRecord> = {},
): ActorOrganizationRecord => ({
  $type: "app.certified.actor.organization",
  organizationType: ["nonprofit"],
  visibility: "public",
  createdAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("areRecordsEquivalent", () => {
  it("treats object key order as irrelevant", () => {
    expect(
      areRecordsEquivalent(
        { a: 1, nested: { b: 2, c: 3 } },
        { nested: { c: 3, b: 2 }, a: 1 },
      ),
    ).toBe(true);
  });
});

describe("buildCombinedActorSaveWrites", () => {
  it("skips an unchanged organization update when only profile changed", () => {
    const existingProfile = profile();
    const profileRecord = profile({ displayName: "Updated profile" });
    const existingOrganization = organization();
    const organizationRecord = organization();

    const writes = buildCombinedActorSaveWrites({
      existingProfile,
      profileRecord,
      existingOrganization,
      organizationRecord,
      organizationCreated: false,
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      $type: "com.atproto.repo.applyWrites#update",
      collection: "app.certified.actor.profile",
      rkey: "self",
    });
  });

  it("skips an unchanged profile update when only organization changed", () => {
    const existingProfile = profile();
    const profileRecord = profile();
    const existingOrganization = organization();
    const organizationRecord = organization({ visibility: "unlisted" });

    const writes = buildCombinedActorSaveWrites({
      existingProfile,
      profileRecord,
      existingOrganization,
      organizationRecord,
      organizationCreated: false,
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      $type: "com.atproto.repo.applyWrites#update",
      collection: "app.certified.actor.organization",
      rkey: "self",
    });
  });

  it("returns no writes when both records are unchanged", () => {
    const existingProfile = profile();
    const profileRecord = profile();
    const existingOrganization = organization();
    const organizationRecord = organization();

    const writes = buildCombinedActorSaveWrites({
      existingProfile,
      profileRecord,
      existingOrganization,
      organizationRecord,
      organizationCreated: false,
    });

    expect(writes).toEqual([]);
  });

  it("always creates a missing organization record", () => {
    const writes = buildCombinedActorSaveWrites({
      existingProfile: profile(),
      profileRecord: profile(),
      existingOrganization: null,
      organizationRecord: organization(),
      organizationCreated: true,
    });

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      $type: "com.atproto.repo.applyWrites#create",
      collection: "app.certified.actor.organization",
      rkey: "self",
    });
  });
});
