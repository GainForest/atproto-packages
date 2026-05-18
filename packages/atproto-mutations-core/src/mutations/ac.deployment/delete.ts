import { deleteRecord } from "../../utils/shared";
import { AcDeploymentPdsError } from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.ac.deployment";

const makePdsError = (message: string, cause: unknown) =>
  new AcDeploymentPdsError({ message, cause });

export const deleteAcDeployment = (input: DeleteRecordInput) =>
  deleteRecord(COLLECTION, input.rkey, makePdsError);

export type { DeleteRecordResult };
export { AcDeploymentPdsError };
