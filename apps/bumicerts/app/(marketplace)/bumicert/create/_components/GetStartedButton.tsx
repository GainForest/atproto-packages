"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";
import { trackBumicertFlowStarted } from "@/lib/analytics/hotjar";

const GetStartedButton = () => {
  const handleClick = () => {
    trackBumicertFlowStarted({ draftId: "0" });
  };

  return (
    <Button asChild>
      <Link href={links.bumicert.createWithDraftId("0")} onClick={handleClick}>
        <PlusIcon />
        Create a Bumicert
      </Link>
    </Button>
  );
};

export default GetStartedButton;
