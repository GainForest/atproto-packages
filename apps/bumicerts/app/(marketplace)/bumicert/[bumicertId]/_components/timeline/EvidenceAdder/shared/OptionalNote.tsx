"use client";

import { useAtprotoStore } from "@/components/stores/atproto";
import {
  BumicertsLeafletEditorProps,
  LeafletEditor,
} from "@/components/ui/leaflet-editor";

export type OptionalNoteProps = {
  description: BumicertsLeafletEditorProps["content"];
  setDescription: BumicertsLeafletEditorProps["onChange"];
};

const OptionalNote = ({
  description,
  setDescription,
  disabled,
}: OptionalNoteProps & {
  disabled?: boolean;
}) => {
  const auth = useAtprotoStore((state) => state.auth);
  const ownerDid = auth.user?.did;

  if (!ownerDid) {
    return (
      <div className="w-full text-center text-destructive">
        Something went wrong. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col w-full">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-[0.1em]">
        Optional Note
      </p>
      <LeafletEditor
        content={description}
        onChange={setDescription}
        ownerDid={ownerDid}
        placeholder="Add context about this evidence…"
        initialHeight={96}
        minHeight={72}
        maxHeight={280}
        disabled={disabled}
      />
    </div>
  );
};

export default OptionalNote;
