"use client";

/**
 * DeleteWalletModal — asks the user to confirm before removing a linked wallet.
 * Pushed on top of ManageWalletsModal.
 */

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import { Button } from "@/components/ui/button";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { trpc } from "@/lib/trpc/client";
import { ChevronRight, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { blo } from "blo";
import { useTranslations } from "next-intl";

interface DeleteWalletModalProps {
  rkey: string;
  address: string;
  name: string | null | undefined;
  onBack: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function DeleteWalletModal({
  rkey,
  address,
  name,
  onBack,
  onDeleted,
}: DeleteWalletModalProps) {
  const t = useTranslations("modals.wallet.delete");
  const { stack, hide, popModal } = useModal();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteEvm = trpc.link.evm.delete.useMutation();

  const handleBack = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      onBack();
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteEvm.mutateAsync({ rkey });
      onDeleted();
    } catch (e) {
      console.error("[DeleteWalletModal] Failed to remove wallet:", e);
      setError(t("removeError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalContent dismissible={false}>
      <ModalHeader backAction={isDeleting ? undefined : handleBack}>
        <ModalTitle>{t("title")}</ModalTitle>
        <ModalDescription>{t("description")}</ModalDescription>
      </ModalHeader>

      <p className="mt-6 text-center text-pretty">
        {t.rich("confirmRemove", {
          name: name ?? t("untitled"),
          nameText: (chunks) => (
            <span className="font-medium text-foreground">&quot;{chunks}&quot;</span>
          ),
        })}
      </p>
      <div className="bg-muted/50 rounded-2xl p-4 mt-4 grid grid-cols-[1fr_2rem_1fr] overflow-hidden">
        <div className="flex flex-col items-center justify-center">
          <Image
            height={32}
            width={32}
            alt={name ?? address}
            src={blo(address as `0x${string}`)}
            className="rounded-full border-2 drop-shadow-sm"
          />
          <span className="font-medium text-sm mt-2 bg-muted px-1 py-0.5 rounded-md">
            {formatAddress(address)}
          </span>
        </div>
        <div className="flex items-center justify-center">
          <ChevronRight className="size-6 text-destructive opacity-50" />
        </div>
        <div className="flex items-center justify-center relative">
          <div className="absolute h-10 w-10 rounded-full blur-xl bg-destructive/70 "></div>
          <Trash2Icon className="text-destructive size-8" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ModalFooter>
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? t("removing") : t("removeWallet")}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleBack}
          disabled={isDeleting}
        >
          {t("cancel")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
