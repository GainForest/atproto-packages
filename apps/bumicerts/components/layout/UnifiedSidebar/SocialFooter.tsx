"use client";

import Link from "next/link";
import { GithubIcon, TwitterIcon, FileTextIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { links } from "@/lib/links";
import { cn } from "@/lib/utils";

const SOCIAL_LINKS = [
  { href: links.external.github, label: "GitHub", Icon: GithubIcon },
  { href: links.external.twitter, label: "X (Twitter)", Icon: TwitterIcon },
  { href: links.external.gainforest, label: "GainForest", Icon: FileTextIcon },
];

export function SocialFooter() {
  return (
    <div className="flex flex-col gap-2">
      {/* Social icons row */}
      <div className="flex items-center justify-center gap-1 px-2">
        {SOCIAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={cn(
              "p-2 rounded-md",
              "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              "transition-colors duration-150"
            )}
          >
            <link.Icon className="h-4 w-4" />
          </Link>
        ))}
      </div>

      {/* Version + Theme toggle */}
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] text-muted-foreground/50">v0.2.0</span>
        <ThemeToggle />
      </div>
    </div>
  );
}
