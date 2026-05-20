import { auth } from "@/lib/auth";
import { getCentralSession } from "@/lib/central-auth";

type CurrentSession = {
  isLoggedIn: boolean;
  did: string | null;
};

export async function getCurrentSession(): Promise<CurrentSession> {
  const centralSession = await getCentralSession();
  if (centralSession) {
    return {
      isLoggedIn: centralSession.isLoggedIn,
      did: centralSession.did ?? null,
    };
  }

  const localSession = await auth.session.getSession();
  if (!localSession.isLoggedIn) {
    return { isLoggedIn: false, did: null };
  }

  return {
    isLoggedIn: true,
    did: localSession.did,
  };
}
