import { getTranslations } from "next-intl/server";
import { LeaderboardClient } from "./_components/LeaderboardClient";

export async function generateMetadata() {
  const t = await getTranslations("marketplace.leaderboard.metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
