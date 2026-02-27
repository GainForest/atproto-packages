import type { Main as DefaultSiteRecord } from "@gainforest/generated/app/gainforest/organization/defaultSite.defs";
import type { SingletonMutationResult } from "../../../utils/shared/types";

export type { DefaultSiteRecord };

/** Returned by setDefaultSite. */
export type DefaultSiteMutationResult = SingletonMutationResult<DefaultSiteRecord>;

export type SetDefaultSiteInput = {
  /**
   * Full AT-URI of the certified.location record to set as the default site.
   * Must be in the format `at://{did}/app.certified.location/{rkey}`.
   * The DID in the URI must match the authenticated user's DID — the location
   * must exist in the user's own PDS.
   */
  locationUri: string;
};
