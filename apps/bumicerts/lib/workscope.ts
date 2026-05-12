import type { WorkscopeCel } from "@gainforest/atproto-mutations-next";

export type WorkscopeOption = {
  value: string;
  label: string;
  tagKey: string;
};

export const WORKSCOPE_OPTIONS: WorkscopeOption[] = [
  {
    value: "Ecological Restoration",
    label: "Ecological Restoration",
    tagKey: "ecological_restoration",
  },
  {
    value: "Agroforestry",
    label: "Agroforestry",
    tagKey: "agroforestry",
  },
  {
    value: "Climate Adaptation",
    label: "Climate Adaptation",
    tagKey: "climate_adaptation",
  },
  {
    value: "Biodiversity Monitoring",
    label: "Biodiversity Monitoring",
    tagKey: "biodiversity_monitoring",
  },
  {
    value: "Environmental Education",
    label: "Environmental Education",
    tagKey: "environmental_education",
  },
  {
    value: "Indigenous & Local Knowledge",
    label: "Indigenous & Local Knowledge",
    tagKey: "indigenous_local_knowledge",
  },
  {
    value: "Environmental Justice",
    label: "Environmental Justice",
    tagKey: "environmental_justice",
  },
];

const tagKeyByValue = new Map(
  WORKSCOPE_OPTIONS.map((option) => [option.value, option.tagKey]),
);

const labelByTagKey = new Map(
  WORKSCOPE_OPTIONS.map((option) => [option.tagKey, option.label]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueValues(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }

  return unique;
}

export function workscopeValueToTagKey(value: string): string {
  const knownKey = tagKeyByValue.get(value);
  if (knownKey) return knownKey;

  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function workscopeTagKeyToLabel(tagKey: string): string {
  return labelByTagKey.get(tagKey) ?? tagKey;
}

export function buildWorkscopeCel(
  workTypes: readonly string[],
  createdAt = new Date(),
): WorkscopeCel {
  const tagKeys = uniqueValues(
    workTypes.map(workscopeValueToTagKey).filter(isNonEmptyString),
  );

  return {
    $type: "org.hypercerts.workscope.cel",
    expression: `scope.hasAll(${JSON.stringify(tagKeys)})`,
    usedTags: [],
    version: "v1",
    createdAt: createdAt.toISOString(),
  };
}

function extractTagKeysFromExpression(expression: string): string[] {
  const normalized = expression.trim();
  const prefix = "scope.hasAll(";

  if (!normalized.startsWith(prefix) || !normalized.endsWith(")")) {
    return [];
  }

  const tagArraySource = normalized.slice(prefix.length, -1);

  try {
    const parsed: unknown = JSON.parse(tagArraySource);
    if (!Array.isArray(parsed)) return [];
    return uniqueValues(parsed.filter(isNonEmptyString));
  } catch {
    return [];
  }
}

export function extractWorkScopeObjectives(workScope: unknown): string[] {
  if (!isRecord(workScope)) return [];

  const scope = workScope.scope;
  if (typeof scope === "string") {
    return scope
      .split(",")
      .map((value) => value.trim())
      .filter(isNonEmptyString);
  }

  const tags = workScope.tags;
  if (Array.isArray(tags)) {
    return uniqueValues(tags.filter(isNonEmptyString)).map(
      workscopeTagKeyToLabel,
    );
  }

  const expression = workScope.expression;
  if (typeof expression === "string") {
    return extractTagKeysFromExpression(expression).map(workscopeTagKeyToLabel);
  }

  return [];
}
