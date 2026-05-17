import type { Metadata } from "next";
import { CheckoutClient } from "./_components/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your donation to multiple bumicerts in one transaction.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
