import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  LANGUAGE_COOKIE_NAME,
  resolveSupportedLanguage,
} from "@/lib/i18n/languages";
import { messagesByLocale } from "@/messages/locales";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const cookieStore = await cookies();
  const requestedLocale = await requestLocale;
  const resolvedLocale = resolveSupportedLanguage(
    locale ?? requestedLocale ?? cookieStore.get(LANGUAGE_COOKIE_NAME)?.value,
  );

  return {
    locale: resolvedLocale,
    messages: messagesByLocale[resolvedLocale],
  };
});
