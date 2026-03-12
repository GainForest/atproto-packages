// src/try-catch.ts
async function tryCatch(promise) {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

// src/is-object.ts
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof RegExp) && !(value instanceof Date) && !(value instanceof Set) && !(value instanceof Map);
}

// src/parse-at-uri.ts
function parseAtUri(atUri) {
  const parts = atUri.replace("at://", "").split("/");
  return {
    did: parts[0] ?? "",
    collection: parts[1] ?? "",
    rkey: parts[2] ?? "self"
  };
}
export {
  isObject,
  parseAtUri,
  tryCatch
};
//# sourceMappingURL=index.js.map