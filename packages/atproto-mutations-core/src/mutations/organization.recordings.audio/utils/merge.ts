import { applyPatch } from "../../../utils/shared/patch";

const REQUIRED_FIELDS = new Set<string>(["name", "blob", "metadata", "createdAt"]);

/**
 * Merge a patch into an existing audio recording record.
 * Required fields (name, blob, metadata, createdAt) are never unset.
 */
export const applyAudioRecordingPatch = (
  existing: object,
  data: object,
  unset?: string[]
): Record<string, unknown> =>
  applyPatch(existing, data, unset, REQUIRED_FIELDS) as Record<string, unknown>;
