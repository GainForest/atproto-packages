# Example: Route Shell Pattern

Use this shape for a route with static chrome plus one main data-driven block.

## File Layout

```text
app/(marketplace)/reports/summary/
  _components/
    ReportsShell.tsx
    ReportsSkeleton.tsx
    ReportsGrid.tsx
  server/
    getReports.ts
  loading.tsx
  page.tsx
  error.tsx
```

## `ReportsShell.tsx`

```tsx
"use client";

import { motion } from "framer-motion";

export function ReportsShell({
  animate = true,
  children,
}: {
  animate?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-8">
      <motion.header
        initial={animate ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1>Reports</h1>
      </motion.header>

      {children}
    </section>
  );
}
```

## `loading.tsx`

```tsx
import { ReportsShell } from "./_components/ReportsShell";
import { ReportsSkeleton } from "./_components/ReportsSkeleton";

export default function Loading() {
  return (
    <ReportsShell animate={true}>
      <ReportsSkeleton />
    </ReportsShell>
  );
}
```

## `page.tsx`

```tsx
import ErrorPage from "@/components/error-page";
import { getReports } from "./server/getReports";
import { ReportsGrid } from "./_components/ReportsGrid";
import { ReportsShell } from "./_components/ReportsShell";

export default async function Page() {
  const reports = await getReports();

  if (!reports) {
    return <ErrorPage />;
  }

  return (
    <ReportsShell animate={false}>
      <ReportsGrid reports={reports} />
    </ReportsShell>
  );
}
```

## Rules This Example Demonstrates

- Use the same shell in both `loading.tsx` and `page.tsx`.
- Pass `animate={true}` in `loading.tsx` and `animate={false}` in `page.tsx`.
- Keep skeletons text-free and shaped like the final layout.
- Return `<ErrorPage />` on fetch failure instead of throwing a generic render-time error.
