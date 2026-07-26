import { RHYTHM_STEPS } from "./catalog.js";

export function createRhythmRouletteScene(canvas) {
  const context = canvas.getContext("2d");

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 760;
    const height = canvas.clientHeight || 430;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw({ challenge, pattern, currentStep = -1 } = {}) {
    const width = canvas.clientWidth || 760;
    const height = canvas.clientHeight || 430;
    const unit = Math.max(4, Math.floor(Math.min(width, height) / 82));
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    drawPixelBackground(width, height, unit);
    drawCrates(width, height, unit);
    drawProducer(width, height, unit);
    drawPulledRecords(challenge?.records || [], width, height, unit);
    drawBeatLights(pattern, currentStep, unit);
    drawChallengePoster(challenge?.rule?.title || "Needle drop", width, unit);
  }

  function drawPixelBackground(width, height, unit) {
    context.fillStyle = "#15171c";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#202a2d";
    context.fillRect(0, height * 0.6, width, height * 0.4);
    context.fillStyle = "#293034";
    for (let x = 0; x < width; x += unit * 8) context.fillRect(x, height * 0.6, unit * 4, unit);
    context.fillStyle = "#f4aa3e";
    context.fillRect(unit * 4, unit * 5, unit * 30, unit * 5);
    context.fillStyle = "#101113";
    context.font = `${unit * 3}px ui-monospace, monospace`;
    context.fillText("USED RECORDS", unit * 6, unit * 9);
    context.fillStyle = "#60c7ff";
    context.fillRect(width - unit * 24, unit * 6, unit * 18, unit * 8);
    context.fillStyle = "#101113";
    context.fillText("BREAKS", width - unit * 22, unit * 11);
  }

  function drawCrates(width, height, unit) {
    const baseY = height - unit * 20;
    for (let crate = 0; crate < 4; crate += 1) {
      const x = unit * 5 + crate * unit * 25;
      context.fillStyle = ["#6fddb1", "#ed6382", "#f4aa3e", "#60c7ff"][crate];
      context.fillRect(x, baseY + (crate % 2) * unit * 3, unit * 21, unit * 13);
      context.fillStyle = "#101113";
      context.fillRect(x + unit * 2, baseY + unit * 3 + (crate % 2) * unit * 3, unit * 17, unit * 2);
      for (let record = 0; record < 8; record += 1) {
        context.fillRect(x + unit * 2 + record * unit * 2, baseY - unit * 3 + (crate % 2) * unit * 3, unit, unit * 8);
      }
    }
  }

  function drawProducer(width, height, unit) {
    const x = width * 0.52;
    const y = height * 0.37;
    context.fillStyle = "#3f2620";
    context.fillRect(x - unit * 4, y - unit * 8, unit * 8, unit * 8);
    context.fillStyle = "#f1b27d";
    context.fillRect(x - unit * 5, y - unit * 7, unit * 10, unit * 10);
    context.fillStyle = "#101113";
    context.fillRect(x - unit * 6, y - unit * 4, unit * 12, unit * 3);
    context.fillStyle = "#ffe169";
    context.fillRect(x - unit * 2, y - unit * 3, unit * 4, unit);
    context.fillStyle = "#ed6382";
    context.fillRect(x - unit * 7, y + unit * 4, unit * 14, unit * 13);
    context.fillStyle = "#60c7ff";
    context.fillRect(x - unit * 11, y + unit * 6, unit * 5, unit * 13);
    context.fillRect(x + unit * 6, y + unit * 6, unit * 5, unit * 13);
    context.fillStyle = "#101113";
    context.fillRect(x - unit * 8, y + unit * 17, unit * 6, unit * 13);
    context.fillRect(x + unit * 2, y + unit * 17, unit * 6, unit * 13);
  }

  function drawPulledRecords(records, width, height, unit) {
    const startX = width - unit * 34;
    const startY = height - unit * 28;
    records.forEach((record, index) => {
      const x = startX + index * unit * 10;
      context.fillStyle = record.color;
      context.fillRect(x, startY - index * unit * 4, unit * 8, unit * 8);
      context.fillStyle = "#101113";
      context.fillRect(x + unit * 2, startY + unit * 2 - index * unit * 4, unit * 4, unit * 4);
    });
  }

  function drawBeatLights(pattern, currentStep, unit) {
    for (let step = 0; step < RHYTHM_STEPS; step += 1) {
      const active = pattern && Object.values(pattern).some((lane) => lane[step]);
      context.fillStyle = step === currentStep ? "#ffe169" : active ? "#6fddb1" : "#343840";
      context.fillRect(unit * 6 + step * unit * 3, unit * 18, unit * 2, unit * 2);
    }
  }

  function drawChallengePoster(title, width, unit) {
    context.fillStyle = "#101113";
    context.fillRect(width - unit * 35, unit * 17, unit * 29, unit * 9);
    context.fillStyle = "#ffe169";
    context.fillRect(width - unit * 34, unit * 18, unit * 27, unit * 2);
    context.fillStyle = "#f5efe4";
    context.font = `${unit * 2}px ui-monospace, monospace`;
    context.fillText(title.toUpperCase().slice(0, 18), width - unit * 33, unit * 24);
  }

  return { draw, resize };
}
