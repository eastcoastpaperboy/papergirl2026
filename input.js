import {
  GAME_OVER,
  GAME_PAUSED,
  GAME_PLAYING,
  GAME_TITLE,
  H,
  W,
} from './entities.js';

function toCanvasPos(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height),
  };
}

function pointerRole(game, x, y) {
  if (game.mode !== GAME_PLAYING) {
    return 'start';
  }
  if (y > H - 84) {
    if (x < W * 0.25) {
      return 'left';
    }
    if (x < W * 0.5) {
      return 'right';
    }
    if (x < W * 0.75) {
      return 'jump';
    }
    return 'throw';
  }
  return 'throw';
}

function pressRole(game, role, actions) {
  if (role === 'left') {
    game.touchLeft = true;
  }
  if (role === 'right') {
    game.touchRight = true;
  }
  if (role === 'jump') {
    actions.jumpBike();
  }
  if (role === 'throw') {
    game.touchThrow = true;
    actions.firePaper();
  }
}

function releaseRole(game, role) {
  if (role === 'left') {
    game.touchLeft = false;
  }
  if (role === 'right') {
    game.touchRight = false;
  }
  if (role === 'throw') {
    game.touchThrow = false;
  }
}

export function bindInput(canvas, game, actions) {
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvasPos(canvas, e);
    const role = pointerRole(game, p.x, p.y);

    if (role === 'start') {
      if (game.mode === GAME_TITLE || game.mode === GAME_OVER) {
        actions.startGame();
      } else if (game.mode === GAME_PAUSED) {
        game.mode = GAME_PLAYING;
      }
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    game.activePointers.set(e.pointerId, role);
    pressRole(game, role, actions);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!game.activePointers.has(e.pointerId)) {
      return;
    }
    const prev = game.activePointers.get(e.pointerId);
    const p = toCanvasPos(canvas, e);
    const next = pointerRole(game, p.x, p.y);

    if (next === prev || next === 'start') {
      return;
    }

    releaseRole(game, prev);
    game.activePointers.set(e.pointerId, next);
    pressRole(game, next, actions);
  });

  function clearPointer(e) {
    if (!game.activePointers.has(e.pointerId)) {
      return;
    }
    releaseRole(game, game.activePointers.get(e.pointerId));
    game.activePointers.delete(e.pointerId);
  }

  canvas.addEventListener('pointerup', clearPointer);
  canvas.addEventListener('pointercancel', clearPointer);
  canvas.addEventListener('pointerout', clearPointer);

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();

    if (['arrowleft', 'arrowright', 'arrowup', ' ', 'spacebar', 'enter', 'p', 'escape', 'a', 'd', 'b'].includes(k)) {
      e.preventDefault();
    }

    if (k === 'b') {
      actions.goToCity();
      return;
    }

    if (k === 'escape') {
      if (game.mode === GAME_PLAYING) {
        game.mode = GAME_PAUSED;
      } else {
        actions.goToCity();
      }
      return;
    }

    if (k === 'enter') {
      if (game.mode === GAME_TITLE || game.mode === GAME_OVER) {
        actions.startGame();
      } else if (game.mode === GAME_PAUSED) {
        game.mode = GAME_PLAYING;
      }
      return;
    }

    if (k === 'p') {
      if (game.mode === GAME_PLAYING) {
        game.mode = GAME_PAUSED;
      } else if (game.mode === GAME_PAUSED) {
        game.mode = GAME_PLAYING;
      }
      return;
    }

    if (k === 'arrowup') {
      actions.jumpBike();
      return;
    }

    if (k === ' ' || k === 'spacebar') {
      actions.firePaper();
      return;
    }

    game.held.add(k);
  });

  document.addEventListener('keyup', (e) => {
    game.held.delete(e.key.toLowerCase());
  });
}
