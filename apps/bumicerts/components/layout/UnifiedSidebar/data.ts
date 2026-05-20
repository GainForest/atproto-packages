import {
  CompassIcon,
  Building2Icon,
  TrophyIcon,
  MapPinIcon,
  MicIcon,
  TreePineIcon,
} from "lucide-react";
import BumicertIcon from "@/icons/BumicertIcon";
import { links } from "@/lib/links";

// ── Nav item types ─────────────────────────────────────────────────────────────

export interface NavLeaf {
  kind: "leaf";
  id: string;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
  pathCheck: { equals?: string; startsWith?: string };
}

export interface NavSection {
  kind: "section";
  id: string;
  labelKey: string;
  items: NavLeaf[];
  /** If true, section is only shown when authenticated. Shows sign-in prompt otherwise. */
  requiresAuth?: boolean;
}

export interface NavSeparator {
  kind: "separator";
  id: string;
}

export type NavItem = NavSection | NavSeparator;

// ── Navigation structure ────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "section",
    id: "explore",
    labelKey: "sections.explore",
    items: [
      {
        kind: "leaf",
        id: "bumicerts",
        labelKey: "items.bumicerts",
        Icon: CompassIcon,
        href: links.explore,
        pathCheck: { startsWith: links.explore },
      },
      {
        kind: "leaf",
        id: "organizations",
        labelKey: "items.organizations",
        Icon: Building2Icon,
        href: links.allOrganizations,
        pathCheck: { startsWith: "/organizations" },
      },
      {
        kind: "leaf",
        id: "leaderboard",
        labelKey: "items.leaderboard",
        Icon: TrophyIcon,
        href: links.leaderboard,
        pathCheck: { equals: links.leaderboard },
      },
    ],
  },
  {
    kind: "section",
    id: "manage",
    labelKey: "sections.manage",
    requiresAuth: true,
    items: [
      {
        kind: "leaf",
        id: "organization",
        labelKey: "items.organization",
        Icon: Building2Icon,
        href: links.manage.home,
        pathCheck: { equals: links.manage.home },
      },
      {
        kind: "leaf",
        id: "sites",
        labelKey: "items.sites",
        Icon: MapPinIcon,
        href: links.manage.sites,
        pathCheck: { startsWith: links.manage.sites },
      },
      {
        kind: "leaf",
        id: "audio",
        labelKey: "items.audio",
        Icon: MicIcon,
        href: links.manage.audio,
        pathCheck: { startsWith: links.manage.audio },
      },
      {
        kind: "leaf",
        id: "bumicerts-manage",
        labelKey: "items.bumicerts",
        Icon: BumicertIcon,
        href: links.manage.bumicerts,
        pathCheck: { startsWith: links.manage.bumicerts },
      },
      {
        kind: "leaf",
        id: "trees",
        labelKey: "items.trees",
        Icon: TreePineIcon,
        href: links.manage.trees,
        pathCheck: { startsWith: links.manage.trees },
      },
    ],
  },
];
