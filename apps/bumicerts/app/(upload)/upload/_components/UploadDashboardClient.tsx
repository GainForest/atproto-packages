"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2Icon } from "lucide-react";
import type { OrganizationData } from "@/lib/types";
import type { AuthenticatedAccountState } from "@/lib/account";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { trpc } from "@/lib/trpc/client";
import { formatError } from "@/lib/utils/trpc-errors";
import { toSerializableFile } from "@gainforest/atproto-mutations-next";
import Container from "@/components/ui/container";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { countries } from "@/lib/countries";
import { OrgHero } from "@/components/account/OrgHero";
import { OrgAbout } from "@/components/account/OrgAbout";
import { EditableHero } from "./EditableHero";
import { EditableAbout } from "./EditableAbout";
import { ManageEditHeaderContent } from "./ManageEditHeaderContent";
import { ManageNavGrid } from "./UploadNavGrid";
import { ManageDashboardSkeleton } from "./UploadDashboardSkeleton";
import {
  buildUploadAccountPageDataFromAccount,
  type UploadAccountPageData,
} from "./uploadAccountPageData";
import {
  isUnchangedEdit,
  UNCHANGED_EDIT,
  useManageDashboardState,
  type EditableFields,
} from "./store";
import { useManageMode } from "../_hooks/useUploadMode";
import { AccountSetupPage } from "./AccountSetupPage";
import {
  hasMeaningfulOrganizationLongDescription,
  organizationLongDescriptionsMatch,
} from "./organizationLongDescription";
import { normalizeLinearDocumentForRecord } from "@/lib/utils/linearDocument";
import { resolveDashboardMode } from "./uploadDashboardMode";

const RECONCILIATION_INVALIDATE_DELAY_MS = 8_000;

type ReconciliationChecks = {
  kind: AuthenticatedAccountState["kind"];
  kindChanged: boolean;
  displayName?: string;
  shortDescription?: string | null;
  website?: `${string}:${string}` | null;
  country?: string;
  startDate?: string | null;
  visibility?: OrganizationData["visibility"];
  longDescription?: OrganizationData["longDescription"];
};

type PendingReconciliation = {
  optimisticAccount: AuthenticatedAccountState;
  optimisticPageData: UploadAccountPageData;
  checks: ReconciliationChecks;
};

interface ManageDashboardClientProps {
  did: string;
  initialAccount: AuthenticatedAccountState;
  initialData: UploadAccountPageData;
}

function buildWebsiteUri(
  value: string | null,
): `${string}:${string}` | undefined {
  if (!value) return undefined;
  return (
    value.startsWith("http") ? value : `https://${value}`
  ) as `${string}:${string}`;
}

function resolveEditValue<T>(
  editValue: T | typeof UNCHANGED_EDIT,
  currentValue: T,
): T {
  return isUnchangedEdit(editValue) ? currentValue : editValue;
}

function buildProfileUpsertData(options: {
  currentProfile: AuthenticatedAccountState["profile"];
  currentOrganization: OrganizationData;
  data: Record<string, unknown>;
  unset: string[];
}): Record<string, unknown> {
  const nextData: Record<string, unknown> = {
    displayName:
      options.currentProfile?.displayName || options.currentOrganization.displayName,
    description:
      options.currentProfile?.description ||
      options.currentOrganization.shortDescription,
    pronouns: options.currentProfile?.pronouns,
    website: options.currentProfile?.website || options.currentOrganization.website,
    ...options.data,
  };

  for (const key of options.unset) {
    delete nextData[key];
  }

  return Object.fromEntries(
    Object.entries(nextData).filter(
      ([, value]) => value !== undefined && value !== null,
    ),
  );
}

