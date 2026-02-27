export type TryCatchResult<T> = [T, null] | [null, Error];

export async function tryCatch<T>(
  promise: Promise<T>
): Promise<TryCatchResult<T>> {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
