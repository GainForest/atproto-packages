import { cache } from "react";
import { notFound } from "next/navigation";
import { graphqlClient } from "@/lib/graphql/client";
import { OrganizationByDidQuery } from "@/lib/graphql/queries";
import {
  orgInfoToOrganizationData,
  activitiesToBumicertDataArray,
  type GraphQLOrgInfo,
  type GraphQLHcActivity,
} from "@/lib/adapters";
import Container from "@/components/ui/container";
import { OrgPageClient } from "./OrgPageClient";

const getOrgData = cache(async (did: string) => {
  try {
    const response = await graphqlClient.request(OrganizationByDidQuery, { did, orgDid: did });
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const { data, error } = await getOrgData(did);

  if (error || !data) return { title: "Organization — Bumicerts" };

  const orgInfos = data.gainforest?.organization?.infos?.records ?? [];
  const orgInfo = orgInfos[0] as GraphQLOrgInfo | undefined;

  if (!orgInfo) return { title: "Organization — Bumicerts" };

  // Extract short description text
  const shortDesc = orgInfo.shortDescription;
  const descText = typeof shortDesc === "object" && shortDesc?.text
    ? shortDesc.text
    : typeof shortDesc === "string"
      ? shortDesc
      : "";

  return {
    title: `${orgInfo.displayName ?? "Organization"} — Bumicerts`,
    description: descText,
  };
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ did: string }>;
}) {
  const { did: encodedDid } = await params;
  const did = decodeURIComponent(encodedDid);

  const { data, error } = await getOrgData(did);

  if (error) {
    console.error("Error fetching org page", did, error);
    throw new Error("Failed to load organization. Please try again.");
  }

  const orgInfos = (data?.gainforest?.organization?.infos?.records ?? []) as GraphQLOrgInfo[];
  const orgInfo = orgInfos[0];

  if (!orgInfo) {
    notFound();
  }

  // Visibility check — if Unlisted, only the owner can see it (we don't gate for now)
  if (orgInfo.visibility === "Unlisted") {
    notFound();
  }

  // Get activities for this org
  const activities = (data?.hypercerts?.activities?.records ?? []) as GraphQLHcActivity[];

  // Build org info map for adapter
  const orgInfoByDid = new Map<string, GraphQLOrgInfo>();
  orgInfoByDid.set(did, orgInfo);

  // Transform data
  const organization = orgInfoToOrganizationData(orgInfo, activities.length);
  const bumicerts = activitiesToBumicertDataArray(activities, orgInfoByDid);

  return (
    <Container className="pt-4">
      <OrgPageClient organization={organization} bumicerts={bumicerts} />
    </Container>
  );
}
