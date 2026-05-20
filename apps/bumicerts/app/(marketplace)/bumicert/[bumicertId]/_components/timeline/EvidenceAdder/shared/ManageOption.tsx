import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  getManagedEvidenceTabConfig,
  type ManagedEvidenceTabId,
} from "./evidenceRegistry";
import { useTranslations } from "next-intl";

const ManageOption = ({ type }: { type: ManagedEvidenceTabId }) => {
  const t = useTranslations("bumicert.detail.evidenceAdder");
  const { manageHref } = getManagedEvidenceTabConfig(type);

  if (!manageHref) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <Link
        href={manageHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        {t("manage")}
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  );
};

export default ManageOption;
