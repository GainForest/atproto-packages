"use client";

import { useState, useMemo } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { SearchIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ISO 3166-1 alpha-2 country list
const COUNTRIES: { code: string; name: string }[] = [
  { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" }, { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" }, { code: "AT", name: "Austria" },
  { code: "BD", name: "Bangladesh" }, { code: "BE", name: "Belgium" },
  { code: "BO", name: "Bolivia" }, { code: "BR", name: "Brazil" },
  { code: "KH", name: "Cambodia" }, { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" }, { code: "CL", name: "Chile" },
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" },
  { code: "CD", name: "Congo (DRC)" }, { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" }, { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" }, { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" }, { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" }, { code: "ET", name: "Ethiopia" },
  { code: "FI", name: "Finland" }, { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" }, { code: "GH", name: "Ghana" },
  { code: "DE", name: "Germany" }, { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" }, { code: "HU", name: "Hungary" },
  { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" }, { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" }, { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" }, { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" }, { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" },
  { code: "KR", name: "South Korea" }, { code: "KW", name: "Kuwait" },
  { code: "LA", name: "Laos" }, { code: "LB", name: "Lebanon" },
  { code: "LR", name: "Liberia" }, { code: "LY", name: "Libya" },
  { code: "MG", name: "Madagascar" }, { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" }, { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" }, { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" }, { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" }, { code: "NA", name: "Namibia" },
  { code: "NP", name: "Nepal" }, { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" }, { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" }, { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" }, { code: "PK", name: "Pakistan" },
  { code: "PA", name: "Panama" }, { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" }, { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" }, { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" }, { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" }, { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" }, { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" }, { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" }, { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" }, { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" }, { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" }, { code: "TG", name: "Togo" },
  { code: "TT", name: "Trinidad and Tobago" }, { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" }, { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" }, { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" }, { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" },
  { code: "VE", name: "Venezuela" }, { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" }, { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6 - 0x41;
  return (
    String.fromCodePoint(code.toUpperCase().charCodeAt(0) + base) +
    String.fromCodePoint(code.toUpperCase().charCodeAt(1) + base)
  );
}

interface CountrySelectorModalProps {
  currentCode: string;
  onConfirm: (code: string) => void;
}

export function CountrySelectorModal({
  currentCode,
  onConfirm,
}: CountrySelectorModalProps) {
  const { hide, popModal, stack } = useModal();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>(currentCode);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  const handleConfirm = async () => {
    onConfirm(selected);
    await handleClose();
  };

  return (
    <ModalContent>
      <ModalHeader backAction={stack.length > 1 ? handleClose : undefined}>
        <ModalTitle>Select country</ModalTitle>
        <ModalDescription className="sr-only">
          Choose the country where your organisation operates.
        </ModalDescription>
      </ModalHeader>

      {/* Search */}
      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search countries…"
          className="w-full h-9 pl-9 pr-3 text-sm bg-muted/40 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
          autoFocus
        />
      </div>

      {/* Country list */}
      <div className="overflow-y-auto max-h-64 -mx-1 px-1 flex flex-col gap-0.5">
        {filtered.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setSelected(c.code)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer",
              selected === c.code
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted/60 text-foreground"
            )}
          >
            <span className="text-base leading-none w-6 text-center" aria-hidden="true">
              {countryCodeToFlag(c.code)}
            </span>
            <span className="flex-1">{c.name}</span>
            {selected === c.code && (
              <CheckIcon className="h-4 w-4 text-primary shrink-0" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No countries found.
          </p>
        )}
      </div>

      <ModalFooter className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!selected}>
          Confirm
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
