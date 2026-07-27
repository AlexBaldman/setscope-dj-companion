import { applyRoomSystem, cueRoomMotion, roomManifest } from "./room-system.js";

const root = document.querySelector("[data-room]");
const switcher = document.querySelector("#roomSwitcher");
const status = document.querySelector("#styleStatus");

switcher.innerHTML = Object.entries(roomManifest).map(([id, room]) => `
  <button data-room-choice="${id}" aria-pressed="${id === root.dataset.room}">
    <span>${room.label}</span><small>${room.material}</small>
  </button>
`).join("");

switcher.addEventListener("click", (event) => {
  const button = event.target.closest("[data-room-choice]");
  if (!button) return;
  root.dataset.room = button.dataset.roomChoice;
  const room = applyRoomSystem();
  document.querySelectorAll("[data-room-choice]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === button));
  });
  renderRoom(room);
  cueRoomMotion("impact");
});

document.querySelector("#motionDemo").addEventListener("click", () => cueRoomMotion("impact"));
renderRoom(applyRoomSystem());

function renderRoom(room) {
  if (!room) return;
  document.querySelector("#roomTitle").textContent = room.label;
  document.querySelector("#materialValue").textContent = room.material;
  document.querySelector("#motionValue").textContent = room.motion;
  status.textContent = room.label.toUpperCase();
}
