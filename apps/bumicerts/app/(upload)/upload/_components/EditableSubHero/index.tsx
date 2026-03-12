"use client";

import { motion } from "framer-motion";
import {
  CalendarIcon,
  GlobeIcon,
  LockIcon,
  MapPinIcon,
  PencilIcon,
  PlusCircleIcon,
} from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { CountrySelectorModal } from "../../_modals/CountrySelectorModal";
import { WebsiteEditorModal } from "../../_modals/WebsiteEditorModal";
import { StartDateSelectorModal } from "../../_modals/StartDateSelectorModal";
import { VisibilitySelectorModal } from "../../_modals/VisibilitySelectorModal";
import { useUploadDashboardStore } from "../store";
import type { OrganizationData } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AR: "Argentina",
  AU: "Australia", AT: "Austria", BD: "Bangladesh", BE: "Belgium",
  BO: "Bolivia", BR: "Brazil", KH: "Cambodia", CM: "Cameroon",
  CA: "Canada", CL: "Chile", CN: "China", CO: "Colombia",
  CD: "Congo (DRC)", CR: "Costa Rica", HR: "Croatia", CZ: "Czech Republic",
  DK: "Denmark", DO: "Dominican Republic", EC: "Ecuador", EG: "Egypt",
  SV: "El Salvador", ET: "Ethiopia", FI: "Finland", FR: "France",
  GA: "Gabon", GH: "Ghana", DE: "Germany", GT: "Guatemala",
  HN: "Honduras", HU: "Hungary", IN: "India", ID: "Indonesia",
  IR: "Iran", IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy",
  JM: "Jamaica", JP: "Japan", JO: "Jordan", KZ: "Kazakhstan",
  KE: "Kenya", KR: "South Korea", KW: "Kuwait", LA: "Laos",
  LB: "Lebanon", LR: "Liberia", LY: "Libya", MG: "Madagascar",
  MW: "Malawi", MY: "Malaysia", MV: "Maldives", ML: "Mali",
  MX: "Mexico", MA: "Morocco", MZ: "Mozambique", MM: "Myanmar",
  NA: "Namibia", NP: "Nepal", NL: "Netherlands", NZ: "New Zealand",
  NI: "Nicaragua", NE: "Niger", NG: "Nigeria", NO: "Norway",
  PK: "Pakistan", PA: "Panama", PG: "Papua New Guinea", PY: "Paraguay",
  PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal",
  QA: "Qatar", RO: "Romania", RU: "Russia", RW: "Rwanda",
  SA: "Saudi Arabia", SN: "Senegal", SL: "Sierra Leone", SG: "Singapore",
  SO: "Somalia", ZA: "South Africa", SS: "South Sudan", ES: "Spain",
  LK: "Sri Lanka", SD: "Sudan", SE: "Sweden", CH: "Switzerland",
  SY: "Syria", TW: "Taiwan", TZ: "Tanzania", TH: "Thailand",
  TG: "Togo", TT: "Trinidad and Tobago", TN: "Tunisia", TR: "Turkey",
  UG: "Uganda", UA: "Ukraine", AE: "United Arab Emirates",
  GB: "United Kingdom", US: "United States", UY: "Uruguay",
  UZ: "Uzbekistan", VE: "Venezuela", VN: "Vietnam", YE: "Yemen",
  ZM: "Zambia", ZW: "Zimbabwe",
};

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6 - 0x41;
  return (
    String.fromCodePoint(code.toUpperCase().charCodeAt(0) + base) +
    String.fromCodePoint(code.toUpperCase().charCodeAt(1) + base)
  );
}

// ── EditChip ──────────────────────────────────────────────────────────────────

interface EditChipProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  isEditing?: boolean;
  /** When true, chip is styled as an "add" prompt */
  isEmpty?: boolean;
}

function EditChip({
  onClick,
  className,
  children,
  isEditing,
  isEmpty,
}: EditChipProps) {
  if (!isEditing) {
    if (isEmpty) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-muted/60 border border-border/50 rounded-full px-2.5 py-1 font-medium",
          className
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] rounded-full px-2.5 py-1 font-medium border cursor-pointer transition-colors",
        isEmpty
          ? "text-primary/70 bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "text-foreground/60 bg-muted/60 border-border/50 hover:bg-muted hover:border-border hover:text-foreground/80",
        className
      )}
    >
      {isEmpty && <PlusCircleIcon className="h-3 w-3 shrink-0" />}
      {!isEmpty && isEditing && <PencilIcon className="h-3 w-3 shrink-0 opacity-60" />}
      {children}
    </motion.button>
  );
}

