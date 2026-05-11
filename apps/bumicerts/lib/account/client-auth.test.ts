import { describe, expect, test } from "bun:test";
import type { AccountSummary, UserAccountState } from "@/lib/account";
import type { AtprotoAuthCatalog } from "@/components/stores/atproto";
import {
  resolveValidatedUserMenuAccount,
  shouldHideUnknownAccountSetupChoice,
  shouldOpenUnknownAccountSetupChoice,
  shouldShowUserMenuSkeleton,
  UNAUTHENTICATED_ACCOUNT_SUMMARY,
} from "./client-auth";

type AuthState = AtprotoAuthCatalog[keyof AtprotoAuthCatalog];

const authenticatedAuth: AuthState = {
  status: "AUTHENTICATED",
  authenticated: true,
  user: {
    did: "did:plc:alice",
    handle: "alice.example.com",
  },
};

const resumingAuth: AuthState = {
  status: "RESUMING",
  authenticated: false,
  user: null,
};

const unauthenticatedAuth: AuthState = {
  status: "UNAUTHENTICATED",
  authenticated: false,
  user: null,
};

const unknownAccount: AccountSummary = {
  kind: "unknown",
  did: "did:plc:alice",
  profile: null,
  organization: null,
};

const onboardedUserAccount: UserAccountState = {
  kind: "user",
  did: "did:plc:alice",
  profile: {
    $type: "app.certified.actor.profile",
    displayName: "Alice",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  organization: null,
};

describe("resolveValidatedUserMenuAccount", () => {
  test("keeps the menu in skeleton state while validated auth is still resuming", () => {
    expect(shouldShowUserMenuSkeleton(resumingAuth)).toBe(true);
    expect(
      resolveValidatedUserMenuAccount({
        auth: resumingAuth,
        account: unknownAccount,
      }),
    ).toBeNull();
  });

  test("ignores stale account data after validated auth resolves unauthenticated", () => {
    expect(
      resolveValidatedUserMenuAccount({
        auth: unauthenticatedAuth,
        account: unknownAccount,
      }),
    ).toBeNull();
  });

  test("reuses the validated account query result when the user is signed in", () => {
    expect(
      resolveValidatedUserMenuAccount({
        auth: authenticatedAuth,
        account: onboardedUserAccount,
      }),
    ).toEqual(onboardedUserAccount);
  });

  test("falls back to an authenticated unknown account when the ambient query has not caught up", () => {
    expect(
      resolveValidatedUserMenuAccount({
        auth: authenticatedAuth,
        account: UNAUTHENTICATED_ACCOUNT_SUMMARY,
      }),
    ).toEqual({
      kind: "unknown",
      did: "did:plc:alice",
      profile: null,
      organization: null,
    });
  });
});

describe("unknown account setup choice gating", () => {
  test("waits for validated auth before opening the onboarding choice modal", () => {
    expect(
      shouldOpenUnknownAccountSetupChoice({
        auth: resumingAuth,
        account: unknownAccount,
        isAccountResolved: true,
        isModalSystemReady: true,
        hasSeenChoiceInSession: false,
        isAccountSetupChoiceModalActive: false,
      }),
    ).toBe(false);
  });

  test("opens only for the validated unknown account owner", () => {
    expect(
      shouldOpenUnknownAccountSetupChoice({
        auth: authenticatedAuth,
        account: unknownAccount,
        isAccountResolved: true,
        isModalSystemReady: true,
        hasSeenChoiceInSession: false,
        isAccountSetupChoiceModalActive: false,
      }),
    ).toBe(true);

    expect(
      shouldOpenUnknownAccountSetupChoice({
        auth: authenticatedAuth,
        account: {
          ...unknownAccount,
          did: "did:plc:bob",
        },
        isAccountResolved: true,
        isModalSystemReady: true,
        hasSeenChoiceInSession: false,
        isAccountSetupChoiceModalActive: false,
      }),
    ).toBe(false);
  });

  test("hides an open onboarding choice modal once validated auth resolves unauthenticated", () => {
    expect(
      shouldHideUnknownAccountSetupChoice({
        auth: unauthenticatedAuth,
        account: unknownAccount,
        isAccountSetupChoiceModalActive: true,
      }),
    ).toBe(true);
  });
});
