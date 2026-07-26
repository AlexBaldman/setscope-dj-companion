export function diagnosePitchGateResults(results = []) {
  const resolved = results.filter((result) => result?.outcome && result.outcome !== "pending");
  const voiced = resolved.filter((result) => Number.isFinite(result.signedDistance));
  const silentCount = resolved.length - voiced.length;
  const hits = resolved.filter((result) => result.outcome === "hit").length;
  if (!resolved.length) return diagnosis("silent", 0, 0, 0, "Complete a round to diagnose your landings.");
  if (silentCount > resolved.length / 2) {
    return diagnosis("silent", 0, voiced.length, silentCount, "Most gates had no stable pitch. Check the input and sustain each note.");
  }
  const biasSemitones = voiced.reduce((sum, result) => sum + result.signedDistance, 0) / Math.max(1, voiced.length);
  const biasCents = Math.round(biasSemitones * 100);
  const highCount = voiced.filter((result) => result.signedDistance > 0.2).length;
  const lowCount = voiced.filter((result) => result.signedDistance < -0.2).length;
  if (hits / resolved.length >= 0.8 && Math.abs(biasCents) <= 20) {
    return diagnosis("centered", biasCents, voiced.length, silentCount, "Landings were centered. Raise the speed or reduce assist when ready.");
  }
  if (highCount >= Math.max(2, lowCount * 1.5)) {
    return diagnosis("high", biasCents, voiced.length, silentCount, `Voiced landings tended high by ${Math.abs(biasCents)} cents on average.`);
  }
  if (lowCount >= Math.max(2, highCount * 1.5)) {
    return diagnosis("low", biasCents, voiced.length, silentCount, `Voiced landings tended low by ${Math.abs(biasCents)} cents on average.`);
  }
  return diagnosis("mixed", biasCents, voiced.length, silentCount, "Landings varied above and below target. Slow down and repeat a smaller interval.");
}

function diagnosis(code, biasCents, voicedAttempts, silentCount, detail) {
  return { code, biasCents, voicedAttempts, silentCount, detail };
}
