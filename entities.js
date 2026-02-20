export const W = 512;
export const H = 384;

export const GAME_TITLE = 'title';
export const GAME_PLAYING = 'playing';
export const GAME_PAUSED = 'paused';
export const GAME_OVER = 'gameover';

export const PLAYER_Y = 286;
export const ICE_START = 22;
export const ICE_MAX = 48;

export const HOME_STYLES = [
  { wall: '#f0f0f0', wallShade: '#d7d7d7', accent: '#111', roofDark: '#0b0b0b', roofLight: '#f3f3f3', flower: '#31c73b' },
  { wall: '#efe7b8', wallShade: '#d6ce9c', accent: '#111', roofDark: '#0b0b0b', roofLight: '#f3f3f3', flower: '#31c73b' },
  { wall: '#a30e6f', wallShade: '#8c0b5f', accent: '#f3f3f3', roofDark: '#0b0b0b', roofLight: '#f3f3f3', flower: '#cf57ad' },
];

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

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function roadW(y) {
  return 140 + Math.floor(y / 6);
}

export function sideW(y) {
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
  return clamp(0.72 + (y / H) * 0.58, 0.72, 1.22);
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

export function overlapCircle(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy < rr * rr;
}
