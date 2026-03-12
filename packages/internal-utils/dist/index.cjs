"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  isObject: () => isObject,
  parseAtUri: () => parseAtUri,
  tryCatch: () => tryCatch
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isObject,
  parseAtUri,
  tryCatch
});
//# sourceMappingURL=index.cjs.map