import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import FileInput from "../../../../../../../../components/ui/FileInput";
import { useState } from "react";
import { Loader2, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toSerializableFile } from "@/lib/mutations-utils";
import { upsertOrganizationInfoAction } from "@/lib/actions/organizations";
import { graphqlClient } from "@/lib/graphql/client";
import { graphql } from "@/lib/graphql/tada";

export const UploadLogoModalId = "upload/organization/logo";

// Query to get current organization info
const OrgInfoQuery = graphql(`
  query OrgInfoForLogoUpload($did: String!) {
    gainforest {
      organization {
        infos(where: { did: $did }, limit: 1) {
          records {
            meta { did }
            displayName
            shortDescription
            longDescription
            objectives
            country
            visibility
            website
            startDate
            createdAt
            logo {
              cid
              uri
            }
            coverImage {
              cid
              uri
            }
          }
        }
      }
    }
  }
`);

export const UploadLogoModal = () => {
  const { stack, popModal, hide } = useModal();
  const [logo, setLogo] = useState<File | null>(null);
  const auth = useAtprotoStore((state) => state.auth);
  const queryClient = useQueryClient();

  const {
    data: orgInfoData,
    isPending: isPendingOrganizationInfo,
    isPlaceholderData: isOlderData,
  } = useQuery({
    queryKey: ["org-info-for-logo", auth.user?.did],
    queryFn: async () => {
      if (!auth.user?.did) return null;
      const response = await graphqlClient.request(OrgInfoQuery, {
        did: auth.user.did,
      });
      return response.gainforest?.organization?.infos?.records?.[0] ?? null;
    },
    enabled: !!auth.user?.did,
    staleTime: 30 * 1000,
  });

  const isLoadingOrganizationInfo = isPendingOrganizationInfo || isOlderData;

  const {
    mutate: uploadLogo,
    isPending: isUploadingLogo,
    isSuccess: isUploaded,
  } = useMutation({
    mutationFn: async () => {
      if (!auth.user?.did) throw new Error("User is not authenticated");
      if (!logo) throw new Error("Logo is required");
      if (!orgInfoData) throw new Error("Organization information is required");

      // Convert file to serializable format for the mutation
      const logoFile = await toSerializableFile(logo);

      // Extract shortDescription text - GraphQL returns { text, facets } object
      const shortDesc = orgInfoData.shortDescription as
        | { text?: string | null }
        | string
        | null
        | undefined;
      const shortDescText =
        typeof shortDesc === "object" && shortDesc?.text
          ? shortDesc.text
          : typeof shortDesc === "string"
          ? shortDesc
          : "";

      // Extract objectives - ensure correct enum type
      const objectives = (orgInfoData.objectives ?? []).filter(
        (obj): obj is "Conservation" | "Research" | "Education" | "Community" | "Other" =>
          ["Conservation", "Research", "Education", "Community", "Other"].includes(obj as string)
      );

      // Parse the JSON fields from GraphQL response
      // GraphQL returns these as JSON scalars
      type RichtextShape = { text: string; facets?: unknown[] };
      type LinearDocShape = { blocks: unknown[] };

      const shortDescJson = orgInfoData.shortDescription as RichtextShape | null;
      const longDescJson = orgInfoData.longDescription as LinearDocShape | null;

      // Call the upsert mutation with the new logo
      const result = await upsertOrganizationInfoAction({
        displayName: orgInfoData.displayName ?? "",
        shortDescription: shortDescJson ?? { text: shortDescText },
        longDescription: longDescJson ?? { blocks: [] },
        objectives,
        country: (orgInfoData.country as string) || "", // Required field
        visibility: (orgInfoData.visibility as "Public" | "Unlisted") ?? "Public",
        website: (orgInfoData.website as `${string}:${string}`) ?? undefined,
        startDate: (orgInfoData.startDate as `${string}-${string}-${string}T${string}:${string}:${string}Z`) ?? undefined,
        logo: {
          $type: "org.hypercerts.defs#smallImage" as const,
          image: logoFile,
        },
        // Keep existing cover image if present
        // Note: We can't easily preserve the existing blob without re-fetching it
      } as any);

      return result;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the logo
      queryClient.invalidateQueries({ queryKey: ["org-logo"] });
      queryClient.invalidateQueries({ queryKey: ["org-info"] });
    },
  });

  return (
    <ModalContent>
      <ModalHeader
        backAction={
          stack.length === 1
            ? undefined
            : () => {
                popModal();
              }
        }
      >
        <ModalTitle>Upload Logo</ModalTitle>
        <ModalDescription>
          Upload a logo for your organization.
        </ModalDescription>
      </ModalHeader>
      {isLoadingOrganizationInfo ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin" />
          <span className="text-sm text-muted-foreground">
            Loading organization information...
          </span>
        </div>
      ) : (
        <FileInput
          placeholder="Upload a logo for your organization"
          supportedFileTypes={[
            "image/jpg",
            "image/jpeg",
            "image/png",
            "image/webp",
          ]}
          maxSizeInMB={5}
          value={logo}
          onFileChange={setLogo}
        />
      )}

      <ModalFooter>
        {isUploaded ? (
          <Button
            onClick={() => {
              if (stack.length === 1) {
                hide().then(() => {
                  popModal();
                });
              } else {
                popModal();
              }
            }}
          >
            Done
          </Button>
        ) : (
          <Button
            disabled={isLoadingOrganizationInfo || !logo || isUploadingLogo}
            onClick={() => uploadLogo()}
          >
            {isUploadingLogo ? (
              <Loader2 className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            {isUploadingLogo ? "Uploading..." : "Upload"}
          </Button>
        )}
      </ModalFooter>
    </ModalContent>
  );
};
