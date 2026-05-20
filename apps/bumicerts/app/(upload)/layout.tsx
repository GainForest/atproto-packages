import type { Metadata } from "next";
import { getCurrentSession } from "@/lib/current-session";
import { ManageLayoutClient } from "./_components/UploadLayoutClient";
import { SignInPrompt } from "./_components/SignInPrompt";
import { ModalProvider } from "@/components/ui/modal/context";
import { noIndexMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = noIndexMetadata();

/**
 * (MANAGE) layout
 *
 * Server component — reads session on every request.
 * If the user is not authenticated, renders a sign-in prompt.
 * Otherwise, renders the client layout shell.
 */
export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session.isLoggedIn) {
    // Unauthenticated: show sign-in prompt (needs ModalProvider for the auth modal)
    return (
      <ModalProvider>
        <SignInPrompt />
      </ModalProvider>
    );
  }

  return <ManageLayoutClient>{children}</ManageLayoutClient>;
}
