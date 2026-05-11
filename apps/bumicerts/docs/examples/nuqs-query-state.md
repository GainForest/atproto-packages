# Example: `nuqs` Query State

Use this shape when the state belongs in the URL and should survive refresh, share, or navigation.

## `useReviewMode.ts`

```tsx
"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

const MODE_VALUES = ["edit", "review"] as const;
type ReviewMode = (typeof MODE_VALUES)[number];

const modeParser = parseAsStringLiteral(MODE_VALUES);

export function useReviewMode(): [
  ReviewMode | null,
  (value: ReviewMode | null) => void,
] {
  const [mode, setMode] = useQueryState(
    "mode",
    modeParser.withOptions({ shallow: true, history: "push" }),
  );

  const updateMode = (value: ReviewMode | null) => {
    void setMode(value);
  };

  return [mode, updateMode];
}
```

## Usage

```tsx
export function ReviewToolbar() {
  const [mode, setMode] = useReviewMode();
  const isEditing = mode === "edit";

  return (
    <div>
      <Button onClick={() => setMode("edit")}>Edit</Button>
      {isEditing ? <Button onClick={() => setMode(null)}>Done</Button> : null}
    </div>
  );
}
```

## Rules This Example Demonstrates

- The URL is the single source of truth for this state.
- Clear the query param with `null` instead of manual URL string manipulation.
- Do not mirror the same query state with extra `useState` or manual router code.
