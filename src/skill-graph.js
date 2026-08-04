export const SKILL_LEDGER_SCHEMA = "setscope.skill-ledger";
export const SKILL_LEDGER_VERSION = 1;
export const SKILL_LEDGER_STORAGE_KEY = "setscope-skill-ledger-v1";

const MAX_RECEIPTS = 160;

export function createSkillLedger(input = {}) {
  const receipts = Array.isArray(input.receipts)
    ? input.receipts.map(normalizeSkillReceipt).filter((receipt) => receipt.eventId).slice(0, MAX_RECEIPTS)
    : [];
  return {
    schema: SKILL_LEDGER_SCHEMA,
    schemaVersion: SKILL_LEDGER_VERSION,
    receipts: dedupeReceipts(receipts),
  };
}

export function loadSkillLedger(storage = globalThis.localStorage) {
  try {
    return createSkillLedger(JSON.parse(storage?.getItem(SKILL_LEDGER_STORAGE_KEY) || "null"));
  } catch {
    return createSkillLedger();
  }
}

export function recordSkillEvidence(event, eventId, storage = globalThis.localStorage) {
  if (!eventId || !event?.modeId || !storage) return null;
  const ledger = loadSkillLedger(storage);
  if (ledger.receipts.some((receipt) => receipt.eventId === eventId)) return ledger;
  ledger.receipts.unshift(normalizeSkillReceipt({
    eventId,
    modeId: event.modeId,
    score: event.score,
    trackId: event.trackId,
    createdAt: event.createdAt,
    eligibleForMastery: event.assistance?.eligibleForMastery,
    assistanceLevel: event.assistance?.level,
    dimensions: dimensionsForEvent(event),
  }));
  ledger.receipts = ledger.receipts.slice(0, MAX_RECEIPTS);
  storage.setItem(SKILL_LEDGER_STORAGE_KEY, JSON.stringify(ledger));
  return ledger;
}

export function deriveSkillGraph({ profile = {}, ledger = createSkillLedger(), events = [] } = {}) {
  const currentReceipts = (Array.isArray(events) ? events : [])
    .map((event) => event?.metadata ? receiptFromAudioEvent(event) : null)
    .filter(Boolean);
  const receipts = dedupeReceipts([...currentReceipts, ...(ledger.receipts || [])]);
  const eligible = receipts.filter((receipt) => receipt.eligibleForMastery);
  const pitchReceipts = eligible.filter((receipt) => receipt.modeId === "pitch-gates");
  const rhythmReceipts = eligible.filter((receipt) => ["rhythm-roulette", "beat-school"].includes(receipt.modeId));
  const signalReceipts = eligible.filter((receipt) => receipt.modeId === "audio-lab");
  const intervalStats = Object.values(profile.practice?.intervalHistory || {});
  const intervalAttempts = sum(intervalStats.map((stat) => stat.attempts));
  const earLevel = intervalAttempts
    ? weightedMean(intervalStats.map((stat) => ({
      value: intervalLevel(stat),
      weight: Math.max(1, Number(stat.attempts) || 0),
    })))
    : 0;

  const nodes = [
    node("ear", "Ear", "Intervals", earLevel, confidence(intervalAttempts, 24), intervalAttempts, "pitch-gates"),
    node(
      "pitch",
      "Pitch",
      "Control",
      mean(pitchReceipts.map((receipt) => receipt.dimensions.accuracy ?? receipt.score)),
      confidence(pitchReceipts.length, 6),
      pitchReceipts.length,
      "pitch-gates",
    ),
    node(
      "rhythm",
      "Rhythm",
      "Pocket",
      mean(rhythmReceipts.map(rhythmLevel)),
      confidence(rhythmReceipts.length, 5),
      rhythmReceipts.length,
      "rhythm-roulette",
    ),
    node(
      "signal",
      "Signal",
      "Listening",
      mean(signalReceipts.map(signalLevel)),
      confidence(signalReceipts.length, 5),
      signalReceipts.length,
      "audio-lab",
    ),
    transferNode(eligible),
  ];
  const focus = chooseFocus(nodes, profile);
  const totalEvidence = receipts.length;
  const trustedEvidence = eligible.length;
  return {
    nodes,
    focus,
    overall: Math.round(mean(nodes.map((item) => item.level))),
    totalEvidence,
    trustedEvidence,
    guidedEvidence: totalEvidence - trustedEvidence,
  };
}

function receiptFromAudioEvent(event) {
  const metadata = event.metadata;
  if (!metadata?.modeId) return null;
  return normalizeSkillReceipt({
    eventId: event.id,
    modeId: metadata.modeId,
    score: metadata.score,
    trackId: metadata.trackId || event.trackId,
    createdAt: metadata.createdAt || event.createdAt,
    eligibleForMastery: metadata.assistance?.eligibleForMastery,
    assistanceLevel: metadata.assistance?.level,
    dimensions: dimensionsForEvent(metadata),
  });
}

