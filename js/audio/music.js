export function createMusicController({ state }) {
  const audioState = {
    context: null,
    masterGain: null,
    droneGain: null,
    melodyGain: null,
    sparkleGain: null,
    droneOscillators: [],
    melodyOscillator: null,
    melodyFilter: null,
    sparkleTimer: 0,
    melodyTimer: 0,
    started: false,
  };

  function ensureAudioContext() {
    if (audioState.context) {
      return audioState.context;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    const context = new AudioContextCtor();
    const masterGain = context.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(context.destination);

    const droneGain = context.createGain();
    droneGain.gain.value = 0.16;
    droneGain.connect(masterGain);

    const melodyFilter = context.createBiquadFilter();
    melodyFilter.type = "lowpass";
    melodyFilter.frequency.value = 900;

    const melodyGain = context.createGain();
    melodyGain.gain.value = 0.06;
    melodyFilter.connect(melodyGain);
    melodyGain.connect(masterGain);

    const sparkleGain = context.createGain();
    sparkleGain.gain.value = 0.035;
    sparkleGain.connect(masterGain);

    audioState.context = context;
    audioState.masterGain = masterGain;
    audioState.droneGain = droneGain;
    audioState.melodyFilter = melodyFilter;
    audioState.melodyGain = melodyGain;
    audioState.sparkleGain = sparkleGain;
    return context;
  }

  function startGeneratedMusic() {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      context.resume();
    }

    if (audioState.started) {
      const now = context.currentTime;
      audioState.masterGain.gain.cancelScheduledValues(now);
      audioState.masterGain.gain.linearRampToValueAtTime(0.22, now + 0.8);
      return;
    }

    const now = context.currentTime;
    const droneNotes = [196, 293.66, 392];
    audioState.droneOscillators = droneNotes.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.05 : 0.03;
      oscillator.connect(gain);
      gain.connect(audioState.droneGain);
      oscillator.start(now);
      return oscillator;
    });

    const melodyOscillator = context.createOscillator();
    melodyOscillator.type = "triangle";
    melodyOscillator.frequency.value = 440;
    melodyOscillator.connect(audioState.melodyFilter);
    melodyOscillator.start(now);
    audioState.melodyOscillator = melodyOscillator;
    audioState.started = true;

    const melodyNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 392, 440];

    const scheduleMelody = () => {
      if (!state.music || !audioState.context) {
        return;
      }

      const note = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
      const start = audioState.context.currentTime;
      const end = start + 1.4;
      audioState.melodyOscillator.frequency.cancelScheduledValues(start);
      audioState.melodyOscillator.frequency.setValueAtTime(note, start);
      audioState.melodyGain.gain.cancelScheduledValues(start);
      audioState.melodyGain.gain.setValueAtTime(0.01, start);
      audioState.melodyGain.gain.linearRampToValueAtTime(0.065, start + 0.3);
      audioState.melodyGain.gain.exponentialRampToValueAtTime(0.012, end);
      audioState.melodyFilter.frequency.setValueAtTime(700 + Math.random() * 500, start);
      audioState.melodyTimer = window.setTimeout(scheduleMelody, 1200 + (Math.random() * 900));
    };

    const sparkle = () => {
      if (!state.music || !audioState.context) {
        return;
      }

      const bell = context.createOscillator();
      const gain = context.createGain();
      bell.type = "sine";
      bell.frequency.value = 1046.5 + (Math.random() * 800);
      gain.gain.value = 0.0001;
      bell.connect(gain);
      gain.connect(audioState.sparkleGain);

      const start = context.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
      bell.start(start);
      bell.stop(start + 1.2);
      audioState.sparkleTimer = window.setTimeout(sparkle, 1800 + (Math.random() * 2800));
    };

    scheduleMelody();
    sparkle();
    audioState.masterGain.gain.cancelScheduledValues(now);
    audioState.masterGain.gain.linearRampToValueAtTime(0.22, now + 1.2);
  }

  function stopGeneratedMusic() {
    if (!audioState.context) {
      return;
    }

    const now = audioState.context.currentTime;
    audioState.masterGain.gain.cancelScheduledValues(now);
    audioState.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    window.clearTimeout(audioState.sparkleTimer);
    window.clearTimeout(audioState.melodyTimer);
    audioState.sparkleTimer = 0;
    audioState.melodyTimer = 0;
  }

  return {
    startGeneratedMusic,
    stopGeneratedMusic,
  };
}
