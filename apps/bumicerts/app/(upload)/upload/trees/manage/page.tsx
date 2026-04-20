import { redirect } from "next/navigation";
import { links } from "@/lib/links";

type TreesManagePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TreesManagePage({
  searchParams,
}: TreesManagePageProps) {
  const resolvedSearchParams = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
      continue;
    }

    if (value !== undefined) {
      query.append(key, value);
    }
  }

  const queryString = query.toString();

  redirect(
    queryString === ""
      ? links.manage.trees
      : `${links.manage.trees}?${queryString}`,
  );
}