function buildNextOrganizationData(options: {
  current: OrganizationData;
  edits: EditableFields;
  nextKind: "user" | "organization";
}): OrganizationData {
  const nextLogoUrl = options.edits.logo
    ? URL.createObjectURL(options.edits.logo)
    : options.current.logoUrl;
  const nextCoverUrl = options.edits.coverImage
    ? URL.createObjectURL(options.edits.coverImage)
    : options.current.coverImageUrl;
  const nextShortDescription = resolveEditValue(
    options.edits.shortDescription,
    options.current.shortDescription,
  );
  const nextCountry = resolveEditValue(
    options.edits.country,
    options.current.country,
  );

  return {
    ...options.current,
    displayName: resolveEditValue(
      options.edits.displayName,
      options.current.displayName,
    ),
    shortDescription: nextShortDescription ?? "",
    shortDescriptionFacets: resolveEditValue(
      options.edits.shortDescriptionFacets,
      options.current.shortDescriptionFacets,
    ),
    longDescription:
      options.nextKind === "organization"
        ? (options.edits.longDescription ?? options.current.longDescription)
        : { blocks: [] },
    logoUrl: nextLogoUrl,
    coverImageUrl: nextCoverUrl,
    country: options.nextKind === "organization" ? (nextCountry ?? "") : "",
    website: resolveEditValue(options.edits.website, options.current.website),
    startDate:
      options.nextKind === "organization"
        ? resolveEditValue(options.edits.startDate, options.current.startDate)
        : null,
    visibility:
      options.nextKind === "organization"
        ? resolveEditValue(options.edits.visibility, options.current.visibility)
        : "Public",
  };
}

function shouldUpgradeUserToOrganization(options: {
  current: OrganizationData;
  edits: {
    country: EditableFields["country"];
    startDate: EditableFields["startDate"];
    longDescription: OrganizationData["longDescription"] | null;
    visibility: EditableFields["visibility"];
  };
}): { shouldUpgrade: boolean; isComplete: boolean } {
  const country = resolveEditValue(
    options.edits.country,
    options.current.country,
  );
  const longDescription =
    options.edits.longDescription ?? options.current.longDescription;
  const visibility = resolveEditValue(
    options.edits.visibility,
    options.current.visibility,
  );
  const startDate = resolveEditValue(
    options.edits.startDate,
    options.current.startDate,
  );

  const touchedOrgFields =
    !isUnchangedEdit(options.edits.country) ||
    !isUnchangedEdit(options.edits.startDate) ||
    options.edits.longDescription !== null ||
    !isUnchangedEdit(options.edits.visibility);

  const isComplete =
    typeof country === "string" &&
    country.length === 2 &&
    country in countries &&
    hasMeaningfulOrganizationLongDescription(longDescription) &&
    (visibility === "Public" ||
      visibility === "Unlisted" ||
      visibility === null) &&
    (startDate === null || startDate.length > 0);

  return {
    shouldUpgrade: touchedOrgFields,
    isComplete,
  };
}

function buildSaveReconciliationChecks(options: {
  currentAccount: AuthenticatedAccountState;
  currentOrganization: OrganizationData | null;
  edits: EditableFields;
  nextAccount: AuthenticatedAccountState;
  nextOrganization: OrganizationData;
}): ReconciliationChecks {
  const checks: ReconciliationChecks = {
    kind: options.nextAccount.kind,
    kindChanged: options.currentAccount.kind !== options.nextAccount.kind,
  };

  if (!isUnchangedEdit(options.edits.displayName)) {
    checks.displayName = options.edits.displayName;
  }

  if (!isUnchangedEdit(options.edits.shortDescription)) {
    checks.shortDescription =
      options.edits.shortDescription === null ||
      options.edits.shortDescription.trim().length === 0
        ? null
        : options.edits.shortDescription;
  }

  if (!isUnchangedEdit(options.edits.website)) {
    checks.website =
      options.edits.website === null ||
      options.edits.website.trim().length === 0
        ? null
        : (buildWebsiteUri(options.edits.website) ?? null);
  }

  if (
    options.nextAccount.kind === "organization" &&
    (options.currentAccount.kind !== "organization" ||
      !isUnchangedEdit(options.edits.country))
  ) {
    checks.country = options.nextOrganization.country;
  }

  if (
    options.nextAccount.kind === "organization" &&
    (options.currentAccount.kind !== "organization" ||
      !isUnchangedEdit(options.edits.startDate))
  ) {
    checks.startDate = options.nextOrganization.startDate;
  }

  if (
    options.nextAccount.kind === "organization" &&
    (options.currentAccount.kind !== "organization" ||
      !isUnchangedEdit(options.edits.visibility))
  ) {
    checks.visibility = options.nextOrganization.visibility;
  }

  if (
    options.nextAccount.kind === "organization" &&
    options.edits.longDescription !== null
  ) {
    checks.longDescription = options.nextOrganization.longDescription;
  }

  return checks;
}

