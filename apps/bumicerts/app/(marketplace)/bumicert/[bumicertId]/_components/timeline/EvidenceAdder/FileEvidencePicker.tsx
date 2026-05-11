import { useId, useState } from "react";
import FileInput from "@/components/ui/FileInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListLayout } from "./shared/RecordList";
import OptionalNote from "./shared/OptionalNote";
import Mutator, { type AttachmentData } from "./shared/Mutator";
import { useEvidenceAdderStore } from "./shared/evidenceAdderStore";
import {
  FileEvidenceContentTypeSelect,
  getDefaultFileContentType,
  getFileContentTypeLabel,
  type KnownEvidenceContentType,
  toKnownFileContentType,
} from "./shared/FileEvidenceContentTypeSelect";

const BROAD_SUPPORTED_FILE_TYPES = [
  "image/*",
  "audio/*",
  "video/*",
  "application/*",
  "text/*",
];

function toFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const FileEvidencePicker = () => {
  const description = useEvidenceAdderStore((state) => state.description);
  const resetDescription = useEvidenceAdderStore(
    (state) => state.resetDescription,
  );
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);
  const activityUri = useEvidenceAdderStore((state) => state.activityUri);
  const activityCid = useEvidenceAdderStore((state) => state.activityCid);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [filePickerValue, setFilePickerValue] = useState<File | null>(null);
  const [filePickerKey, setFilePickerKey] = useState(0);
  const [selectedContentType, setSelectedContentType] =
    useState<KnownEvidenceContentType>(getDefaultFileContentType);
  const externalLinkInputId = useId();
  const externalLinkHelpId = `${externalLinkInputId}-help`;

  const appendFile = (file: File) => {
    setSelectedFiles((prev) => {
      const next = [...prev];
      const existing = new Set(prev.map(toFileKey));

      const key = toFileKey(file);
      if (!existing.has(key)) {
        next.push(file);
      }

      return next;
    });
  };

  const removeFile = (fileToRemove: File) => {
    const removeKey = toFileKey(fileToRemove);
    setSelectedFiles((prev) =>
      prev.filter((file) => toFileKey(file) !== removeKey),
    );
  };

  const appendLink = () => {
    const trimmed = linkInput.trim();
    setLinkError(null);

    if (!trimmed) {
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        setLinkError("Use an http or https URL.");
        return;
      }

      const normalized = parsed.toString();
      setSelectedLinks((prev) =>
        prev.includes(normalized) ? prev : [...prev, normalized],
      );
      setLinkInput("");
    } catch {
      setLinkError("Enter a valid URL.");
    }
  };

  const removeLink = (linkToRemove: string) => {
    setSelectedLinks((prev) => prev.filter((link) => link !== linkToRemove));
  };

  const computedMutationData: AttachmentData = {
    title: getFileContentTypeLabel(selectedContentType),
    contentType: selectedContentType,
    description,
    subjectInfo: {
      uri: activityUri,
      cid: activityCid,
    },
    contents: [...selectedFiles, ...selectedLinks],
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <FileEvidenceContentTypeSelect
          value={selectedContentType}
          onValueChange={(value) =>
            setSelectedContentType(toKnownFileContentType(value))
          }
          disabled={isSubmitting}
        />

        <FileInput
          key={filePickerKey}
          placeholder="Add a file as evidence"
          value={filePickerValue ?? undefined}
          supportedFileTypes={BROAD_SUPPORTED_FILE_TYPES}
          maxSizeInMB={4}
          onFileChange={(file) => {
            if (isSubmitting) return;
            if (!file) {
              setFilePickerValue(null);
              return;
            }

            appendFile(file);
            setFilePickerValue(null);
            setFilePickerKey((prev) => prev + 1);
          }}
          className={`min-h-[120px] ${isSubmitting ? "pointer-events-none opacity-70" : ""}`}
        />

        <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-background p-3">
          <label htmlFor={externalLinkInputId} className="text-sm font-medium">
            External link
          </label>
          <div className="flex gap-2">
            <Input
              id={externalLinkInputId}
              value={linkInput}
              placeholder="https://example.org/report"
              disabled={isSubmitting}
              aria-invalid={linkError ? true : undefined}
              aria-describedby={externalLinkHelpId}
              onChange={(event) => setLinkInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (!isSubmitting) {
                    appendLink();
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={appendLink}
              disabled={isSubmitting || linkInput.trim().length === 0}
            >
              Add
            </Button>
          </div>
          {linkError ? (
            <p id={externalLinkHelpId} className="text-xs text-destructive">
              {linkError}
            </p>
          ) : (
            <p id={externalLinkHelpId} className="text-xs text-muted-foreground">
              Link reports, websites, dashboards, or external evidence platforms.
            </p>
          )}
        </div>

        {selectedFiles.length > 0 || selectedLinks.length > 0 ? (
          <ListLayout>
            {selectedFiles.map((file) => {
              const key = toFileKey(file);
              return (
                <div
                  key={key}
                  className="w-full bg-background flex items-center gap-2.5 px-3 py-2 rounded-xl border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatFileSize(file.size)}
                      {file.type ? ` · ${file.type}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeFile(file)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            {selectedLinks.map((link) => (
              <div
                key={link}
                className="w-full bg-background flex items-center gap-2.5 px-3 py-2 rounded-xl border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    External link
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {link}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => removeLink(link)}
                  disabled={isSubmitting}
                >
                  Remove
                </button>
              </div>
            ))}
          </ListLayout>
        ) : (
          <div className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground text-center">
            No files or links selected yet.
          </div>
        )}
      </div>

      <OptionalNote disabled={isSubmitting} />
      <Mutator
        data={computedMutationData}
        onSuccess={() => {
          resetDescription();
          setSelectedFiles([]);
          setSelectedLinks([]);
          setLinkInput("");
        }}
      />
    </>
  );
};

export default FileEvidencePicker;
