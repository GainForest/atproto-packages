import { cache } from "react";
import { notFound } from "next/navigation";
import { graphqlClient } from "@/lib/graphql/client";
import { ActivityByUriQuery } from "@/lib/graphql/queries";
import {
  activityToBumicertData,
  type GraphQLOrgInfo,
  type GraphQLHcActivity,
} from "@/lib/adapters";
import type { BumicertData } from "@/lib/types";
import { BumicertHero } from "./_components/Hero";
import { BumicertBody } from "./_components/Body";
import { BumicertDetailHeader } from "./_components/BumicertDetailHeader";

const getActivityData = cache(async (did: string) => {
  try {
    const response = await graphqlClient.request(ActivityByUriQuery, { did, orgDid: did });
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bumicertId: string }>;
}) {
  const { bumicertId } = await params;
  const id = decodeURIComponent(bumicertId);
  const parsed = id.includes("-") ? id.split("-") : null;
  if (!parsed) return { title: "Bumicert Not Found" };

  const [did, rkey] = parsed;
  const { data, error } = await getActivityData(did);

  if (error || !data) return { title: "Bumicert Not Found" };

  const activities = (data.hypercerts?.activities?.records ?? []) as GraphQLHcActivity[];
  const activity = activities.find((a) => a.meta?.rkey === rkey);

  if (!activity) return { title: "Bumicert Not Found" };

  return {
    title: `${activity.title ?? "Bumicert"} — Bumicerts`,
    description: activity.shortDescription ?? activity.description?.slice(0, 160) ?? "",
    openGraph: {
      title: `${activity.title ?? "Bumicert"} — Bumicerts`,
      description: activity.shortDescription ?? "",
      type: "article",
    },
  };
}

export default async function BumicertDetailPage({
  params,
}: {
  params: Promise<{ bumicertId: string }>;
}) {
  const { bumicertId } = await params;
  const id = decodeURIComponent(bumicertId);

  const parsed = id.includes("-") ? id.split("-") : null;
  if (!parsed) notFound();

  const [did, rkey] = parsed;

  const { data, error } = await getActivityData(did);

  if (error) {
    console.error("Error fetching Bumicert", did, rkey, error);
    throw new Error("Failed to load this bumicert. Please try again.");
  }

  const activities = (data?.hypercerts?.activities?.records ?? []) as GraphQLHcActivity[];
  const activity = activities.find((a) => a.meta?.rkey === rkey);

  if (!activity) {
    notFound();
  }

  const orgInfos = (data?.gainforest?.organization?.infos?.records ?? []) as GraphQLOrgInfo[];
  const orgInfo = orgInfos[0];

  const bumicert = activityToBumicertData(activity, orgInfo);

  return (
    <div className="w-full">
      <BumicertDetailHeader bumicertId={id} />
      <BumicertHero bumicert={bumicert} />
      <BumicertBody bumicert={bumicert} />
    </div>
  );
}
