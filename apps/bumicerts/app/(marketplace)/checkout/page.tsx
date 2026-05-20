import { getTranslations } from "next-intl/server";
import { CheckoutClient } from "./_components/CheckoutClient";
import { noIndexMetadata } from "@/lib/seo-metadata";

export async function generateMetadata() {
  const t = await getTranslations("modals.checkout.metadata");

  return {
    ...noIndexMetadata(t("title")),
    description: t("description"),
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
