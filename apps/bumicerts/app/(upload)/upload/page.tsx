import { auth } from "@/lib/auth";
import { UploadDashboardClient } from "./_components/UploadDashboardClient";

/**
 * /upload — Organisation management dashboard
 *
 * Auth is already enforced by the (upload) layout; this page simply
 * retrieves the DID from the session and hands it to the client component.
 */
export default async function UploadPage() {
  const session = await auth.session.getSession();

  // Layout already guards against unauthenticated access, but we need the
  // session data here. If somehow reached without auth, render nothing —
  // the layout's SignInPrompt covers this case.
  if (!session.isLoggedIn) return null;

  return <UploadDashboardClient did={session.did} />;
}
