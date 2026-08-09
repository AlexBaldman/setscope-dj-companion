export const PRODUCT_MANIFEST_VERSION = 2;

const definitions = [
  surface("setscope", "SetScope", "Set", "index.html", "set", "Companion", "MVP", "", false, "player",
    identity("SET-01", "Listening Station", "Live set", "Catch the moment. Keep the musical evidence.", ["Listen", "Identify", "Map"])),
  surface("beat-school", "Beat School", "Beat", "beat-school.html", "beat", "Pad Game", "Playable", "#lessonAction", true, "player",
    identity("BEAT-02", "Beat Basement", "Rhythm lesson", "Turn a set moment into feel, timing, and a beat of your own.", ["Hear", "Imitate", "Remix"])),
  surface("pitch-gates", "Pitch Gates", "Pitch", "pitch-gates.html", "pitch", "Ear Game", "Playable", "#startRoundBtn", true, "player",
    identity("PITCH-03", "Vocal Arcade", "Pitch trainer", "Find your range, lock the interval, and make the gate sing.", ["Center", "Match", "Sing"])),
  surface("rhythm-roulette", "Rhythm Roulette", "Dig", "rhythm-roulette.html", "dig", "Beat Game", "Playable", "#blindDigBtn", true, "player",
    identity("DIG-04", "Record Shop", "Beat challenge", "Dig blind, flip the sample, and leave with a receipt.", ["Dig", "Flip", "Build"])),
  surface("audio-lab", "Audio Lab", "Tune", "audio-lab.html", "scope", "Bench Tool", "Live", "#logSnapshotBtn", true, "player",
    identity("SCOPE-05", "Signal Bench", "Analysis bench", "Make sound visible, measurable, and useful elsewhere.", ["Listen", "Measure", "Attach"])),
  surface("midi-playground", "MIDI Playground", "MIDI", "midi-playground.html", "midi", "Hardware", "Live", "", false, "labs",
    identity("MIDI-06", "Controller Workshop", "Hardware map", "Teach every controller the musical role you want it to play.", ["Connect", "Learn", "Route"])),
  surface("journal", "Dev Journal", "Journal", "journal.html", "journal", "Docs", "Editable", "", false, "labs",
    identity("LOG-07", "Field Notebook", "Living archive", "Preserve the decisions, artifacts, and alternate paths behind the work.", ["Record", "Reorder", "Remember"])),
  surface("style-lab", "Style Lab", "Style", "design-system.html", "set", "System", "Living", "", false, "labs",
    identity("STYLE-08", "Style Foundry", "Blueprint lens", "Compare the system, tune the recipe, and approve the next projection.", ["Compare", "Tune", "Approve"])),
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
  experience,
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
    experience,
  });
}

function identity(code, place, lens, tagline, verbs) {
  return Object.freeze({
    world: "The Music Block",
    code,
    place,
    lens,
    tagline,
    verbs: Object.freeze(verbs),
  });
}
