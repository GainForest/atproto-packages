"use client";

import { ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal/modal";
import { LoginModal } from "@/components/auth/LoginModal";

export function AuthModal() {
  return (
    <ModalContent className="py-2">
      <ModalTitle className="sr-only">Sign in to Bumicerts</ModalTitle>
      <ModalDescription className="sr-only">
        Sign in with your username to access Bumicerts.
      </ModalDescription>
      <LoginModal />
    </ModalContent>
  );
}
