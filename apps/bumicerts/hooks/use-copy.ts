"use client";

import { useState } from "react";

/**
 * Simple clipboard copy hook with temporary "copied" state.
 * 
 * @returns Object with `isCopied` boolean and `copy` function
 * 
 * @example
 * ```tsx
 * const { isCopied, copy } = useCopy();
 * 
 * <button onClick={() => copy("text to copy")}>
 *   {isCopied ? "Copied!" : "Copy"}
 * </button>
 * ```
 */
export function useCopy() {
  const [isCopied, setIsCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return { isCopied, copy };
}
