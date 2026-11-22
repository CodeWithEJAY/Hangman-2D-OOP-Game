
let audioContext = null;
let masterGain = null;

let gameMusicGain = null;
let questMusicGain = null;
let bossMusicGain = null;

const MENU_BGM_URL = new URL("../../assets/audio/load.mp3", import.meta.url).href;
const GAME_BGM_URL = new URL("../../assets/audio/stardew.mp3", import.meta.url).href;
const QUEST_BGM_URL = new URL("../../assets/audio/boss.mp3", import.meta.url).href;
const BOSS_BGM_URL = new URL("../../assets/audio/boss2.mp3", import.meta.url).href;

let menuMusicAudio = null;
let menuMusicRequested = false;
let menuMusicFadeTimer = null;
let menuMusicStopTimer = null;

let gameTrack = null;
let questTrack = null;
let bossTrack = null;

let gameMusicTimer = null;
let gameMusicStep = 0;

let bossMusicTimer = null;
let bossMusicStep = 0;

const createAudioContext = () => {
  if (!audioContext || audioContext.state === "closed") {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      console.error("Web Audio API is not supported.");
      return null;
    }

    try {
      audioContext = new AudioContextClass();

      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(audioContext.destination);

      gameMusicGain = audioContext.createGain();
      gameMusicGain.gain.value = 0.0001;
      gameMusicGain.connect(masterGain);

      questMusicGain = audioContext.createGain();
      questMusicGain.gain.value = 0.0001;
      questMusicGain.connect(masterGain);

      bossMusicGain = audioContext.createGain();
      bossMusicGain.gain.value = 0.0001;
      bossMusicGain.connect(masterGain);
    } catch (error) {
      console.error("Audio initialization failed:", error);
      return null;
    }
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(error => {
      console.warn("Audio resume failed:", error);
    });
  }

  return audioContext;
};

const getTrackGain = trackName => {
  if (trackName === "game") return gameMusicGain;
  if (trackName === "quest") return questMusicGain;
  if (trackName === "boss") return bossMusicGain;

  return null;
};

const getTrack = trackName => {
  if (trackName === "game") return gameTrack;
  if (trackName === "quest") return questTrack;
  if (trackName === "boss") return bossTrack;

  return null;
};

const setTrack = (trackName, track) => {
  if (trackName === "game") gameTrack = track;
  if (trackName === "quest") questTrack = track;
  if (trackName === "boss") bossTrack = track;
};

const fadeGainIn = (gainNode, volume, duration = 0.8) => {
  const audio = createAudioContext();

  if (!audio || !gainNode) return;

  const now = audio.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(
    Math.max(0.0001, gainNode.gain.value),
    now
  );
  gainNode.gain.linearRampToValueAtTime(
    volume,
    now + duration
  );
};

const fadeGainOut = gainNode => {
  if (!audioContext || !gainNode) return;

  const now = audioContext.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setTargetAtTime(0.0001, now, 0.12);
};

const createMusicTrack = (url, gainNode) => {
  const audio = createAudioContext();

  if (!audio || !gainNode) return null;

  const element = new Audio(url);
  element.loop = true;
  element.preload = "auto";

  element.addEventListener("error", () => {
    console.error("Could not load music:", url, element.error);
  });

  const source = audio.createMediaElementSource(element);
  source.connect(gainNode);

  return {
    audio: element,
    source,
    gain: gainNode,
    stopTimer: null,
    starting: false,
    requested: false
  };
};

const startTrack = (
  trackName,
  url,
  volume,
  restart = false
) => {
  const audio = createAudioContext();

  if (!audio) return;

  const gainNode = getTrackGain(trackName);

  if (!gainNode) return;

  let track = getTrack(trackName);

  if (!track) {
    track = createMusicTrack(url, gainNode);

    if (!track) return;

    setTrack(trackName, track);
  }

  if (track.stopTimer !== null) {
    window.clearTimeout(track.stopTimer);
    track.stopTimer = null;
  }

  track.requested = true;

  if (!track.audio.paused) {
    fadeGainIn(track.gain, volume);
    return;
  }

  if (track.starting) return;

  if (restart) {
    track.audio.currentTime = 0;
  }

  track.starting = true;

  track.audio.play()
    .then(() => {
      track.starting = false;

      if (track.requested) {
        fadeGainIn(track.gain, volume);
      } else {
        track.audio.pause();
      }
    })
    .catch(error => {
      track.starting = false;
      console.warn(`${trackName} music could not play:`, error);
    });
};

