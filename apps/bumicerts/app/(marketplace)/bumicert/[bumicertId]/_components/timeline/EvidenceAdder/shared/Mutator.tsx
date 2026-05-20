"use client";

import { useState } from "react";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useAtprotoStore } from "@/components/stores/atproto";
import { Button } from "@/components/ui/button";
import type { BumicertsLeafletEditorProps } from "@/components/ui/leaflet-editor";
import { toSerializableFile } from "@/lib/mutations-utils";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";
import {
  createOrderedAttachmentSubjects,
  isValidAttachmentSubjectInfo,
  toAttachmentStrongRefs,
  type AttachmentSubjectInfo,
} from "../../shared/attachmentSubjects";
import { useEvidenceAdderStore } from "./evidenceAdderStore";
import {
  buildOptimisticAttachmentItem,
  type OptimisticAttachmentContent,
} from "./optimisticAttachmentItem";
import { useTranslations } from "next-intl";

export type AttachmentData = {
  title: string;
  contentType: string;
  description?: BumicertsLeafletEditorProps["content"];
  contents: Array<string | File>;
  subjectInfo: AttachmentSubjectInfo;
  contextualSubjects?: AttachmentSubjectInfo[];
};

type AttachmentMutatorData = AttachmentData | AttachmentData[];
type SerializableAttachmentFile = Awaited<ReturnType<typeof toSerializableFile>>;
type ResolvedAttachmentContent = string | SerializableAttachmentFile;
type CreatedAttachmentRecord = {
  uri: string;
  rkey: string;
  cid: string;
};

type CreatedAttachment = {
  data: AttachmentData;
  created: CreatedAttachmentRecord;
  resolvedContents: ResolvedAttachmentContent[];
};

const INVALID_ACTIVITY_SUBJECT_MESSAGE =
  "Cannot link evidence because the bumicert reference is incomplete. Refresh the page and try again.";

function hasDescription(
  description: BumicertsLeafletEditorProps["content"] | undefined,
): description is BumicertsLeafletEditorProps["content"] {
  return Boolean(description && description.blocks.length > 0);
}

async function resolveAttachmentContents(
  contents: Array<string | File>,
): Promise<ResolvedAttachmentContent[]> {
  return Promise.all(
    contents.map(async (content) => {
      if (typeof content === "string") {
        return content;
      }

      return toSerializableFile(content);
    }),
  );
}

function toOptimisticContents(
  contents: ResolvedAttachmentContent[],
): OptimisticAttachmentContent[] {
  return contents.map((content) => {
    if (typeof content === "string") {
      return content;
    }

    const mimeType =
      content.type.length > 0 ? content.type : "application/octet-stream";

    return {
      name: content.name,
      type: mimeType,
      size: content.size,
      dataUrl: `data:${mimeType};base64,${content.data}`,
    };
  });
}

function hasInvalidActivitySubject(items: AttachmentData[]): boolean {
  return items.some(
    (item) =>
      item.contents.length > 0 &&
      !isValidAttachmentSubjectInfo(item.subjectInfo),
  );
}

function buildPartialSuccessMessage(args: {
  createdCount: number;
  totalCount: number;
  cause: unknown;
}): string {
  const createdLabel = `${args.createdCount} attachment${args.createdCount === 1 ? "" : "s"}`;
  const totalLabel = `${args.totalCount} group${args.totalCount === 1 ? "" : "s"}`;
  return `${createdLabel} linked, but not all ${totalLabel} completed. ${formatError(args.cause)}`;
}