// ── EditableSubHero ───────────────────────────────────────────────────────────

interface EditableSubHeroProps {
  organization: OrganizationData;
}

export function EditableSubHero({ organization }: EditableSubHeroProps) {
  const { pushModal, show } = useModal();
  const isEditing = useUploadDashboardStore((s) => s.isEditing);
  const edits = useUploadDashboardStore((s) => s.edits);
  const setEdit = useUploadDashboardStore((s) => s.setEdit);

  // Resolved display values
  const country = edits.country ?? organization.country;
  const website = edits.website ?? organization.website;
  const startDate = edits.startDate ?? organization.startDate;
  const visibility = edits.visibility ?? organization.visibility;

  const countryName = COUNTRY_NAMES[country] ?? country ?? null;
  const countryFlag = country ? countryCodeToFlag(country) : "";
  const sinceLabel = formatShortDate(startDate);

  // ── Open modals ──────────────────────────────────────────────────────────────

  const openCountry = () => {
    pushModal(
      {
        id: MODAL_IDS.UPLOAD_COUNTRY_SELECTOR,
        content: (
          <CountrySelectorModal
            currentCode={country}
            onConfirm={(code) => setEdit("country", code)}
          />
        ),
      },
      true
    );
    show();
  };

  const openWebsite = () => {
    pushModal(
      {
        id: MODAL_IDS.UPLOAD_WEBSITE_EDITOR,
        content: (
          <WebsiteEditorModal
            currentUrl={website}
            onConfirm={(url) => setEdit("website", url)}
          />
        ),
      },
      true
    );
    show();
  };

  const openStartDate = () => {
    pushModal(
      {
        id: MODAL_IDS.UPLOAD_START_DATE_SELECTOR,
        content: (
          <StartDateSelectorModal
            currentDate={startDate}
            onConfirm={(date) => setEdit("startDate", date)}
          />
        ),
      },
      true
    );
    show();
  };

  const openVisibility = () => {
    pushModal(
      {
        id: MODAL_IDS.UPLOAD_VISIBILITY_SELECTOR,
        content: (
          <VisibilitySelectorModal
            current={visibility}
            onConfirm={(v) => setEdit("visibility", v)}
          />
        ),
      },
      true
    );
    show();
  };

  const hasAnyChip = countryName ?? sinceLabel ?? website ?? isEditing;
  if (!hasAnyChip) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      {/* Country */}
      <EditChip
        onClick={openCountry}
        isEditing={isEditing}
        isEmpty={!countryName}
      >
        {countryFlag && (
          <span className="text-sm leading-none" aria-hidden="true">
            {countryFlag}
          </span>
        )}
        {countryName ?? "Add country"}
        {!countryName && !isEditing && null}
      </EditChip>

      {/* Start date / since */}
      <EditChip
        onClick={openStartDate}
        isEditing={isEditing}
        isEmpty={!sinceLabel}
      >
        <CalendarIcon className="h-3 w-3 shrink-0" />
        {sinceLabel ? `Since ${sinceLabel}` : "Add start date"}
      </EditChip>

      {/* Website */}
      <EditChip
        onClick={openWebsite}
        isEditing={isEditing}
        isEmpty={!website}
      >
        <GlobeIcon className="h-3 w-3 shrink-0" />
        {website
          ? website.replace(/^https?:\/\//, "").replace(/\/$/, "")
          : "Add website"}
      </EditChip>

      {/* Visibility — only shown in edit mode or when Unlisted */}
      {(isEditing || visibility === "Unlisted") && (
        <EditChip
          onClick={openVisibility}
          isEditing={isEditing}
          isEmpty={false}
        >
          {visibility === "Unlisted" ? (
            <LockIcon className="h-3 w-3 shrink-0" />
          ) : (
            <MapPinIcon className="h-3 w-3 shrink-0" />
          )}
          {visibility}
        </EditChip>
      )}
    </div>
  );
}
