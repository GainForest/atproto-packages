/**
 * Custom resolver: app.bumicerts.link.evm
 *
 * Excluded from auto-generation because:
 *   1. Nested sub-objects (Eip712Proof, Eip712Message, Eip712PlatformAttestation)
 *      each need their own GraphQL types.
 *   2. A `valid` boolean is computed at query time by cryptographically verifying
 *      both the user's EIP-712 signature and the platform's counter-signature.
 *      This is stateless — we never check if platformAddress is our wallet,
 *      only that the signatures are cryptographically valid.
 *   3. A custom EvmLinkWhereInput extends WhereInput with a `valid` boolean filter.
 *
 * Attaches the `evm` field to the generated BumicertsLinkNS (created here)
 * and attaches `link` to the generated BumicertsNS.
 */

import { builder } from "../../builder.ts";
import {
  PageInfoType, RecordMetaType, CreatorInfoType,
  SortOrderEnum, SortFieldEnum,
  rowToMeta, payload, toPageInfo, resolveCreatorInfo,
} from "../../types.ts";
import type { WhereInput } from "../../types.ts";
import { getRecordsByCollection } from "@/db/queries.ts";
import { resolveActorToDid } from "../../identity.ts";
import type { RecordRow } from "@/db/types.ts";
import { verifyTypedData } from "viem";

import { BumicertsNS } from "../generated.ts";

// ── JSONB accessors ──────────────────────────────────────────────────────────

const s = (p: Record<string, unknown>, k: string): string | null => {
  const v = p[k]; if (v == null) return null;
  return typeof v === "string" ? v : String(v);
};

// ── EIP-712 domain & types (must match useWalletAttestation.ts exactly) ──────

const EIP712_DOMAIN = {
  name:    "ATProto EVM Attestation",
  version: "1",
} as const;

const EIP712_TYPES = {
  AttestLink: [
    { name: "did",        type: "string" },
    { name: "evmAddress", type: "string" },
    { name: "chainId",    type: "string" },
    { name: "timestamp",  type: "string" },
    { name: "nonce",      type: "string" },
  ],
} as const;

// ── Signature verification helpers ────────────────────────────────────────────

/**
 * Verify the user's EIP-712 proof.
 *
 * The user signed an `AttestLink` typed message (did, evmAddress, chainId,
 * timestamp, nonce) with their EVM wallet.  We recover the signer address
 * and check it matches the top-level `address` field.
 */
