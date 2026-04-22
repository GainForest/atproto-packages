import type { Dispatch, SetStateAction } from "react";
import type { OptionalNoteProps } from "./OptionalNote";

export type SubjectInfo = {
  activityUri: string;
  activityCid: string;
};

export type ViewerSharedProps = OptionalNoteProps &
  SubjectInfo & {
    isSubmitting: boolean;
    setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  };
