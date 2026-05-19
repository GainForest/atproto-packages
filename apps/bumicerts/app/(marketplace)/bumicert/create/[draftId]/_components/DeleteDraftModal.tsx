"use client";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { links } from "@/lib/links";
import { CircleCheckIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useFormStore } from "../form-store";
import { useAtprotoStore } from "@/components/stores/atproto";
import { queryKeys } from "@/lib/query-keys";
import { useTranslations } from "next-intl";

export const DeleteDraftModalId = "bumicert/delete-draft";

type DeleteDraftModalProps = {
  draftId?: number;
  draftTitle?: string;
  onSuccess?: () => void;
};

const DeleteDraftModal = ({
  draftId: propDraftId,
  draftTitle: propDraftTitle,
  onSuccess,
}: DeleteDraftModalProps) => {
  const t = useTranslations("bumicert.create.draft.modals.deleteDraft");
  const { stack, popModal, hide } = useModal();
  const pathname = usePathname();
  const router = useRouter();
  const formValues = useFormStore((state) => state.formValues);
  const queryClient = useQueryClient();
  const auth = useAtprotoStore((state) => state.auth);

  const draftTitle =
    propDraftTitle ??
    (formValues[0].projectName.trim() === ""
      ? t("untitledDraft")
      : formValues[0].projectName);

  const draftIdMatch = pathname.match(/\/create\/(\d+)$/);
  const urlDraftId = draftIdMatch ? parseInt(draftIdMatch[1], 10) : null;
  const draftId = propDraftId ?? urlDraftId;

  const {
    mutate: deleteDraft,
    isPending,
    isSuccess: success,
    error,
  } = useMutation({
    mutationFn: async () => {
      if (!draftId || draftId === 0 || isNaN(draftId)) {
        throw new Error("Invalid draft ID");
      }

      const response = await fetch(links.api.drafts.bumicert.delete, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ draftIds: [draftId] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete draft");
      }

      const result = await response.json();

      if (result.deletedCount === 0) {
        throw new Error(
          "No draft was deleted. The draft may not exist or you don't have permission to delete it."
        );
      }

      return result;
    },
    onSuccess: async () => {
      if (auth.user?.did) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.drafts.byDid(auth.user.did),
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        await hide();
        popModal();
        router.push(links.bumicert.create);
      }
    },
  });

  const handleDelete = () => {
    deleteDraft();
  };

  const handleClose = () => {
    if (stack.length === 1) {
      hide().then(() => {
        popModal();
      });
    } else {
      popModal();
    }
  };

  if (!draftId) {
    return (
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("title")}</ModalTitle>
          <ModalDescription>{t("missingDraftDescription")}</ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button onClick={handleClose} className="w-full">
            {t("close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  return (
    <ModalContent>
      <ModalHeader
        backAction={
          stack.length === 1 || success
            ? undefined
            : () => {
                popModal();
              }
        }
      >
        <ModalTitle>{t("title")}</ModalTitle>
        <ModalDescription>
          {success ? t("successDescription") : t("description")}
        </ModalDescription>
      </ModalHeader>
      <AnimatePresence>
        {!success ? (
          <motion.div
            className="flex flex-col items-center gap-2 mt-4"
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
          >
            <p>
              {t.rich("confirmBody", {
                destructive: (chunks) => <span className="text-destructive">{chunks}</span>,
                strong: (chunks) => (
                  <strong className="font-medium text-foreground my-2">
                    {chunks}
                  </strong>
                ),
                title: draftTitle,
                br: () => <br />,
              })}
            </p>
            {error && (
              <div className="text-red-500 w-full text-left text-sm">
                {error.message}
              </div>
            )}
            <ModalFooter className="w-full gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="w-full"
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    {t("deleting")}
                  </>
                ) : (
                  <>
                    <Trash2Icon />
                    {t("deleteAction")}
                  </>
                )}
              </Button>
            </ModalFooter>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-4 mt-8"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          >
            <div className="flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 bg-primary blur-2xl rounded-full animate-pulse"></div>
              </div>
              <CircleCheckIcon className="size-20 text-primary" />
            </div>
            <p className="text-center text-muted-foreground font-medium text-pretty">
              {t("deletedBody")}
            </p>
            <ModalFooter className="w-full">
              <Button onClick={handleClose} className="w-full">
                {t("close")}
              </Button>
            </ModalFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContent>
  );
};

export default DeleteDraftModal;
