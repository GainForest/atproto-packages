"use client";

import { Button } from "@/components/ui/button";

export function SentryExampleErrorButton() {
  return (
    <Button
      variant="destructive"
      onClick={() => {
        throw new Error("Sentry example page test error");
      }}
    >
      Trigger test error
    </Button>
  );
}
