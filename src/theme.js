const STORAGE_KEY = "setscope-theme";
const root = document.documentElement;
const buttons = document.querySelectorAll("[data-theme-toggle]");

applyTheme(localStorage.getItem(STORAGE_KEY) || "dark");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
});

function applyTheme(theme) {
  const lightMode = theme === "light";
  root.dataset.theme = lightMode ? "light" : "dark";
  buttons.forEach((button) => {
    const action = lightMode ? "dark" : "light";
    button.setAttribute("aria-label", `Switch to ${action} mode`);
    button.setAttribute("title", `Switch to ${action} mode`);
    button.setAttribute("aria-pressed", String(lightMode));
  });
}
