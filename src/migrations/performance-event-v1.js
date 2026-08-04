import {
  PERFORMANCE_EVENT_V2,
  createPerformanceEventV2,
  quarantineMetadata,
  validatePerformanceEventV2,
} from "../contracts/performance-event.js";

export function migratePerformanceEventV1(event) {
  return createPerformanceEventV2({
    modeId: event?.modeId,
    status: event?.status,
    score: event?.score,
    streak: event?.streak,
    sourceLabel: event?.sourceLabel,
    trackId: event?.trackId,
    time: event?.time,
    details: event?.details,
    evidence: event?.evidence,
    assistance: {
      level: event?.sourceLabel?.toLowerCase() === "demo" ? "demo" : "guided",
      eligibleForMastery: false,
      values: { migratedFromLegacy: true },
    },
    createdAt: event?.createdAt || "1970-01-01T00:00:00.000Z",
  });
}

export function normalizePerformanceMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata ?? null;
  if (metadata.schemaVersion === PERFORMANCE_EVENT_V2) {
    const validation = validatePerformanceEventV2(metadata);
    return validation.valid ? metadata : quarantineMetadata(metadata, validation.errors);
  }
  if (metadata.kind !== "performance") return metadata;
  const migrated = migratePerformanceEventV1(metadata);
  const validation = validatePerformanceEventV2(migrated);
  return validation.valid ? migrated : quarantineMetadata(metadata, validation.errors);
}
