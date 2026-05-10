import type { AuthenticatedAccountState } from "@/lib/account";

export const MANAGE_MODE_VALUES = ["edit", "onboard-user", "onboard-org"] as const;
export type ManageMode = (typeof MANAGE_MODE_VALUES)[number];

export function parseManageMode(
  value: string | string[] | undefined,
): ManageMode | null {
  switch (value) {
    case "edit":
    case "onboard-user":
    case "onboard-org":
      return value;
    default:
      return null;
  }
}

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

export function shouldClearDashboardMode(options: {
  currentKind: AuthenticatedAccountState["kind"];
  rawMode: string | string[] | undefined;
}): boolean {
  if (options.rawMode === undefined) {
    return false;
  }

  const parsedMode = parseManageMode(options.rawMode);

  if (parsedMode === null) {
    return true;
  }

  return (
    resolveDashboardMode({
      currentKind: options.currentKind,
      mode: parsedMode,
    }) === null
  );
}
