/**
 * GraphQL namespace: certified
 *
 * app.certified.* records.
 *
 * Every paginated query accepts:
 *   cursor  – opaque keyset pagination token
 *   limit   – page size 1-100 (default 50)
 *   where   – identity filter { did?, handle?, and?, or?, not? }
 *   sortBy  – CREATED_AT | INDEXED_AT
 *   order   – DESC (default) | ASC
 */

import { builder } from "../builder.ts";
import {
  PageInfoType, RecordMetaType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, resolveBlobsInValue, extractBlobRef, fetchCollectionPage, toPageInfo, WhereInputRef,
} from "../types.ts";
import { getRecordsByCollection } from "@/db/queries.ts";
import { resolveActorToDid } from "../identity.ts";
import { getPdsHostsBatch } from "@/identity/pds.ts";
import type { RecordRow } from "@/db/types.ts";

// JSONB accessors
const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};
const j = (p: Record<string, unknown>, k: string): unknown => p[k] ?? null;

// ================================================================
// Token classes
// ================================================================

class CertifiedActorNS {}
class CertifiedBadgeNS {}
class CertifiedNS {}

// ================================================================
// ── Actor leaf types ─────────────────────────────────────────────
// ================================================================

const CertifiedActorProfileType = builder.simpleObject("CertifiedActorProfile", {
  description: "A Hypercert account profile declaration (app.certified.actor.profile).",
  fields: (t) => ({
    meta:        t.field({ type: RecordMetaType }),
    displayName: t.string({ nullable: true }),
    description: t.string({ nullable: true }),
    pronouns:    t.string({ nullable: true }),
    website:     t.string({ nullable: true }),
    avatar:      t.field({ type: "JSON", nullable: true }),
    banner:      t.field({ type: "JSON", nullable: true }),
    createdAt:   t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedActorProfilePageType = builder.simpleObject("CertifiedActorProfilePage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedActorProfileType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

async function mapActorProfile(row: RecordRow) {
  const p = payload(row);
  return {
    meta:        rowToMeta(row),
    displayName: s(p,"displayName"),
    description: s(p,"description"),
    pronouns:    s(p,"pronouns"),
    website:     s(p,"website"),
    avatar:      await resolveBlobsInValue(j(p,"avatar"), row.did),
    banner:      await resolveBlobsInValue(j(p,"banner"), row.did),
    createdAt:   s(p,"createdAt"),
  };
}

// ── Actor namespace ──

builder.objectType(CertifiedActorNS, {
  name: "CertifiedActorNamespace",
  description: "Certified actor records (app.certified.actor.*).",
  fields: (t) => ({
    profiles: t.field({
      type: CertifiedActorProfilePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;
        const page = await getRecordsByCollection("app.certified.actor.profile", {
          cursor: cursor ?? undefined, limit: limit ?? undefined, did: resolvedDid,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order as "asc" | "desc") ?? undefined,
        });
        await getPdsHostsBatch([...new Set(page.records.map((r) => r.did))]);
        return { records: await Promise.all(page.records.map(mapActorProfile)), pageInfo: toPageInfo(page.cursor) };
      },
    }),
  }),
});

// ================================================================
// ── Location leaf type ───────────────────────────────────────────
// ================================================================

const CertifiedLocationType = builder.simpleObject("CertifiedLocation", {
  description: "A geospatial location record (app.certified.location).",
  fields: (t) => ({
    meta:         t.field({ type: RecordMetaType }),
    lpVersion:    t.string({ nullable: true }),
    srs:          t.string({ nullable: true }),
    locationType: t.string({ nullable: true }),
    // `location` is a union of URI string | blob | inline string object — returned as raw JSON
    location:     t.field({ type: "JSON", nullable: true }),
    name:         t.string({ nullable: true }),
    description:  t.string({ nullable: true }),
    createdAt:    t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedLocationPageType = builder.simpleObject("CertifiedLocationPage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedLocationType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ================================================================
// ── Badge leaf types ─────────────────────────────────────────────
// ================================================================

const CertifiedBadgeDefinitionType = builder.simpleObject("CertifiedBadgeDefinition", {
  description: "A badge definition (app.certified.badge.definition).",
  fields: (t) => ({
    meta:           t.field({ type: RecordMetaType }),
    badgeType:      t.string({ nullable: true }),
    title:          t.string({ nullable: true }),
    icon:           t.field({ type: "JSON", nullable: true }),
    description:    t.string({ nullable: true }),
    // allowedIssuers is an array of { did: string } objects
    allowedIssuers: t.field({ type: "JSON", nullable: true }),
    createdAt:      t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedBadgeDefinitionPageType = builder.simpleObject("CertifiedBadgeDefinitionPage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedBadgeDefinitionType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const CertifiedBadgeAwardType = builder.simpleObject("CertifiedBadgeAward", {
  description: "A badge award to a user, project, or activity claim (app.certified.badge.award).",
  fields: (t) => ({
    meta:      t.field({ type: RecordMetaType }),
    // badge is a strongRef to the badge.definition record
    badge:     t.field({ type: "JSON", nullable: true }),
    // subject is a union: { $type: 'app.certified.defs#did', did: string }
    //                  or { $type: 'com.atproto.repo.strongRef', uri, cid }
    subject:   t.field({ type: "JSON", nullable: true }),
    note:      t.string({ nullable: true }),
    createdAt: t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedBadgeAwardPageType = builder.simpleObject("CertifiedBadgeAwardPage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedBadgeAwardType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

const CertifiedBadgeResponseType = builder.simpleObject("CertifiedBadgeResponse", {
  description: "A recipient response to a badge award (app.certified.badge.response).",
  fields: (t) => ({
    meta:       t.field({ type: RecordMetaType }),
    // badgeAward is a strongRef to the badge.award record
    badgeAward: t.field({ type: "JSON", nullable: true }),
    response:   t.string({ nullable: true }),
    weight:     t.string({ nullable: true }),
    createdAt:  t.field({ type: "DateTime", nullable: true }),
  }),
});
const CertifiedBadgeResponsePageType = builder.simpleObject("CertifiedBadgeResponsePage", {
  fields: (t) => ({ records: t.field({ type: [CertifiedBadgeResponseType] }), pageInfo: t.field({ type: PageInfoType }) }),
});

// ── Badge namespace ──

builder.objectType(CertifiedBadgeNS, {
  name: "CertifiedBadgeNamespace",
  description: "Badge records (app.certified.badge.*).",
  fields: (t) => ({
    definitions: t.field({
      type: CertifiedBadgeDefinitionPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.certified.badge.definition", args, async (row) => {
        const p = payload(row);
        return {
          meta:           rowToMeta(row),
          badgeType:      s(p,"badgeType"),
          title:          s(p,"title"),
          icon:           await extractBlobRef(j(p,"icon"), row.did),
          description:    s(p,"description"),
          allowedIssuers: j(p,"allowedIssuers"),
          createdAt:      s(p,"createdAt"),
        };
      }),
    }),
    awards: t.field({
      type: CertifiedBadgeAwardPageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.certified.badge.award", args, (row) => {
        const p = payload(row);
        return {
          meta:      rowToMeta(row),
          badge:     j(p,"badge"),
          subject:   j(p,"subject"),
          note:      s(p,"note"),
          createdAt: s(p,"createdAt"),
        };
      }),
    }),
    responses: t.field({
      type: CertifiedBadgeResponsePageType,
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.certified.badge.response", args, (row) => {
        const p = payload(row);
        return {
          meta:       rowToMeta(row),
          badgeAward: j(p,"badgeAward"),
          response:   s(p,"response"),
          weight:     s(p,"weight"),
          createdAt:  s(p,"createdAt"),
        };
      }),
    }),
  }),
});

// ── Certified root namespace ──

builder.objectType(CertifiedNS, {
  name: "CertifiedNamespace",
  description: "All Certified AT Protocol records (app.certified.*).",
  fields: (t) => ({
    actor: t.field({
      type: CertifiedActorNS,
      description: "Certified actor records (app.certified.actor.*).",
      resolve: () => new CertifiedActorNS(),
    }),
    locations: t.field({
      type: CertifiedLocationPageType,
      description: "Geospatial location records (app.certified.location).",
      args: {
        cursor: t.arg.string(), limit: t.arg.int(),
        where: t.arg({ type: WhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }), order: t.arg({ type: SortOrderEnum }),
      },
      resolve: (_, args) => fetchCollectionPage("app.certified.location", args, (row) => {
        const p = payload(row);
        return {
          meta:         rowToMeta(row),
          lpVersion:    s(p,"lpVersion"),
          srs:          s(p,"srs"),
          locationType: s(p,"locationType"),
          location:     j(p,"location"),
          name:         s(p,"name"),
          description:  s(p,"description"),
          createdAt:    s(p,"createdAt"),
        };
      }),
    }),
    badge: t.field({
      type: CertifiedBadgeNS,
      description: "Badge records (app.certified.badge.*).",
      resolve: () => new CertifiedBadgeNS(),
    }),
  }),
});

builder.queryFields((t) => ({
  certified: t.field({
    type: CertifiedNS,
    description: "All Certified indexed records, grouped by namespace.",
    resolve: () => new CertifiedNS(),
  }),
}));