function buildSetupReconciliationChecks(options: {
  nextAccount: AuthenticatedAccountState;
  nextOrganization: OrganizationData;
}): ReconciliationChecks {
  const checks: ReconciliationChecks = {
    kind: options.nextAccount.kind,
    kindChanged: true,
    displayName: options.nextOrganization.displayName,
    shortDescription: options.nextOrganization.shortDescription || null,
    website: buildWebsiteUri(options.nextOrganization.website) ?? null,
  };

  if (options.nextAccount.kind === "organization") {
    checks.country = options.nextOrganization.country;
    checks.startDate = options.nextOrganization.startDate;
    checks.visibility = options.nextOrganization.visibility;
    checks.longDescription = options.nextOrganization.longDescription;
  }

  return checks;
}

function hasQueryCaughtUp(
  account: AuthenticatedAccountState,
  checks: ReconciliationChecks,
): boolean {
  if (account.kind !== checks.kind) {
    return false;
  }

  let matchedObservableChange = checks.kindChanged;

  if (checks.displayName !== undefined) {
    if (account.kind === "unknown") return false;
    if ((account.profile.displayName ?? "") !== checks.displayName) {
      return false;
    }
    matchedObservableChange = true;
  }

  if (checks.shortDescription !== undefined) {
    if (account.kind === "unknown") return false;
    if ((account.profile.description ?? null) !== checks.shortDescription) {
      return false;
    }
    matchedObservableChange = true;
  }

  if (checks.website !== undefined) {
    if (account.kind === "unknown") return false;
    if ((account.profile.website ?? null) !== checks.website) {
      return false;
    }
    matchedObservableChange = true;
  }

  if (checks.country !== undefined) {
    if (account.kind !== "organization") return false;
    if (
      buildUploadAccountPageDataFromAccount(account).organization?.country !==
      checks.country
    ) {
      return false;
    }
    matchedObservableChange = true;
  }

  if (checks.startDate !== undefined) {
    if (account.kind !== "organization") return false;
    if ((account.organization.foundedDate ?? null) !== checks.startDate) {
      return false;
    }
    matchedObservableChange = true;
  }

  if (checks.visibility !== undefined) {
    if (account.kind !== "organization") return false;
    if (
      buildUploadAccountPageDataFromAccount(account).organization
        ?.visibility !== checks.visibility
    ) {
      return false;
    }
    matchedObservableChange = true;
  }

  if (checks.longDescription !== undefined) {
    if (account.kind !== "organization") return false;
    const nextLongDescription =
      buildUploadAccountPageDataFromAccount(account).organization
        ?.longDescription;
    if (
      !nextLongDescription ||
      !organizationLongDescriptionsMatch(
        nextLongDescription,
        checks.longDescription,
      )
    ) {
      return false;
    }
    matchedObservableChange = true;
  }

  return matchedObservableChange;
}

function hasReconciliationWork(checks: ReconciliationChecks): boolean {
  return (
    checks.kindChanged ||
    checks.displayName !== undefined ||
    checks.shortDescription !== undefined ||
    checks.website !== undefined ||
    checks.country !== undefined ||
    checks.startDate !== undefined ||
    checks.visibility !== undefined ||
    checks.longDescription !== undefined
  );
}

function isPendingReconciliationActive(options: {
  authoritativeAccount: AuthenticatedAccountState;
  pendingReconciliation: PendingReconciliation | null;
}): boolean {
  return (
    options.pendingReconciliation !== null &&
    !hasQueryCaughtUp(
      options.authoritativeAccount,
      options.pendingReconciliation.checks,
    )
  );
}

