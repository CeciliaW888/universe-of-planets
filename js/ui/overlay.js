export function createOverlayController({
  state,
  dom,
  getActiveWorld,
  render,
  sceneController,
  narrationController,
}) {
  let overlayFocusTimer = 0;
  let overlayEntryTimer = 0;

  function openOverlay(id = state.activeId) {
    state.activeId = id;
    state.overlayOpen = true;
    const active = getActiveWorld();

    if (overlayEntryTimer) {
      window.clearTimeout(overlayEntryTimer);
      overlayEntryTimer = 0;
    }

    if (overlayFocusTimer) {
      window.clearTimeout(overlayFocusTimer);
    }

    document.body.classList.add("overlay-active");
    dom.detailOverlay.classList.add("open");
    dom.detailOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    dom.overlayLoader.setAttribute("aria-hidden", "false");
    dom.overlayInteractHint.style.opacity = "";
    dom.overlayScene.classList.add("entering");
    dom.overlayScene.classList.remove("ready");

    render();
    sceneController.updateThreeScene(active);

    overlayFocusTimer = window.setTimeout(() => {
      dom.overlayShell.focus();
    }, 60);

    overlayEntryTimer = window.setTimeout(() => {
      dom.overlayScene.classList.remove("entering");
      dom.overlayScene.classList.add("ready");
      narrationController.playNarration(active);
    }, 720);
  }

  function closeOverlay() {
    state.overlayOpen = false;

    if (overlayEntryTimer) {
      window.clearTimeout(overlayEntryTimer);
      overlayEntryTimer = 0;
    }

    if (overlayFocusTimer) {
      window.clearTimeout(overlayFocusTimer);
      overlayFocusTimer = 0;
    }

    document.body.classList.remove("overlay-active");
    dom.detailOverlay.classList.remove("open");
    dom.detailOverlay.setAttribute("aria-hidden", "true");
    dom.overlayLoader.setAttribute("aria-hidden", "true");
    dom.overlayScene.classList.remove("entering", "ready");
    document.body.style.overflow = window.innerWidth <= 1080 ? "auto" : "hidden";
    sceneController.pauseAnimation();
    narrationController.stopNarration();
  }

  return {
    openOverlay,
    closeOverlay,
  };
}
