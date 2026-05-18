"use client";

import { useMemo, type ReactNode } from "react";
import { CirclePlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AudioRecordingItem } from "@/graphql/indexer/queries/audio";
import type { AudioDeploymentItem } from "@/graphql/indexer/queries/audio/deployments";
import type { AudioEventItem } from "@/graphql/indexer/queries/audio/events";
import { formatDate, getAudioMeta, textFromDescription } from "./audio-utils";
import type { Section } from "./types";
import { AudioForm, DeploymentForm, EventForm } from "./AudioForms";

export function ListPanel(props: {
  section: Section;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  events: AudioEventItem[];
  deployments: AudioDeploymentItem[];
  recordings: AudioRecordingItem[];
  onNew: () => void;
  onOpenDetail: (section: Section, uri: string) => void;
}) {
  const filtered = useMemo(() => {
    const query = props.searchQuery.toLowerCase();
    if (props.section === "events") {
      return props.events.filter((event) =>
        [
          event.record.eventID,
          event.record.eventDate,
          event.record.locality,
          event.record.country,
        ].some((value) => (value ?? "").toLowerCase().includes(query)),
      );
    }
    if (props.section === "deployments") {
      return props.deployments.filter((deployment) =>
        [
          deployment.record.name,
          deployment.record.deviceModel,
          deployment.record.habitat,
        ].some((value) => (value ?? "").toLowerCase().includes(query)),
      );
    }
    return props.recordings.filter((recording) =>
      [
        recording.record.name,
        textFromDescription(recording.record.description),
      ].some((value) => (value ?? "").toLowerCase().includes(query)),
    );
  }, [
    props.deployments,
    props.events,
    props.recordings,
    props.searchQuery,
    props.section,
  ]);

  const title =
    props.section === "events"
      ? "Events"
      : props.section === "deployments"
        ? "Deployments"
        : "Audio recordings";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between w-full gap-2">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={props.searchQuery}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="pl-9"
          />
        </div>
        <Button onClick={props.onNew} className="rounded-full">
          <CirclePlusIcon className="size-4" /> New
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => {
            if (props.section === "events") {
              const event = item as AudioEventItem;
              const linkedDeployments = props.deployments.filter(
                (deployment) =>
                  deployment.record.eventRef === event.metadata.uri,
              ).length;
              const linkedAudio = props.recordings.filter((recording) =>
                props.deployments.some(
                  (deployment) =>
                    deployment.metadata.uri ===
                      recording.record.deploymentRef &&
                    deployment.record.eventRef === event.metadata.uri,
                ),
              ).length;
              return (
                <RecordCard
                  key={event.metadata.uri}
                  title={event.record.eventID}
                  subtitle={event.record.eventDate}
                  meta={`${linkedDeployments} deployments · ${linkedAudio} recordings`}
                  onClick={() =>
                    props.onOpenDetail("events", event.metadata.uri)
                  }
                />
              );
            }
            if (props.section === "deployments") {
              const deployment = item as AudioDeploymentItem;
              const linkedAudio = props.recordings.filter(
                (recording) =>
                  recording.record.deploymentRef === deployment.metadata.uri,
              ).length;
              return (
                <RecordCard
                  key={deployment.metadata.uri}
                  title={deployment.record.name}
                  subtitle={deployment.record.deviceModel}
                  meta={`${linkedAudio} recordings · deployed ${formatDate(deployment.record.deployedAt)}`}
                  onClick={() =>
                    props.onOpenDetail("deployments", deployment.metadata.uri)
                  }
                />
              );
            }
            const recording = item as AudioRecordingItem;
            const meta = getAudioMeta(recording);
            return (
              <RecordCard
                key={recording.metadata.uri}
                title={recording.record.name ?? "Untitled recording"}
                subtitle={String(meta.recordedAt ?? "No recording date")}
                meta={`${String(meta.duration ?? "0")}s · ${String(meta.sampleRate ?? "?")} Hz`}
                onClick={() =>
                  props.onOpenDetail("recordings", recording.metadata.uri)
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecordCard(props: {
  title: string | null;
  subtitle?: string | null;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-muted/30"
    >
      <p className="font-medium">{props.title ?? "Untitled"}</p>
      {props.subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{props.subtitle}</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{props.meta}</p>
    </button>
  );
}

export function CreatePanel(props: {
  section: Section;
  events: AudioEventItem[];
  deployments: AudioDeploymentItem[];
  onCreated: () => void;
  onOpenDetail: (section: Section, uri: string) => void;
}) {
  if (props.section === "events")
    return (
      <EventForm
        mode="create"
        onSaved={(uri) => {
          props.onCreated();
          props.onOpenDetail("events", uri);
        }}
      />
    );
  if (props.section === "deployments")
    return (
      <DeploymentForm
        mode="create"
        events={props.events}
        onSaved={(uri) => {
          props.onCreated();
          props.onOpenDetail("deployments", uri);
        }}
      />
    );
  return (
    <AudioForm
      mode="create"
      events={props.events}
      deployments={props.deployments}
      onSaved={(uri) => {
        props.onCreated();
        props.onOpenDetail("recordings", uri);
      }}
    />
  );
}

export function DetailPanel(props: {
  section: Section;
  selectedEvent: AudioEventItem | null;
  selectedDeployment: AudioDeploymentItem | null;
  selectedRecording: AudioRecordingItem | null;
  events: AudioEventItem[];
  deployments: AudioDeploymentItem[];
  recordings: AudioRecordingItem[];
  onUpdated: () => void;
  onOpenDetail: (section: Section, uri: string) => void;
}) {
  if (props.section === "events" && props.selectedEvent) {
    const eventDeployments = props.deployments.filter(
      (deployment) =>
        deployment.record.eventRef === props.selectedEvent?.metadata.uri,
    );
    const eventAudio = props.recordings.filter((recording) =>
      eventDeployments.some(
        (deployment) =>
          recording.record.deploymentRef === deployment.metadata.uri,
      ),
    );
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <EventForm
          mode="edit"
          event={props.selectedEvent}
          onSaved={() => props.onUpdated()}
        />
        <RelationshipPanel title="In this event">
          {eventDeployments.map((deployment) => (
            <MiniLink
              key={deployment.metadata.uri}
              label={deployment.record.name}
              detail={deployment.record.deviceModel}
              onClick={() =>
                props.onOpenDetail("deployments", deployment.metadata.uri)
              }
            />
          ))}
          {eventAudio.map((recording) => (
            <MiniLink
              key={recording.metadata.uri}
              label={recording.record.name ?? "Untitled recording"}
              detail="Audio"
              onClick={() =>
                props.onOpenDetail("recordings", recording.metadata.uri)
              }
            />
          ))}
        </RelationshipPanel>
      </div>
    );
  }
  if (props.section === "deployments" && props.selectedDeployment) {
    const linkedEvent =
      props.events.find(
        (event) =>
          event.metadata.uri === props.selectedDeployment?.record.eventRef,
      ) ?? null;
    const deploymentAudio = props.recordings.filter(
      (recording) =>
        recording.record.deploymentRef ===
        props.selectedDeployment?.metadata.uri,
    );
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DeploymentForm
          mode="edit"
          deployment={props.selectedDeployment}
          events={props.events}
          onSaved={() => props.onUpdated()}
        />
        <RelationshipPanel title="Related items">
          {linkedEvent && (
            <MiniLink
              label={linkedEvent.record.eventID}
              detail="Event"
              onClick={() =>
                props.onOpenDetail("events", linkedEvent.metadata.uri)
              }
            />
          )}
          {deploymentAudio.map((recording) => (
            <MiniLink
              key={recording.metadata.uri}
              label={recording.record.name ?? "Untitled recording"}
              detail="Audio"
              onClick={() =>
                props.onOpenDetail("recordings", recording.metadata.uri)
              }
            />
          ))}
        </RelationshipPanel>
      </div>
    );
  }
  if (props.section === "recordings" && props.selectedRecording) {
    const linkedDeployment =
      props.deployments.find(
        (deployment) =>
          deployment.metadata.uri ===
          props.selectedRecording?.record.deploymentRef,
      ) ?? null;
    const linkedEvent =
      props.events.find(
        (event) => event.metadata.uri === linkedDeployment?.record.eventRef,
      ) ?? null;
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AudioForm
          mode="edit"
          recording={props.selectedRecording}
          events={props.events}
          deployments={props.deployments}
          onSaved={() => props.onUpdated()}
        />
        <RelationshipPanel title="Audio context">
          {linkedDeployment && (
            <MiniLink
              label={linkedDeployment.record.name}
              detail="Deployment"
              onClick={() =>
                props.onOpenDetail("deployments", linkedDeployment.metadata.uri)
              }
            />
          )}
          {linkedEvent && (
            <MiniLink
              label={linkedEvent.record.eventID}
              detail="Event"
              onClick={() =>
                props.onOpenDetail("events", linkedEvent.metadata.uri)
              }
            />
          )}
        </RelationshipPanel>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
      Record not found. It may still be indexing.
    </div>
  );
}

function RelationshipPanel(props: { title: string; children: ReactNode }) {
  return (
    <aside className="space-y-3 rounded-2xl border p-4">
      <h3 className="font-medium">{props.title}</h3>
      <div className="space-y-2">{props.children}</div>
    </aside>
  );
}

function MiniLink(props: {
  label: string | null;
  detail: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="w-full rounded-xl border p-3 text-left text-sm hover:bg-muted/40"
    >
      <p className="font-medium">{props.label ?? "Untitled"}</p>
      {props.detail && (
        <p className="text-xs text-muted-foreground">{props.detail}</p>
      )}
    </button>
  );
}