function mergeRefetchedPageData(options: {
  currentPageData: UploadAccountPageData;
  nextAccount: AuthenticatedAccountState;
  checks?: ReconciliationChecks;
}): UploadAccountPageData {
  const nextPageData = buildUploadAccountPageDataFromAccount(
    options.nextAccount,
  );
  const currentOrganization = options.currentPageData.organization;
  const nextOrganization = nextPageData.organization;

  if (!currentOrganization || !nextOrganization) {
    return nextPageData;
  }

  const shouldPreserveLogo =
    currentOrganization.logoUrl?.startsWith("blob:") &&
    nextOrganization.logoUrl === null;
  const shouldPreserveCoverImage =
    currentOrganization.coverImageUrl?.startsWith("blob:") &&
    nextOrganization.coverImageUrl === null;
  const shouldPreserveVisibility = options.checks?.visibility !== undefined;
  const shouldPreserveLongDescription =
    options.checks?.longDescription !== undefined;

  if (
    !shouldPreserveLogo &&
    !shouldPreserveCoverImage &&
    !shouldPreserveVisibility &&
    !shouldPreserveLongDescription
  ) {
    return nextPageData;
  }

  return {
    ...nextPageData,
    organization: {
      ...nextOrganization,
      logoUrl: shouldPreserveLogo
        ? currentOrganization.logoUrl
        : nextOrganization.logoUrl,
      coverImageUrl: shouldPreserveCoverImage
        ? currentOrganization.coverImageUrl
        : nextOrganization.coverImageUrl,
      visibility: shouldPreserveVisibility
        ? currentOrganization.visibility
        : nextOrganization.visibility,
      longDescription: shouldPreserveLongDescription
        ? currentOrganization.longDescription
        : nextOrganization.longDescription,
    },
  };
}

function RegisterOrganizationButton() {
  const t = useTranslations("upload.actions");

  return (
    <Button asChild variant="secondary">
      <Link href={links.manage.onboardOrganization}>
        <Building2Icon />
        {t("registerOrganization")}
      </Link>
    </Button>
  );
}

