"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLinesIcon, MapPinIcon } from "lucide-react";
import FileInput from "@/components/ui/FileInput";
import { trpc } from "@/lib/trpc/client";
import { toSerializableFile } from "@/lib/mutations-utils";
import { formatError } from "@/lib/utils/trpc-errors";
import type { AudioRecordingItem } from "@/graphql/indexer/queries/audio";
import type { AudioDeploymentItem } from "@/graphql/indexer/queries/audio/deployments";
import type { AudioEventItem } from "@/graphql/indexer/queries/audio/events";
import { AudioSpectrogram } from "./AudioSpectrogram";
import { cleanFilename, datetimeLocal, extractAudioMetadata, formatBytes, getAudioBlobFile, getAudioMeta, optional, optionalNumber, splitTags, textFromDescription } from "./audio-utils";
import { AUDIO_MIME_TYPES, MAX_AUDIO_BYTES, type AudioMetadataDraft, type OperationStep } from "./types";
import { Field, FormShell, ProgressState, SelectField, TextField } from "./FormFields";

export function EventForm(
  props:
    | { mode: "create"; onSaved: (uri: string) => void }
    | { mode: "edit"; event: AudioEventItem; onSaved: (uri: string) => void },
) {
  const record = props.mode === "edit" ? props.event.record : null;
  const [eventID, setEventID] = useState(record?.eventID ?? "");
  const [eventDate, setEventDate] = useState(
    record?.eventDate ?? new Date().toISOString().slice(0, 10),
  );
  const [samplingProtocol, setSamplingProtocol] = useState(
    record?.samplingProtocol ?? "Audio recording survey",
  );
  const [recordedBy, setRecordedBy] = useState(record?.recordedBy ?? "");
  const [habitat, setHabitat] = useState(record?.habitat ?? "");
  const [latitude, setLatitude] = useState(record?.decimalLatitude ?? "");
  const [longitude, setLongitude] = useState(record?.decimalLongitude ?? "");
  const [country, setCountry] = useState(record?.country ?? "");
  const [locality, setLocality] = useState(record?.locality ?? "");
  const [weatherRemarks, setWeatherRemarks] = useState(
    record?.weatherRemarks ?? "",
  );
  const [eventRemarks, setEventRemarks] = useState(record?.eventRemarks ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = trpc.dwc.event.create.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const update = trpc.dwc.event.update.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const isPending = create.isPending || update.isPending;

  const save = async () => {
    setError(null);
    const data = {
      eventID: eventID.trim(),
      eventDate: eventDate.trim(),
      samplingProtocol: optional(samplingProtocol),
      recordedBy: optional(recordedBy),
      habitat: optional(habitat),
      decimalLatitude: optional(latitude),
      decimalLongitude: optional(longitude),
      country: optional(country),
      locality: optional(locality),
      weatherRemarks: optional(weatherRemarks),
      eventRemarks: optional(eventRemarks),
    };
    if (props.mode === "create") {
      const result = await create.mutateAsync(data);
      props.onSaved(result.uri);
      return;
    }
    const result = await update.mutateAsync({
      rkey: props.event.metadata.rkey,
      data,
    });
    props.onSaved(result.uri);
  };

  return (
    <FormShell
      title={props.mode === "create" ? "Create event" : "Edit event"}
      error={error}
      isPending={isPending}
      disabled={!eventID.trim() || !eventDate.trim()}
      onSave={() => void save()}
    >
      <Field
        label="Event ID"
        required
        value={eventID}
        onChange={setEventID}
        placeholder="survey-2024-amazon-site-a"
      />
      <Field
        label="Event date/range"
        required
        value={eventDate}
        onChange={setEventDate}
        placeholder="2024-03-01/2024-03-08"
      />
      <Field
        label="How was the audio collected?"
        value={samplingProtocol}
        onChange={setSamplingProtocol}
      />
      <Field label="Recorded by" value={recordedBy} onChange={setRecordedBy} />
      <Field label="Habitat" value={habitat} onChange={setHabitat} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Latitude" value={latitude} onChange={setLatitude} />
        <Field label="Longitude" value={longitude} onChange={setLongitude} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Country" value={country} onChange={setCountry} />
        <Field label="Locality" value={locality} onChange={setLocality} />
      </div>
      <TextField
        label="Weather remarks"
        value={weatherRemarks}
        onChange={setWeatherRemarks}
      />
      <TextField
        label="Event remarks"
        value={eventRemarks}
        onChange={setEventRemarks}
      />
    </FormShell>
  );
}

export function DeploymentForm(
  props:
    | {
        mode: "create";
        events: AudioEventItem[];
        onSaved: (uri: string) => void;
      }
    | {
        mode: "edit";
        deployment: AudioDeploymentItem;
        events: AudioEventItem[];
        onSaved: (uri: string) => void;
      },
) {
  const record = props.mode === "edit" ? props.deployment.record : null;
  const [name, setName] = useState(record?.name ?? "");
  const [deviceModel, setDeviceModel] = useState(
    record?.deviceModel ?? "AudioMoth",
  );
  const [eventRef, setEventRef] = useState(record?.eventRef ?? "");
  const [serial, setSerial] = useState(record?.deviceSerialNumber ?? "");
  const [gain, setGain] = useState(record?.gain ?? "");
  const [sampleRateHz, setSampleRateHz] = useState(
    record?.sampleRateHz ? String(record.sampleRateHz) : "",
  );
  const [schedule, setSchedule] = useState(record?.recordingSchedule ?? "");
  const [deployedAt, setDeployedAt] = useState(
    datetimeLocal(record?.deployedAt),
  );
  const [retrievedAt, setRetrievedAt] = useState(
    record?.retrievedAt ? datetimeLocal(record.retrievedAt) : "",
  );
  const [latitude, setLatitude] = useState(record?.decimalLatitude ?? "");
  const [longitude, setLongitude] = useState(record?.decimalLongitude ?? "");
  const [altitude, setAltitude] = useState(record?.altitude ?? "");
  const [habitat, setHabitat] = useState(record?.habitat ?? "");
  const [remarks, setRemarks] = useState(record?.remarks ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = trpc.ac.deployment.create.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const update = trpc.ac.deployment.update.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const isPending = create.isPending || update.isPending;

  const save = async () => {
    setError(null);
    const data = {
      name: name.trim(),
      deviceModel: deviceModel.trim(),
      eventRef: optional(eventRef),
      deviceSerialNumber: optional(serial),
      gain: optional(gain),
      sampleRateHz: optionalNumber(sampleRateHz),
      recordingSchedule: optional(schedule),
      deployedAt: new Date(deployedAt).toISOString(),
      retrievedAt: retrievedAt
        ? new Date(retrievedAt).toISOString()
        : undefined,
      decimalLatitude: optional(latitude),
      decimalLongitude: optional(longitude),
      altitude: optional(altitude),
      habitat: optional(habitat),
      remarks: optional(remarks),
    };
    if (props.mode === "create") {
      const result = await create.mutateAsync(data);
      props.onSaved(result.uri);
      return;
    }
    const result = await update.mutateAsync({
      rkey: props.deployment.metadata.rkey,
      data,
    });
    props.onSaved(result.uri);
  };

  return (
    <FormShell
      title={props.mode === "create" ? "Create deployment" : "Edit deployment"}
      error={error}
      isPending={isPending}
      disabled={!name.trim() || !deviceModel.trim() || !deployedAt}
      onSave={() => void save()}
    >
      <Field
        label="Deployment name"
        required
        value={name}
        onChange={setName}
        placeholder="Site A North — AudioMoth March 2024"
      />
      <SelectField
        label="Event"
        value={eventRef}
        onChange={setEventRef}
        options={props.events.map((event) => ({
          value: event.metadata.uri,
          label: event.record.eventID,
        }))}
        emptyLabel="No event selected"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Device model"
          required
          value={deviceModel}
          onChange={setDeviceModel}
        />
        <Field label="Serial number" value={serial} onChange={setSerial} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Gain" value={gain} onChange={setGain} />
        <Field
          label="Configured sample rate Hz"
          value={sampleRateHz}
          onChange={setSampleRateHz}
        />
      </div>
      <Field
        label="Recording schedule"
        value={schedule}
        onChange={setSchedule}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Deployed at"
          required
          type="datetime-local"
          value={deployedAt}
          onChange={setDeployedAt}
        />
        <Field
          label="Retrieved at"
          type="datetime-local"
          value={retrievedAt}
          onChange={setRetrievedAt}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Latitude" value={latitude} onChange={setLatitude} />
        <Field label="Longitude" value={longitude} onChange={setLongitude} />
        <Field label="Altitude" value={altitude} onChange={setAltitude} />
      </div>
      <TextField label="Habitat" value={habitat} onChange={setHabitat} />
      <TextField label="Remarks" value={remarks} onChange={setRemarks} />
    </FormShell>
  );
}

export function AudioForm(
  props:
    | {
        mode: "create";
        events: AudioEventItem[];
        deployments: AudioDeploymentItem[];
        onSaved: (uri: string) => void;
      }
    | {
        mode: "edit";
        recording: AudioRecordingItem;
        events: AudioEventItem[];
        deployments: AudioDeploymentItem[];
        onSaved: (uri: string) => void;
      },
) {
  const record = props.mode === "edit" ? props.recording.record : null;
  const meta = props.mode === "edit" ? getAudioMeta(props.recording) : {};
  const [name, setName] = useState(record?.name ?? "");
  const [description, setDescription] = useState(
    textFromDescription(record?.description),
  );
  const [deploymentRef, setDeploymentRef] = useState(
    record?.deploymentRef ?? "",
  );
  const [recordedAt, setRecordedAt] = useState(
    datetimeLocal(
      typeof meta.recordedAt === "string" ? meta.recordedAt : undefined,
    ),
  );
  const [recordedBy, setRecordedBy] = useState(record?.recordedBy ?? "");
  const [license, setLicense] = useState(record?.license ?? "CC-BY-4.0");
  const [tags, setTags] = useState((record?.tags ?? []).join(", "));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadataDraft | null>(null);
  const [scientificName, setScientificName] = useState("");
  const [vernacularName, setVernacularName] = useState("");
  const [identifiedBy, setIdentifiedBy] = useState("");
  const [identificationRemarks, setIdentificationRemarks] = useState("");
  const [occurrenceRemarks, setOccurrenceRemarks] = useState("");
  const [basisOfRecord, setBasisOfRecord] = useState("MachineObservation");
  const [operationStep, setOperationStep] = useState<OperationStep | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const createAudio = trpc.ac.audio.create.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const updateAudio = trpc.ac.audio.update.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const createOccurrence = trpc.dwc.occurrence.create.useMutation({
    onError: (err) => setError(formatError(err)),
  });
  const isPending =
    createAudio.isPending ||
    updateAudio.isPending ||
    createOccurrence.isPending;
  const deployment = props.deployments.find(
    (item) => item.metadata.uri === deploymentRef,
  );
  const event = props.events.find(
    (item) => item.metadata.uri === deployment?.record.eventRef,
  );
  const canCreateOccurrence = scientificName.trim().length > 0;
  const existingBlob = props.mode === "edit" ? getAudioBlobFile(props.recording) : null;
  const spectrogramSource = useMemo(() => {
    if (audioFile) return { kind: "file", file: audioFile } as const;
    if (previewUrl) return { kind: "url", url: previewUrl } as const;
    if (existingBlob) {
      return { kind: "url", url: existingBlob.url, mimeType: existingBlob.mimeType } as const;
    }
    return null;
  }, [audioFile, existingBlob, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFile = async (file: File | undefined) => {
    setFileError(null);
    setMetadata(null);
    const nextFile = file ?? null;
    setAudioFile(nextFile);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = nextFile ? URL.createObjectURL(nextFile) : null;
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    if (!nextFile) return;
    if (nextFile.size > MAX_AUDIO_BYTES) {
      setFileError(
        "This file is larger than 4MB. Please use @TheTainaBot for larger files.",
      );
      return;
    }
    if (!name.trim()) setName(cleanFilename(nextFile.name));
    setMetadata(await extractAudioMetadata(nextFile));
  };

  const save = async () => {
    setError(null);
    if (fileError) return;
    if (props.mode === "create") {
      if (!audioFile || !metadata) return;
      setOperationStep("audio");
      const result = await createAudio.mutateAsync({
        name: name.trim(),
        description: optional(description)
          ? { text: description.trim() }
          : undefined,
        audioFile: await toSerializableFile(audioFile),
        metadata: {
          ...metadata,
          recordedAt: new Date(recordedAt).toISOString(),
        },
        deploymentRef: optional(deploymentRef),
        recordedBy: optional(recordedBy),
        license: optional(license),
        tags: splitTags(tags),
      });
      let finalUri = result.uri;
      if (canCreateOccurrence) {
        setOperationStep("occurrence");
        const occurrence = await createOccurrence.mutateAsync({
          basisOfRecord,
          scientificName: scientificName.trim(),
          eventDate: new Date(recordedAt).toISOString(),
          vernacularName: optional(vernacularName),
          identifiedBy: optional(identifiedBy),
          identificationRemarks: optional(identificationRemarks),
          occurrenceRemarks: optional(occurrenceRemarks),
          eventRef: event?.metadata.uri,
          associatedMedia: result.uri,
          decimalLatitude:
            deployment?.record.decimalLatitude ??
            event?.record.decimalLatitude ??
            undefined,
          decimalLongitude:
            deployment?.record.decimalLongitude ??
            event?.record.decimalLongitude ??
            undefined,
          country: event?.record.country ?? undefined,
          habitat:
            deployment?.record.habitat ?? event?.record.habitat ?? undefined,
        });
        setOperationStep("audio");
        const linked = await updateAudio.mutateAsync({
          rkey: result.rkey,
          data: { occurrenceRef: occurrence.uri },
        });
        finalUri = linked.uri;
      }
      setOperationStep("complete");
      props.onSaved(finalUri);
      return;
    }

    setOperationStep("audio");
    const newFile =
      audioFile && metadata
        ? {
            newAudioFile: await toSerializableFile(audioFile),
            newTechnicalMetadata: metadata,
          }
        : {};
    const result = await updateAudio.mutateAsync({
      rkey: props.recording.metadata.rkey,
      data: {
        name: name.trim(),
        description: optional(description)
          ? { text: description.trim() }
          : undefined,
        metadata: { recordedAt: new Date(recordedAt).toISOString() },
        deploymentRef: optional(deploymentRef),
        recordedBy: optional(recordedBy),
        license: optional(license),
        tags: splitTags(tags),
      },
      ...newFile,
    });
    setOperationStep("complete");
    props.onSaved(result.uri);
  };

  return (
    <FormShell
      title={
        props.mode === "create"
          ? "Upload audio recording"
          : "Edit audio recording"
      }
      error={error ?? fileError}
      isPending={isPending}
      disabled={
        !name.trim() ||
        (props.mode === "create" &&
          (!audioFile || !metadata || Boolean(fileError)))
      }
      onSave={() => void save()}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border p-4">
          <FileInput
            placeholder="Drop or click to upload audio"
            value={audioFile ?? undefined}
            supportedFileTypes={AUDIO_MIME_TYPES}
            maxSizeInMB={4}
            onFileChange={(file) => void handleFile(file ?? undefined)}
            className="min-h-[120px]"
          />
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <AudioLinesIcon className="mt-0.5 size-4 text-primary" />
            <p>
              WAV, MP3, M4A, AAC, FLAC, OGG, Opus, WebM, or AIFF. Files must be {formatBytes(MAX_AUDIO_BYTES)} or smaller; send larger AudioMoth files through Taina.
            </p>
          </div>
          {metadata && (
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <span className="rounded-full bg-muted px-3 py-1">{metadata.fileFormat}</span>
              <span className="rounded-full bg-muted px-3 py-1">{metadata.duration}s</span>
              <span className="rounded-full bg-muted px-3 py-1">{metadata.sampleRate} Hz</span>
              <span className="rounded-full bg-muted px-3 py-1">
                {metadata.channels} channel(s){metadata.bitDepth ? ` · ${metadata.bitDepth}-bit` : ""}
              </span>
            </div>
          )}
        </div>
        <AudioSpectrogram source={spectrogramSource} />
      </div>
      <Field label="Name" required value={name} onChange={setName} />
      <SelectField
        label="Deployment"
        value={deploymentRef}
        onChange={setDeploymentRef}
        options={props.deployments.map((item) => ({
          value: item.metadata.uri,
          label: item.record.name,
        }))}
        emptyLabel="No deployment selected"
      />
      {event && (
        <p className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
          <MapPinIcon className="size-4" /> Linked event: {event.record.eventID}
        </p>
      )}
      <TextField
        label="Description"
        value={description}
        onChange={setDescription}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Recorded at"
          required
          type="datetime-local"
          value={recordedAt}
          onChange={setRecordedAt}
        />
        <Field
          label="Recorded by"
          value={recordedBy}
          onChange={setRecordedBy}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="License" value={license} onChange={setLicense} />
        <Field
          label="Tags"
          value={tags}
          onChange={setTags}
          placeholder="night-recording, tropical-forest"
        />
      </div>

      {props.mode === "create" && (
        <div className="space-y-3 rounded-2xl border p-4">
          <div>
            <h3 className="font-medium">Optional species found</h3>
            <p className="text-sm text-muted-foreground">
              Add the species you or a tool identified in this recording.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Scientific name"
              value={scientificName}
              onChange={setScientificName}
              placeholder="Pteronotus parnellii"
            />
            <Field
              label="Common/local name"
              value={vernacularName}
              onChange={setVernacularName}
            />
          </div>
          <SelectField
            label="Basis of record"
            value={basisOfRecord}
            onChange={setBasisOfRecord}
            options={[
              { value: "MachineObservation", label: "Machine observation" },
              { value: "HumanObservation", label: "Human observation" },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Identified by"
              value={identifiedBy}
              onChange={setIdentifiedBy}
            />
            <Field
              label="Identification remarks"
              value={identificationRemarks}
              onChange={setIdentificationRemarks}
            />
          </div>
          <TextField
            label="Species notes"
            value={occurrenceRemarks}
            onChange={setOccurrenceRemarks}
          />
        </div>
      )}
      {operationStep && <ProgressState step={operationStep} />}
    </FormShell>
  );
}

