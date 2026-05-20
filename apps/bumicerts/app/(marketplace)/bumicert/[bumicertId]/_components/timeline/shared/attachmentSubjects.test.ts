import { describe, expect, test } from "bun:test";
import {
  createOrderedAttachmentSubjects,
  getAttachmentContextSubject,
  isAttachmentForActivity,
  isValidAttachmentSubjectInfo,
  toAttachmentStrongRefs,
} from "./attachmentSubjects";
import type { AttachmentItem } from "@/graphql/indexer/queries/attachments";

const activitySubject = {
  uri: "at://did:plc:org/org.hypercerts.claim.activity/activity-1",
  cid: "bafy-activity",
};
const siteSubject = {
  uri: "at://did:plc:org/app.certified.location/site-1",
  cid: "bafy-site",
};

function makeAttachment(subjects: AttachmentItem["record"]["subjects"]): AttachmentItem {
  return {
    metadata: {
      did: "did:plc:org",
      uri: "at://did:plc:org/org.hypercerts.context.attachment/att-1",
      rkey: "att-1",
      cid: "bafy-att",
      createdAt: null,
      indexedAt: null,
    },
    creatorInfo: null,
    record: {
      title: "Attachment",
      shortDescription: null,
      description: null,
      contentType: "evidence",
      subjects,
      content: [],
      createdAt: null,
    },
  };
}

describe("attachment subjects", () => {
  test("keeps the activity subject first and context subjects after it", () => {
    expect(
      createOrderedAttachmentSubjects({
        activitySubject,
        contextualSubjects: [siteSubject],
      }),
    ).toEqual([activitySubject, siteSubject]);
  });

  test("does not promote context subjects when the activity subject is incomplete", () => {
    expect(
      createOrderedAttachmentSubjects({
        activitySubject: { uri: activitySubject.uri, cid: "" },
        contextualSubjects: [siteSubject],
      }),
    ).toEqual([]);
  });

  test("serializes subjects as ATProto strong refs", () => {
    expect(toAttachmentStrongRefs([activitySubject, siteSubject])).toEqual([
      {
        $type: "com.atproto.repo.strongRef",
        ...activitySubject,
      },
      {
        $type: "com.atproto.repo.strongRef",
        ...siteSubject,
      },
    ]);
  });

  test("matches attachments only through subjects[0]", () => {
    const item = makeAttachment([siteSubject, activitySubject]);

    expect(isAttachmentForActivity(item, activitySubject.uri)).toBe(false);
    expect(isAttachmentForActivity(item, siteSubject.uri)).toBe(true);
  });

  test("reads subjects[1] as contextual site metadata", () => {
    expect(getAttachmentContextSubject(makeAttachment([activitySubject, siteSubject]).record.subjects)).toEqual(siteSubject);
  });

  test("rejects incomplete strong refs before creating attachments", () => {
    expect(isValidAttachmentSubjectInfo(activitySubject)).toBe(true);
    expect(isValidAttachmentSubjectInfo({ uri: activitySubject.uri, cid: "" })).toBe(false);
  });
});
