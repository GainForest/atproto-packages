import type { Metadata } from "next";
import { SentryExampleErrorButton } from "./_components/SentryExampleErrorButton";

export const metadata: Metadata = {
  title: "Sentry example page",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SentryExamplePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Sentry setup</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Verify Sentry error reporting
        </h1>
        <p className="text-muted-foreground">
          Use this page only to confirm that the deployed app is connected to
          Sentry. Clicking the button intentionally throws a browser error.
        </p>
      </div>
      <SentryExampleErrorButton />
    </main>
  );
}
