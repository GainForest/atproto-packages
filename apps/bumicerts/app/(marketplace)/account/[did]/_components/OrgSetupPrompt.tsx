"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2Icon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

/**
 * Displayed when a user navigates to /manage but hasn't set up their
 * organization yet. Prompts them to complete org setup first.
 */
export function OrgSetupPrompt() {
  const t = useTranslations("marketplace.account.setupPrompt");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4 mb-4">
        <Building2Icon className="size-8 text-primary" />
      </div>
      <h2 className="font-serif text-2xl font-light tracking-[-0.02em] mb-2">
        {t("title")}
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        {t("description")}
      </p>
      <Button asChild>
        <Link href={links.manage.home}>
          {t("action")}
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}
