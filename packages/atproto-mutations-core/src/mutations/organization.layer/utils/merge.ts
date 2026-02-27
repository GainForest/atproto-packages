import { applyPatch } from "../../../utils/shared/patch";

const REQUIRED_FIELDS = new Set<string>(["name", "type", "uri", "createdAt"]);

/**
 * Merge a patch into an existing layer record.
 * Required fields (name, type, uri, createdAt) are never unset even if listed in `unset`.
 */
export const applyLayerPatch = (
  existing: object,
  data: object,
  unset?: string[]
): Record<string, unknown> =>
  applyPatch(existing, data, unset, REQUIRED_FIELDS) as Record<string, unknown>;
