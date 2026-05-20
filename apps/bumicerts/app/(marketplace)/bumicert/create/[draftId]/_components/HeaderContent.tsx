"use client";

import { useFormStore } from "../form-store";
import { useAtprotoStore } from "@/components/stores/atproto";
import StepHeader from "./StepProgress";
import { HeaderContent } from "@/app/(marketplace)/_components/Header/HeaderContent";

// ── Slot components ─────────────────────────────────────────────────────────

const SubHeaderContent = () => {
  const isHydrated = useFormStore((state) => state.isHydrated);
  const auth = useAtprotoStore((state) => state.auth);

  if (!isHydrated || !auth.authenticated) return null;
  return (
    <div className="w-full pt-1">
      <StepHeader />
    </div>
  );
};

// ── Exported injector ────────────────────────────────────────────────────────

/**
 * Renders the header slots for the draft editing page.
 * HeaderContent auto-clears all slots when this component unmounts.
 */
const DraftHeaderContent = () => <HeaderContent sub={<SubHeaderContent />} />;

export default DraftHeaderContent;
