import type { OrganizationData } from "@/lib/types";
import { LeafletRenderer } from "@/components/ui/leaflet-renderer";

export function OrgAbout({ organization }: { organization: OrganizationData }) {
  if (!organization.longDescription.blocks.length) return null;

  return (
    <section className="py-1 md:py-2 org-animate org-fade-in-up org-delay-1">
      <LeafletRenderer
        document={organization.longDescription}
        ownerDid={organization.did}
      />
    </section>
  );
}
