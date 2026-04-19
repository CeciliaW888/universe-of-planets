export function createNarrationController({ state, dom, labelByLang, narrationSegments }) {
  const speechSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let availableVoices = [];
  let voiceRefreshTimer = 0;

  function refreshVoices() {
    if (!speechSupported) {
      return;
    }

    availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length && voiceRefreshTimer) {
      window.clearTimeout(voiceRefreshTimer);
      voiceRefreshTimer = 0;
    }
  }

  function pickVoice(lang) {
    if (!availableVoices.length) {
      refreshVoices();
    }

    const prefixes = lang.startsWith("zh") ? ["zh", "cmn"] : ["en"];
    const matching = availableVoices.filter((voice) => prefixes.some((prefix) => voice.lang.toLowerCase().startsWith(prefix)));
    if (!matching.length) {
      return null;
    }

    const preferredNames = lang.startsWith("zh")
      ? ["xiaoxiao", "xiaoyi", "tingting", "huihui", "mei-jia", "sin-ji"]
      : ["samantha", "karen", "moira", "ava", "aria", "allison", "serena", "daniel"];

    return matching.find((voice) => preferredNames.some((name) => voice.name.toLowerCase().includes(name))) || matching[0];
  }

  function updateStatus(message) {
    dom.narrationStatus.textContent = message;
    dom.overlayPauseBtn.classList.toggle("active", state.narrationPaused);
    dom.overlayPauseBtn.textContent = state.narrationPaused
      ? labelByLang(state, "Resume narration", "继续朗读")
      : labelByLang(state, "Pause narration", "暂停朗读");
  }

  function stopNarration() {
    if (!speechSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    state.narrationPaused = false;
    updateStatus(labelByLang(state, "Narration stopped.", "朗读已停止。"));
  }

  function playNarration(world) {
    if (!speechSupported) {
      updateStatus(labelByLang(state, "Speech synthesis is not supported in this browser.", "当前浏览器不支持语音朗读。"));
      return;
    }

    window.speechSynthesis.cancel();
    state.narrationPaused = false;
    updateStatus(labelByLang(state, `Narrating ${world.name}.`, `正在朗读 ${world.zh}。`));

    narrationSegments(state, world).forEach((segment, index, segments) => {
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.lang = segment.lang;
      utterance.voice = pickVoice(segment.lang) || null;
      utterance.rate = state.lang === "zh"
        ? (state.mode === "kids" ? 0.93 : 0.98)
        : (state.mode === "kids" ? 0.92 : 0.99);
      utterance.pitch = state.lang === "zh"
        ? (state.mode === "kids" ? 1.16 : 1.04)
        : (state.mode === "kids" ? 1.18 : 1.01);
      utterance.volume = 0.96;
      utterance.onend = () => {
        if (index === segments.length - 1 && !state.narrationPaused) {
          updateStatus(labelByLang(state, `Narration finished for ${world.name}.`, `${world.zh} 的朗读已完成。`));
        }
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  function togglePause(getActiveWorld) {
    if (!speechSupported) {
      updateStatus(labelByLang(state, "Speech synthesis is not supported in this browser.", "当前浏览器不支持语音朗读。"));
      return;
    }

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      state.narrationPaused = true;
      updateStatus(labelByLang(state, "Narration paused.", "朗读已暂停。"));
      return;
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      state.narrationPaused = false;
      updateStatus(labelByLang(state, "Narration resumed.", "朗读已继续。"));
      return;
    }

    playNarration(getActiveWorld());
  }

  function init() {
    if (!speechSupported) {
      return;
    }

    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
    if (!availableVoices.length) {
      voiceRefreshTimer = window.setTimeout(refreshVoices, 400);
    }
  }

  return {
    speechSupported,
    init,
    playNarration,
    stopNarration,
    togglePause,
    updateStatus,
  };
}
