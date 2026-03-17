/**
 * UTF-8 byte offset utilities.
 * AT Protocol richtext facets use UTF-8 byte offsets; JS strings are UTF-16.
 */

const encoder = new TextEncoder()

export function toUtf8Bytes(text: string): Uint8Array {
  return encoder.encode(text)
}

export function utf8ByteOffsetToCharIndex(text: string, byteOffset: number): number {
  const bytes = encoder.encode(text)
  const decoder = new TextDecoder()
  const slice = bytes.slice(0, byteOffset)
  return decoder.decode(slice).length
}

export function sliceByByteOffset(text: string, byteStart: number, byteEnd: number): string {
  const startChar = utf8ByteOffsetToCharIndex(text, byteStart)
  const endChar = utf8ByteOffsetToCharIndex(text, byteEnd)
  return text.slice(startChar, endChar)
}

export function utf8ByteLength(text: string): number {
  return encoder.encode(text).length
}
