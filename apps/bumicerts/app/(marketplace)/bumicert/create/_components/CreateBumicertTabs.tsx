"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import DraftBumicerts from "./DraftBumicerts";
import MyBumicerts from "./MyBumicerts";

type CreateTab = "recent" | "drafts";

const tabs: { value: CreateTab; label: string }[] = [
  { value: "recent", label: "Recent Bumicerts" },
  { value: "drafts", label: "Drafts" },
];

const tabPanelIds: Record<CreateTab, string> = {
  recent: "create-bumicert-recent-panel",
  drafts: "create-bumicert-drafts-panel",
};

const tabButtonIds: Record<CreateTab, string> = {
  recent: "create-bumicert-recent-tab",
  drafts: "create-bumicert-drafts-tab",
};

export function CreateBumicertTabs() {
  const [activeTab, setActiveTab] = useState<CreateTab>("recent");

  return (
    <section className="pt-2">
      <div
        role="tablist"
        aria-label="Bumicert creation views"
        className="flex items-end gap-8 border-b border-border/80 px-1"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              id={tabButtonIds[tab.value]}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={tabPanelIds[tab.value]}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative -mb-px px-4 pb-4 pt-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {isActive && (
                <motion.span
                  layoutId="create-bumicert-active-tab"
                  className="absolute inset-x-0 bottom-0 h-px bg-primary"
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        id={tabPanelIds[activeTab]}
        role="tabpanel"
        aria-labelledby={tabButtonIds[activeTab]}
        tabIndex={0}
        className="min-h-[19rem] focus-visible:outline-none"
      >
        {activeTab === "recent" ? <MyBumicerts /> : <DraftBumicerts />}
      </div>
    </section>
  );
}