const Mutator = ({
  data,
  onSuccess,
}: {
  data: AttachmentMutatorData;
  onSuccess?: () => void;
}) => {
  const t = useTranslations("bumicert.detail.evidenceAdder");
  const isSubmitting = useEvidenceAdderStore((state) => state.isSubmitting);
  const setIsSubmitting = useEvidenceAdderStore(
    (state) => state.setIsSubmitting,
  );
  const viewerDid = useAtprotoStore((state) => state.auth.user?.did ?? null);
  const organizationDid = useEvidenceAdderStore((state) => state.organizationDid);
  const indexerUtils = indexerTrpc.useUtils();

  const createAttachment = trpc.context.attachment.create.useMutation();
  const [errorMessage, setErrorMessage] = useState<string>();
  const dataItems = Array.isArray(data) ? data : [data];
  const totalContentCount = dataItems.reduce(
    (total, item) => total + item.contents.length,
    0,
  );
  const subjectErrorMessage = hasInvalidActivitySubject(dataItems)
    ? INVALID_ACTIVITY_SUBJECT_MESSAGE
    : null;

  const mutate = async () => {
    const itemsToCreate = dataItems.filter((item) => item.contents.length > 0);
    if (itemsToCreate.length === 0) return;

    if (hasInvalidActivitySubject(itemsToCreate)) {
      setErrorMessage(INVALID_ACTIVITY_SUBJECT_MESSAGE);
      return;
    }

    setErrorMessage(undefined);
    setIsSubmitting(true);

    const createdAttachments: CreatedAttachment[] = [];

    const reconcileCreatedAttachments = async () => {
      if (createdAttachments.length === 0) {
        return;
      }

      if (!organizationDid) {
        try {
          await indexerUtils.context.attachments.invalidate();
        } catch {}
        return;
      }

      const optimisticItems = createdAttachments.map(
        ({ data: item, created, resolvedContents }) =>
          buildOptimisticAttachmentItem({
            did: viewerDid ?? organizationDid,
            uri: created.uri,
            rkey: created.rkey,
            cid: created.cid,
            title: item.title,
            contentType: item.contentType,
            description: item.description,
            subjectInfo: item.subjectInfo,
            contextualSubjects: item.contextualSubjects,
            contents: toOptimisticContents(resolvedContents),
          }),
      );
      const createdRkeys = new Set(
        createdAttachments.map(({ created }) => created.rkey),
      );

      const applyOptimisticUpdate = () => {
        indexerUtils.context.attachments.setData(
          { did: organizationDid },
          (previous) => {
            const current = previous ?? [];
            const deduped = current.filter(
              (item) => !createdRkeys.has(item.metadata?.rkey ?? ""),
            );
            return [...optimisticItems, ...deduped];
          },
        );
      };

      applyOptimisticUpdate();

      try {
        await indexerUtils.context.attachments.invalidate({
          did: organizationDid,
        });
        applyOptimisticUpdate();
      } catch {
        applyOptimisticUpdate();
      }
    };

    try {
      for (const item of itemsToCreate) {
        const resolvedContents = await resolveAttachmentContents(item.contents);
        const orderedSubjects = createOrderedAttachmentSubjects({
          activitySubject: item.subjectInfo,
          contextualSubjects: item.contextualSubjects,
        });
        const created = await createAttachment.mutateAsync({
          title: item.title,
          contentType: item.contentType,
          subjects: toAttachmentStrongRefs(orderedSubjects),
          content: resolvedContents.map((content) => {
            if (typeof content === "string") {
              return { $type: "org.hypercerts.defs#uri", uri: content };
            }

            return { $type: "org.hypercerts.defs#smallBlob", blob: content };
          }),
          ...(hasDescription(item.description)
            ? { description: item.description }
            : {}),
        });

        createdAttachments.push({ data: item, created, resolvedContents });
      }

      await reconcileCreatedAttachments();
      onSuccess?.();
    } catch (e) {
      await reconcileCreatedAttachments();

      if (createdAttachments.length > 0) {
        onSuccess?.();
        setErrorMessage(
          buildPartialSuccessMessage({
            createdCount: createdAttachments.length,
            totalCount: itemsToCreate.length,
            cause: e,
          }),
        );
      } else {
        setErrorMessage(formatError(e));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderedErrorMessage = subjectErrorMessage ?? errorMessage;

  return (
    <>
      {renderedErrorMessage && (
        <p className="text-sm text-destructive">{renderedErrorMessage}</p>
      )}

      <Button
        onClick={mutate}
        disabled={isSubmitting || totalContentCount === 0 || Boolean(subjectErrorMessage)}
        className="w-full"
      >
        {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
        {isSubmitting
          ? t("linking")
          : totalContentCount === 0
            ? t("selectToLink")
            : t("linkItems", { count: totalContentCount })}
        {!isSubmitting ? <ArrowRightIcon /> : null}
      </Button>
    </>
  );
};

export default Mutator;
