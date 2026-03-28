import { auth } from "@/lib/auth";
import { ProfileEditClient } from "./_components/ProfileEditClient";

/**
 * /upload/profile — Certified profile page (view + edit modes)
 *
 * Auth is enforced by the (upload) layout. Mode (?mode=edit) is managed
 * entirely client-side via nuqs — no searchParams needed here.
 *
 * This page lets users edit their certified actor profile
 * (app.certified.actor.profile), which extends their Bluesky identity
 * with additional fields like pronouns, website, and a custom banner.
 *
 * Fields are clearly labeled to show whether they come from:
 *   - The certified profile (editable here)
 *   - Bluesky (imported, shown for reference)
 */
export default async function ProfilePage() {
  const session = await auth.session.getSession();

  // Layout already guards against unauthenticated access
  if (!session.isLoggedIn) return null;

  return <ProfileEditClient did={session.did} />;
}
