"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { TREE_UPLOAD_EVENTS, type TreeUploadEventPayload } from "@/lib/analytics/events";
import { trackTreeUploadEvent } from "@/lib/analytics/hotjar";
import { links } from "@/lib/links";

type TreeUploadFeedbackModalProps = {
  analyticsPayload: TreeUploadEventPayload;
};

export function TreeUploadFeedbackModal({
  analyticsPayload,
}: TreeUploadFeedbackModalProps) {
  const { popModal } = useModal();

  const handleClose = () => {
    trackTreeUploadEvent(TREE_UPLOAD_EVENTS.FEEDBACK_FORM_CLOSED, analyticsPayload);
    popModal();
  };

  return (
    <ModalContent
      dismissible={false}
      className="flex max-h-[85vh] flex-col space-y-5 overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))] group-data-[vaul-drawer-direction=bottom]/drawer-content:max-h-[calc(80vh-3rem)]"
    >
      <ModalHeader backAction={handleClose}>
        <div>
          <ModalTitle>Share tree upload feedback</ModalTitle>
          <ModalDescription>
            This short beta form helps us turn your onboarding experience into
            clear fixes for the next release.
          </ModalDescription>
        </div>
      </ModalHeader>

      <div className="min-h-0 overflow-hidden rounded-2xl border border-border bg-muted/20">
        <iframe
          src={links.external.treeUploadFeedbackFormEmbed}
          title="Bumicerts tree data upload beta feedback form"
          className="h-[42dvh] min-h-[240px] w-full bg-background sm:h-[65vh] sm:min-h-[480px]"
          loading="lazy"
        />
      </div>

      <ModalFooter className="gap-2">
        <Button variant="outline" asChild>
          <a
            href={links.external.treeUploadFeedbackForm}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink />
            Open in new tab
          </a>
        </Button>
        <Button variant="ghost" onClick={handleClose}>
          Back to upload summary
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
