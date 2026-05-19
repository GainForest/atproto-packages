export const LANGUAGE_COOKIE_NAME = "bumicerts-language";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguageCode = "en";

export function isSupportedLanguageCode(
  value: string | undefined,
): value is SupportedLanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

export function resolveSupportedLanguage(
  value: string | undefined,
): SupportedLanguageCode {
  return isSupportedLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageLabel(code: SupportedLanguageCode): string {
  return (
    SUPPORTED_LANGUAGES.find((language) => language.code === code)?.nativeLabel ??
    code.toUpperCase()
  );
}
