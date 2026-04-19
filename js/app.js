import { worlds, links } from "./data/worlds.js";
import { createOptions, ensureActive as ensureActiveSelection, getActiveWorld as getActiveSelection, getFilteredWorlds as getFilteredSelection, state } from "./state.js";
import { createMusicController } from "./audio/music.js";
import { createNarrationController } from "./audio/narration.js";
import { createThreeSceneController } from "./three/scene.js";
import { dom } from "./ui/dom.js";
import { buildFilterChips } from "./ui/filters.js";
import { createOverlayController } from "./ui/overlay.js";
import { createRenderer } from "./ui/render.js";
import { factsForWorld, labelByLang, narrationSegments, storyForWorld } from "./ui/text.js";

const options = createOptions(worlds);

const getFilteredWorlds = () => getFilteredSelection(worlds, state);
const getActiveWorld = () => getActiveSelection(worlds, state);
const ensureActive = (filtered) => ensureActiveSelection(worlds, filtered, state);

const narrationController = createNarrationController({
  state,
  dom,
  labelByLang,
  narrationSegments,
});

const musicController = createMusicController({ state });
const sceneController = createThreeSceneController({ state, dom, getActiveWorld });

let overlayController;

const renderer = createRenderer({
  worlds,
  links,
  state,
  dom,
  narrationController,
  sceneController,
  getFilteredWorlds,
  ensureActive,
  getActiveWorld,
  storyForWorld,
  factsForWorld,
  labelByLang,
  openOverlay: (id) => overlayController.openOverlay(id),
});

overlayController = createOverlayController({
  state,
  dom,
  getActiveWorld,
  render: renderer.render,
  sceneController,
  narrationController,
});

[
  ["type", dom.typeFilters],
  ["temp", dom.tempFilters],
  ["habitability", dom.habitFilters],
  ["system", dom.systemFilters],
].forEach(([key, container]) => {
  buildFilterChips({
    container,
    key,
    values: options[key],
    state,
    onChange: renderer.render,
  });
});

dom.modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    dom.modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderer.render();
    if (state.overlayOpen) {
      narrationController.playNarration(getActiveWorld());
    }
  });
});

dom.languageSelect.addEventListener("change", (event) => {
  state.lang = event.target.value;
  renderer.render();
  if (state.overlayOpen) {
    narrationController.playNarration(getActiveWorld());
  }
});

dom.musicBtn.addEventListener("click", () => {
  state.music = !state.music;
  dom.musicBtn.classList.toggle("active", state.music);
  dom.musicBtn.textContent = state.music
    ? `🎵 ${labelByLang(state, "Music Off", "关闭音乐")}`
    : `🎵 ${labelByLang(state, "Music On", "打开音乐")}`;
  if (state.music) {
    musicController.startGeneratedMusic();
  } else {
    musicController.stopGeneratedMusic();
  }
});

dom.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.toLowerCase().trim();
  renderer.render();
});

dom.openImmersiveBtn.addEventListener("click", () => overlayController.openOverlay(state.activeId));
dom.quickNarrateBtn.addEventListener("click", () => {
  renderer.render();
  narrationController.playNarration(getActiveWorld());
});
dom.overlayBackdrop.addEventListener("click", overlayController.closeOverlay);
dom.overlayBackBtn.addEventListener("click", overlayController.closeOverlay);
dom.overlayCloseBtn.addEventListener("click", overlayController.closeOverlay);
dom.overlayReplayBtn.addEventListener("click", () => narrationController.playNarration(getActiveWorld()));
dom.overlayReplayTopBtn.addEventListener("click", () => narrationController.playNarration(getActiveWorld()));
dom.overlayPauseBtn.addEventListener("click", () => narrationController.togglePause(getActiveWorld));

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.overlayOpen) {
    overlayController.closeOverlay();
  }
});

narrationController.init();
window.addEventListener("beforeunload", narrationController.stopNarration);
window.addEventListener("beforeunload", musicController.stopGeneratedMusic);
window.addEventListener("beforeunload", sceneController.destroyThreeScene);

renderer.render();
