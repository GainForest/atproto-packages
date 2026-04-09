import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { deleteRecord, fetchRecord } from "../../utils/shared";
import { $parse } from "@gainforest/generated/app/gainforest/dwc/dataset.defs";
import {
  DwcDatasetNotFoundError,
  DwcDatasetPdsError,
} from "./utils/errors";
import type { DwcDatasetRecord } from "./utils/types";

const COLLECTION = "app.gainforest.dwc.dataset";

const makePdsError = (message: string, cause: unknown) =>
  new DwcDatasetPdsError({ message, cause });

export const deleteDwcDataset = (input: {
  rkey: string;
}): Effect.Effect<
  void,
  DwcDatasetNotFoundError | DwcDatasetPdsError,
  AtprotoAgent
> =>
  Effect.gen(function* () {
    const { rkey } = input;

    const existing = yield* fetchRecord(
      COLLECTION,
      rkey,
      $parse,
      makePdsError
    );

    if (existing === null) {
      return yield* Effect.fail(new DwcDatasetNotFoundError({ rkey }));
    }

    yield* deleteRecord(COLLECTION, rkey, makePdsError);
  });

export { DwcDatasetNotFoundError, DwcDatasetPdsError };
