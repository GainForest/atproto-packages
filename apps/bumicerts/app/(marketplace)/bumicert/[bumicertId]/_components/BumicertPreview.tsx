import Image from "next/image";
import { getProxiedImageUrl } from "@/lib/images";
import type { BumicertData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BumicertPreviewProps {
  bumicert: Pick<BumicertData, "coverImageUrl" | "title">;
  className?: string;
}

export function BumicertPreview({ bumicert, className }: BumicertPreviewProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {bumicert.coverImageUrl ? (
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl border border-border">
          <Image
            src={getProxiedImageUrl(bumicert.coverImageUrl)}
            alt={bumicert.title}
            fill
            className="object-cover"
          />
        </div>
      ) : null}

      <h1 className="text-2xl font-instrument italic leading-snug text-foreground">
        {bumicert.title}
      </h1>
    </div>
  );
}
