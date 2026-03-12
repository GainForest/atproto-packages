type TryCatchResult<T> = [T, null] | [null, Error];
declare function tryCatch<T>(promise: Promise<T>): Promise<TryCatchResult<T>>;

declare function isObject(value: unknown): value is Record<string, unknown>;

type AtUri = {
    did: string;
    collection: string;
    rkey: string;
};
declare function parseAtUri(atUri: string): AtUri;

export { type AtUri, type TryCatchResult, isObject, parseAtUri, tryCatch };
