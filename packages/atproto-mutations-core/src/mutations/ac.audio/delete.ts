import { Effect } from "effect";
import { AtprotoAgent } from "../../services/AtprotoAgent";
import { deleteRecord } from "../../utils/shared";
import { AudioRecordingPdsError } from "./utils/errors";
import type { DeleteRecordInput, DeleteRecordResult } from "./utils/types";

const COLLECTION = "app.gainforest.ac.audio";

const makePdsError = (message: string, cause: unknown) =>
  new AudioRecordingPdsError({ message, cause });

export const deleteAudioRecording = (
  input: DeleteRecordInput
): Effect.Effect<DeleteRecordResult, AudioRecordingPdsError, AtprotoAgent> =>
  Effect.gen(function* () {
    const { rkey } = input;
    const agent = yield* AtprotoAgent;
    const repo = agent.assertDid;
    const uri = `at://${repo}/${COLLECTION}/${rkey}`;

    yield* deleteRecord(COLLECTION, rkey, makePdsError);

    return { uri, rkey };
  });

export { AudioRecordingPdsError };
