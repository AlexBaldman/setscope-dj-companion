export function uid() {
  return globalThis.crypto?.randomUUID?.() || `track_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function toSeconds(time) {
  const parts = String(time).split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}

export function formatSeconds(total) {
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function randomColors() {
  const palette = ["#f0ad4e", "#75d7b6", "#6ec6ff", "#ec6f7e", "#b8dd7f"];
  return [0, 1, 2].map(() => palette[Math.floor(Math.random() * palette.length)]);
}

export function mode(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

export function compactEra(eras) {
  const unique = [...new Set(eras)];
  if (unique.length <= 1) return unique[0];
  if (unique.length === 2) return unique.join(" + ");
  return `${unique[0]} + ${unique.length - 1}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showToast(els, message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1700);
}
