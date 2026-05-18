import { deleteRecord } from "../../utils/shared";
import { DwcEventPdsError } from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.dwc.event";

const makePdsError = (message: string, cause: unknown) =>
  new DwcEventPdsError({ message, cause });

export const deleteDwcEvent = (input: DeleteRecordInput) =>
  deleteRecord(COLLECTION, input.rkey, makePdsError);

export type { DeleteRecordResult };
export { DwcEventPdsError };
