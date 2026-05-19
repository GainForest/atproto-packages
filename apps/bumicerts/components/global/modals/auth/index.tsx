"use client";

import { useTranslations } from "next-intl";
import { ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal/modal";
import { LoginModal } from "@/components/auth/LoginModal";

export function AuthModal() {
  const t = useTranslations("modals.auth");

  return (
    <ModalContent className="py-2">
      <ModalTitle className="sr-only">{t("title")}</ModalTitle>
      <ModalDescription className="sr-only">
        {t("description")}
      </ModalDescription>
      <LoginModal />
    </ModalContent>
  );
}