const stopTrack = track => {
  if (!track) return;

  track.requested = false;
  fadeGainOut(track.gain);

  if (track.stopTimer !== null) {
    window.clearTimeout(track.stopTimer);
  }

  track.stopTimer = window.setTimeout(() => {
    if (!track.requested) {
      track.audio.pause();
      track.audio.currentTime = 0;
    }

    track.stopTimer = null;
  }, 650);
};

// MENU MUSIC

const fadeMenuMusic = (
  targetVolume,
  duration = 650,
  onComplete = null
) => {
  if (!menuMusicAudio) return;

  if (menuMusicFadeTimer !== null) {
    window.clearInterval(menuMusicFadeTimer);
    menuMusicFadeTimer = null;
  }

  const startingVolume = menuMusicAudio.volume;
  const startTime = performance.now();

  menuMusicFadeTimer = window.setInterval(() => {
    if (!menuMusicAudio) {
      window.clearInterval(menuMusicFadeTimer);
      menuMusicFadeTimer = null;
      return;
    }

    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / duration);

    menuMusicAudio.volume =
      startingVolume + (targetVolume - startingVolume) * progress;

    if (progress >= 1) {
      window.clearInterval(menuMusicFadeTimer);
      menuMusicFadeTimer = null;

      if (onComplete) onComplete();
    }
  }, 25);
};

const attemptMenuMusicPlayback = () => {
  if (!menuMusicRequested || !menuMusicAudio) return;

  if (!menuMusicAudio.paused) {
    fadeMenuMusic(0.48, 800);
    return;
  }

  menuMusicAudio.play()
    .then(() => {
      if (menuMusicRequested) {
        fadeMenuMusic(0.48, 800);
      }
    })
    .catch(error => {
      console.warn("Menu music is waiting for user interaction:", error);
    });
};

export const startMenuMusic = () => {
  stopGameMusic();
  stopQuestMusic();
  stopBossMusic();

  if (menuMusicStopTimer !== null) {
    window.clearTimeout(menuMusicStopTimer);
    menuMusicStopTimer = null;
  }

  if (menuMusicFadeTimer !== null) {
    window.clearInterval(menuMusicFadeTimer);
    menuMusicFadeTimer = null;
  }

  if (!menuMusicAudio) {
    menuMusicAudio = new Audio(MENU_BGM_URL);
    menuMusicAudio.loop = true;
    menuMusicAudio.preload = "auto";
    menuMusicAudio.volume = 0;

    menuMusicAudio.addEventListener("error", () => {
      console.error("Could not load menu music:", menuMusicAudio?.src);
    });
  }

  menuMusicRequested = true;
  menuMusicAudio.currentTime = 0;
  menuMusicAudio.volume = 0;

  attemptMenuMusicPlayback();
};

export const stopMenuMusic = () => {
  menuMusicRequested = false;

  if (!menuMusicAudio) return;

  if (menuMusicStopTimer !== null) {
    window.clearTimeout(menuMusicStopTimer);
    menuMusicStopTimer = null;
  }

  fadeMenuMusic(0, 600, () => {
    if (menuMusicAudio && !menuMusicRequested) {
      menuMusicAudio.pause();
      menuMusicAudio.currentTime = 0;
    }
  });

  menuMusicStopTimer = window.setTimeout(() => {
    if (menuMusicAudio && !menuMusicRequested) {
      menuMusicAudio.pause();
      menuMusicAudio.currentTime = 0;
      menuMusicAudio.volume = 0;
    }

    menuMusicStopTimer = null;
  }, 700);
};

// AUDIO UNLOCK

export const unlockAudio = () => {
  createAudioContext();
  attemptMenuMusicPlayback();
};

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudio, true);
  window.addEventListener("keydown", unlockAudio, true);
}

export const setSoundEnabled = () => unlockAudio();
export const isSoundEnabled = () => true;

