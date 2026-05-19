export const LANGUAGE_COOKIE_NAME = "bumicerts-language";

export const SUPPORTED_LOCALES = ["en", "es", "pt", "sw", "id"] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguageCode = "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
] as const satisfies ReadonlyArray<{
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
}>;

export function isSupportedLanguageCode(
  value: string | undefined,
): value is SupportedLanguageCode {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
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
