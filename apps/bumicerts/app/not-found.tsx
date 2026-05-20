import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { links } from "@/lib/links";

export default async function NotFound() {
  const t = await getTranslations("common.notFound");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1
        className="text-7xl font-light tracking-[-0.02em]"
        style={{ fontFamily: "var(--font-garamond-var)" }}
      >
        404
      </h1>
      <p className="text-lg text-muted-foreground max-w-md">
        {t("description")}
      </p>
      <Link
        href={links.home}
        className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
