/**
 * Module augmentation to reconcile @tiptap/react's EditorContent type with
 * @types/react@19.
 *
 * TipTap's EditorContent is declared as React.NamedExoticComponent, which is
 * typed against the React version used when TipTap's type declarations were
 * generated. When a project uses @types/react@19 (which adds `bigint` to
 * ReactNode), TypeScript can't assign a v18 NamedExoticComponent to a v19
 * JSX element slot because the ReactNode union differs structurally.
 *
 * We redeclare EditorContent as a plain React.FC, which is a regular function
 * component type. React.FC<P> is typed as `(props: P) => ReactElement | null`,
 * and ReactElement is the same across React versions — resolving the mismatch
 * without suppressing any type information that callers care about.
 */

import type { EditorContentProps } from "@tiptap/react";
import type { FC } from "react";

declare module "@tiptap/react" {
  // eslint-disable-next-line no-var
  export declare const EditorContent: FC<EditorContentProps>;
}
