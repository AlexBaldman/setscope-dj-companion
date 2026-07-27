import { mkdtemp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const managedServer = process.env.BASE_URL ? null : await startRuntimeServer();
const baseUrl = (process.env.BASE_URL || managedServer.baseUrl).replace(/\/$/, "");
const artifactDir = process.env.RUNTIME_ARTIFACT_DIR || (await mkdtemp(join(tmpdir(), "setscope-runtime-")));
const desktopViewport = { width: 1440, height: 1100 };
const compactViewport = { width: 1024, height: 768 };
const tabletViewport = { width: 768, height: 1024 };
const mobileViewport = { width: 390, height: 844 };
const failures = [];

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  managedServer?.process.kill();
  throw new Error(`Playwright could not launch Chromium. Run "npx playwright install chromium" if this is a fresh machine. ${error.message}`);
}

try {
  await runDesktopFlow();
  await runResponsiveOverflowPass("compact", compactViewport);
  await runResponsiveOverflowPass("tablet", tabletViewport);
  await runMobileOverflowPass();
  await runLightThemePass();
  await runReducedMotionPass();
} finally {
  await browser.close();
  managedServer?.process.kill();
}

if (failures.length) {
  console.error(`Runtime smoke failed. Artifacts: ${artifactDir}`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Runtime smoke passed. Artifacts: ${artifactDir}`);

async function runDesktopFlow() {
  const context = await browser.newContext({ viewport: desktopViewport });
  await installFakeMicrophone(context);
  const page = await context.newPage();
  const logs = captureRuntimeProblems(page, "desktop");
  await verifySetScope(page);
  await verifyLiveListening(page);
  await verifyContextualPracticeLoop(page);
  await verifyRhythmRoulette(page);
  await verifyPitchGates(page);
  await verifyAudioLab(page);
  await verifyMidiPlayground(page);
  await verifyBeatSchool(page);
  await verifyJournal(page);
  await verifyStyleLab(page);
  collectRuntimeProblems(logs);
  await context.close();
}

async function installFakeMicrophone(context) {
  await context.addInitScript(() => {
    const track = { stop() {} };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [track] }) },
    });
    class RuntimeMediaRecorder extends EventTarget {
      static isTypeSupported() {
        return true;
      }

      constructor() {
        super();
        this.mimeType = "audio/webm";
        this.state = "inactive";
      }

      start() {
        this.state = "recording";
      }

      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        const dataEvent = new Event("dataavailable");
        Object.defineProperty(dataEvent, "data", { value: new Blob(["setscope-runtime-audio"], { type: this.mimeType }) });
        this.dispatchEvent(dataEvent);
        this.dispatchEvent(new Event("stop"));
      }
    }
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: RuntimeMediaRecorder });
  });
}

async function runMobileOverflowPass() {
  await runResponsiveOverflowPass("mobile", mobileViewport);
}

async function runResponsiveOverflowPass(viewName, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 768 });
  await installFakeMicrophone(context);
  const page = await context.newPage();
  const logs = captureRuntimeProblems(page, viewName);
  const routes = [
    [`setscope-${viewName}`, "/"],
    [`roulette-${viewName}`, "/rhythm-roulette.html"],
    [`pitch-gates-${viewName}`, "/pitch-gates.html"],
    [`audio-lab-${viewName}`, "/audio-lab.html"],
    [`midi-${viewName}`, "/midi-playground.html"],
    [`beat-school-${viewName}`, "/beat-school.html"],
    [`journal-${viewName}`, "/journal.html"],
    [`style-lab-${viewName}`, "/design-system.html"],
  ];
  for (const [label, path] of routes) {
    await goto(page, path);
    if (path === "/" && viewport.width <= 959) {
      await verifyResponsiveCockpit(page, viewName);
      continue;
    }
    await auditPage(page, label);
    if (viewport.width <= 768) await verifyFirstViewportAction(page, path, viewName);
  }
  collectRuntimeProblems(logs);
  await context.close();
}

async function runLightThemePass() {
  const context = await browser.newContext({ viewport: compactViewport });
  await context.addInitScript(() => localStorage.setItem("setscope-theme", "light"));
  const page = await context.newPage();
  const logs = captureRuntimeProblems(page, "light-theme");
  for (const path of ["/", "/pitch-gates.html", "/audio-lab.html", "/beat-school.html", "/rhythm-roulette.html", "/midi-playground.html", "/journal.html", "/design-system.html"]) {
    await goto(page, path);
    assert(await page.evaluate(() => document.documentElement.dataset.theme === "light"), `${path} should restore light mode`);
    await auditPage(page, `${path === "/" ? "setscope" : path.slice(1, -5)}-light`);
  }
  collectRuntimeProblems(logs);
  await context.close();
}

async function runReducedMotionPass() {
  const context = await browser.newContext({
    viewport: mobileViewport,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await goto(page, "/beat-school.html");
  const motion = await page.locator("#lessonAction").evaluate((node) => ({
    media: matchMedia("(prefers-reduced-motion: reduce)").matches,
    transition: getComputedStyle(node).transitionDuration,
  }));
  assert(motion.media, "reduced-motion context should reach the application");
  assert(parseFloat(motion.transition) <= 0.001, "room actions should collapse motion when reduced motion is requested");
  await context.close();
}

async function verifyFirstViewportAction(page, path, viewName) {
  const selector = {
    "/pitch-gates.html": "#startRoundBtn",
    "/audio-lab.html": "#logSnapshotBtn",
    "/rhythm-roulette.html": "#blindDigBtn",
    "/midi-playground.html": "#connectMidiBtn",
    "/beat-school.html": "#lessonAction",
  }[path];
  if (!selector) return;
  const geometry = await page.locator(selector).evaluate((element) => ({
    bottom: element.getBoundingClientRect().bottom,
    viewport: window.innerHeight,
  }));
  assert(geometry.bottom <= geometry.viewport + 1, `${viewName} ${path} should keep its contextual primary action in the first viewport`);
}

async function verifyResponsiveCockpit(page, viewName) {
  await expectVisible(page, "#cockpitWorkspaceNav", `${viewName} cockpit workspace navigation`);
  const draftBefore = await page.evaluate(() => localStorage.getItem("setscope-draft-v1"));

  await page.locator("#workspaceSignalTab").click();
  await expectVisible(page, "#signalWorkspace", `${viewName} Signal workspace`);
  assert(!(await page.locator("#timelineWorkspace").isVisible()), `${viewName} should hide Timeline while Signal is active`);
  assert(!(await page.locator("#setCoachPanel").evaluate((node) => node.open)), `${viewName} secondary Signal modules should start collapsed`);
  await auditPage(page, `setscope-${viewName}-signal`);
  await page.locator("#setCoachPanel > summary").click();
  assert(await page.locator("#setCoachPanel").evaluate((node) => node.open), `${viewName} should expand Set Coach on demand`);

  await page.locator("#workspaceTimelineTab").click();
  await expectVisible(page, "#timelineWorkspace", `${viewName} Timeline workspace`);
  await auditPage(page, `setscope-${viewName}-timeline`);
  const selectedTitle = ((await page.locator(".track-row").first().locator(".track-name").textContent()) || "").trim();
  await page.locator(".track-row").first().click();
  await expectVisible(page, "#intelWorkspace", `${viewName} Intel workspace after track selection`);
  await expectText(page, "#workspaceNowTitle", selectedTitle, `${viewName} persistent selected track`);
  assert((await page.locator("body").getAttribute("data-cockpit-workspace")) === "intel", `${viewName} track selection should open Intel`);
  const workspaceTop = await page.locator("#cockpitWorkspaceNav").evaluate((element) => element.getBoundingClientRect().top);
  assert(Math.abs(workspaceTop) < 2, `${viewName} automatic workspace changes should reveal the workspace navigation`);
  await auditPage(page, `setscope-${viewName}-intel`);

  const draftAfter = await page.evaluate(() => localStorage.getItem("setscope-draft-v1"));
  assert(draftAfter === draftBefore, `${viewName} workspace navigation should not mutate SetDraft`);

  if (viewName === "mobile") {
    await page.locator(".session-menu > summary").click();
    await expectVisible(page, "#archiveBtn", "mobile set action menu");
    await page.locator(".session-menu > summary").click();
    await page.locator("#workspaceListenBtn").click();
    await page.waitForFunction(() => document.body.dataset.listening === "active");
    await page.locator("#workspaceTimelineTab").click();
    assert((await page.locator("#workspaceListenBtn").getAttribute("aria-pressed")) === "true", "mobile listening should survive workspace switches");
    await page.locator("#workspaceListenBtn").click();
    await page.waitForFunction(() => document.body.dataset.listening === "idle");
  }
}

async function verifySetScope(page) {
  await goto(page, "/");
  await expectVisible(page, "#djMentorPanel", "SetScope DJ Mentor panel");
  await expectVisible(page, "#setCoachPanel", "SetScope coach panel");
  await expectVisible(page, "#nextMovePanel", "SetScope next move panel");
  await expectVisible(page, "#skillGraphPanel", "cross-session skill constellation");
  await expectText(page, "#skillFocus", "Signal", "new learner skill focus");
  await expectText(page, "#nextMoveMode", "Audio Lab", "first session recommendation");
  await page.locator("#nextMoveBtn").click();
  await page.waitForURL(/audio-lab\.html/);
  await expectVisible(page, "[data-practice-context]", "armed practice mission");
  const missionContract = await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}");
    return draft.practiceMissions?.[0];
  });
  assert(missionContract?.status === "active", "next move should persist an active mission");
  assert(missionContract?.modeId === "audio-lab", "next move should preserve its tool");
  assert(new URL(page.url()).searchParams.get("missionId") === missionContract.id, "tool route should carry the mission id");
  await page.locator("[data-context-return]").click();
  await page.waitForURL(/\/(?:index\.html)?(?:\?|$)/);
  await expectText(page, "#nextMoveAction", "Resume", "armed mission resume state");
  const deckFit = await page.evaluate(() => {
    const deck = document.querySelector(".deck-visual")?.getBoundingClientRect();
    const pads = [...document.querySelectorAll(".sampler-pad")];
    return {
      activePads: pads.filter((pad) => pad.getAttribute("aria-pressed") === "true").length,
      padCount: pads.length,
      padsFit: Boolean(deck) && pads.every((pad) => {
        const rect = pad.getBoundingClientRect();
        return rect.left >= deck.left - 1 && rect.right <= deck.right + 1 && pad.scrollWidth <= pad.clientWidth;
      }),
    };
  });
  assert(deckFit.padCount === 4, "vinyl deck should expose four transition pads");
  assert(deckFit.padsFit, "vinyl deck transition pads and labels should remain inside the hardware frame");
  assert(deckFit.activePads === 1, "vinyl deck should expose one latched transition pad");
  await page.locator("#mentorActionList [data-coach-action=\"mentor-note\"]").click();
  await expectText(page, "#toast", "Mentor note saved", "mentor note toast");
  const draftBeforeFilter = await page.evaluate(() => localStorage.getItem("setscope-draft-v1"));
  const draftContract = JSON.parse(draftBeforeFilter || "{}");
  assert(draftContract.schema === "setscope.set-draft" && draftContract.schemaVersion === 2, "cockpit commands should persist SetDraft V2");
  await page.locator("#timelineSearch").fill("temporary no-match filter");
  const draftAfterFilter = await page.evaluate(() => localStorage.getItem("setscope-draft-v1"));
  assert(draftAfterFilter === draftBeforeFilter, "temporary timeline filters and rendering should not persist the draft");
  await page.locator("#timelineSearch").fill("");

  const archivedTitle = ((await page.locator("#setTitle").textContent()) || "").trim();
  await page.locator("#archiveBtn").click();
  await expectText(page, "#toast", "Set archived", "archive save toast");
  await page.locator("#setArchivePanel").evaluate((panel) => {
    panel.open = true;
  });
  const archivedSet = page.locator("#archiveList [data-set-id]").first();
  await archivedSet.waitFor({ state: "visible" });
  await expectText(page, "#archiveList [data-set-id]", archivedTitle, "archived set summary");
  const archivedTrackTitle = ((await page.locator(".track-row .track-name").first().textContent()) || "").trim();
  await page.locator("#archiveSearch").fill(archivedTrackTitle.split(" ").slice(0, 2).join(" "));
  await expectText(page, "#archiveCount", "1 found", "archive search count");
  await expectText(page, ".archive-match-strip", archivedTrackTitle, "archive track match clue");
  await page.locator("#archiveSearch").fill("missing archive phrase");
  await expectText(page, "#archiveCount", "0 found", "empty archive search count");
  await expectText(page, "#archiveList", "No matching sets", "empty archive search state");
  await page.locator("#archiveSearch").fill("");
  await expectText(page, "#archiveCount", "1 saved", "cleared archive search count");
  await page.locator("#setTitle").evaluate((title) => {
    title.textContent = "Unsaved working title";
  });
  await archivedSet.click();
  await expectText(page, "#toast", "Set loaded", "archive load toast");
  await page.waitForFunction(
    (title) => document.querySelector("#setTitle")?.textContent?.includes(title),
    archivedTitle,
  );
  assert(((await page.locator("#setTitle").textContent()) || "").includes(archivedTitle), "reloaded archive title should be restored");

  await auditPage(page, "setscope-desktop");
}

async function verifyLiveListening(page) {
  await goto(page, "/");
  await page.locator("#cadenceSelect").selectOption("8000");
  await page.locator("#listenBtn").click();
  await expectText(page, "#liveStatus", "Capturing", "live transport capture state");
  await page.locator("#liveMatches").waitFor({ state: "visible", timeout: 12000 });
  await page.waitForFunction(() => document.querySelector("#liveMatches")?.textContent === "1", null, { timeout: 12000 });
  assert((await page.locator("#listenBtn").getAttribute("aria-pressed")) === "true", "live transport should remain active after a match");
  await page.locator("#listenBtn").click();
  await expectText(page, "#liveStatus", "Off air", "live transport stopped state");
  assert((await page.locator("#listenBtn").getAttribute("aria-pressed")) === "false", "live transport should expose stopped state");
  await auditPage(page, "setscope-live-transport");
}

async function verifyContextualPracticeLoop(page) {
  await goto(page, "/");
  const trackTitle = (await page.locator("#nowTitle").textContent()) || "";
  const trackId = await page.evaluate((title) => {
    const draft = JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}");
    return draft.tracks?.find((track) => track.title === title)?.id || "";
  }, trackTitle);
  assert(Boolean(trackId), "context loop should resolve the selected timeline track");

  await page.locator('[data-practice-tool="rhythm-roulette"]').click();
  await expectVisible(page, "[data-practice-context]", "contextual practice assignment");
  await expectText(page, "[data-context-track]", trackTitle, "practice assignment track");
  await page.locator("#blindDigBtn").click();
  await page.locator("#surpriseBeatBtn").click();
  for (const index of [3, 5, 7, 9]) await page.locator(".step-cell").nth(index).click();
  await page.locator("#saveRouletteBtn").click();
  await expectText(page, "[data-context-status]", "Run attached", "attached practice status");

  const savedEvent = await page.evaluate((expectedTrackId) => {
    const draft = JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}");
    return draft.audioEvents?.find((event) => event.metadata?.modeId === "rhythm-roulette" && event.trackId === expectedTrackId);
  }, trackId);
  assert(Boolean(savedEvent?.id), "contextual Rhythm Roulette run should attach to its source track");
  assert(savedEvent?.labels?.includes("practice"), "contextual practice run should be labeled for filtering");

  await page.locator("[data-context-return]").click();
  await expectVisible(page, "#eventDrawer.open", "returned practice event drawer");
  await expectText(page, "#eventDrawerTitle", "Rhythm Roulette run", "returned practice event title");
  await expectText(page, "#nowTitle", trackTitle, "returned timeline selection");
}

async function verifyRhythmRoulette(page) {
  await goto(page, "/rhythm-roulette.html");
  await expectVisible(page, "#rouletteSceneCanvas", "Rhythm Roulette scene canvas");
  await page.locator("#blindDigBtn").click();
  await expectCount(page, ".record-card", 3, "Rhythm Roulette mystery pulls");
  await expectCount(page, ".sample-pad:not(.empty)", 12, "Rhythm Roulette sample pads");
  await expectCount(page, ".step-cell", 64, "Rhythm Roulette beat grid");
  const focusedStep = page.locator(".step-cell").first();
  await page.locator("#playBeatBtn").click();
  await focusedStep.focus();
  await page.waitForTimeout(350);
  assert(await focusedStep.evaluate((node) => document.activeElement === node), "Rhythm Roulette playback should preserve sequencer keyboard focus");
  await page.locator("#playBeatBtn").click();
  await page.locator("#surpriseBeatBtn").click();
  assert(await page.locator("#saveRouletteBtn").isDisabled(), "Rhythm Roulette should require player choices after Auto flip");
  for (const index of [3, 5, 7, 9]) await page.locator(".step-cell").nth(index).click();
  assert(!(await page.locator("#saveRouletteBtn").isDisabled()), "Rhythm Roulette should unlock save after four player choices");
  await page.locator("#saveRouletteBtn").click();
  await expectText(page, "#rouletteStatus", "RUN SAVED", "Rhythm Roulette save status");
  const savedEvent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}").audioEvents?.some((event) => event.metadata?.modeId === "rhythm-roulette"),
  );
  assert(savedEvent, "Rhythm Roulette should persist a learning event");
  await auditPage(page, "roulette-desktop");
}

async function verifyPitchGates(page) {
  await goto(page, "/pitch-gates.html");
  await expectVisible(page, "#pitchGameCanvas", "Pitch Gates canvas");
  await expectText(page, "#overlayStatus", "CHOOSE AN INPUT", "Pitch Gates idle guidance");
  await expectVisible(page, "#captureComfortBtn", "Pitch Gates comfort-note control");
  await page.locator("[data-assist=\"balanced\"]").click();
  assert(await page.locator("[data-assist=\"balanced\"]").evaluate((node) => node.classList.contains("active")), "Pitch Gates should change assist presets");
  assert(await page.locator("#startRoundBtn").isDisabled(), "Pitch Gates should require an input before a round");
  await page.locator("#toneBtn").click();
  await page.waitForFunction(() => document.querySelector("#liveNote")?.textContent !== "--");
  await page.locator("#captureComfortBtn").click();
  await expectText(page, "#profileStage", "CALIBRATE", "Pitch Gates should request confirmed comfort bounds");
  assert(!(await page.locator("#profileRange").textContent()).includes("Not calibrated"), "Pitch Gates should save a safe calibrated span");
  await page.locator("#startRoundBtn").click();
  await expectText(page, "#overlayTitle", "3", "Pitch Gates pre-roll");
  await page.waitForFunction(() => document.querySelector("#readyOverlay")?.classList.contains("hidden"));
  const overlayHidden = await page.locator("#readyOverlay").evaluate((node) => node.classList.contains("hidden"));
  assert(overlayHidden, "Pitch Gates should hide ready overlay after starting a round");
  await page.locator("#pauseRoundBtn").click();
  await expectText(page, "#overlayTitle", "PAUSED", "Pitch Gates pause receipt");
  await page.locator("#pauseRoundBtn").click();
  assert(await page.locator("#readyOverlay").evaluate((node) => node.classList.contains("hidden")), "Pitch Gates should resume in place");
  await auditPage(page, "pitch-gates-desktop");
}

async function verifyAudioLab(page) {
  await goto(page, "/audio-lab.html");
  await expectVisible(page, "#scopeCanvas", "Audio Lab scope canvas");
  assert(await page.locator("#logSnapshotBtn").isDisabled(), "Audio Lab should require a signal before logging a snapshot");
  await expectText(page, "#scopeDisplayLabel", "Idle display", "Audio Lab truthful idle display");
  await expectText(page, "#sourceLabel", "NONE", "Audio Lab initial source label");
  await expectText(page, "#profileStage", "CALIBRATE", "Audio Lab shared boundary calibration stage");
  assert(!(await page.locator("#profileRange").textContent()).includes("Not calibrated"), "Audio Lab should load Pitch Gates calibration");
  await page.locator('[data-preset="profile"]').click();
  assert((await page.locator("[data-target-midi]").count()) === 5, "Audio Lab should build tuner targets from the shared safe span");
  await page.locator("#toneBtn").click();
  await page.waitForFunction(() => document.querySelector("#liveNote")?.textContent !== "--");
  await page.locator("[data-demo-midi]").nth(0).click();
  await page.waitForFunction(() => document.querySelector("#liveNote")?.textContent === document.querySelectorAll("[data-demo-midi]")[0]?.textContent);
  await page.locator("#profileLowBtn").click();
  await page.locator("#profileLowBtn").click();
  await page.locator("[data-demo-midi]").nth(2).click();
  await page.waitForFunction(() => document.querySelector("#liveNote")?.textContent === document.querySelectorAll("[data-demo-midi]")[2]?.textContent);
  await page.locator("#profileHighBtn").click();
  await page.locator("#profileHighBtn").click();
  await expectText(page, "#profileRange", "Confirmed", "Audio Lab confirmed comfort span");
  await expectText(page, "#profileStage", "HEAR", "confirmed comfort span should advance to hearing");
  await page.locator("[data-demo-midi]").nth(1).click();
  await page.waitForFunction(() => document.querySelector("#liveNote")?.textContent === document.querySelectorAll("[data-demo-midi]")[1]?.textContent);
  await page.waitForTimeout(2500);
  await expectText(page, "#profileStage", "HEAR", "Audio Lab demo holds should remain guided rather than promote mastery");
  await page.locator("#freezeScopeBtn").click();
  await page.locator("#triggerScopeBtn").click();
  const segmentHeight = await page.locator("[data-demo-midi]").nth(1).evaluate((node) => node.getBoundingClientRect().height);
  assert(segmentHeight >= 40, "Audio Lab segmented controls should use the shared hardware sizing");
  await auditPage(page, "audio-lab-desktop");
}

async function verifyMidiPlayground(page) {
  await goto(page, "/midi-playground.html");
  await expectVisible(page, "#padField", "MIDI Playground pad monitor");
  await expectCount(page, "#padField > i", 16, "MIDI Playground pad matrix");
  await expectCount(page, "#deviceSlots [data-device-family]", 5, "MIDI hardware census rack");
  await page.locator("#demoMidiBtn").click();
  await page.waitForFunction(() => Number(document.querySelector("#eventCount")?.textContent) >= 4);
  assert((await page.locator("#midiEventLog .midi-event").count()) >= 4, "MIDI demo should emit normalized observations");
  await page.locator("#learnBtn").click();
  await page.locator("#demoMidiBtn").click();
  await page.waitForFunction(() => document.querySelector("#mappingCount")?.textContent === "1 map");
  assert((await page.locator("#learnBtn").getAttribute("aria-pressed")) === "false", "MIDI Learn should disarm after saving");
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem("setscope-input-mappings-v1") || "[]").length === 1), "MIDI Learn should persist its semantic mapping");
  await page.locator("#inputLatencyControl").fill("12");
  await page.locator("#outputLatencyControl").fill("8");
  await expectText(page, "#timingConfidence", "manual 25%", "manual timing confidence");
  assert(await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem("setscope-latency-profile-v1") || "{}");
    return profile.inputLatencyMs === 12 && profile.outputLatencyMs === 8;
  }), "MIDI Playground should persist latency offsets");
  await page.locator("#demoMidiBtn").click();
  await page.waitForFunction(() => document.querySelector("#semanticAction")?.textContent.includes("KICK"));
  await expectText(page, "#clockPosition", "BAR", "semantic action musical position");
  await auditPage(page, "midi-playground-desktop");
}

async function verifyBeatSchool(page) {
  await goto(page, "/beat-school.html?seed=27");
  await expectVisible(page, "#padBank", "Beat School drum pads");
  await expectCount(page, "#padBank .beat-pad", 4, "Beat School four-pad bank");
  await expectCount(page, "#stepTrack .beat-step", 16, "Beat School step timeline");
  await page.locator('[data-lane="kick"]').click();
  await expectText(page, "#inputStatus", "KICK", "Beat School touch input receipt");
  await page.locator("#demoRun").click();
  await expectText(page, "#receiptHeading", "saved", "Beat School saved demo receipt");
  assert(await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem("setscope-draft-v1") || "{}");
    const run = draft.audioEvents?.find((event) => event.metadata?.modeId === "beat-school");
    return run?.metadata?.assistance?.eligibleForMastery === false;
  }), "Beat School demo evidence should never count toward mastery");
  await auditPage(page, "beat-school-desktop");
}

async function verifyJournal(page) {
  await goto(page, "/journal.html");
  await expectVisible(page, "#page", "Journal page");
  await expectCount(page, "[data-tool-rack] .tool-rack-item", 8, "Journal shared tool navigation");
  await page.locator("[data-paper=\"graph\"]").click();
  const paper = await page.locator("body").getAttribute("data-paper");
  assert(paper === "graph", "Journal should switch to graph paper");
  await auditPage(page, "journal-desktop");
}

async function verifyStyleLab(page) {
  await goto(page, "/design-system.html");
  await expectVisible(page, "#roomSwitcher", "Style Lab room switcher");
  await expectCount(page, "[data-room-choice]", 7, "Style Lab room identities");
  await expectCount(page, ".asset-grid img", 4, "Style Lab environment library");
  await page.locator('[data-room-choice="pitch"]').click();
  assert((await page.locator("[data-room]").getAttribute("data-room")) === "pitch", "Style Lab should switch room identity");
  assert((await page.locator("[data-room]").getAttribute("data-material")) === "painted-cabinet", "Style Lab should apply room material");
  await expectText(page, "#styleStatus", "VOCAL ARCADE", "Style Lab room status");
  await auditPage(page, "style-lab-desktop");
}

async function goto(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
}

async function auditPage(page, label) {
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: join(artifactDir, `${label}.png`),
    timeout: 60000,
  });
  const result = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const brokenImages = [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    return {
      brokenImages,
      duplicateIds: [...new Set(duplicateIds)],
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      clippedControls: [...document.querySelectorAll("button, a, input, select, textarea")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const scrollRegion = node.parentElement?.closest(".sequencer, .tool-rack, [data-scroll-region]");
          const boundedScroller = Boolean(scrollRegion)
            && ["auto", "scroll"].includes(getComputedStyle(scrollRegion).overflowX)
            && scrollRegion.scrollWidth > scrollRegion.clientWidth;
          return !boundedScroller && style.display !== "none" && rect.width > 2 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
        })
        .map((node) => node.id || node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 24) || node.tagName),
      clippedTitleInputs: [...document.querySelectorAll(".entry-title")]
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .map((node) => node.id || "entry-title"),
      title: document.title,
      transparentSharedSurfaces: [...document.querySelectorAll('[data-ui="chassis"], [data-ui="panel"]')]
        .filter((node) => getComputedStyle(node).backgroundColor === "rgba(0, 0, 0, 0)")
        .map((node) => node.id || node.className || node.dataset.ui),
      undersizedPriorityTargets: [...document.querySelectorAll(".tool-rack-item, .segment-control button, .entry-move button, .step-cell, [data-room] button, [data-room] summary, [data-room] select")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== "none" && (rect.width < 43 || rect.height < 43);
        })
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const label = node.id || node.getAttribute("aria-label") || node.className;
          return `${label}:${Math.round(rect.width * 10) / 10}x${Math.round(rect.height * 10) / 10}`;
        }),
    };
  });
  assert(!result.overflowX, `${label} should not have horizontal overflow`);
  assert(result.clippedControls.length === 0, `${label} should not clip controls: ${result.clippedControls.join(", ")}`);
  assert(result.clippedTitleInputs.length === 0, `${label} should fit journal titles: ${result.clippedTitleInputs.join(", ")}`);
  assert(result.duplicateIds.length === 0, `${label} should not have duplicate ids: ${result.duplicateIds.join(", ")}`);
  assert(result.brokenImages.length === 0, `${label} should not have broken images: ${result.brokenImages.join(", ")}`);
  assert(result.transparentSharedSurfaces.length === 0, `${label} should give shared hardware surfaces a material background: ${result.transparentSharedSurfaces.join(", ")}`);
  if (label.endsWith("-mobile")) assert(result.undersizedPriorityTargets.length === 0, `${label} should keep priority touch targets at 44px: ${result.undersizedPriorityTargets.join(", ")}`);
}

async function expectVisible(page, selector, label) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible", timeout: 5000 });
  assert((await locator.count()) > 0, `${label} should exist`);
}

async function expectText(page, selector, text, label) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible", timeout: 5000 });
  await locator.evaluate(
    (element, expected) => new Promise((resolve, reject) => {
      if ((element.textContent || "").includes(expected)) {
        resolve();
        return;
      }
      const observer = new MutationObserver(() => {
        if ((element.textContent || "").includes(expected)) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(element, { characterData: true, childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timed out waiting for "${expected}"`));
      }, 5000);
    }),
    text,
  );
  const content = (await page.locator(selector).textContent()) || "";
  assert(content.includes(text), `${label} should include "${text}", saw "${content}"`);
}

async function expectCount(page, selector, expected, label) {
  const count = await page.locator(selector).count();
  assert(count === expected, `${label} expected ${expected}, saw ${count}`);
}

function captureRuntimeProblems(page, label) {
  const problems = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      problems.push(`${label} console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`${label} page error: ${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      problems.push(`${label} HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return problems;
}

function collectRuntimeProblems(problems) {
  failures.push(...problems);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function startRuntimeServer() {
  const port = await reservePort();
  const dataDirectory = await mkdtemp(join(tmpdir(), "setscope-runtime-data-"));
  const output = [];
  const child = spawn(process.execPath, ["server.mjs"], {
    env: { ...process.env, PORT: String(port), SETSCOPE_DATA_DIR: dataDirectory },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  const baseUrl = `http://127.0.0.1:${port}`;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    if (child.exitCode !== null) throw new Error(`runtime_server_exited: ${output.join("").trim()}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return { baseUrl, process: child };
    } catch {
      // Server has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`runtime_server_start_timeout: ${output.join("").trim()}`);
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
