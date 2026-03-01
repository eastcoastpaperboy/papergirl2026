export const W = 512;
export const H = 384;

export const GAME_TITLE = 'title';
export const GAME_PLAYING = 'playing';
export const GAME_PAUSED = 'paused';
export const GAME_OVER = 'gameover';

export const PLAYER_Y = 286;
export const ICE_START = 22;
export const ICE_MAX = 48;
export const CROSS_STREET_PERIOD = 1860;
export const CROSS_STREET_HEIGHT = 100;
export const HOME_STYLE_COUNT = 3;

function createPlayer() {
  return {
    x: 140,
    lives: 3,
    score: 0,
    papers: 20,
    combo: 0,
    invuln: 0,
    reload: 0,
    jumpZ: 0,
    jumpV: 0,
    bundleTick: 0,
    facing: 1,
    turnInput: 0,
  };
}

export function createGameState({ bestScore = 0, touchEnabled = false } = {}) {
  return {
    mode: GAME_TITLE,
    elapsed: 0,
    scroll: 0,
    speed: 1.7,
    animClock: 0,
    fi: 0,
    lastTs: 0,
    iceTimer: ICE_START,
    deliveries: 0,
    gameOverReason: 'ICE arrested her',

    player: createPlayer(),
    papers: [],
    homes: [],
    hazards: [],
    pops: [],

    spawnHomeT: 0,
    spawnHazardT: 0,
    homeSpawnIndex: 0,
    bikeHitSfxTick: 0,
    paperHitSfxTick: 0,
    scoreEntryActive: false,
    scoreSubmittedForRound: false,

    bestScore,
    held: new Set(),
    touchEnabled,
    touchLeft: false,
    touchRight: false,
    touchThrow: false,
    activePointers: new Map(),
  };
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function wrapMod(value, mod) {
  const r = value % mod;
  return r < 0 ? r + mod : r;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

function roadW(y) {
  return 140 + Math.floor(y / 6);
}

function sideW(y) {
  return 48 + Math.floor(y / 24);
}

export function laneAt(y) {
  const xR = 780 - y;
  const rw = roadW(y);
  const sw = sideW(y);
  const rL = xR - rw;
  const cL = rL - 4;
  const siL = cL - sw;
  return { xR, rw, sw, rL, cL, siL };
}

export function homeScale(y) {
  // Flatter perspective keeps large PNG homes from ballooning near the camera.
  return clamp(0.70 + (y / H) * 0.30, 0.70, 1.0);
}

export function homeGeometry(home) {
  const s = homeScale(home.y);
  const baseY = home.y - 6 * s;
  const frontX = home.x - 74 * s;
  const houseW = home.w * s;
  const houseH = home.h * s;
  const sideWidth = 34 * s;
  const roofH = 30 * s;
  const doorX = frontX + houseW * 0.6;
  const doorY = baseY - houseH * 0.28;
  return { s, baseY, frontX, houseW, houseH, sideWidth, roofH, doorX, doorY };
}

function intersectionPhase(y, scroll) {
  return wrapMod(y + Math.floor(scroll), CROSS_STREET_PERIOD);
}

export function isIntersectionBand(y, scroll, pad = 0) {
  const p = intersectionPhase(y, scroll);
  return p < (CROSS_STREET_HEIGHT + pad) || p > (CROSS_STREET_PERIOD - pad);
}

export function overlapCircle(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy < rr * rr;
}
