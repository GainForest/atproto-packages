import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

export async function AccountOnboardingRequired() {
  const t = await getTranslations("marketplace.account.onboarding");

  return (
    <Container className="max-w-2xl py-16">
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <Button asChild>
          <Link href={links.manage.home}>{t("action")}</Link>
        </Button>
      </div>
    </Container>
  );
}
