import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { deleteRecord } from "../../utils/shared";
import { LayerPdsError } from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.organization.layer";

const makePdsError = (message: string, cause: unknown) =>
  new LayerPdsError({ message, cause });

export const deleteLayer = (
  input: DeleteRecordInput
): Effect.Effect<DeleteRecordResult, LayerPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey };
  });

export { LayerPdsError };
