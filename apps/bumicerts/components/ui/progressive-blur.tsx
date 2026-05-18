"use client";

import React from "react";

import { cn } from "@/lib/utils";

export interface ProgressiveBlurProps {
  className?: string;
  height?: string;
  position?: "top" | "bottom" | "both";
  blurLevels?: number[];
  children?: React.ReactNode;
}

export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [1, 4, 10, 20],
}: ProgressiveBlurProps) {
  // For "both", we render two stacks (top + bottom). For single direction, one stack.
  const renderStack = (stackPosition: "top" | "bottom") => {
    const direction = stackPosition === "top" ? "to top" : "to bottom";
    const step = 100 / (blurLevels.length + 1); // even distribution of fade bands

    return blurLevels.map((blur, i) => {
      // Each layer: transparent until its threshold, then opaque toward the edge.
      // Stacking opaque regions = cumulative blur intensity at the top/bottom edge.
      const fadeStart = i * step;
      const fadeEnd = (i + 1) * step;
      const mask = `linear-gradient(${direction}, transparent ${fadeStart}%, #000 ${fadeEnd}%)`;

      return (
        <span
          key={`${stackPosition}-${i}`}
          style={{
            gridArea: "1 / 1",
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
      );
    });
  };

  if (position === "both") {
    return (
      <>
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 grid",
            className,
          )}
          style={{ height }}
        >
          {renderStack("top")}
        </div>
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-10 grid",
            className,
          )}
          style={{ height }}
        >
          {renderStack("bottom")}
        </div>
      </>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 grid",
        position === "top" ? "top-0" : "bottom-0",
        className,
      )}
      style={{ height }}
    >
      {renderStack(position)}
    </div>
  );
}
