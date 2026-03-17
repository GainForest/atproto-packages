/**
 * UTF-8 byte offset utilities.
 *
 * ATProto facets use UTF-8 byte offsets for text ranges. JavaScript strings are
 * internally UTF-16, so we must encode/decode through Uint8Array when computing
 * offsets.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export { encoder, decoder };

/**
 * Get the UTF-8 byte length of the portion of `text` up to character index `charIndex`.
 */
export function byteOffsetAt(text: string, charIndex: number): number {
  return encoder.encode(text.slice(0, charIndex)).length;
}

/**
 * Get the character index (UTF-16 string index) corresponding to a UTF-8 byte offset.
 *
 * If `byteOffset` falls in the middle of a multi-byte sequence, the offset is
 * walked back to the start of that sequence to avoid producing U+FFFD replacement
 * characters.
 */
export function charIndexAtByteOffset(text: string, byteOffset: number): number {
  const bytes = encoder.encode(text);
  let offset = Math.max(0, Math.min(byteOffset, bytes.length));
  // Walk back past UTF-8 continuation bytes (0x80–0xBF)
  while (offset > 0 && ((bytes[offset] ?? 0) & 0xc0) === 0x80) {
    offset--;
  }
  return decoder.decode(bytes.slice(0, offset)).length;
}

/**
 * Clamp a byte offset to a valid UTF-8 character boundary.
 * If `offset` points into the middle of a multi-byte sequence, walk it back.
 */
export function clampToCharBoundary(bytes: Uint8Array, offset: number): number {
  let o = Math.max(0, Math.min(offset, bytes.length));
  while (o > 0 && ((bytes[o] ?? 0) & 0xc0) === 0x80) {
    o--;
  }
  return o;
}