// EXPLORATION MUSIC

export const startGameMusic = () => {
  stopMenuMusic();
  stopQuestMusic();
  stopBossMusic();

  startTrack(
    "game",
    GAME_BGM_URL,
    0.55,
    true
  );
};

export const pauseGameMusic = () => {
  if (!gameTrack || gameTrack.audio.paused) return;

  gameTrack.requested = false;
  fadeGainOut(gameTrack.gain);

  if (gameTrack.stopTimer !== null) {
    window.clearTimeout(gameTrack.stopTimer);
  }

  gameTrack.stopTimer = window.setTimeout(() => {
    if (!gameTrack.requested) {
      gameTrack.audio.pause();
    }

    gameTrack.stopTimer = null;
  }, 650);
};

export const resumeGameMusic = () => {
  stopMenuMusic();
  stopQuestMusic();
  stopBossMusic();

  startTrack(
    "game",
    GAME_BGM_URL,
    0.55,
    false
  );
};

export const stopGameMusic = () => {
  stopTrack(gameTrack);
};

// REGULAR NPC QUEST MUSIC

export const startQuestMusic = () => {
  stopMenuMusic();
  stopGameMusic();
  stopBossMusic();

  startTrack(
    "quest",
    QUEST_BGM_URL,
    0.55,
    false
  );
};

export const stopQuestMusic = () => {
  stopTrack(questTrack);
};

// BOSS FIGHT MUSIC

export const startBossMusic = () => {
  stopMenuMusic();
  stopGameMusic();
  stopQuestMusic();

  startTrack(
    "boss",
    BOSS_BGM_URL,
    0.62,
    false
  );
};

export const stopBossMusic = () => {
  stopTrack(bossTrack);
};

// SOUND EFFECTS

const playTone = (
  frequency,
  duration,
  type = "square",
  volume = 0.08,
  endFrequency = frequency,
  delay = 0,
  output = null
) => {
  const audio = createAudioContext();

  const destination = output || masterGain;

  if (!audio || !destination) return;

  const now = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;

  oscillator.frequency.setValueAtTime(
    Math.max(1, frequency),
    now
  );

  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(1, endFrequency),
    now + duration
  );

  gain.gain.setValueAtTime(0.0001, now);

  const finalVolume = destination === bossMusicGain
    ? Math.min(volume * 3, 0.18)
    : volume;

  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, finalVolume),
    now + Math.min(0.025, duration / 3)
  );

  gain.gain.setValueAtTime(finalVolume, now);

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  oscillator.connect(gain);
  gain.connect(destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
};

export const playDialogueBlip = (isBoss = false, character = "") => {
  const code = String(character).toLowerCase().charCodeAt(0) || 0;

  if (isBoss) {
    const pitch = 230 + (code % 7) * 15;

    playTone(
      pitch,
      0.075,
      "triangle",
      0.3,
      pitch * 0.88
    );

    playTone(
      pitch * 1.5,
      0.045,
      "sine",
      0.018,
      pitch * 1.2,
      0.012
    );

    return;
  }

  const pitch = 850 + (code % 7) * 85;

  playTone(
    pitch,
    0.045,
    "square",
    0.065,
    pitch * 1.35
  );

  playTone(
    pitch * 1.2,
    0.035,
    "triangle",
    0.035,
    pitch * 1.5,
    0.025
  );
};

const playNoise = (
  duration = 0.2,
  volume = 0.08,
  filterFrequency = 1000,
  delay = 0,
  output = null
) => {
  const audio = createAudioContext();

  const destination = output || masterGain;

  if (!audio || !destination) return;

  const now = audio.currentTime + delay;
  const sampleRate = audio.sampleRate;

  const buffer = audio.createBuffer(
    1,
    Math.ceil(sampleRate * duration),
    sampleRate
  );

  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();

  source.buffer = buffer;
  filter.type = "lowpass";

  filter.frequency.setValueAtTime(filterFrequency, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(40, filterFrequency * 0.2),
    now + duration
  );

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  source.start(now);
  source.stop(now + duration + 0.02);
};

export const playSoundTest = () => {
  unlockAudio();

  playTone(660, 0.15, "square", 0.12, 880);
  playTone(880, 0.18, "square", 0.10, 1100, 0.18);
};

