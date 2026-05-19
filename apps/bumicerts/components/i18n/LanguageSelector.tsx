"use client";

import { Globe2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "./LanguageProvider";
import {
  SUPPORTED_LANGUAGES,
  getLanguageLabel,
  isSupportedLanguageCode,
} from "@/lib/i18n/languages";
import { getHomeCopy } from "@/lib/i18n/translations";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const copy = getHomeCopy(language).language;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-muted-foreground hover:text-foreground"
          aria-label={`${copy.changeAria}. ${copy.currentLanguage}: ${getLanguageLabel(language)}`}
        >
          <Globe2Icon aria-hidden="true" />
          <span className="text-xs font-semibold uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{copy.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(value) => {
            if (isSupportedLanguageCode(value)) {
              setLanguage(value);
            }
          }}
        >
          {SUPPORTED_LANGUAGES.map((option) => (
            <DropdownMenuRadioItem key={option.code} value={option.code}>
              <span className="flex flex-col">
                <span>{option.nativeLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {option.label}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
