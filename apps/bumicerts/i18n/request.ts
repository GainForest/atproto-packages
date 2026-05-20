import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  LANGUAGE_COOKIE_NAME,
  resolvePreferredLanguageFromHeader,
  resolveSupportedLanguage,
} from "@/lib/i18n/languages";
import { messagesByLocale } from "@/messages/locales";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const requestedLocale = await requestLocale;
  const savedLocale = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  const requestedLanguage = locale ?? requestedLocale;
  const resolvedLocale = savedLocale
    ? resolveSupportedLanguage(savedLocale)
    : requestedLanguage
      ? resolveSupportedLanguage(requestedLanguage)
      : resolvePreferredLanguageFromHeader(headerStore.get("accept-language"));

  return {
    locale: resolvedLocale,
    messages: messagesByLocale[resolvedLocale],
  };
});