export const playButtonSound = () => {
  playTone(520, 0.07, "square", 0.06, 680);
};

export const playCorrectSound = () => {
  playTone(620, 0.12, "square", 0.09, 880);
};

export const playWrongSound = () => {
  playTone(220, 0.2, "sawtooth", 0.08, 120);
};

export const playCoinSound = () => {
  playTone(800, 0.08, "square", 0.08, 1100);
};

export const playQuestCompleteSound = () => {
  playTone(523, 0.12, "square", 0.08, 659);
  playTone(659, 0.12, "square", 0.08, 784, 0.12);
  playTone(784, 0.2, "square", 0.08, 1047, 0.24);
};

export const playGameOverSound = () => {
  playTone(330, 0.2, "triangle", 0.09, 220);
  playTone(220, 0.35, "triangle", 0.09, 110, 0.2);
};

export const playBossEntranceSound = () => {
  playTone(110, 1.4, "sawtooth", 0.12, 38);
  playTone(165, 1.1, "triangle", 0.08, 55, 0.12);
  playNoise(1.1, 0.07, 240);
};

export const playBossLandSound = () => {
  playNoise(0.42, 0.16, 180);
  playTone(85, 0.55, "sine", 0.18, 35);
  playTone(48, 0.65, "triangle", 0.13, 25, 0.04);
};

export const playBossDialogueSound = () => {
  playTone(310, 0.12, "sine", 0.04, 230);
  playTone(465, 0.16, "triangle", 0.03, 350, 0.08);
};

export const playBossHintSound = () => {
  playTone(660, 0.12, "sine", 0.08, 990);
  playTone(990, 0.16, "sine", 0.07, 1320, 0.10);
  playTone(1320, 0.22, "sine", 0.06, 1600, 0.20);
};

export const playHankAttackSound = () => {
  playNoise(0.12, 0.12, 900);
  playTone(190, 0.16, "square", 0.09, 85, 0.02);
  playTone(390, 0.09, "triangle", 0.05, 220, 0.05);
};

export const playBossDamageSound = () => {
  playNoise(0.28, 0.17, 1200);
  playTone(125, 0.30, "sawtooth", 0.12, 42);
  playTone(740, 0.12, "square", 0.06, 280, 0.03);
};

export const playBossAttackSound = () => {
  playNoise(0.45, 0.14, 500);
  playTone(180, 0.48, "sawtooth", 0.12, 45);
  playTone(75, 0.55, "sine", 0.15, 28, 0.08);
};

export const playBossDefeatSound = () => {
  playNoise(0.4, 0.08, 700);
  playTone(220, 0.25, "triangle", 0.08, 330);
  playTone(330, 0.25, "triangle", 0.08, 440, 0.22);
  playTone(440, 0.3, "triangle", 0.08, 660, 0.44);
  playTone(660, 0.65, "triangle", 0.10, 880, 0.68);
};

// STOP ALL AUDIO

export const stopAudio = () => {
  menuMusicRequested = false;

  if (menuMusicFadeTimer !== null) {
    window.clearInterval(menuMusicFadeTimer);
    menuMusicFadeTimer = null;
  }

  if (menuMusicStopTimer !== null) {
    window.clearTimeout(menuMusicStopTimer);
    menuMusicStopTimer = null;
  }

  if (menuMusicAudio) {
    menuMusicAudio.pause();
    menuMusicAudio.currentTime = 0;
    menuMusicAudio = null;
  }

  [gameTrack, questTrack, bossTrack].forEach(track => {
    if (!track) return;

    if (track.stopTimer !== null) {
      window.clearTimeout(track.stopTimer);
    }

    track.audio.pause();
    track.audio.currentTime = 0;
  });

  gameTrack = null;
  questTrack = null;
  bossTrack = null;

  gameMusicTimer = null;
  gameMusicStep = 0;
  bossMusicTimer = null;
  bossMusicStep = 0;

  if (audioContext) {
    audioContext.close();
    audioContext = null;

    masterGain = null;
    gameMusicGain = null;
    questMusicGain = null;
    bossMusicGain = null;
  }
};
