import type { AccountSummary, AuthenticatedAccountState, UnauthenticatedAccountState } from "@/lib/account";
import type { AtprotoAuthCatalog } from "@/components/stores/atproto";

type ValidatedAuthState = AtprotoAuthCatalog[keyof AtprotoAuthCatalog];

export const UNAUTHENTICATED_ACCOUNT_SUMMARY = {
  kind: "unauthenticated",
  did: null,
  profile: null,
  organization: null,
} satisfies UnauthenticatedAccountState;

function isValidatedAuthenticated(
  auth: ValidatedAuthState,
): auth is AtprotoAuthCatalog["authenticated"] {
  return auth.status === "AUTHENTICATED";
}

function isAccountSummary(value: AccountSummary | undefined): value is AccountSummary {
  return (
    value !== undefined &&
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value.kind === "unauthenticated" ||
      value.kind === "unknown" ||
      value.kind === "user" ||
      value.kind === "organization")
  );
}

export function shouldShowUserMenuSkeleton(auth: ValidatedAuthState): boolean {
  return auth.status === "RESUMING";
}

export function resolveValidatedUserMenuAccount(options: {
  auth: ValidatedAuthState;
  account: AccountSummary | undefined;
}): AuthenticatedAccountState | null {
  if (!isValidatedAuthenticated(options.auth)) {
    return null;
  }

  if (isAccountSummary(options.account) && options.account.kind !== "unauthenticated") {
    return options.account;
  }

  return {
    kind: "unknown",
    did: options.auth.user.did,
    profile: null,
    organization: null,
  };
}

export function shouldOpenUnknownAccountSetupChoice(options: {
  auth: ValidatedAuthState;
  account: AccountSummary | undefined;
  isAccountResolved: boolean;
  isModalSystemReady: boolean;
  hasSeenChoiceInSession: boolean;
  isAccountSetupChoiceModalActive: boolean;
}): options is {
  auth: AtprotoAuthCatalog["authenticated"];
  account: Extract<AccountSummary, { kind: "unknown" }>;
  isAccountResolved: true;
  isModalSystemReady: true;
  hasSeenChoiceInSession: false;
  isAccountSetupChoiceModalActive: false;
} {
  if (!isValidatedAuthenticated(options.auth)) {
    return false;
  }

  if (!options.isAccountResolved || !options.isModalSystemReady) {
    return false;
  }

  if (options.account?.kind !== "unknown") {
    return false;
  }

  if (options.account.did !== options.auth.user.did) {
    return false;
  }

  return !options.hasSeenChoiceInSession && !options.isAccountSetupChoiceModalActive;
}

export function shouldHideUnknownAccountSetupChoice(options: {
  auth: ValidatedAuthState;
  account: AccountSummary | undefined;
  isAccountSetupChoiceModalActive: boolean;
}): boolean {
  if (!options.isAccountSetupChoiceModalActive) {
    return false;
  }

  if (!isValidatedAuthenticated(options.auth)) {
    return true;
  }

  if (!options.account) {
    return false;
  }

  if (options.account.kind !== "unknown") {
    return true;
  }

  return options.account.did !== options.auth.user.did;
}
