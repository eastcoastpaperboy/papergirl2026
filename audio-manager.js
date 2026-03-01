import {
  GAME_OVER,
  GAME_PAUSED,
  GAME_PLAYING,
} from './entities.js';

const AUDIO_MUTE_KEY = 'papergirl_audio_muted';
const BGM_VOLUME = 0.55;
const SIREN_VOLUME = 0.72;
const BIKE_HIT_VOLUME = 0.85;
const PAPER_HIT_VOLUME = 0.78;

export function createAudioManager(game, { muteBtn }) {
  const bgmTrack = new Audio('Audio/nes_morning_mayhem.wav');
  bgmTrack.loop = true;
  bgmTrack.preload = 'auto';
  bgmTrack.volume = BGM_VOLUME;

  const sirenTrack = new Audio('Audio/nes_police_siren_5sec_slow_realistic.wav');
  sirenTrack.loop = false;
  sirenTrack.preload = 'auto';
  sirenTrack.volume = SIREN_VOLUME;

  const bikeHitTrack = new Audio('Audio/nes_bike_hit_sound.wav');
  bikeHitTrack.loop = false;
  bikeHitTrack.preload = 'auto';
  bikeHitTrack.volume = BIKE_HIT_VOLUME;

  const paperHitTrack = new Audio('Audio/nes_newspaper_mailbox_hit.wav');
  paperHitTrack.loop = false;
  paperHitTrack.preload = 'auto';
  paperHitTrack.volume = PAPER_HIT_VOLUME;

  const allAudioTracks = [bgmTrack, sirenTrack, bikeHitTrack, paperHitTrack];

  let audioMuted = false;
  try {
    audioMuted = localStorage.getItem(AUDIO_MUTE_KEY) === '1';
  } catch (_) {}

  let lastAudioMode = game.mode;
  let lastBikeHitSfxTick = game.bikeHitSfxTick;
  let lastPaperHitSfxTick = game.paperHitSfxTick;

  function updateMuteButton() {
    if (!muteBtn) {
      return;
    }
    muteBtn.classList.toggle('muted', audioMuted);
    muteBtn.setAttribute('aria-label', audioMuted ? 'Unmute audio' : 'Mute audio');
    muteBtn.title = audioMuted ? 'Unmute audio' : 'Mute audio';
  }

  function applyMuteStateToTracks() {
    for (const track of allAudioTracks) {
      track.muted = audioMuted;
    }
  }

  function playAudio(track) {
    if (audioMuted) {
      return;
    }
    const p = track.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  }

  function stopAndReset(track) {
    track.pause();
    try {
      track.currentTime = 0;
    } catch (_) {}
  }

  function replayAudio(track) {
    try {
      track.currentTime = 0;
    } catch (_) {}
    playAudio(track);
  }

  function setAudioMuted(nextMuted) {
    const muted = Boolean(nextMuted);
    if (audioMuted === muted) {
      return;
    }
    audioMuted = muted;
    applyMuteStateToTracks();
    updateMuteButton();
    try {
      localStorage.setItem(AUDIO_MUTE_KEY, audioMuted ? '1' : '0');
    } catch (_) {}
    if (audioMuted) {
      stopAll();
    } else {
      syncForMode(true);
    }
  }

  function syncForMode(force = false) {
    const mode = game.mode;
    if (!force && mode === lastAudioMode) {
      return;
    }

    if (mode === GAME_PLAYING || mode === GAME_PAUSED) {
      stopAndReset(sirenTrack);
      if (bgmTrack.paused) {
        playAudio(bgmTrack);
      }
    } else if (mode === GAME_OVER) {
      stopAndReset(bgmTrack);
      stopAndReset(sirenTrack);
      playAudio(sirenTrack);
    } else {
      stopAndReset(bgmTrack);
      stopAndReset(sirenTrack);
    }

    lastAudioMode = mode;
  }

  function stopAll() {
    for (const track of allAudioTracks) {
      stopAndReset(track);
    }
  }

  function onGameStart() {
    lastBikeHitSfxTick = game.bikeHitSfxTick;
    lastPaperHitSfxTick = game.paperHitSfxTick;
  }

  function updateFrameSfx() {
    if (game.bikeHitSfxTick > lastBikeHitSfxTick) {
      lastBikeHitSfxTick = game.bikeHitSfxTick;
      replayAudio(bikeHitTrack);
    } else if (game.bikeHitSfxTick < lastBikeHitSfxTick) {
      lastBikeHitSfxTick = game.bikeHitSfxTick;
    }

    if (game.paperHitSfxTick > lastPaperHitSfxTick) {
      lastPaperHitSfxTick = game.paperHitSfxTick;
      replayAudio(paperHitTrack);
    } else if (game.paperHitSfxTick < lastPaperHitSfxTick) {
      lastPaperHitSfxTick = game.paperHitSfxTick;
    }
  }

  function bindHandlers() {
    if (!muteBtn) {
      return;
    }
    muteBtn.addEventListener('click', () => {
      setAudioMuted(!audioMuted);
    });
  }

  function init() {
    applyMuteStateToTracks();
    updateMuteButton();
    bindHandlers();
  }

  return {
    init,
    onGameStart,
    syncForMode,
    stopAll,
    updateFrameSfx,
  };
}
