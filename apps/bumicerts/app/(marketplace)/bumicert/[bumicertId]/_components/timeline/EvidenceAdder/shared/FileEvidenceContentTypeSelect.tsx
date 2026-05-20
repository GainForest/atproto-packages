import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getFilePickerEvidenceContentTypeOptions,
  type KnownEvidenceContentType,
} from "../../shared/evidenceContentTypeRegistry";

export type { KnownEvidenceContentType } from "../../shared/evidenceContentTypeRegistry";
import { useTranslations } from "next-intl";

const FILE_CONTENT_TYPE_OPTIONS = getFilePickerEvidenceContentTypeOptions();

export function getDefaultFileContentType(): KnownEvidenceContentType {
  const documentOption = FILE_CONTENT_TYPE_OPTIONS.find(
    (option) => option.value === "document",
  );

  return documentOption?.value ?? FILE_CONTENT_TYPE_OPTIONS[0]?.value ?? "evidence";
}

export function toKnownFileContentType(value: string): KnownEvidenceContentType {
  const option = FILE_CONTENT_TYPE_OPTIONS.find((entry) => entry.value === value);
  return option?.value ?? getDefaultFileContentType();
}

export function getFileContentTypeLabel(value: KnownEvidenceContentType): string {
  const option = FILE_CONTENT_TYPE_OPTIONS.find((entry) => entry.value === value);
  return option?.label ?? "Evidence";
}

export const contentTypeLabelKeys: Record<KnownEvidenceContentType, string> = {
  document: "document",
  report: "report",
  audit: "audit",
  evidence: "evidence",
  testimonial: "testimonial",
  methodology: "methodology",
  photo: "photo",
  video: "video",
  dataset: "dataset",
  certificate: "certificate",
  audio: "audio",
  other: "other",
  "tree-dataset": "treeDataset",
  biodiversity: "biodiversity",
  occurrence: "occurrence",
};

export function FileEvidenceContentTypeSelect({
  value,
  onValueChange,
  disabled,
}: {
  value: KnownEvidenceContentType;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("bumicert.detail.evidenceAdder");

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{t("contentType")}</label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={t("selectContentType")} />
        </SelectTrigger>
        <SelectContent>
          {FILE_CONTENT_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(`contentTypes.${contentTypeLabelKeys[option.value]}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
