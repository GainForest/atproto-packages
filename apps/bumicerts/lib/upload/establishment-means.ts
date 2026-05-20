export type EstablishmentMeansCode =
  | "native"
  | "introduced"
  | "naturalised"
  | "invasive"
  | "managed"
  | "uncertain";

export type EstablishmentMeansOption = {
  value: EstablishmentMeansCode | (string & {});
  label: string;
  description: string;
  gbifCodeLabel: string;
  legacy?: boolean;
};

type EstablishmentMeansTranslator = (
  key:
    | "managedLabel"
    | "managedDescription"
    | "nativeLabel"
    | "nativeDescription"
    | "naturalisedLabel"
    | "naturalisedDescription"
    | "uncertainLabel"
    | "uncertainDescription"
    | "introducedLabel"
    | "introducedDescription"
    | "invasiveLabel"
    | "invasiveDescription"
    | "legacyDescription",
) => string;

export const PARTNER_ESTABLISHMENT_MEANS_OPTIONS = [
  {
    value: "managed",
    label: "Your team planted them",
    description:
      "Trees were intentionally planted and are actively maintained by your community.",
    gbifCodeLabel: "managed",
  },
  {
    value: "native",
    label: "They grew here naturally",
    description:
      "Trees seeded and grew on their own. Species belongs in this region.",
    gbifCodeLabel: "native",
  },
  {
    value: "naturalised",
    label: "They regenerated naturally",
    description:
      "Trees that arrived from elsewhere and have established a self-sustaining population.",
    gbifCodeLabel: "naturalised",
  },
  {
    value: "uncertain",
    label: "Not sure",
    description:
      "Trees were already here when you started recording. Better to be honest than guess.",
    gbifCodeLabel: "uncertain",
  },
] as const satisfies readonly EstablishmentMeansOption[];

const LEGACY_ESTABLISHMENT_MEANS_OPTIONS = [
  {
    value: "introduced",
    label: "Introduced",
    description:
      "Species was brought here by people, but this older record does not specify whether it became naturalised or invasive.",
    gbifCodeLabel: "introduced",
    legacy: true,
  },
  {
    value: "invasive",
    label: "Invasive",
    description:
      "Species spreads aggressively outside its native range and can threaten local ecosystems.",
    gbifCodeLabel: "invasive",
    legacy: true,
  },
] as const satisfies readonly EstablishmentMeansOption[];

function createUnknownLegacyOption(value: string): EstablishmentMeansOption {
  return {
    value,
    label: value,
    description: "Legacy GBIF code preserved from an existing record.",
    gbifCodeLabel: value,
    legacy: true,
  };
}

export function translateEstablishmentMeansOption(
  option: EstablishmentMeansOption,
  t: EstablishmentMeansTranslator,
): EstablishmentMeansOption {
  switch (option.value) {
    case "managed":
      return { ...option, label: t("managedLabel"), description: t("managedDescription") };
    case "native":
      return { ...option, label: t("nativeLabel"), description: t("nativeDescription") };
    case "naturalised":
      return { ...option, label: t("naturalisedLabel"), description: t("naturalisedDescription") };
    case "uncertain":
      return { ...option, label: t("uncertainLabel"), description: t("uncertainDescription") };
    case "introduced":
      return { ...option, label: t("introducedLabel"), description: t("introducedDescription") };
    case "invasive":
      return { ...option, label: t("invasiveLabel"), description: t("invasiveDescription") };
    default:
      return { ...option, description: t("legacyDescription") };
  }
}

export function getPartnerEstablishmentMeansOptions(
  t: EstablishmentMeansTranslator,
): EstablishmentMeansOption[] {
  return PARTNER_ESTABLISHMENT_MEANS_OPTIONS.map((option) =>
    translateEstablishmentMeansOption(option, t),
  );
}

export function getEstablishmentMeansOption(
  value: string | null | undefined
): EstablishmentMeansOption | null {
  if (!value) {
    return null;
  }

  const option = [
    ...PARTNER_ESTABLISHMENT_MEANS_OPTIONS,
    ...LEGACY_ESTABLISHMENT_MEANS_OPTIONS,
  ].find((item) => item.value === value);

  return option ?? createUnknownLegacyOption(value);
}

export function getSelectableEstablishmentMeansOptions(
  currentValue: string | null | undefined,
  t?: EstablishmentMeansTranslator,
): EstablishmentMeansOption[] {
  const options: EstablishmentMeansOption[] = t
    ? getPartnerEstablishmentMeansOptions(t)
    : [...PARTNER_ESTABLISHMENT_MEANS_OPTIONS];
  const currentOption = getEstablishmentMeansOption(currentValue);

  if (currentOption?.legacy) {
    options.push(t ? translateEstablishmentMeansOption(currentOption, t) : currentOption);
  }

  return options;
}
