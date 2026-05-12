export const EVIDENCE_CONTENT_TYPE_REGISTRY = [
  { value: "document", label: "Document", filePickerEligible: true },
  { value: "report", label: "Report", filePickerEligible: true },
  { value: "audit", label: "Audit", filePickerEligible: true },
  { value: "evidence", label: "Evidence", filePickerEligible: true },
  { value: "testimonial", label: "Testimonial", filePickerEligible: true },
  { value: "methodology", label: "Methodology", filePickerEligible: true },
  { value: "photo", label: "Photo", filePickerEligible: true },
  { value: "video", label: "Video", filePickerEligible: true },
  { value: "dataset", label: "Dataset", filePickerEligible: true },
  { value: "certificate", label: "Certificate", filePickerEligible: true },
  { value: "audio", label: "Audio", filePickerEligible: true },
  { value: "other", label: "Other", filePickerEligible: true },
  { value: "tree-dataset", label: "Tree dataset", filePickerEligible: false },
  { value: "biodiversity", label: "Biodiversity", filePickerEligible: false },
  { value: "occurrence", label: "Tree", filePickerEligible: false },
] as const;

export type KnownEvidenceContentType =
  (typeof EVIDENCE_CONTENT_TYPE_REGISTRY)[number]["value"];

export function getFilePickerEvidenceContentTypeOptions(): Array<{
  value: KnownEvidenceContentType;
  label: string;
}> {
  return EVIDENCE_CONTENT_TYPE_REGISTRY.filter(
    (entry) => entry.filePickerEligible,
  ).map((entry) => ({
    value: entry.value,
    label: entry.label,
  }));
}
