import type { CertifiedLocation } from "@/lib/graphql-dev/queries";
import UriEvidencePicker from "./shared/UriEvidenceViewer";
import type { ViewerSharedProps } from "./shared/evidenceTypes";
import { getManagedEvidenceTabConfig } from "./shared/evidenceRegistry";

const SiteEvidencePicker = ({
  data,
  ...props
}: {
  data: CertifiedLocation[];
} & ViewerSharedProps) => {
  const tabConfig = getManagedEvidenceTabConfig("sites");

  return (
    <UriEvidencePicker
      tabId="sites"
      data={data}
      icon={tabConfig.icon}
      mutation={tabConfig.attachment}
      getUri={(item) => item.metadata?.uri ?? undefined}
      getPrimary={(item) => item.record?.name ?? "Unnamed site"}
      getSecondary={(item) => item.record?.locationType ?? undefined}
      {...props}
    />
  );
};

export default SiteEvidencePicker;
