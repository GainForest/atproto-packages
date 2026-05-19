"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import FileInput from "@/components/ui/FileInput";

export type ImageEditorTarget = "cover" | "logo";

interface ImageEditorModalProps {
  target: ImageEditorTarget;
  onConfirm: (file: File) => void;
}

export function ImageEditorModal({ target, onConfirm }: ImageEditorModalProps) {
  const t = useTranslations("upload.modals");
  const tActions = useTranslations("upload.actions");
  const { hide, popModal, stack } = useModal();
  const [file, setFile] = useState<File | null>(null);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    onConfirm(file);
    await handleClose();
  };

  const title = target === "cover" ? t("imageCoverTitle") : t("imageLogoTitle");
  const description =
    target === "cover" ? t("imageCoverDescription") : t("imageLogoDescription");

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>{title}</ModalTitle>
        <ModalDescription>{description}</ModalDescription>
      </ModalHeader>

      <div className="py-4">
        <FileInput
          supportedFileTypes={["image/*"]}
          maxSizeInMB={5}
          value={file}
          onFileChange={setFile}
          placeholder={t("imagePlaceholder")}
        />
      </div>

      <ModalFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClose}>
          {tActions("cancel")}
        </Button>
        <Button onClick={handleConfirm} disabled={!file}>
          {tActions("apply")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
