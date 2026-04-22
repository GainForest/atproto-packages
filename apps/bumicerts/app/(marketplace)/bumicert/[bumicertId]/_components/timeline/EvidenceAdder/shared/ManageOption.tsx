import { links } from "@/lib/links";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const TYPE_HREFS = {
  audio: links.manage.audio,
  sites: links.manage.sites,
  trees: links.manage.trees,
};

const ManageOption = ({ type }: { type: "audio" | "sites" | "trees" }) => {
  return (
    <div className="flex justify-end">
      <Link
        href={TYPE_HREFS[type]}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        Manage
        <ArrowUpRight className="size-3" />
      </Link>
    </div>
  );
};

export default ManageOption;
