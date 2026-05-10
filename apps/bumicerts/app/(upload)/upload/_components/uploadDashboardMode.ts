import type { AuthenticatedAccountState } from "@/lib/account";
import type { ManageMode } from "../_hooks/useUploadMode";

export function resolveDashboardMode(options: {
  currentKind: AuthenticatedAccountState["kind"];
  mode: ManageMode | null;
}): ManageMode | null {
  if (options.currentKind === "unknown" && options.mode === "edit") {
    return null;
  }

  if (options.currentKind === "user" && options.mode === "onboard-user") {
    return null;
  }

  if (
    options.currentKind === "organization" &&
    (options.mode === "onboard-user" || options.mode === "onboard-org")
  ) {
    return null;
  }

  return options.mode;
}
