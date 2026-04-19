import { filterText, modeBadgeText, modeLabelText } from "./text.js";
import { withAlpha } from "../utils/color.js";

export function createRenderer({
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
  openOverlay,
}) {
  function renderMap(filtered) {
    const byId = Object.fromEntries(worlds.map((world) => [world.id, world]));
    const visibleIds = new Set(filtered.map((world) => world.id));
    dom.svg.innerHTML = "<defs></defs>";

    links.forEach(([fromId, toId]) => {
      if (!visibleIds.has(fromId) || !visibleIds.has(toId)) {
        return;
      }

      const from = byId[fromId];
      const to = byId[toId];
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const midX = (from.x + to.x) / 2;
      const midY = Math.min(from.y, to.y) - 42;
      path.setAttribute("d", `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
      path.setAttribute("class", "link-line");
      dom.svg.appendChild(path);
    });

    worlds.forEach((world) => {
      const visible = visibleIds.has(world.id);
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", `node ${visible ? "" : "hidden"} ${state.activeId === world.id ? "active" : ""}`);
      group.setAttribute("transform", `translate(${world.x}, ${world.y})`);
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", visible ? "0" : "-1");

      const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      glow.setAttribute("r", String(world.size * 1.9));
      glow.setAttribute("fill", world.glow);
      glow.setAttribute("class", "planet-glow");
      group.appendChild(glow);

      if (world.special === "sun") {
        for (let index = 0; index < 10; index += 1) {
          const angle = (Math.PI * 2 * index) / 10;
          const ray = document.createElementNS("http://www.w3.org/2000/svg", "line");
          ray.setAttribute("x1", String(Math.cos(angle) * (world.size + 8)));
          ray.setAttribute("y1", String(Math.sin(angle) * (world.size + 8)));
          ray.setAttribute("x2", String(Math.cos(angle) * (world.size + 18)));
          ray.setAttribute("y2", String(Math.sin(angle) * (world.size + 18)));
          ray.setAttribute("class", "sun-ray");
          group.appendChild(ray);
        }
      }

      if (world.ring) {
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        ring.setAttribute("rx", String(world.size * 1.8));
        ring.setAttribute("ry", String(world.size * 0.65));
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "rgba(255,238,195,.6)");
        ring.setAttribute("stroke-width", "3");
        ring.setAttribute("transform", "rotate(-18)");
        group.appendChild(ring);
      }

      const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      core.setAttribute("r", String(world.size));
      core.setAttribute("fill", world.color);
      core.setAttribute("class", "planet-core");
      group.appendChild(core);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(world.size + 12));
      label.setAttribute("y", "-2");
      label.setAttribute("class", "planet-label");
      label.textContent = labelByLang(state, world.name, world.zh);
      group.appendChild(label);

      const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
      sub.setAttribute("x", String(world.size + 12));
      sub.setAttribute("y", "14");
      sub.setAttribute("class", "planet-sub");
      sub.textContent = labelByLang(state, world.system, world.systemZh);
      group.appendChild(sub);

      const activate = () => openOverlay(world.id);
      group.addEventListener("click", activate);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });

      dom.svg.appendChild(group);
    });
  }

  function renderList(filtered) {
    dom.worldList.innerHTML = "";

    filtered.forEach((world) => {
      const card = document.createElement("div");
      card.className = `world-card${state.activeId === world.id ? " active" : ""}`;
      card.innerHTML = `
        <div class="world-card-top">
          <div>
            <h3>${labelByLang(state, world.name, world.zh)}</h3>
            <small>${labelByLang(state, world.system, world.systemZh)}</small>
          </div>
          <span class="legend-dot" style="background:${world.color}"></span>
        </div>
        <div class="world-tags">
          <span class="tag">${labelByLang(state, world.type, world.typeZh)}</span>
          <span class="tag">${labelByLang(state, world.temp, world.tempZh)}</span>
          <span class="tag">${labelByLang(state, world.habitability, world.habitabilityZh)}</span>
        </div>
      `;
      card.addEventListener("click", () => openOverlay(world.id));
      dom.worldList.appendChild(card);
    });
  }

  function renderDetails(active) {
    dom.modeLabel.textContent = modeLabelText(state);
    dom.modeSuffix.textContent = state.lang === "zh" ? "模式" : " mode";
    dom.captionTitle.textContent = `${labelByLang(state, active.name, active.zh)} · ${labelByLang(state, active.type, active.typeZh)}`;
    dom.captionText.textContent = storyForWorld(state, active);
    dom.detailName.textContent = labelByLang(state, active.name, active.zh);
    dom.detailMeta.textContent = `${labelByLang(state, active.type, active.typeZh)} · ${labelByLang(state, active.system, active.systemZh)} · ${labelByLang(state, active.temp, active.tempZh)} · ${labelByLang(state, active.habitability, active.habitabilityZh)}`;
    dom.detailStory.textContent = storyForWorld(state, active);
    dom.planetHero.style.setProperty("--hero-color", active.color);
    dom.planetHero.style.setProperty("--hero-glow", active.glow);
    dom.planetHero.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), ${active.color} 42%, rgba(0,0,0,.82) 100%)`;
    dom.detailFacts.innerHTML = Object.entries(factsForWorld(state, active))
      .map(([key, value]) => `<div class="fact-box"><strong>${key}</strong><span>${value}</span></div>`)
      .join("");
    dom.openImmersiveBtn.textContent = labelByLang(state, "Open immersive story", "打开沉浸故事");
    dom.quickNarrateBtn.textContent = labelByLang(state, "Read aloud", "朗读");
  }

  function renderOverlay(active) {
    dom.overlayKicker.textContent = labelByLang(state, "Immersive story", "沉浸故事");
    dom.overlayModeBadge.textContent = modeBadgeText(state);
    dom.overlayName.textContent = labelByLang(state, active.name, active.zh);
    dom.overlayMeta.textContent = `${labelByLang(state, active.type, active.typeZh)} · ${labelByLang(state, active.system, active.systemZh)} · ${labelByLang(state, active.temp, active.tempZh)} · ${labelByLang(state, active.habitability, active.habitabilityZh)}`;
    dom.overlaySceneBadgeLabel.textContent = labelByLang(state, "3D Scene Live", "3D 场景已启动");
    dom.overlaySceneBadgeText.textContent = labelByLang(state, "Rotating planet model powered by Three.js", "由 Three.js 驱动的旋转星球模型");
    dom.overlayEntryLabel.textContent = labelByLang(state, "Scene Entry", "场景入口");
    dom.overlayEntryText.textContent = labelByLang(state, "Arrival complete. Drag gently to orbit and watch the world turn under the light.", "抵达完成。轻轻拖动即可环绕观看，观察光线掠过这颗星球。");
    dom.overlayLoaderLabel.textContent = labelByLang(state, "Approaching world", "正在接近星球");
    dom.overlayLoaderText.textContent = labelByLang(state, "Calibrating the camera, light, and orbit path for your arrival.", "正在校准镜头、光线与轨道路径，准备带你抵达。");
    dom.overlayInteractHint.textContent = labelByLang(state, "Drag to orbit", "拖动环绕");
    dom.overlayStory.textContent = storyForWorld(state, active);
    dom.overlayStoryNote.textContent = narrationController.speechSupported
      ? labelByLang(state, "Narration starts once the scene settles.", "场景稳定后会自动开始朗读。")
      : labelByLang(state, "This browser does not support speech synthesis narration.", "当前浏览器不支持语音朗读。");

    dom.overlayBody.style.setProperty("--hero-color", active.color);
    dom.overlayBody.style.setProperty("--hero-glow", active.glow);
    dom.overlayScene.style.setProperty("--spot-x", `${Math.max(18, Math.min(78, (active.x / 1000) * 100))}%`);
    dom.overlayScene.style.setProperty("--spot-y", `${Math.max(18, Math.min(82, (active.y / 680) * 100))}%`);
    dom.overlaySceneBg.style.background = `
      radial-gradient(circle at 50% 50%, rgba(255,255,255,.12), transparent 22%),
      radial-gradient(circle at 50% 52%, ${withAlpha(active.color, 0.18)}, transparent 30%),
      radial-gradient(circle at 50% 50%, ${withAlpha(active.color, 0.12)}, transparent 44%),
      conic-gradient(from 0deg, rgba(255,255,255,.05), transparent 28%, ${withAlpha(active.color, 0.08)}, transparent 65%, rgba(255,255,255,.05))
    `;
    dom.overlayShell.style.background = `
      radial-gradient(circle at 12% 14%, rgba(255,255,255,.08), transparent 20%),
      radial-gradient(circle at 82% 18%, ${withAlpha(active.color, 0.08)}, transparent 22%),
      linear-gradient(160deg, rgba(9, 18, 40, .98), rgba(13, 24, 55, .96) 42%, rgba(8, 13, 32, .98))
    `;

    dom.overlayBody.className = `overlay-body ${active.special === "sun" ? "sun" : ""}`;
    dom.overlayBody.style.background = `
      radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), rgba(255,255,255,.08) 24%, transparent 26%),
      radial-gradient(circle at 34% 34%, rgba(255,255,255,.16), transparent 52%),
      radial-gradient(circle at 58% 64%, rgba(0,0,0,.34), transparent 62%),
      radial-gradient(circle at 30% 30%, rgba(255,255,255,.28), ${active.color} 48%, rgba(8,10,20,.96) 100%)
    `;
    dom.overlayBody.style.boxShadow = `inset -30px -30px 50px rgba(0,0,0,.3), 0 0 60px ${active.glow}, 0 0 140px rgba(255,255,255,.06)`;
    dom.overlayRing.classList.toggle("visible", Boolean(active.ring));
    dom.overlayRing.style.borderColor = active.ring ? "rgba(255,238,195,.56)" : "transparent";

    dom.overlayFacts.innerHTML = Object.entries(factsForWorld(state, active))
      .map(([key, value]) => `<div class="overlay-fact"><strong>${key}</strong><span>${value}</span></div>`)
      .join("");

    if (state.overlayOpen) {
      sceneController.updateThreeScene(active);
    }

    dom.overlayBackBtn.textContent = labelByLang(state, "← Back to map", "← 返回地图");
    dom.overlayReplayBtn.textContent = labelByLang(state, "Replay narration", "重播朗读");
    dom.overlayReplayTopBtn.textContent = labelByLang(state, "Replay narration", "重播");
    narrationController.updateStatus(
      narrationController.speechSupported
        ? labelByLang(state, "Narration ready.", "朗读准备就绪。")
        : labelByLang(state, "Speech synthesis is not available.", "当前没有可用的语音朗读。"),
    );
  }

  function syncFilterButtons() {
    [["type", dom.typeFilters], ["temp", dom.tempFilters], ["habitability", dom.habitFilters], ["system", dom.systemFilters]]
      .forEach(([key, container]) => {
        Array.from(container.querySelectorAll(".chip")).forEach((button) => {
          const value = button.dataset.value;
          button.classList.toggle("active", value === state.filters[key]);
          button.textContent = filterText(worlds, state, value, key);
        });
      });
  }

  function renderStaticText() {
    dom.modeButtons[0].textContent = labelByLang(state, "🌈 Story Mode", "🌈 故事模式");
    dom.modeButtons[1].textContent = labelByLang(state, "🔭 Science Mode", "🔭 科学模式");
    dom.eyebrowText.textContent = labelByLang(state, "Storybook Space Atlas", "童话宇宙地图");
    dom.titleText.textContent = labelByLang(state, "Universe of Planets", "行星宇宙图");
    dom.subtitleText.textContent = labelByLang(state, "A bright, magical planet playground for kids, families, and curious explorers who want to drift from the Sun to faraway worlds.", "一个明亮、温暖、充满魔法感的星球游乐场，适合孩子、家人和所有想探索宇宙的人。");
    dom.worldCount.textContent = String(worlds.length);
    dom.worldLabel.textContent = labelByLang(state, "worlds", "世界");
    dom.systemCount.textContent = String(new Set(worlds.map((world) => world.system)).size);
    dom.systemLabel.textContent = labelByLang(state, "systems", "星系");
    dom.finderTitle.textContent = labelByLang(state, "World Finder", "星球导航");
    dom.finderText.textContent = labelByLang(state, "Filter by planet type, warmth, habitability, or star system. Tap any card to focus the map and open its story.", "按行星类型、温度、宜居度和星系筛选，点卡片即可聚焦地图并打开故事。");
    dom.sceneBannerLabel.textContent = labelByLang(state, "3D Mission", "3D 任务");
    dom.sceneBannerText.textContent = labelByLang(state, "Tap any glowing world to launch its immersive Three.js scene.", "点击任意发光世界，立刻进入它的 Three.js 沉浸场景。");
    dom.languageLabel.textContent = labelByLang(state, "Language", "语言");
    dom.typeFilterLabel.textContent = labelByLang(state, "Type", "类型");
    dom.tempFilterLabel.textContent = labelByLang(state, "Temperature", "温度");
    dom.habitFilterLabel.textContent = labelByLang(state, "Habitability", "宜居度");
    dom.systemFilterLabel.textContent = labelByLang(state, "System", "星系");
    dom.searchInput.placeholder = labelByLang(state, "Search planet, moon, exoplanet, star", "搜索行星、卫星、系外行星、恒星");
    dom.languageSelect.value = state.lang;
    dom.musicBtn.textContent = state.music
      ? `🎵 ${labelByLang(state, "Music Off", "关闭音乐")}`
      : `🎵 ${labelByLang(state, "Music On", "打开音乐")}`;
  }

  function render() {
    const filtered = getFilteredWorlds();
    ensureActive(filtered);
    const active = getActiveWorld();
    syncFilterButtons();
    renderStaticText();
    renderMap(filtered);
    renderList(filtered);
    renderDetails(active);
    renderOverlay(active);
  }

  return {
    render,
    syncFilterButtons,
  };
}