async function verifyUserProof(
  address: string,
  proof: {
    signature: string;
    message: {
      did: string;
      evmAddress: string;
      chainId: string;
      timestamp: string;
      nonce: string;
    };
  }
): Promise<boolean> {
  try {
    const valid = await verifyTypedData({
      address: address as `0x${string}`,
      domain:  EIP712_DOMAIN,
      types:   EIP712_TYPES,
      primaryType: "AttestLink",
      message: {
        did:        proof.message.did,
        evmAddress: proof.message.evmAddress,
        chainId:    proof.message.chainId,
        timestamp:  proof.message.timestamp,
        nonce:      proof.message.nonce,
      },
      signature: proof.signature as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}

/**
 * Verify the platform's counter-signature.
 *
 * The platform signed over `signedData` (which is the raw user signature hex)
 * as an EIP-191 personal sign message (the simplest "I sign this bytes" scheme).
 * We check that the recovered signer matches `platformAddress`.
 *
 * Note: We do NOT check if platformAddress is a specific trusted address —
 * we remain stateless and only verify cryptographic validity.
 */
async function verifyPlatformAttestation(attestation: {
  signature:       string;
  platformAddress: string;
  signedData:      string;
}): Promise<boolean> {
  try {
    // The platform signed the raw hex of the user's signature as a personal_sign
    // message.  viem's verifyMessage handles the EIP-191 prefix automatically.
    const { verifyMessage } = await import("viem");
    const valid = await verifyMessage({
      address:   attestation.platformAddress as `0x${string}`,
      message:   { raw: attestation.signedData as `0x${string}` },
      signature: attestation.signature as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}

/**
 * Compute the `valid` field for a link.evm record.
 * Returns true only if BOTH signatures are cryptographically valid.
 */
async function computeValid(p: Record<string, unknown>): Promise<boolean> {
  try {
    const address = s(p, "address");
    if (!address) return false;

    // ── User proof ─────────────────────────────────────────────────────────
    const userProofRaw = p["userProof"];
    if (!userProofRaw || typeof userProofRaw !== "object") return false;
    const up = userProofRaw as Record<string, unknown>;

    // Only handle the known eip712Proof variant
    if (
      up["$type"] !== "app.bumicerts.link.evm#eip712Proof" &&
      up["$type"] !== undefined // also accept untyped for backwards compat
    ) {
      if (up["$type"] !== undefined && up["$type"] !== "app.bumicerts.link.evm#eip712Proof") {
        return false; // unknown userProof variant
      }
    }

    const userSig = s(up, "signature");
    const msgRaw  = up["message"];
    if (!userSig || !msgRaw || typeof msgRaw !== "object") return false;
    const msg = msgRaw as Record<string, unknown>;

    const userProofOk = await verifyUserProof(address, {
      signature: userSig,
      message: {
        did:        s(msg, "did")        ?? "",
        evmAddress: s(msg, "evmAddress") ?? "",
        chainId:    s(msg, "chainId")    ?? "",
        timestamp:  s(msg, "timestamp")  ?? "",
        nonce:      s(msg, "nonce")      ?? "",
      },
    });
    if (!userProofOk) return false;

    // ── Platform attestation ────────────────────────────────────────────────
    const paRaw = p["platformAttestation"];
    if (!paRaw || typeof paRaw !== "object") return false;
    const pa = paRaw as Record<string, unknown>;

    // Only handle the known eip712PlatformAttestation variant
    if (
      pa["$type"] !== undefined &&
      pa["$type"] !== "app.bumicerts.link.evm#eip712PlatformAttestation"
    ) {
      return false; // unknown platformAttestation variant
    }

    const paSig     = s(pa, "signature");
    const paAddress = s(pa, "platformAddress");
    const paData    = s(pa, "signedData");
    if (!paSig || !paAddress || !paData) return false;

    return verifyPlatformAttestation({
      signature:       paSig,
      platformAddress: paAddress,
      signedData:      paData,
    });
  } catch {
    return false;
  }
}

// ── Sub-types: EIP-712 message ────────────────────────────────────────────────

export const BumicertsLinkEvmEip712MessageType = builder.simpleObject("BumicertsLinkEvmEip712Message", {
  description: "The EIP-712 typed data message signed by the user's EVM wallet.",
  fields: (t) => ({
    did:        t.string({ nullable: true, description: "The ATProto DID being linked." }),
    evmAddress: t.string({ nullable: true, description: "The EVM wallet address (must match top-level address)." }),
    chainId:    t.string({ nullable: true, description: "EVM chain ID (bigint serialized as string)." }),
    timestamp:  t.string({ nullable: true, description: "Unix timestamp when the attestation was created." }),
    nonce:      t.string({ nullable: true, description: "Replay-protection nonce." }),
  }),
});

// ── Sub-types: user proof ─────────────────────────────────────────────────────

export const BumicertsLinkEvmEip712ProofType = builder.simpleObject("BumicertsLinkEvmEip712Proof", {
  description: "EOA wallet ownership proof via EIP-712 typed data signature.",
  fields: (t) => ({
    signature: t.string({ nullable: true, description: "User's ECDSA signature (0x-prefixed hex)." }),
    message:   t.field({ type: BumicertsLinkEvmEip712MessageType, nullable: true }),
  }),
});

// ── Sub-types: platform attestation ──────────────────────────────────────────

export const BumicertsLinkEvmPlatformAttestationType = builder.simpleObject("BumicertsLinkEvmPlatformAttestation", {
  description: "Platform's EIP-712 counter-signature attesting the link was created through a trusted service.",
  fields: (t) => ({
    signature:       t.string({ nullable: true, description: "Platform's ECDSA signature (0x-prefixed hex)." }),
    platformAddress: t.string({ nullable: true, description: "The platform's signing wallet address." }),
    signedData:      t.string({ nullable: true, description: "The user signature that the platform signed over." }),
  }),
});

// ── Special metadata type — cryptographic validity beyond the standard envelope

export const BumicertsLinkEvmSpecialMetadataType = builder.simpleObject("BumicertsLinkEvmSpecialMetadata", {
  description:
    "Cryptographic validity metadata for a link.evm record, computed at query time.",
  fields: (t) => ({
    valid: t.boolean({
      description:
        "True if both the user's EIP-712 ownership proof and the platform's " +
        "counter-signature are cryptographically valid at query time. " +
        "Stateless: does not check if platformAddress is a specific trusted wallet.",
    }),
  }),
});

// ── Pure record type ──────────────────────────────────────────────────────────

export const BumicertsLinkEvmRecordType = builder.simpleObject("BumicertsLinkEvmRecord", {
  description: "Pure payload for app.bumicerts.link.evm — a DID–EVM wallet link record.",
  fields: (t) => ({
    name:                t.string({ nullable: true, description: "Optional user-defined label for this wallet link." }),
    address:             t.string({ nullable: true, description: "EVM wallet address (0x-prefixed, checksummed)." }),
    userProof:           t.field({ type: BumicertsLinkEvmEip712ProofType, nullable: true, description: "User's EIP-712 ownership proof." }),
    platformAttestation: t.field({ type: BumicertsLinkEvmPlatformAttestationType, nullable: true, description: "Platform's EIP-712 counter-signature." }),
    createdAt:           t.field({ type: "DateTime", nullable: true }),
  }),
});

// ── Item + Page types ─────────────────────────────────────────────────────────

export const BumicertsLinkEvmItemType = builder.simpleObject("BumicertsLinkEvmItem", {
  description: "A DID–EVM wallet link record (app.bumicerts.link.evm).",
  fields: (t) => ({
    metadata:        t.field({ type: RecordMetaType }),
    specialMetadata: t.field({
      type: BumicertsLinkEvmSpecialMetadataType,
      nullable: true,
      description:
        "Cryptographic validity metadata for this record, computed at query time. " +
        "Always present for link.evm records.",
    }),
    creatorInfo: t.field({ type: CreatorInfoType }),
    record:      t.field({ type: BumicertsLinkEvmRecordType }),
  }),
});

export const BumicertsLinkEvmPageType = builder.simpleObject("BumicertsLinkEvmPage", {
  fields: (t) => ({
    data:     t.field({ type: [BumicertsLinkEvmItemType] }),
    pageInfo: t.field({ type: PageInfoType }),
  }),
});

// ── Custom WhereInput ─────────────────────────────────────────────────────────

/**
 * Extended WhereInput for link.evm queries.
 * Adds a `valid` boolean filter that post-filters records by signature validity.
 */
interface EvmLinkWhereInput extends WhereInput {
  /** If set, only return records where both signatures are (true) or are not (false) valid. */
  valid?: boolean | null;
}

const EvmLinkWhereInputRef = builder.inputRef<EvmLinkWhereInput>("EvmLinkWhereInput");

EvmLinkWhereInputRef.implement({
  description:
    "Filter for app.bumicerts.link.evm records. " +
    "Supports all standard identity filters (`did`, `handle`, `rkey`) plus " +
    "a `valid` boolean to filter by cryptographic signature validity.",
  fields: (t) => ({
    did: t.string({
      required: false,
      description: "Filter to records authored by this DID.",
    }),
    handle: t.string({
      required: false,
      description: "Filter by AT Protocol handle. Resolved to a DID (takes precedence over `did`).",
    }),
    rkey: t.string({
      required: false,
      description: "Filter by record key (rkey).",
    }),
    valid: t.boolean({
      required: false,
      description:
        "If true, only return records where both the user proof and platform attestation " +
        "signatures are cryptographically valid. If false, only return invalid records. " +
        "If omitted, returns all records regardless of validity.",
    }),
    and: t.field({ type: [EvmLinkWhereInputRef], required: false, description: "All child filters must match." }),
    or:  t.field({ type: [EvmLinkWhereInputRef], required: false, description: "At least one child filter must match." }),
    not: t.field({ type: EvmLinkWhereInputRef,   required: false, description: "The child filter must NOT match." }),
  }),
});

// ── Row mapper ────────────────────────────────────────────────────────────────

export async function mapBumicertsLinkEvm(row: RecordRow) {
  const p = payload(row);

  // ── Decode userProof ──────────────────────────────────────────────────────
  type Eip712MessageShape = {
    did: string | null; evmAddress: string | null; chainId: string | null;
    timestamp: string | null; nonce: string | null;
  };
  type UserProofShape = { signature: string | null; message: Eip712MessageShape | null };

  let userProof: UserProofShape | null = null;

  const upRaw = p["userProof"];
  if (upRaw != null && typeof upRaw === "object") {
    const up = upRaw as Record<string, unknown>;
    const msgRaw = up["message"];
    let message: Eip712MessageShape | null = null;
    if (msgRaw != null && typeof msgRaw === "object") {
      const m = msgRaw as Record<string, unknown>;
      message = {
        did:        s(m, "did"),
        evmAddress: s(m, "evmAddress"),
        chainId:    s(m, "chainId"),
        timestamp:  s(m, "timestamp"),
        nonce:      s(m, "nonce"),
      };
    }
    userProof = {
      signature: s(up, "signature"),
      message,
    };
  }

  // ── Decode platformAttestation ────────────────────────────────────────────
  let platformAttestation: {
    signature: string | null;
    platformAddress: string | null;
    signedData: string | null;
  } | null = null;

  const paRaw = p["platformAttestation"];
  if (paRaw != null && typeof paRaw === "object") {
    const pa = paRaw as Record<string, unknown>;
    platformAttestation = {
      signature:       s(pa, "signature"),
      platformAddress: s(pa, "platformAddress"),
      signedData:      s(pa, "signedData"),
    };
  }

  // ── Compute valid (query-time cryptographic check) ────────────────────────
  const valid = await computeValid(p);

  return {
    metadata: rowToMeta(row),
    specialMetadata: { valid },
    creatorInfo: await resolveCreatorInfo(row.did),
    record: {
      name:                s(p, "name"),
      address:             s(p, "address"),
      userProof,
      platformAttestation,
      createdAt:           s(p, "createdAt"),
    },
  };
}

// ── Local class for the link sub-namespace ────────────────────────────────────
// (Not in generated.ts because all link.* collections are excluded)

class BumicertsLinkNS {}

// Register the link namespace type
builder.objectType(BumicertsLinkNS, {
  name: "BumicertsLinkNamespace",
  description: "BumicertsLinkNamespace namespace (bumicerts.link.*).",
  fields: (t) => ({
    evm: t.field({
      type: BumicertsLinkEvmPageType,
      description:
        "Paginated list of app.bumicerts.link.evm records. " +
        "Each record includes a `valid` field computed by verifying both " +
        "the user's EIP-712 ownership proof and the platform's counter-signature. " +
        "Use `where: { valid: true }` to fetch only cryptographically valid links.",
      args: {
        cursor: t.arg.string(),
        limit:  t.arg.int(),
        where:  t.arg({ type: EvmLinkWhereInputRef, required: false }),
        sortBy: t.arg({ type: SortFieldEnum }),
        order:  t.arg({ type: SortOrderEnum }),
      },
      resolve: async (_, args) => {
        const { cursor, limit, where, sortBy, order } = args;

        // ── Resolve actor to DID ─────────────────────────────────────────────
        let resolvedDid: string | undefined;
        if (where?.handle) resolvedDid = await resolveActorToDid(where.handle);
        else if (where?.did) resolvedDid = where.did;

        // ── Fetch records ────────────────────────────────────────────────────
        const safeLimit = Math.min(Math.max(limit ?? 50, 1), 100);
        const page = await getRecordsByCollection("app.bumicerts.link.evm", {
          cursor:    cursor ?? undefined,
          limit:     safeLimit,
          did:       resolvedDid,
          rkey:      where?.rkey ?? undefined,
          sortField: (sortBy as "createdAt" | "indexedAt") ?? undefined,
          sortOrder: (order  as "asc" | "desc")            ?? undefined,
        });

        // ── Map (includes per-record signature verification) ─────────────────
        const data = await Promise.all(page.records.map(mapBumicertsLinkEvm));

        // ── Post-fetch: apply valid filter ───────────────────────────────────
        const filtered =
          where?.valid != null
            ? data.filter((item) => item.specialMetadata?.valid === where.valid)
            : data;

        return { data: filtered, pageInfo: toPageInfo(page.cursor, filtered.length) };
      },
    }),
  }),
});

// ── Attach `link` to the generated BumicertsNS ───────────────────────────────
builder.objectFields(BumicertsNS, (t) => ({
  link: t.field({
    type: BumicertsLinkNS,
    description: "BumicertsLinkNamespace namespace.",
    resolve: () => new BumicertsLinkNS(),
  }),
}));
