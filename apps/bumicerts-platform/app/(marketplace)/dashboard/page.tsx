import type { Metadata } from "next";
import { DashboardClient } from "./_components/DashboardClient";

export const metadata: Metadata = {
  title: "Donations Dashboard — Bumicerts",
  description:
    "Platform-wide donations analytics: total raised, unique donors, funding trends, and recent transactions.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
