import type { Main as AcDeploymentRecord } from "@gainforest/generated/app/gainforest/ac/deployment.defs";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  RecordMutationResult,
} from "../../../utils/shared/types";

export type { AcDeploymentRecord };

export type AcDeploymentMutationResult = RecordMutationResult<AcDeploymentRecord>;

type CreateAcDeploymentData = Omit<AcDeploymentRecord, "$type" | "createdAt">;

export type CreateAcDeploymentInput = CreateAcDeploymentData & {
  rkey?: string;
};

export type UpdateAcDeploymentData = Partial<CreateAcDeploymentData>;

export type UpdateAcDeploymentInput = {
  rkey: string;
  data: UpdateAcDeploymentData;
  unset?: ReadonlyArray<keyof UpdateAcDeploymentData>;
};

export type { DeleteRecordInput, DeleteRecordResult };
