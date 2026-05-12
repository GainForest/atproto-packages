import { FileTextIcon, LeafIcon, MicIcon, TreesIcon } from "lucide-react";
import { links } from "@/lib/links";

export type EvidenceTabId = "audio" | "trees" | "biodiversity" | "files";
export type ManagedEvidenceTabId = Exclude<EvidenceTabId, "files">;
export type EvidenceAttachmentContentType =
  | "audio"
  | "occurrence"
  | "tree-dataset"
  | "biodiversity"
  | "evidence";

type AttachmentDefaults = {
  title: string;
  contentType: EvidenceAttachmentContentType;
};

type TabBaseConfig = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  attachment: AttachmentDefaults;
};

type ManagedTabConfig = TabBaseConfig & {
  manageHref: string | null;
  emptyLabel: string;
};

const MANAGED_TAB_CONFIG: Record<ManagedEvidenceTabId, ManagedTabConfig> = {
  audio: {
    label: "Audio",
    icon: MicIcon,
    manageHref: links.manage.audio,
    emptyLabel: "audio recordings",
    attachment: {
      title: "Audio Recordings",
      contentType: "audio",
    },
  },
  trees: {
    label: "Trees",
    icon: TreesIcon,
    manageHref: links.manage.trees,
    emptyLabel: "tree datasets",
    attachment: {
      title: "Tree Data Set",
      contentType: "tree-dataset",
    },
  },
  biodiversity: {
    label: "Biodiversity",
    icon: LeafIcon,
    manageHref: null,
    emptyLabel: "biodiversity observations",
    attachment: {
      title: "Biodiversity Observations",
      contentType: "biodiversity",
    },
  },
};

const FILE_TAB_CONFIG: TabBaseConfig = {
  label: "Documents",
  icon: FileTextIcon,
  attachment: {
    title: "Documents",
    contentType: "evidence",
  },
};

export const EVIDENCE_TABS: Array<
  {
    id: EvidenceTabId;
  } & TabBaseConfig
> = [
  {
    id: "audio",
    ...MANAGED_TAB_CONFIG.audio,
  },
  {
    id: "trees",
    ...MANAGED_TAB_CONFIG.trees,
  },
  {
    id: "biodiversity",
    ...MANAGED_TAB_CONFIG.biodiversity,
  },
  {
    id: "files",
    ...FILE_TAB_CONFIG,
  },
];

export function getManagedEvidenceTabConfig(
  tabId: ManagedEvidenceTabId,
): ManagedTabConfig {
  return MANAGED_TAB_CONFIG[tabId];
}

export function getEvidenceTabLabel(tabId: EvidenceTabId): string {
  if (tabId === "files") {
    return FILE_TAB_CONFIG.label;
  }
  return MANAGED_TAB_CONFIG[tabId].label;
}

export function getEvidenceAttachmentDefaults(tabId: EvidenceTabId): AttachmentDefaults {
  if (tabId === "files") {
    return FILE_TAB_CONFIG.attachment;
  }
  return MANAGED_TAB_CONFIG[tabId].attachment;
}
