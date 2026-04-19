export function labelByLang(state, en, zh) {
  return state.lang === "zh" ? zh : en;
}

export function worldText(state, world, keyEn, keyZh) {
  return state.lang === "zh" ? world[keyZh] : world[keyEn];
}

export function modeLabelText(state) {
  return state.mode === "kids"
    ? labelByLang(state, "Story", "故事")
    : labelByLang(state, "Science", "科学");
}

export function modeBadgeText(state) {
  return state.mode === "kids"
    ? labelByLang(state, "Story mode", "故事模式")
    : labelByLang(state, "Science mode", "科学模式");
}

export function factsForWorld(state, world) {
  if (state.mode === "kids") {
    return state.lang === "zh" ? world.factsKidsZh : world.factsKids;
  }

  return state.lang === "zh" ? world.factsAstroZh : world.factsAstro;
}

export function storyForWorld(state, world) {
  return state.mode === "kids"
    ? worldText(state, world, "blurbKids", "blurbKidsZh")
    : worldText(state, world, "blurbAstro", "blurbAstroZh");
}

export function narrationSegments(state, world) {
  const storyEn = state.mode === "kids" ? world.blurbKids : world.blurbAstro;
  const storyZh = state.mode === "kids" ? world.blurbKidsZh : world.blurbAstroZh;
  const facts = factsForWorld(state, world);
  const factSentence = Object.entries(facts)
    .slice(0, 3)
    .map(([key, value]) => (state.lang === "zh" ? `${key}，${value}。` : `${key}. ${value}.`))
    .join(" ");

  if (state.lang === "zh") {
    return [{
      text: `${world.zh}。${storyZh} ${factSentence} 继续看看下一颗闪亮的星球吧。`,
      lang: "zh-CN",
    }];
  }

  const intro = state.mode === "kids"
    ? `Hello explorer. Here comes ${world.name}.`
    : `Now exploring ${world.name}.`;
  const outro = state.mode === "kids"
    ? "Imagine floating nearby and taking a gentle look around."
    : "Keep looking closely. Each world shows a different chapter of planetary science.";

  return [{
    text: `${intro} ${storyEn} ${factSentence} ${outro}`,
    lang: "en-US",
  }];
}

export function filterText(worlds, state, value, key) {
  if (value === "All") {
    return state.lang === "zh" ? "全部" : "All";
  }

  const world = worlds.find((item) => item[key] === value);
  const zhKey = key === "type"
    ? "typeZh"
    : key === "temp"
      ? "tempZh"
      : key === "habitability"
        ? "habitabilityZh"
        : "systemZh";

  return world ? labelByLang(state, value, world[zhKey]) : value;
}
