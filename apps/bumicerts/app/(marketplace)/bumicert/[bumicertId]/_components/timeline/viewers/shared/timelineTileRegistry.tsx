import {
  AudioLinesIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileVideoIcon,
  LeafIcon,
  MapPinIcon,
  SproutIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { FeedTileKind } from "../../shared/timelineFeedViewModel";

type TileIcon = ComponentType<{ className?: string }>;

type TileRegistryEntry = {
  icon: TileIcon;
};

const TIMELINE_TILE_REGISTRY: Record<FeedTileKind, TileRegistryEntry> = {
  site: { icon: MapPinIcon },
  tree: { icon: SproutIcon },
  dataset: { icon: DatabaseIcon },
  biodiversity: { icon: LeafIcon },
  audio: { icon: AudioLinesIcon },
  image: { icon: FileImageIcon },
  video: { icon: FileVideoIcon },
  pdf: { icon: FileTextIcon },
  file: { icon: FileIcon },
  link: { icon: ExternalLinkIcon },
  record: { icon: FileIcon },
};

export function getTimelineTileRegistryEntry(kind: FeedTileKind): TileRegistryEntry {
  return TIMELINE_TILE_REGISTRY[kind];
}
