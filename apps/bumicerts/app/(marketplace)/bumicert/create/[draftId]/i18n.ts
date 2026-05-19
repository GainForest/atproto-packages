export const getStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

export const localizeFormError = (
  message: string | undefined,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | undefined => {
  if (!message) return undefined;

  if (message === "Required") return t("validation.required");
  if (message === "No more than 50 characters allowed") {
    return t("validation.maxCharacters", { count: 50 });
  }
  if (message === "No more than 3000 characters allowed") {
    return t("validation.maxCharacters", { count: 3000 });
  }
  if (message === "Description is required") return t("validation.descriptionRequired");
  if (message === "All contributors must have a name") return t("validation.contributorNameRequired");
  if (message.startsWith("Cover image must be ") && message.includes("MB or smaller")) {
    return t("validation.coverImageMaxSize");
  }
  if (message === "Cover image must be JPG, PNG, or WebP") {
    return t("validation.coverImageType");
  }

  return message;
};
