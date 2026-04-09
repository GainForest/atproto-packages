import { Effect } from "effect";
import { fetchRecord, deleteRecord } from "../../utils/shared";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { $parse as parseDefaultSite } from "@gainforest/generated/app/gainforest/organization/defaultSite.defs";
import type { CertifiedLocationRecord } from "./utils/types";
import {
  CertifiedLocationNotFoundError,
  CertifiedLocationPdsError,
  CertifiedLocationIsDefaultError,
} from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.certified.location";
const DEFAULT_SITE_COLLECTION = "app.gainforest.organization.defaultSite";

const makePdsError = (message: string, cause: unknown) =>
  new CertifiedLocationPdsError({ message, cause });

/**
 * Delete a certified.location record.
 *
 * Pre-checks that the location is not currently set as the user's
 * `organization.defaultSite`. If it is, fails with `CertifiedLocationIsDefaultError`
 * so the caller can set a different default first.
 */
export const deleteCertifiedLocation = (
  input: DeleteRecordInput
): Effect.Effect<
  DeleteRecordResult,
  CertifiedLocationPdsError | CertifiedLocationIsDefaultError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;

    // 1. Build the full AT-URI for this location so we can compare against defaultSite.
    const locationUri = `at://${repo}/${COLLECTION}/${rkey}`;

    // 2. Check whether this location is currently set as the default site.
    const defaultSite = yield* fetchRecord(
      DEFAULT_SITE_COLLECTION, "self", parseDefaultSite, makePdsError
    );

    if (defaultSite?.site === locationUri) {
      return yield* Effect.fail(
        new CertifiedLocationIsDefaultError({ uri: locationUri })
      );
    }

    // 3. Delete the record.
    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri: locationUri, rkey };
  });

export {
  CertifiedLocationPdsError,
  CertifiedLocationIsDefaultError,
};
