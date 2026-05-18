"use client";

import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import Container from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import TelegramIcon from "@/icons/TelegramIcon";
import { AudioSectionTabs } from "./AudioSectionTabs";
import { CreatePanel, DetailPanel, ListPanel } from "./AudioPanels";
import { FlowChart } from "./FlowChart";
import { MODES, SECTIONS, TELEGRAM_BOT_URL, type Section } from "./types";

interface AudioClientProps {
  did: string;
}

export function AudioClient({ did }: AudioClientProps) {
  const [section, setSection] = useQueryState(
    "section",
    parseAsStringLiteral(SECTIONS).withDefault("events"),
  );
  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral(MODES).withDefault("list"),
  );
  const [selectedUri, setSelectedUri] = useQueryState(
    "uri",
    parseAsString.withDefault(""),
  );
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );

  const eventsQuery = indexerTrpc.audio.events.useQuery({ did });
  const deploymentsQuery = indexerTrpc.audio.deployments.useQuery({ did });
  const recordingsQuery = indexerTrpc.audio.list.useQuery({ did });

  const events = eventsQuery.data ?? [];
  const deployments = deploymentsQuery.data ?? [];
  const recordings = recordingsQuery.data ?? [];
  const isLoading =
    eventsQuery.isLoading ||
    deploymentsQuery.isLoading ||
    recordingsQuery.isLoading;

  const utils = indexerTrpc.useUtils();
  const invalidateAudio = () => {
    void utils.audio.events.invalidate({ did });
    void utils.audio.deployments.invalidate({ did });
    void utils.audio.list.invalidate({ did });
  };

  const showList = (target: Section) => {
    void setSection(target);
    void setMode("list");
    void setSelectedUri(null);
  };

  const openNew = (target: Section) => {
    void setSection(target);
    void setMode("new");
    void setSelectedUri(null);
  };

  const openDetail = (target: Section, uri: string) => {
    void setSection(target);
    void setMode("detail");
    void setSelectedUri(uri);
  };

  const backToList = () => {
    void setMode("list");
    void setSelectedUri(null);
  };

  const selectedEvent =
    events.find((event) => event.metadata.uri === selectedUri) ?? null;
  const selectedDeployment =
    deployments.find((deployment) => deployment.metadata.uri === selectedUri) ??
    null;
  const selectedRecording =
    recordings.find((recording) => recording.metadata.uri === selectedUri) ??
    null;

  const activeTitle =
    section === "events"
      ? "Events"
      : section === "deployments"
        ? "Deployments"
        : "Audio recordings";

  return (
    <Container className="pt-4 pb-10 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="ml-2 font-medium text-lg">How does this work?</span>
          <Button asChild size="sm">
            <Link href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">
              <TelegramIcon /> Use Taina
            </Link>
          </Button>
        </div>
        <div className="rounded-2xl bg-muted p-1 text-sm text-muted-foreground">
          <FlowChart />
          <p className="px-3 mt-1 text-center">
            Files uploaded here must be{" "}
            <strong className="font-medium">4MB or smaller</strong>. For larger
            AudioMoth files, please use Taina.
          </p>
        </div>
      </header>

      <AudioSectionTabs
        value={section}
        counts={{
          events: events.length,
          deployments: deployments.length,
          recordings: recordings.length,
        }}
        onChange={showList}
      />

      {mode !== "list" && (
        <Button variant="ghost" onClick={backToList} className="-ml-2">
          <ChevronLeftIcon className="size-4" /> Back to{" "}
          {activeTitle.toLowerCase()}
        </Button>
      )}

      {isLoading ? (
        <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
          Loading audio workspace…
        </div>
      ) : mode === "new" ? (
        <CreatePanel
          section={section}
          events={events}
          deployments={deployments}
          onCreated={invalidateAudio}
          onOpenDetail={openDetail}
        />
      ) : mode === "detail" ? (
        <DetailPanel
          section={section}
          selectedEvent={selectedEvent}
          selectedDeployment={selectedDeployment}
          selectedRecording={selectedRecording}
          events={events}
          deployments={deployments}
          recordings={recordings}
          onUpdated={invalidateAudio}
          onOpenDetail={openDetail}
        />
      ) : (
        <ListPanel
          section={section}
          searchQuery={searchQuery}
          onSearchChange={(value) => void setSearchQuery(value || null)}
          events={events}
          deployments={deployments}
          recordings={recordings}
          onNew={() => openNew(section)}
          onOpenDetail={openDetail}
        />
      )}
    </Container>
  );
}
