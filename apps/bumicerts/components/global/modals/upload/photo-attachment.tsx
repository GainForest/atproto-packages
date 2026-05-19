"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import {
  ModalContent,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { useModal } from "@/components/ui/modal/context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { toSerializableFile } from "@/lib/mutations-utils";
import type { AcMultimediaRecord } from "@gainforest/atproto-mutations-next";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UploadedPhotoPayload = {
  uri: string;
  rkey: string;
  cid: string;
  record: AcMultimediaRecord;
  previewUrl: string | null;
};

type PhotoAttachModalProps = {
  occurrenceUri: string;
  siteRef?: string;
  speciesName: string;
  onPhotoUploaded: (uploadedPhoto: UploadedPhotoPayload) => void;
};

type SubjectPart =
  | "entireOrganism"
  | "leaf"
  | "bark"
  | "flower"
  | "fruit"
  | "seed"
  | "stem"
  | "twig"
  | "bud"
  | "root";

type UploadState = "idle" | "uploading" | "success" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SUBJECT_PARTS: SubjectPart[] = [
  "entireOrganism",
  "leaf",
  "bark",
  "flower",
  "fruit",
  "seed",
  "stem",
  "twig",
  "bud",
  "root",
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.heic";
const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB — Next.js server action body limit

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function PhotoAttachModal({
  occurrenceUri,
  siteRef,
  speciesName,
  onPhotoUploaded,
}: PhotoAttachModalProps) {
  const createMultimedia = trpc.ac.multimedia.create.useMutation();
  const { hide, popModal, stack } = useModal();
  const t = useTranslations("modals.photoAttachment");

  const [selectedPart, setSelectedPart] = useState<SubjectPart>("entireOrganism");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = async () => {
    // Clean up preview URL on close
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    setUploadError(null);
    setUploadState("idle");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError(t("errors.unsupported"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError(t("errors.tooLarge", { size: formatBytes(file.size) }));
      return;
    }

    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, [previewUrl, t]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!imageFile) return;

    setUploadState("uploading");
    setUploadError(null);

    try {
      const serializableFile = await toSerializableFile(imageFile);
      const result = await createMultimedia.mutateAsync({
        imageFile: serializableFile,
        occurrenceRef: occurrenceUri,
        siteRef,
        subjectPart: selectedPart,
        caption: caption.trim() || undefined,
        format: imageFile.type,
      });

      setUploadState("success");
      onPhotoUploaded({
        uri: result.uri,
        rkey: result.rkey,
        cid: result.cid,
        record: result.record,
        previewUrl: URL.createObjectURL(imageFile),
      });
      await handleClose();
    } catch (err) {
      setUploadState("error");
      setUploadError(String(err));
    }
  };

  const isUploading = uploadState === "uploading";
  const isSuccess = uploadState === "success";

  return (
    <ModalContent>
      <ModalTitle>{t("title", { speciesName })}</ModalTitle>
      <ModalDescription>
        {t("description")}
      </ModalDescription>

      <div className="space-y-4 mt-4">
        {/* Subject Part Selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("subjectPart")}</label>
          <Select
            value={selectedPart}
            onValueChange={(v) => setSelectedPart(v as SubjectPart)}
            disabled={isUploading || isSuccess}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_PARTS.map((part) => (
                <SelectItem key={part} value={part}>
                  {t(`parts.${part}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Image Drop Zone */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("image")}</label>
          <div
            className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60 hover:bg-muted/30"
            } ${isUploading || isSuccess ? "pointer-events-none opacity-60" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {previewUrl ? (
              <div className="relative flex flex-col items-center gap-2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={t("previewAlt")}
                  className="max-h-48 w-full rounded-md object-contain"
                />
                <span className="text-xs text-muted-foreground">
                  {imageFile?.name} ({formatBytes(imageFile?.size ?? 0)})
                </span>
                {!isUploading && !isSuccess && (
                  <span className="text-xs text-muted-foreground">
                    {t("replace")}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm font-medium">
                  {t("drop")}
                </span>
                <span className="text-xs">{t("requirements")}</span>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={handleInputChange}
          />

          {fileError && (
            <p className="text-xs text-destructive">{fileError}</p>
          )}
        </div>

        {/* Optional Caption */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {t("caption")} {" "}
            <span className="text-muted-foreground font-normal">({t("optional")})</span>
          </label>
          <Input
            placeholder={t("captionPlaceholder")}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isUploading || isSuccess}
          />
        </div>

        {/* Upload error */}
        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
      </div>

      <ModalFooter className="mt-4 flex-col gap-2">
        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={!imageFile || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("uploading")}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t("upload")}
            </>
          )}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={handleClose}
          disabled={isUploading}
        >
          {t("cancel")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
