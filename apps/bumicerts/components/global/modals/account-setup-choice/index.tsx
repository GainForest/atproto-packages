"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Building2Icon, HandHeartIcon } from "lucide-react";
import { OnboardingRoleSelector } from "@/components/auth/OnboardingRoleSelector";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { links } from "@/lib/links";

export function AccountSetupChoiceModal() {
  const router = useRouter();
  const { hide, popModal, stack } = useModal();
  const t = useTranslations("modals.accountSetupChoice");

  const handleOptionClick = useCallback(
    async (href: string) => {
      if (stack.length === 1) {
        await hide();
      } else {
        popModal();
      }

      router.push(href);
    },
    [hide, popModal, router, stack.length],
  );

  return (
    <ModalContent>
      <ModalTitle className="sr-only">
        {t("titleSr")}
      </ModalTitle>
      <ModalDescription className="sr-only">
        {t("descriptionSr")}
      </ModalDescription>
      <OnboardingRoleSelector
        title={t("title")}
        description={t("description")}
        markAlt={t("markAlt")}
        options={[
          {
            onClick: () => void handleOptionClick(links.manage.onboardUser),
            Icon: HandHeartIcon,
            optionName: t("funder"),
            optionDescription: t("funderDescription"),
          },
          {
            onClick: () =>
              void handleOptionClick(links.manage.onboardOrganization),
            Icon: Building2Icon,
            optionName: t("steward"),
            optionDescription: t("stewardDescription"),
          },
        ]}
      />
    </ModalContent>
  );
}
