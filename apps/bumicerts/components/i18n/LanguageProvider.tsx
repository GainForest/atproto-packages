"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANGUAGE_COOKIE_NAME,
  resolveSupportedLanguage,
  type SupportedLanguageCode,
} from "@/lib/i18n/languages";

type LanguageContextValue = {
  language: SupportedLanguageCode;
  setLanguage: (language: SupportedLanguageCode) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistLanguage(language: SupportedLanguageCode) {
  const maxAge = 60 * 60 * 24 * 365;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  document.documentElement.lang = language;
}

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage: SupportedLanguageCode;
}) {
  const [language, setLanguageState] = useState(() =>
    resolveSupportedLanguage(initialLanguage),
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        persistLanguage(nextLanguage);
      },
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
