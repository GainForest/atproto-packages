import { getCurrentSession } from "@/lib/current-session";
import { AudioClient } from "./_components/AudioClient";

export default async function AudioPage() {
  const session = await getCurrentSession();
  if (!session.isLoggedIn || !session.did) return null;
  return <AudioClient did={session.did} />;
}