function normalizeSkillReceipt(receipt = {}) {
  return {
    eventId: text(receipt.eventId),
    modeId: text(receipt.modeId),
    score: clamp(receipt.score),
    trackId: text(receipt.trackId),
    eligibleForMastery: receipt.eligibleForMastery === true,
    assistanceLevel: text(receipt.assistanceLevel, "none"),
    dimensions: plainNumbers(receipt.dimensions),
    createdAt: validDate(receipt.createdAt),
  };
}

function dimensionsForEvent(event) {
  const details = event.details || {};
  if (event.modeId === "pitch-gates") {
    return {
      accuracy: clamp(details.accuracy ?? event.score),
    };
  }
  if (event.modeId === "rhythm-roulette") {
    return {
      constraint: Number(details.scoreBreakdown?.constraint || 0) > 0 ? 100 : 0,
      pocket: clamp(Number(details.scoreBreakdown?.pocket || 0) / 5),
      originality: clamp(Number(details.scoreBreakdown?.originality || 0) / 4),
    };
  }
  if (event.modeId === "beat-school") {
    return {
      accuracy: clamp(details.accuracy),
      pocket: clamp(details.pocket),
      dynamics: clamp(details.dynamics),
    };
  }
  if (event.modeId === "audio-lab") {
    return {
      clarity: clamp(details.clarity),
      cents: Math.min(100, Math.abs(Number(details.cents) || 0)),
      stableHold: details.stableHold ? 100 : 0,
    };
  }
  return {};
}

function rhythmLevel(receipt) {
  return mean([
    receipt.dimensions.constraint,
    receipt.dimensions.accuracy,
    receipt.dimensions.pocket,
    receipt.dimensions.dynamics,
    receipt.dimensions.originality,
  ].filter(Number.isFinite));
}

function signalLevel(receipt) {
  const precision = Math.max(0, 100 - Number(receipt.dimensions.cents || 0) * 2);
  return mean([receipt.dimensions.clarity, receipt.dimensions.stableHold, precision]);
}

function intervalLevel(stat) {
  const attempts = Math.max(1, Number(stat.attempts) || 0);
  const accuracy = ((Number(stat.hits) || 0) + (Number(stat.near) || 0) * 0.5) / attempts * 100;
  const precision = Math.max(0, 100 - (Number(stat.meanAbsCents) || 0) / 2);
  return mean([accuracy, precision]);
}

function transferNode(receipts) {
  const attached = receipts.filter((receipt) => receipt.trackId);
  const modeCount = new Set(attached.map((receipt) => receipt.modeId)).size;
  const level = attached.length
    ? Math.min(100, attached.length * 12 + modeCount * 16)
    : 0;
  return node("transfer", "Transfer", "To music", level, confidence(attached.length, 8), attached.length, "pitch-gates");
}

function chooseFocus(nodes, profile) {
  if (profile.calibration?.status !== "calibrated") {
    return nodes.find((node) => node.id === "signal");
  }
  return [...nodes].sort((left, right) => focusWeight(left) - focusWeight(right))[0];
}

function focusWeight(node) {
  return node.level * 0.68 + node.confidence * 0.32;
}

function node(id, label, detail, level, nodeConfidence, evidenceCount, modeId) {
  const roundedLevel = Math.round(level || 0);
  const roundedConfidence = Math.round(nodeConfidence || 0);
  return {
    id,
    label,
    detail,
    level: roundedLevel,
    confidence: roundedConfidence,
    evidenceCount,
    modeId,
    status: roundedConfidence < 34 ? "New" : roundedLevel >= 78 ? "Locked" : roundedLevel >= 52 ? "Growing" : "Building",
  };
}

function dedupeReceipts(receipts) {
  const seen = new Set();
  return receipts.filter((receipt) => {
    if (!receipt.eventId || seen.has(receipt.eventId)) return false;
    seen.add(receipt.eventId);
    return true;
  });
}

function confidence(count, fullAt) {
  return Math.min(100, Number(count || 0) / fullAt * 100);
}

function weightedMean(items) {
  const totalWeight = sum(items.map((item) => item.weight));
  if (!totalWeight) return 0;
  return sum(items.map((item) => item.value * item.weight)) / totalWeight;
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? sum(finite) / finite.length : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function clamp(value) {
  const number = Number(value);
  return Math.max(0, Math.min(100, Number.isFinite(number) ? number : 0));
}

function plainNumbers(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, Number(item)])
      .filter(([, item]) => Number.isFinite(item)),
  );
}

function validDate(value) {
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : new Date(0).toISOString();
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
