const definitions = [
  surface("setscope", "SetScope", "Set", "index.html", "set", "Companion", "MVP"),
  surface("beat-school", "Beat School", "Beat", "beat-school.html", "beat", "Pad Game", "Playable", "#lessonAction", true),
  surface("pitch-gates", "Pitch Gates", "Pitch", "pitch-gates.html", "pitch", "Ear Game", "Playable", "#startRoundBtn", true),
  surface("rhythm-roulette", "Rhythm Roulette", "Dig", "rhythm-roulette.html", "dig", "Beat Game", "Playable", "#blindDigBtn", true),
  surface("audio-lab", "Audio Lab", "Tune", "audio-lab.html", "scope", "Bench Tool", "Live", "#logSnapshotBtn", true),
  surface("midi-playground", "MIDI Playground", "MIDI", "midi-playground.html", "midi", "Hardware", "Live", "", false, "labs"),
  surface("journal", "Dev Journal", "Journal", "journal.html", "journal", "Docs", "Editable", "", false, "labs"),
  surface("style-lab", "Style Lab", "Style", "design-system.html", "set", "System", "Living", "", false, "labs"),
];

export const productSurfaces = Object.freeze(definitions);
export const publicPageFiles = Object.freeze(productSurfaces.map(({ file }) => file));
export const practiceSurfaces = Object.freeze(productSurfaces.filter(({ practiceCapable }) => practiceCapable));
export const playerSurfaces = Object.freeze(productSurfaces.filter(({ navigationGroup }) => navigationGroup === "player"));
export const labSurfaces = Object.freeze(productSurfaces.filter(({ navigationGroup }) => navigationGroup === "labs"));

export function getProductSurface(id) {
  return productSurfaces.find((entry) => entry.id === id) || null;
}

export function getSurfaceHref(id, fallback = "./index.html") {
  return getProductSurface(id)?.href || fallback;
}

function surface(
  id,
  label,
  shortLabel,
  file,
  room,
  category,
  status,
  primaryAction = "",
  practiceCapable = false,
  navigationGroup = "player",
) {
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
    navigationGroup,
  });
}
