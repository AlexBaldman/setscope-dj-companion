export const RHYTHM_STEPS = 16;

export const RHYTHM_LANES = [
  { id: "kick", label: "Kick", tone: "kick" },
  { id: "snare", label: "Snare", tone: "snare" },
  { id: "hat", label: "Hat", tone: "hat" },
  { id: "chop", label: "Chop", tone: "chop" },
];

export const RECORD_CRATE = [
  { id: "sidewalk-sermon", artist: "The Borough Committee", bpm: 92, color: "#f4aa3e", era: "1974 soul library", mood: "dusty horn stab", title: "Sidewalk Sermon" },
  { id: "chrome-rooftop", artist: "Mercury Palm Unit", bpm: 98, color: "#60c7ff", era: "1983 boogie 12 inch", mood: "rubber bass", title: "Chrome Rooftop" },
  { id: "raincoat-letters", artist: "Tanya Bellairs", bpm: 86, color: "#ed6382", era: "1971 private press", mood: "warm vocal chop", title: "Raincoat Letters" },
  { id: "gymnasium-strut", artist: "Harbor City Youth Ensemble", bpm: 104, color: "#6fddb1", era: "1978 school jazz", mood: "loose drum break", title: "Gymnasium Strut" },
  { id: "the-alley-turns", artist: "Kite Radio Orchestra", bpm: 78, color: "#b7db63", era: "1969 soundtrack", mood: "spooky flute phrase", title: "The Alley Turns" },
  { id: "transfer-ticket", artist: "Delford Metro Line", bpm: 112, color: "#b682ff", era: "1988 club dub", mood: "neon chord hit", title: "Transfer Ticket" },
  { id: "five-flights-up", artist: "North End Drum Co.", bpm: 96, color: "#ff7a59", era: "1976 percussion LP", mood: "conga room", title: "Five Flights Up" },
  { id: "mirrors-by-the-bar", artist: "Celeste Vega", bpm: 88, color: "#ffe169", era: "1981 latin soul", mood: "sunlit piano loop", title: "Mirrors By The Bar" },
];

export const RHYTHM_CHALLENGES = [
  { id: "dusty-pocket", title: "Dusty pocket", detail: "Keep the loop under 18 hits and let the gaps do work." },
  { id: "backbeat-tax", title: "Backbeat tax", detail: "Snare has to own beats 2 and 4." },
  { id: "three-record-rule", title: "Three-record rule", detail: "Use chops from every mystery pull before saving." },
  { id: "late-swing", title: "Late swing", detail: "Make at least two off-grid-feeling hits on 4, 8, 12, or 16." },
];

export function createSampleId(recordId, laneId) {
  return `${recordId}:${laneId}`;
}

export function resolveSample(challenge, sampleId) {
  const [recordId, laneId] = String(sampleId || "").split(":");
  const record = challenge?.records?.find((item) => item.id === recordId);
  const lane = RHYTHM_LANES.find((item) => item.id === laneId);
  if (!record || !lane) return null;
  return {
    id: createSampleId(record.id, lane.id),
    label: `${record.title.split(" ")[0]} ${lane.label}`,
    lane,
    record,
    short: record.title.slice(0, 1).toUpperCase(),
  };
}

export function samplesForChallenge(challenge) {
  return (challenge?.records || []).flatMap((record) =>
    RHYTHM_LANES.map((lane) => resolveSample(challenge, createSampleId(record.id, lane.id))),
  );
}
