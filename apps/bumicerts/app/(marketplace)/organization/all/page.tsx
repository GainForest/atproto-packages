import { graphqlClient } from "@/lib/graphql/client";
import { AllOrganizationsQuery } from "@/lib/graphql/queries";
import {
  orgInfosToOrganizationDataArray,
  type GraphQLOrgInfo,
  type GraphQLHcActivity,
} from "@/lib/adapters";
import { AllOrgsClient } from "./_components/AllOrgsClient";

export const metadata = {
  title: "Organizations — Bumicerts",
  description:
    "Browse all nature steward organizations creating verified environmental impact on Bumicerts.",
};

export default async function AllOrganizationsPage() {
  try {
    // Fetch all organizations
    const response = await graphqlClient.request(AllOrganizationsQuery, {
      limit: 1000,
    });

    const orgInfos = (response.gainforest?.organization?.infos?.records ?? []) as GraphQLOrgInfo[];

    // We need activity counts per org - for now we'll set to 0 and let the client refetch
    // A more complete solution would be to query activities in parallel
    const activityCountByDid = new Map<string, number>();

    const organizations = orgInfosToOrganizationDataArray(orgInfos, activityCountByDid);

    return (
      <div className="w-full">
        <AllOrgsClient organizations={organizations} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch organizations:", error);
    return (
      <div className="w-full pt-20 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md px-6">
          <p className="text-muted-foreground text-sm leading-relaxed">
            We couldn&apos;t load organizations right now. Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }
}
