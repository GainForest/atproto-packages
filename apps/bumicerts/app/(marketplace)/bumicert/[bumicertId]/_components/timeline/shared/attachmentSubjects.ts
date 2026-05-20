import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";

export type AttachmentSubjectInfo = {
  uri: string;
  cid: string;
};

type PersistedAttachmentSubject = {
  uri: string | null;
  cid: string | null;
};

export type AttachmentStrongRef = AttachmentSubjectInfo & {
  $type: "com.atproto.repo.strongRef";
};

export function isValidAttachmentSubjectInfo(
  subject: AttachmentSubjectInfo | null | undefined,
): subject is AttachmentSubjectInfo {
  return Boolean(subject?.uri && subject.cid);
}

export function createOrderedAttachmentSubjects(args: {
  activitySubject: AttachmentSubjectInfo;
  contextualSubjects?: AttachmentSubjectInfo[];
}): AttachmentSubjectInfo[] {
  if (!isValidAttachmentSubjectInfo(args.activitySubject)) {
    return [];
  }

  const subjects: AttachmentSubjectInfo[] = [args.activitySubject];
  const seenUris = new Set<string>([args.activitySubject.uri]);

  for (const subject of args.contextualSubjects ?? []) {
    if (!isValidAttachmentSubjectInfo(subject) || seenUris.has(subject.uri)) {
      continue;
    }

    seenUris.add(subject.uri);
    subjects.push(subject);
  }

  return subjects;
}

export function toAttachmentStrongRefs(
  subjects: AttachmentSubjectInfo[],
): AttachmentStrongRef[] {
  return subjects.map((subject) => ({
    $type: "com.atproto.repo.strongRef",
    uri: subject.uri,
    cid: subject.cid,
  }));
}

function normalizePersistedSubject(
  subject: PersistedAttachmentSubject | null | undefined,
): AttachmentSubjectInfo | null {
  if (!subject?.uri || !subject.cid) {
    return null;
  }

  return {
    uri: subject.uri,
    cid: subject.cid,
  };
}

export function getAttachmentActivitySubject(
  subjects: AttachmentItem["record"]["subjects"] | null | undefined,
): AttachmentSubjectInfo | null {
  return normalizePersistedSubject(subjects?.[0]);
}

export function getAttachmentContextSubject(
  subjects: AttachmentItem["record"]["subjects"] | null | undefined,
): AttachmentSubjectInfo | null {
  return normalizePersistedSubject(subjects?.[1]);
}

export function isAttachmentForActivity(
  item: AttachmentItem,
  activityUri: string,
): boolean {
  return getAttachmentActivitySubject(item.record?.subjects)?.uri === activityUri;
}
