import { GAME_OVER } from '../core/entities.js';

const SCORE_ENDPOINT = '/scores.php';
const SCORE_NAME_KEY = 'papergirl_score_name';
const SCORE_NAME_MAX = 5;
const SCORE_LIST_LIMIT = 10;

export function createScoreManager(game, elements) {
  const {
    scoresPanel,
    scoresList,
    gameoverBoard,
    gameoverScoresBody,
    scoreEntry,
    scoreEntrySub,
    scoreNameInput,
    scoreSaveBtn,
    scoreEntryMsg,
  } = elements;

  let highScores = [];
  let lastMode = game.mode;

  function sanitizeScoreName(raw) {
    return String(raw || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, SCORE_NAME_MAX);
  }

  function sortScores(list) {
    list.sort((a, b) => {
      const scoreA = Number(a && a.score) || 0;
      const scoreB = Number(b && b.score) || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      const tsA = String((a && a.createdAt) || '');
      const tsB = String((b && b.createdAt) || '');
      return tsA.localeCompare(tsB);
    });
  }

  function renderGameOverScores() {
    if (!gameoverScoresBody) {
      return;
    }
    gameoverScoresBody.innerHTML = '';
    for (let i = 0; i < SCORE_LIST_LIMIT; i += 1) {
      const row = highScores[i] || null;
      const rank = String(i + 1).padStart(2, '0');
      const name = row ? sanitizeScoreName(row.name).padEnd(SCORE_NAME_MAX, '-') : '-----';
      const score = row ? String(Math.max(0, Number(row.score) || 0)).padStart(6, '0') : '000000';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="rank">${rank}</td><td class="name">${name}</td><td class="score">${score}</td>`;
      gameoverScoresBody.appendChild(tr);
    }
  }

  function renderHighScores() {
    if (!scoresList) {
      renderGameOverScores();
      return;
    }
    scoresList.innerHTML = '';
    const best = highScores.length > 0 ? highScores[0] : null;
    if (!best) {
      const li = document.createElement('li');
      li.innerHTML = '<span class="name">-----</span><span class="score">000000</span>';
      scoresList.appendChild(li);
      renderGameOverScores();
      return;
    }
    const name = sanitizeScoreName(best.name) || '-----';
    const score = Math.max(0, Number(best.score) || 0);
    const li = document.createElement('li');
    li.innerHTML = `<span class="name">${name.padEnd(SCORE_NAME_MAX, '-')}</span><span class="score">${String(score).padStart(6, '0')}</span>`;
    scoresList.appendChild(li);
    renderGameOverScores();
  }

  function updateGameOverBoardVisibility() {
    if (!gameoverBoard) {
      return;
    }
    const inGameOver = game.mode === GAME_OVER;
    gameoverBoard.classList.toggle('hidden', !inGameOver);
    if (scoresPanel) {
      scoresPanel.classList.toggle('hidden', inGameOver);
    }
  }

  function setScoreEntryMessage(text, color = '#ff9b9b') {
    if (!scoreEntryMsg) {
      return;
    }
    scoreEntryMsg.textContent = text;
    scoreEntryMsg.style.color = color;
  }

  function setScoreEntryVisible(visible) {
    if (!scoreEntry) {
      game.scoreEntryActive = false;
      return;
    }
    scoreEntry.classList.toggle('hidden', !visible);
    game.scoreEntryActive = visible;
  }

  function hideEntry() {
    setScoreEntryVisible(false);
    setScoreEntryMessage('');
    if (scoreSaveBtn) {
      scoreSaveBtn.disabled = false;
    }
  }

  function showScoreEntry(score) {
    if (!scoreEntry) {
      return;
    }
    let savedInitials = 'AAA';
    try {
      savedInitials = sanitizeScoreName(localStorage.getItem(SCORE_NAME_KEY) || 'AAA');
    } catch (_) {}
    if (scoreEntrySub) {
      scoreEntrySub.textContent = `SCORE ${String(Math.max(0, score | 0)).padStart(6, '0')}`;
    }
    if (scoreNameInput) {
      scoreNameInput.value = savedInitials || 'AAA';
    }
    setScoreEntryMessage('A-Z / 0-9 only, max 5 chars', '#9cffb2');
    setScoreEntryVisible(true);
    if (scoreNameInput) {
      scoreNameInput.focus();
      scoreNameInput.select();
    }
  }

  function normalizeScoresPayload(payload) {
    const list = payload && Array.isArray(payload.scores) ? payload.scores.slice() : [];
    const cleaned = [];
    for (const row of list) {
      const name = sanitizeScoreName(row && row.name);
      if (!name) {
        continue;
      }
      cleaned.push({
        name,
        score: Math.max(0, Number(row && row.score) || 0),
        createdAt: String((row && row.createdAt) || ''),
      });
    }
    sortScores(cleaned);
    return cleaned;
  }

  async function loadHighScores() {
    try {
      const res = await fetch(SCORE_ENDPOINT, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!res.ok) {
        throw new Error('GET ' + SCORE_ENDPOINT + ' failed with ' + res.status);
      }
      const payload = await res.json();
      highScores = normalizeScoresPayload(payload);
    } catch (e) {
      console.warn('[scores] load failed:', e);
      highScores = [];
    }
    renderHighScores();
  }

  async function submitHighScore(name, score) {
    const res = await fetch(SCORE_ENDPOINT, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name,
        score,
      }),
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch (_) {
      payload = null;
    }

    if (!res.ok) {
      const reason = payload && payload.error ? payload.error : ('HTTP ' + res.status);
      throw new Error(reason);
    }
    return payload;
  }

  async function saveCurrentRoundScore() {
    if (game.scoreSubmittedForRound) {
      hideEntry();
      return;
    }
    const raw = scoreNameInput ? scoreNameInput.value : '';
    const name = sanitizeScoreName(raw);
    if (!name) {
      setScoreEntryMessage('Enter 1-5 letters or numbers.');
      return;
    }
    if (scoreNameInput) {
      scoreNameInput.value = name;
    }
    if (scoreSaveBtn) {
      scoreSaveBtn.disabled = true;
    }
    setScoreEntryMessage('Saving...', '#b8efff');
    try {
      const payload = await submitHighScore(name, game.player.score);
      highScores = normalizeScoresPayload(payload);
      renderHighScores();
      game.scoreSubmittedForRound = true;
      try {
        localStorage.setItem(SCORE_NAME_KEY, name);
      } catch (_) {}
      hideEntry();
    } catch (e) {
      setScoreEntryMessage('Save failed: ' + e.message);
      if (scoreSaveBtn) {
        scoreSaveBtn.disabled = false;
      }
    }
  }

  function handleModeTransition() {
    if (game.mode === GAME_OVER && lastMode !== GAME_OVER) {
      if (!game.scoreSubmittedForRound && game.player.score > 0) {
        showScoreEntry(game.player.score);
      }
    } else if (game.mode !== GAME_OVER && lastMode === GAME_OVER) {
      hideEntry();
    }
    updateGameOverBoardVisibility();
    lastMode = game.mode;
  }

  function bindHandlers() {
    if (scoreNameInput) {
      scoreNameInput.addEventListener('input', () => {
        const cleaned = sanitizeScoreName(scoreNameInput.value);
        if (scoreNameInput.value !== cleaned) {
          scoreNameInput.value = cleaned;
        }
      });
      scoreNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveCurrentRoundScore();
        }
      });
    }
    if (scoreSaveBtn) {
      scoreSaveBtn.addEventListener('click', () => {
        saveCurrentRoundScore();
      });
    }
  }

  function init() {
    bindHandlers();
    renderHighScores();
    loadHighScores();
    updateGameOverBoardVisibility();
  }

  return {
    init,
    hideEntry,
    handleModeTransition,
  };
}
