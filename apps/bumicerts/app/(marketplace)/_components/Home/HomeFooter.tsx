"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ExternalLinkIcon,
  FileTextIcon,
  GithubIcon,
  GlobeIcon,
  TwitterIcon,
} from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getHomeCopy } from "@/lib/i18n/translations";
import { links } from "@/lib/links";

const FOOTER_LINKS = [
  {
    href: links.external.gainforest,
    label: "GainForest",
    Icon: GlobeIcon,
    external: true,
  },
  {
    href: links.external.docs,
    label: "Documentation",
    Icon: FileTextIcon,
    external: true,
  },
  {
    href: links.external.twitter,
    label: "Twitter",
    Icon: TwitterIcon,
    external: true,
  },
  {
    href: links.external.github,
    label: "GitHub",
    Icon: GithubIcon,
    external: true,
  },
];

export function HomeFooter() {
  const { language } = useLanguage();
  const copy = getHomeCopy(language).footer;
  const footerLinks = FOOTER_LINKS.map((link) =>
    link.href === links.external.docs
      ? { ...link, label: copy.documentation }
      : link,
  );

  return (
    <footer className="max-w-7xl mx-auto px-6 py-16 border-t border-border">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        {/* Brand */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/assets/media/images/app-icon.png"
              alt="Bumicerts"
              width={28}
              height={28}
              className="drop-shadow-md"
            />
            <span className="font-serif text-xl font-bold tracking-tight">
              Bumicerts
            </span>
          </div>
          <p
            className="text-muted-foreground text-sm"
            style={{
              fontFamily: "var(--font-instrument-serif-var)",
              fontStyle: "italic",
            }}
          >
            {copy.tagline}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {copy.infrastructure}
          </p>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 py-0.5"
            >
              <link.Icon className="h-3.5 w-3.5" />
              <span>{link.label}</span>
              {link.external && (
                <ExternalLinkIcon className="h-3 w-3 opacity-50" />
              )}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} Bumicerts. {copy.copyright}
      </div>
    </footer>
  );
}
