import { getCurrentSession } from "@/lib/current-session";
import { SitesClient } from "./_components/SitesClient";

export default async function SitesPage() {
  const session = await getCurrentSession();
  if (!session.isLoggedIn || !session.did) return null;
  return <SitesClient did={session.did} />;
}
