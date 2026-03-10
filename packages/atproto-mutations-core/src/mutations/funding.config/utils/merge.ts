import { applyPatch as genericApplyPatch } from "../../../utils/shared/patch";

// receivingWallet is the only required field in the funding.config record
const REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  "receivingWallet",
]);

export const applyPatch = <T extends object>(
  existing: T,
  data: Partial<T>,
  unset?: readonly string[]
): T => genericApplyPatch(existing, data, unset, REQUIRED_FIELDS);
