export const state = {
  mode: "kids",
  lang: "en",
  search: "",
  filters: { type: "All", temp: "All", habitability: "All", system: "All" },
  activeId: "sun",
  music: false,
  overlayOpen: false,
  narrationPaused: false,
};

export function createOptions(worlds) {
  return {
    type: ["All", ...new Set(worlds.map((world) => world.type))],
    temp: ["All", ...new Set(worlds.map((world) => world.temp))],
    habitability: ["All", ...new Set(worlds.map((world) => world.habitability))],
    system: ["All", ...new Set(worlds.map((world) => world.system))],
  };
}

export function getFilteredWorlds(worlds, currentState) {
  return worlds.filter((world) => {
    const text = `${world.name} ${world.zh} ${world.system} ${world.systemZh} ${world.type} ${world.typeZh}`.toLowerCase();
    const searchOk = !currentState.search || text.includes(currentState.search);
    const typeOk = currentState.filters.type === "All" || world.type === currentState.filters.type;
    const tempOk = currentState.filters.temp === "All" || world.temp === currentState.filters.temp;
    const habitOk = currentState.filters.habitability === "All" || world.habitability === currentState.filters.habitability;
    const systemOk = currentState.filters.system === "All" || world.system === currentState.filters.system;

    return searchOk && typeOk && tempOk && habitOk && systemOk;
  });
}

export function ensureActive(worlds, filtered, currentState) {
  if (!filtered.some((world) => world.id === currentState.activeId)) {
    currentState.activeId = filtered[0]?.id || worlds[0].id;
  }
}

export function getActiveWorld(worlds, currentState) {
  return worlds.find((world) => world.id === currentState.activeId) || worlds[0];
}
