import type { Main as DwcEventRecord } from "@gainforest/generated/app/gainforest/dwc/event.defs";
import type {
  DeleteRecordInput,
  DeleteRecordResult,
  RecordMutationResult,
} from "../../../utils/shared/types";

export type { DwcEventRecord };

export type DwcEventMutationResult = RecordMutationResult<DwcEventRecord>;

type CreateDwcEventData = Omit<DwcEventRecord, "$type" | "createdAt">;

export type CreateDwcEventInput = CreateDwcEventData & {
  rkey?: string;
};

export type UpdateDwcEventData = Partial<CreateDwcEventData>;

export type UpdateDwcEventInput = {
  rkey: string;
  data: UpdateDwcEventData;
  unset?: ReadonlyArray<keyof UpdateDwcEventData>;
};

export type { DeleteRecordInput, DeleteRecordResult };
