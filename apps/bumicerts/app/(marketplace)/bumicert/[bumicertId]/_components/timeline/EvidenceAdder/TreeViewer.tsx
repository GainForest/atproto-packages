import { OccurrenceItem } from "@/lib/graphql-dev/queries";
import CheckRow from "./shared/CheckRow";
import React, { useState } from "react";
import { TreesIcon } from "lucide-react";
import { ListEmpty, ListLayout } from "./shared/RecordList";
import ManageOption from "./shared/ManageOption";
import OptionalNote, { OptionalNoteProps } from "./shared/OptionalNote";
import { SubjectInfo } from ".";
import Mutator, { AttachmentData } from "./shared/Mutator";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TreeViewer = ({
  data,
  description,
  setDescription,
  ...props
}: { data: OccurrenceItem[] } & OptionalNoteProps & SubjectInfo) => {
  const [prevData, setPrevData] = useState(data);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());
  const toggle = (uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  if (data !== prevData) {
    const newSet = new Set<string>();
    data.forEach((item) => {
      const uri = item.metadata?.uri;
      if (!uri) return;
      if (selectedUris.has(uri)) {
        newSet.add(uri);
      }
    });
    setSelectedUris(newSet);
    setPrevData(data);
  }
  const [isSubmitting, setSubmitting] = useState(false);

  if (data.length === 0) {
    return <ListEmpty tabId="trees" />;
  }

  const computedMutationData: AttachmentData = {
    title: "Tree Occurrences",
    description,
    subjectInfo: {
      uri: props.activityUri,
      cid: props.activityCid,
    },
    contents: Array.from(selectedUris),
  };

  return (
    <React.Fragment>
      <ListLayout>
        {data.map((item) => {
          const uri = item.metadata?.uri;
          if (!uri) return null;
          const species =
            item.record?.scientificName ??
            item.record?.vernacularName ??
            "Unknown species";
          const count = item.record?.individualCount;
          const date = formatDate(
            item.record?.eventDate ?? item.record?.createdAt ?? undefined,
          );
          const secondary = [
            count != null
              ? `${count} individual${count !== 1 ? "s" : ""}`
              : null,
            date,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <CheckRow
              key={uri}
              selected={selectedUris.has(uri)}
              onToggle={() => toggle(uri)}
              icon={TreesIcon}
              primary={species}
              secondary={secondary || undefined}
              disabled={isSubmitting}
            />
          );
        })}
      </ListLayout>

      <ManageOption type="trees" />
      <OptionalNote
        description={description}
        setDescription={setDescription}
        disabled={isSubmitting}
      />
      <Mutator
        data={computedMutationData}
        isSubmitting={isSubmitting}
        setIsSubmitting={setSubmitting}
        onSuccess={() => {
          setDescription({ blocks: [] });
          setSelectedUris(new Set());
        }}
      />
    </React.Fragment>
  );
};

export default TreeViewer;
