import { getTranslations } from "next-intl/server";
import { CheckoutClient } from "./_components/CheckoutClient";

export async function generateMetadata() {
  const t = await getTranslations("modals.checkout.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function CheckoutPage() {
  return <CheckoutClient />;
}
