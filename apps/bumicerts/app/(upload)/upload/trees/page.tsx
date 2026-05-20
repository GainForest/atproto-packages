import { getCurrentSession } from "@/lib/current-session";
import { TreeUploadContentsquareProvider } from "./_components/TreeUploadContentsquareProvider";
import { TreesPageClient } from "./_components/TreesPageClient";

/**
 * /upload/trees — Tree manager by default, upload wizard in `?mode=upload`
 *
 * Auth is enforced by the (MANAGE) layout. If somehow reached without
 * auth, render nothing — the layout's SignInPrompt covers this case.
 */
export default async function TreesPage() {
  const session = await getCurrentSession();
  if (!session.isLoggedIn || !session.did) return null;
  return (
    <TreeUploadContentsquareProvider>
      <TreesPageClient did={session.did} />
    </TreeUploadContentsquareProvider>
  );
}
