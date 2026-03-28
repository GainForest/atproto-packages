/**
 * Canonical data shapes used throughout bumicerts-2 UI.
 *
 * These are serialization-safe (no Date objects, no class instances)
 * so they travel cleanly from server components → client components
 * via JSON serialization.
 */

import type { LeafletLinearDocument } from "@gainforest/leaflet-react";
import type { Facet } from "@gainforest/leaflet-react/richtext";

// ── Bumicert ────────────────────────────────────────────────────────────────

export type BumicertContributor = {
  /** Raw identity string — DID or free-text name */
  identity: string;
};

export type BumicertData = {
  /** "{did}-{rkey}" — used as the route param */
  id: string;
  /** Organisation DID that owns this bumicert */
  organizationDid: string;
  /** ATProto record key */
  rkey: string;
  /** ATProto record CID — used to form a StrongRef when creating attachments */
  cid: string | null;

  title: string;
  /**
   * Short plain-text summary (app.bsky.richtext string field).
   * Used for cards, previews, SEO metadata, and search.
   * For the full rich-text description use `description`.
   */
  shortDescription: string;
  /**
   * Bluesky-style richtext facets for shortDescription (mentions, links, hashtags).
   * Render with <BskyRichTextDisplay> in full-display contexts.
   * Empty array when there are no annotations.
   */
  shortDescriptionFacets: Facet[];
  /**
   * Full rich-text description as a Leaflet LinearDocument.
   * Always render with <LeafletRenderer> — never extract plain text from this
   * except for keyword search purposes (use extractTextFromLinearDocument).
   */
  description: LeafletLinearDocument;

  /** Resolved blob URL or null */
  coverImageUrl: string | null;
  /** Resolved logo URL for the owning org or null */
  logoUrl: string | null;
  /** Organisation display name */
  organizationName: string;

  /** ISO 3166-1 alpha-2 */
  country: string;
  /** Free-form objective strings */
  objectives: string[];

  /** Contributors extracted from the activity record */
  contributors: BumicertContributor[];

  startDate: string | null;
  endDate: string | null;
  createdAt: string;

  /**
   * Strong refs to `app.certified.location` records linked to this bumicert.
   * Each entry is `{ uri: "at://...", cid: "..." }`.
   * Use the rkey extracted from `uri` to fetch the resolved location records.
   */
  locationRefs: Array<{ uri: string; cid: string | null }>;
};

// ── Funding Config ────────────────────────────────────────────────────────────

/**
 * Serialisation-safe shape of a BumicertsFundingConfigRecord.
 * Mirrors the indexer's `BumicertsFundingConfigRecord` GraphQL type
 * and can be passed server → client without JSON issues.
 */
export type FundingConfigData = {
  /**
   * The receiving wallet — either an EvmLinkRef { $type, uri } or null.
   * Stored as `unknown` since the lexicon uses an open union.
   */
  receivingWallet: { uri: string } | null;
  status: "open" | "coming-soon" | "paused" | "closed" | null;
  goalInUSD: string | null;
  minDonationInUSD: string | null;
  maxDonationInUSD: string | null;
  allowOversell: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

// ── Certified Actor Profile ──────────────────────────────────────────────────

/**
 * A certified user profile that extends basic Bluesky actor data.
 *
 * Data sources:
 *   - `handle`       → Imported from Bluesky (app.bsky.actor.getProfile)
 *   - `displayName`  → Certified profile (app.certified.actor.profile), falls back to Bluesky
 *   - `description`  → Certified profile, falls back to Bluesky
 *   - `pronouns`     → Certified profile only (not available on Bluesky)
 *   - `website`      → Certified profile only (not available on Bluesky)
 *   - `avatarUrl`    → Certified profile, falls back to Bluesky
 *   - `bannerUrl`    → Certified profile only (not available on Bluesky)
 *   - `createdAt`    → Certified profile record timestamp
 *
 * Fields marked "Imported from Bluesky" are fetched from the public Bluesky API
 * at runtime and are NOT stored in the certified profile record.
 */
export type CertifiedProfileData = {
  did: string;
  /** Imported from Bluesky — the user's ATProto handle (e.g. alice.bsky.social) */
  handle: string;

  // ── Certified profile fields (editable) ──────────────────────────────────

  /** Display name — stored in certified profile, falls back to Bluesky display name */
  displayName: string;
  /** Bio / description — stored in certified profile, falls back to Bluesky description */
  description: string;
  /** Pronouns — certified profile only (not on Bluesky) */
  pronouns: string | null;
  /** Personal website URL — certified profile only (not on Bluesky) */
  website: string | null;
  /** Avatar image URL — stored in certified profile, falls back to Bluesky avatar */
  avatarUrl: string | null;
  /** Banner image URL — certified profile only (not on Bluesky) */
  bannerUrl: string | null;

  createdAt: string;

  // ── Bluesky-imported fields (read-only, shown for context) ───────────────

  /** Whether displayName was imported from Bluesky (no certified override) */
  displayNameFromBluesky: boolean;
  /** Whether description was imported from Bluesky (no certified override) */
  descriptionFromBluesky: boolean;
  /** Whether avatar was imported from Bluesky (no certified override) */
  avatarFromBluesky: boolean;
};

// ── Organization ─────────────────────────────────────────────────────────────

export type OrganizationData = {
  did: string;
  displayName: string;
  /**
   * Short plain-text summary (Richtext string field).
   * Used for cards, previews, SEO, and search.
   */
  shortDescription: string;
  /**
   * Bluesky-style richtext facets for shortDescription (mentions, links, hashtags).
   * Render with <BskyRichTextDisplay> in full-display contexts.
   * Empty array when there are no annotations.
   */
  shortDescriptionFacets: Facet[];
  /**
   * Full rich-text about section as a Leaflet LinearDocument.
   * Always render with <LeafletRenderer> — never extract plain text from this
   * except for keyword search purposes (use extractTextFromLinearDocument).
   */
  longDescription: LeafletLinearDocument;

  logoUrl: string | null;
  coverImageUrl: string | null;

  objectives: string[];
  /** ISO 3166-1 alpha-2 */
  country: string;
  website: string | null;
  startDate: string | null;
  visibility: "Public" | "Unlisted";
  createdAt: string;

  bumicertCount: number;
};
