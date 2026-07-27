const definitions = [
  surface("setscope", "SetScope", "Set", "index.html", "set", "Companion", "MVP"),
  surface("pitch-gates", "Pitch Gates", "Arcade", "pitch-gates.html", "pitch", "Ear Game", "Playable", "#startRoundBtn", true),
  surface("audio-lab", "Audio Lab", "Lab", "audio-lab.html", "scope", "Bench Tool", "Live", "#logSnapshotBtn", true),
  surface("beat-school", "Beat School", "Beat", "beat-school.html", "beat", "Pad Game", "Playable", "#lessonAction", true),
  surface("rhythm-roulette", "Rhythm Roulette", "Dig", "rhythm-roulette.html", "dig", "Beat Game", "Playable", "#blindDigBtn", true),
  surface("midi-playground", "MIDI Playground", "MIDI", "midi-playground.html", "midi", "Hardware", "Live", "#connectMidiBtn"),
  surface("journal", "Dev Journal", "Journal", "journal.html", "journal", "Docs", "Editable"),
  surface("style-lab", "Style Lab", "Style", "design-system.html", "set", "System", "Living"),
];

export const productSurfaces = Object.freeze(definitions);
export const publicPageFiles = Object.freeze(productSurfaces.map(({ file }) => file));
export const practiceSurfaces = Object.freeze(productSurfaces.filter(({ practiceCapable }) => practiceCapable));

export function getProductSurface(id) {
  return productSurfaces.find((entry) => entry.id === id) || null;
}

export function getSurfaceHref(id, fallback = "./index.html") {
  return getProductSurface(id)?.href || fallback;
}

function surface(id, label, shortLabel, file, room, category, status, primaryAction = "", practiceCapable = false) {
  return Object.freeze({
    id,
    label,
    shortLabel,
    file,
    href: `./${file}`,
    route: file === "index.html" ? "/" : `/${file}`,
    room,
    category,
    status,
    primaryAction,
    practiceCapable,
  });
}
