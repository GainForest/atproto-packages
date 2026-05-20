import {
  BookImageIcon,
  EarthLockIcon,
  FlagTriangleRightIcon,
  PenLineIcon,
  ScanSearchIcon,
} from "lucide-react";
import Step1 from "../_components/Steps/Step1";
import Step2 from "../_components/Steps/Step2";
import Step3 from "../_components/Steps/Step3";
import Step4 from "../_components/Steps/Step4";
import Step5 from "../_components/Steps/Step5";

type StepData = {
  key: "cover" | "impact" | "site" | "review" | "submit";
  Component: React.ComponentType;
  icon: React.ComponentType;
  previewBumicertByDefault: boolean;
};

export const STEPS: StepData[] = [
  {
    key: "cover",
    Component: Step1,
    icon: BookImageIcon,
    previewBumicertByDefault: true,
  },
  {
    key: "impact",
    Component: Step2,
    icon: PenLineIcon,
    previewBumicertByDefault: false,
  },
  {
    key: "site",
    Component: Step3,
    icon: EarthLockIcon,
    previewBumicertByDefault: false,
  },
  {
    key: "review",
    Component: Step4,
    icon: ScanSearchIcon,
    previewBumicertByDefault: false,
  },
  {
    key: "submit",
    Component: Step5,
    icon: FlagTriangleRightIcon,
    previewBumicertByDefault: false,
  },
] as const;
