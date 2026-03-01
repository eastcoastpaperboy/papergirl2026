import { createGameState } from './entities.js';
import { bindInput } from './input.js';
import { drawScene } from './render.js';
import {
  firePaper,
  jumpBike,
  resetPlayerX,
  startGame,
  updateWorld,
} from './world.js';
import { createAssets, loadAssets } from './asset-loader.js';
import { createScoreManager } from './score-manager.js';
import { createAudioManager } from './audio-manager.js';

const canvas = document.getElementById('c');
const muteBtn = document.getElementById('mute-btn');
const scoresPanel = document.getElementById('scores-panel');
const scoresList = document.getElementById('scores-list');
const gameoverBoard = document.getElementById('gameover-board');
const gameoverScoresBody = document.getElementById('gameover-scores-body');
const scoreEntry = document.getElementById('score-entry');
const scoreEntrySub = document.getElementById('score-entry-sub');
const scoreNameInput = document.getElementById('score-name');
const scoreSaveBtn = document.getElementById('score-save');
const scoreEntryMsg = document.getElementById('score-entry-msg');

const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let bestScore = 0;
try {
  bestScore = Number(localStorage.getItem('papergirl_best') || 0);
} catch (_) {}

const game = createGameState({
  bestScore,
  touchEnabled: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
});

const assets = createAssets();
loadAssets(assets);

const scoreManager = createScoreManager(game, {
  scoresPanel,
  scoresList,
  gameoverBoard,
  gameoverScoresBody,
  scoreEntry,
  scoreEntrySub,
  scoreNameInput,
  scoreSaveBtn,
  scoreEntryMsg,
});

const audioManager = createAudioManager(game, { muteBtn });

function saveBest(nextBest) {
  try {
    localStorage.setItem('papergirl_best', String(nextBest));
  } catch (_) {}
}

function goToCity() {
  scoreManager.hideEntry();
  audioManager.stopAll();
  window.location.href = 'city_select.html';
}

function handleStartGame() {
  scoreManager.hideEntry();
  startGame(game);
  audioManager.onGameStart();
  audioManager.syncForMode(true);
}

scoreManager.init();
audioManager.init();

bindInput(canvas, game, {
  startGame: handleStartGame,
  jumpBike: () => jumpBike(game),
  firePaper: () => firePaper(game),
  goToCity,
});

resetPlayerX(game);
audioManager.syncForMode(true);
scoreManager.handleModeTransition();

function loop(ts) {
  if (!game.lastTs) {
    game.lastTs = ts;
  }

  const dt = Math.min(0.033, (ts - game.lastTs) / 1000);
  game.lastTs = ts;

  updateWorld(game, dt, assets.ready, saveBest);
  audioManager.syncForMode();
  scoreManager.handleModeTransition();
  audioManager.updateFrameSfx();
  drawScene(ctx, game, assets);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
