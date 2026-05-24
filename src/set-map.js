import { toSeconds } from "./utils.js";

export function drawSetMap(canvas, tracks, selectedId) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const width = rect.width;
  const height = rect.height;
  const pad = 18;
  const sorted = [...tracks].sort((a, b) => toSeconds(a.time) - toSeconds(b.time));
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#100f0e";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(244, 239, 230, 0.08)";
  ctx.lineWidth = 1;
  for (let x = pad; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, height - 18);
    ctx.stroke();
  }
  if (!sorted.length) return;
  const maxTime = Math.max(...sorted.map((track) => toSeconds(track.time)), 1);
  const bpms = sorted.map((track) => Number(track.bpm)).filter(Boolean);
  const minBpm = bpms.length ? Math.min(...bpms) - 4 : 70;
  const maxBpm = bpms.length ? Math.max(...bpms) + 4 : 130;
  const xFor = (track) => pad + (toSeconds(track.time) / maxTime) * (width - pad * 2);
  const yFor = (track) => {
    const bpm = Number(track.bpm) || minBpm;
    return height - pad - ((bpm - minBpm) / Math.max(1, maxBpm - minBpm)) * (height - pad * 2);
  };
  sorted.forEach((track, index) => {
    const x = xFor(track);
    const nextX = sorted[index + 1] ? xFor(sorted[index + 1]) : width - pad;
    const colors = track.colors || ["#f0ad4e", "#75d7b6", "#ec6f7e"];
    ctx.fillStyle = hexToRgba(colors[index % colors.length], 0.18);
    ctx.fillRect(x, height - 30, Math.max(6, nextX - x), 14);
  });
  ctx.beginPath();
  sorted.forEach((track, index) => {
    const x = xFor(track);
    const y = yFor(track);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#75d7b6";
  ctx.lineWidth = 3;
  ctx.stroke();
  sorted.forEach((track) => {
    const x = xFor(track);
    const y = yFor(track);
    const selected = track.id === selectedId;
    ctx.beginPath();
    ctx.arc(x, y, selected ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#f0ad4e" : "#f4efe6";
    ctx.fill();
    if (track.needsReview) {
      ctx.beginPath();
      ctx.moveTo(x - 5, 18);
      ctx.lineTo(x + 5, 18);
      ctx.lineTo(x, 8);
      ctx.closePath();
      ctx.fillStyle = "#ec6f7e";
      ctx.fill();
    }
  });
  ctx.fillStyle = "rgba(244, 239, 230, 0.56)";
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.fillText(`${minBpm + 4}-${maxBpm - 4} BPM`, 14, 18);
}

export function nearestTrackFromMap(canvas, event, tracks) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  if (!tracks.length) return undefined;
  const maxTime = Math.max(...tracks.map((track) => toSeconds(track.time)), 1);
  return tracks
    .map((track) => ({
      track,
      distance: Math.abs(x - (18 + (toSeconds(track.time) / maxTime) * (rect.width - 36))),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.track;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