export function ManageDashboardClient({
  did,
  initialAccount,
  initialData,
}: ManageDashboardClientProps) {
  const tDashboard = useTranslations("upload.dashboard");
  const indexerUtils = indexerTrpc.useUtils();
  const [mode, setMode] = useManageMode();
  const [pendingReconciliation, setPendingReconciliation] =
    useState<PendingReconciliation | null>(null);
  const currentAccountQuery = indexerTrpc.account.byDid.useQuery(
    { did },
    {
      initialData: initialAccount,
      refetchOnMount: "always",
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  );

  const edits = useManageDashboardState((state) => state.edits);
  const hasChanges = useManageDashboardState((state) => state.hasChanges);
  const isSaving = useManageDashboardState((state) => state.isSaving);
  const setSaving = useManageDashboardState((state) => state.setSaving);
  const setSaveError = useManageDashboardState((state) => state.setSaveError);
  const onSaveSuccess = useManageDashboardState((state) => state.onSaveSuccess);

  const upsertProfile = trpc.certified.actor.profile.upsert.useMutation();
  const updateOrganization =
    trpc.certified.actor.organization.update.useMutation();
  const upsertOrganization =
    trpc.certified.actor.organization.upsert.useMutation();
  const updateProfileAndOrganization =
    trpc.certified.actor.profileAndOrganizationSave.useMutation();

  const authoritativeAccount = currentAccountQuery.data ?? initialAccount;
  const resolvedMode = resolveDashboardMode({
    currentKind: authoritativeAccount.kind,
    mode,
  });
  const isEditing = resolvedMode === "edit";
  const isOrganizationOnboardingMode = resolvedMode === "onboard-org";
  const hasBufferedChanges = hasChanges();
  const reconciliationActive = isPendingReconciliationActive({
    authoritativeAccount,
    pendingReconciliation,
  });
  const optimisticSnapshot = reconciliationActive
    ? pendingReconciliation
    : null;
  const currentAccount = optimisticSnapshot
    ? optimisticSnapshot.optimisticAccount
    : authoritativeAccount;
  const currentKind = currentAccount.kind;
  const pageData = optimisticSnapshot
    ? optimisticSnapshot.optimisticPageData
    : mergeRefetchedPageData({
        currentPageData:
          pendingReconciliation?.optimisticPageData ?? initialData,
        nextAccount: authoritativeAccount,
      });

  const currentOrganization = pageData.organization;
  const canEditOrganizationFields = currentKind === "organization";

  useEffect(() => {
    if (!reconciliationActive || isEditing || hasBufferedChanges) {
      return;
    }

    const invalidateTimer = window.setInterval(() => {
      void indexerUtils.account.current.invalidate();
      void indexerUtils.account.byDid.invalidate({ did });
    }, RECONCILIATION_INVALIDATE_DELAY_MS);

    return () => {
      window.clearInterval(invalidateTimer);
    };
  }, [
    did,
    hasBufferedChanges,
    indexerUtils,
    isEditing,
    reconciliationActive,
  ]);

  const startReconciliation = useCallback(
    (options: {
      nextAccount: AuthenticatedAccountState;
      nextPageData: UploadAccountPageData;
      checks: ReconciliationChecks;
    }) => {
      if (!hasReconciliationWork(options.checks)) {
        setPendingReconciliation(null);
        return;
      }

      setPendingReconciliation({
        optimisticAccount: options.nextAccount,
        optimisticPageData: options.nextPageData,
        checks: options.checks,
      });
    },
    [],
  );

  async function handleSetupCompleted(
    nextAccount: AuthenticatedAccountState,
    nextOrganization: OrganizationData,
  ) {
    await Promise.all([
      indexerUtils.account.current.cancel(),
      indexerUtils.account.byDid.cancel({ did }),
    ]);
    indexerUtils.account.current.setData(undefined, nextAccount);
    indexerUtils.account.byDid.setData({ did }, nextAccount);
    startReconciliation({
      nextAccount,
      nextPageData: {
        did,
        kind: nextAccount.kind,
        organization: nextOrganization,
      },
      checks: buildSetupReconciliationChecks({
        nextAccount,
        nextOrganization,
      }),
    });
    setMode(null);
  }

  async function handleSave() {
    if (!currentOrganization || !hasChanges() || isSaving) return;

    setSaving(true);
    setSaveError(null);

    try {
      if (currentAccount.kind === "unknown") {
        throw new Error(tDashboard("accountNotReady"));
      }

      let pendingUpgrade: {
        country: { uri: string; cid: string };
        longDescription: OrganizationData["longDescription"];
        startDate: string | null;
        visibility: OrganizationData["visibility"];
      } | null = null;
      let nextProfile = currentAccount.profile;

      if (currentKind === "user") {
        const { shouldUpgrade, isComplete } = shouldUpgradeUserToOrganization({
          current: currentOrganization,
          edits: {
            country: edits.country,
            startDate: edits.startDate,
            longDescription: edits.longDescription,
            visibility: edits.visibility,
          },
        });

        if (shouldUpgrade) {
          if (!isComplete) {
            throw new Error(tDashboard("registerIncomplete"));
          }

          const nextCountryCode = resolveEditValue(
            edits.country,
            currentOrganization.country,
          );
          const nextCountry = nextCountryCode
            ? countries[nextCountryCode]
            : null;
          if (!nextCountry) {
            throw new Error(tDashboard("countryRequired"));
          }

          pendingUpgrade = {
            country: { uri: nextCountry.uri, cid: nextCountry.cid },
            longDescription:
              edits.longDescription ?? currentOrganization.longDescription,
            startDate: resolveEditValue(
              edits.startDate,
              currentOrganization.startDate,
            ),
            visibility: resolveEditValue(
              edits.visibility,
              currentOrganization.visibility,
            ),
          };
        }
      }

      const profileData: Record<string, unknown> = {};
      const profileUnset: string[] = [];

      if (!isUnchangedEdit(edits.displayName)) {
        profileData.displayName = edits.displayName;
      }

      if (!isUnchangedEdit(edits.shortDescription)) {
        if (
          edits.shortDescription === null ||
          edits.shortDescription.trim().length === 0
        ) {
          profileUnset.push("description");
        } else {
          profileData.description = edits.shortDescription;
        }
      }

      if (!isUnchangedEdit(edits.website)) {
        if (edits.website === null || edits.website.trim().length === 0) {
          profileUnset.push("website");
        } else {
          profileData.website = buildWebsiteUri(edits.website);
        }
      }

      if (edits.logo !== null) {
        profileData.avatar = {
          $type: "org.hypercerts.defs#smallImage",
          image: await toSerializableFile(edits.logo),
        };
      }

      if (edits.coverImage !== null) {
        profileData.banner = {
          $type: "org.hypercerts.defs#largeImage",
          image: await toSerializableFile(edits.coverImage),
        };
      }

      const hasProfileChanges =
        Object.keys(profileData).length > 0 || profileUnset.length > 0;

      const organizationData: Record<string, unknown> = {};
      const organizationUnset: string[] = [];

      if (currentKind === "organization") {
        if (!isUnchangedEdit(edits.country)) {
          const selectedCountry = edits.country
            ? countries[edits.country]
            : null;
          if (selectedCountry) {
            organizationData.location = {
              uri: selectedCountry.uri,
              cid: selectedCountry.cid,
            };
          } else {
            organizationUnset.push("location");
          }
        }

        if (!isUnchangedEdit(edits.startDate)) {
          if (edits.startDate) {
            organizationData.foundedDate = `${edits.startDate}T00:00:00.000Z`;
          } else {
            organizationUnset.push("foundedDate");
          }
        }

        if (edits.longDescription !== null) {
          organizationData.longDescription = normalizeLinearDocumentForRecord(
            edits.longDescription,
          );
        }

        if (!isUnchangedEdit(edits.visibility)) {
          organizationData.visibility =
            edits.visibility === "Unlisted" ? "unlisted" : "public";
        }
      }

      const hasOrganizationChanges =
        Object.keys(organizationData).length > 0 ||
        organizationUnset.length > 0;

      const hasMixedRecordChanges =
        hasProfileChanges &&
        (hasOrganizationChanges || pendingUpgrade !== null);

      let nextAccount: AuthenticatedAccountState;

      if (
        currentKind === "organization" &&
        currentAccount.kind === "organization"
      ) {
        nextAccount = {
          kind: "organization",
          did,
          profile: nextProfile,
          organization: currentAccount.organization,
        };
      } else {
        nextAccount = {
          kind: "user",
          did,
          profile: nextProfile,
          organization: null,
        };
      }

      if (pendingUpgrade && hasProfileChanges) {
        const combinedResult = await updateProfileAndOrganization.mutateAsync({
          profile: {
            data: profileData,
            ...(profileUnset.length > 0 ? { unset: profileUnset } : {}),
          },
          organization: {
            operation: "upsert",
            record: {
              location: pendingUpgrade.country,
              ...(pendingUpgrade.startDate
                ? { foundedDate: `${pendingUpgrade.startDate}T00:00:00.000Z` }
                : {}),
              longDescription: normalizeLinearDocumentForRecord(
                pendingUpgrade.longDescription,
              ),
              visibility:
                pendingUpgrade.visibility === "Unlisted"
                  ? "unlisted"
                  : "public",
            },
          },
        });
        nextProfile = combinedResult.profile;
        nextAccount = {
          kind: "organization",
          did,
          profile: combinedResult.profile,
          organization: combinedResult.organization,
        };
      } else if (currentKind === "organization" && hasMixedRecordChanges) {
        const combinedResult = await updateProfileAndOrganization.mutateAsync({
          profile: {
            data: profileData,
            ...(profileUnset.length > 0 ? { unset: profileUnset } : {}),
          },
          organization: {
            operation: "update",
            data: organizationData,
            ...(organizationUnset.length > 0
              ? { unset: organizationUnset }
              : {}),
          },
        });
        nextProfile = combinedResult.profile;
        nextAccount = {
          kind: "organization",
          did,
          profile: combinedResult.profile,
          organization: combinedResult.organization,
        };
      } else if (currentKind === "organization" && hasOrganizationChanges) {
        const organizationResult = await updateOrganization.mutateAsync({
          data: organizationData,
          ...(organizationUnset.length > 0 ? { unset: organizationUnset } : {}),
        });

        nextAccount = {
          kind: "organization",
          did,
          profile: nextProfile,
          organization: organizationResult.record,
        };
      } else if (hasProfileChanges) {
        const profileResult = await upsertProfile.mutateAsync(
          buildProfileUpsertData({
            currentProfile: currentAccount.profile,
            currentOrganization,
            data: profileData,
            unset: profileUnset,
          }),
        );
        nextProfile = profileResult.record;

        nextAccount =
          currentKind === "organization" &&
          currentAccount.kind === "organization"
            ? {
                kind: "organization",
                did,
                profile: profileResult.record,
                organization: currentAccount.organization,
              }
            : {
                kind: "user",
                did,
                profile: profileResult.record,
                organization: null,
              };
      }

      if (pendingUpgrade && !hasProfileChanges) {
        const organizationResult = await upsertOrganization.mutateAsync({
          location: pendingUpgrade.country,
          foundedDate: pendingUpgrade.startDate
            ? `${pendingUpgrade.startDate}T00:00:00.000Z`
            : undefined,
          longDescription: normalizeLinearDocumentForRecord(
            pendingUpgrade.longDescription,
          ),
          visibility:
            pendingUpgrade.visibility === "Unlisted" ? "unlisted" : "public",
        });

        nextAccount = {
          kind: "organization",
          did,
          profile: nextProfile,
          organization: organizationResult.record,
        };
      }

      const nextKind =
        nextAccount.kind === "organization" ? "organization" : "user";
      const nextOrganizationData = buildNextOrganizationData({
        current: currentOrganization,
        edits,
        nextKind,
      });

      await Promise.all([
        indexerUtils.account.current.cancel(),
        indexerUtils.account.byDid.cancel({ did }),
      ]);
      indexerUtils.account.current.setData(undefined, nextAccount);
      indexerUtils.account.byDid.setData({ did }, nextAccount);
      startReconciliation({
        nextAccount,
        nextPageData: {
          did,
          kind: nextAccount.kind,
          organization: nextOrganizationData,
        },
        checks: buildSaveReconciliationChecks({
          currentAccount,
          currentOrganization,
          edits,
          nextAccount,
          nextOrganization: nextOrganizationData,
        }),
      });

      setMode(null);
      onSaveSuccess();
    } catch (error) {
      setSaving(false);
      setSaveError(formatError(error));
    }
  }

  if (currentAccountQuery.isLoading && pageData.kind === "unknown") {
    return <ManageDashboardSkeleton />;
  }

  if (
    currentKind === "unknown" ||
    !currentOrganization ||
    (currentKind === "user" && isOrganizationOnboardingMode)
  ) {
    return (
      <Container className="pt-4">
        <AccountSetupPage did={did} onCompleted={handleSetupCompleted} />
      </Container>
    );
  }

  if (isEditing) {
    return (
      <form
        id="manage-dashboard-save-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <ManageEditHeaderContent
          right={
            currentKind === "user" ? <RegisterOrganizationButton /> : undefined
          }
        />
        <Container className="pt-4 pb-8 space-y-2">
          <EditableHero
            organization={currentOrganization}
            enableOrganizationFields={canEditOrganizationFields}
          />

          <EditableAbout
            organization={currentOrganization}
            enabled={canEditOrganizationFields}
          />
        </Container>
      </form>
    );
  }

  return (
    <>
      {currentKind === "user" && (
        <HeaderContent right={<RegisterOrganizationButton />} />
      )}
      <Container className="pt-4 pb-8 space-y-2">
        <OrgHero organization={currentOrganization} showEditButton />
        <OrgAbout organization={currentOrganization} />
        <ManageNavGrid accountKind={currentKind} />
      </Container>
    </>
  );
}
