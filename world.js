import {
  GAME_OVER,
  GAME_PLAYING,
  H,
  ICE_MAX,
  ICE_START,
  HOME_STYLES,
  PLAYER_Y,
  W,
  clamp,
  laneAt,
  homeScale,
  homeGeometry,
  overlapCircle,
  rand,
} from './entities.js';

export function resetPlayerX(game) {
  const lane = laneAt(PLAYER_Y);
  game.player.x = lane.siL + lane.sw * 0.46;
}

export function addPop(game, x, y, text, color = '#ffe066') {
  game.pops.push({ x, y, text, color, t: 0.8 });
}

export function startGame(game) {
  game.mode = GAME_PLAYING;
  game.elapsed = 0;
  game.scroll = 0;
  game.speed = 1.7;
  game.animClock = 0;
  game.fi = 0;
  game.iceTimer = ICE_START;
  game.deliveries = 0;
  game.gameOverReason = 'ICE arrested her';

  game.player.lives = 3;
  game.player.score = 0;
  game.player.papers = 20;
  game.player.combo = 0;
  game.player.invuln = 0;
  game.player.reload = 0;
  game.player.jumpZ = 0;
  game.player.jumpV = 0;
  game.player.bundleTick = 0;
  resetPlayerX(game);

  game.papers.length = 0;
  game.homes.length = 0;
  game.hazards.length = 0;
  game.pops.length = 0;

  game.spawnHomeT = 0.35;
  game.spawnHazardT = 0.8;
}

export function endGame(game, reason, onBestScore) {
  if (game.mode === GAME_OVER) {
    return;
  }
  game.mode = GAME_OVER;
  game.gameOverReason = reason;
  game.bestScore = Math.max(game.bestScore, game.player.score);
  if (onBestScore) {
    onBestScore(game.bestScore);
  }
}

export function hurtPlayer(game, reason, onBestScore) {
  if (game.player.invuln > 0 || game.mode !== GAME_PLAYING) {
    return;
  }
  game.player.lives -= 1;
  game.player.combo = 0;
  game.player.invuln = 1.5;
  addPop(game, game.player.x, PLAYER_Y - 30, 'CRASH!', '#ff7a7a');
  if (game.player.lives <= 0) {
    endGame(game, reason || 'Too many crashes', onBestScore);
  }
}

export function jumpBike(game) {
  if (game.mode !== GAME_PLAYING) {
    return;
  }
  if (game.player.jumpZ === 0) {
    game.player.jumpV = 360;
  }
}

export function firePaper(game) {
  if (game.mode !== GAME_PLAYING || game.player.reload > 0 || game.player.papers <= 0) {
    return;
  }
  game.player.reload = 0.22;
  game.player.papers -= 1;
  game.papers.push({
    x: game.player.x + 10,
    y: PLAYER_Y - 24 - game.player.jumpZ * 0.2,
    vx: -245 - rand(0, 35),
    vy: -165,
    life: 1.45,
  });
}

function spawnHome(game) {
  game.homes.push({
    x: 0,
    y: -72,
    w: 92 + rand(-8, 18),
    h: 36 + rand(-3, 5),
    offset: rand(46, 90),
    style: Math.floor(rand(0, HOME_STYLES.length)),
    fence: Math.random() < 0.58,
    delivered: false,
  });
}

function spawnHazard(game) {
  const roll = Math.random();
  const kind = roll < 0.42 ? 'tree' : (roll < 0.72 ? 'mailbox' : 'dog');
  const laneU = kind === 'dog' ? rand(0.35, 1.35) : rand(0.22, 0.92);
  game.hazards.push({
    x: 0,
    y: -32,
    kind,
    r: kind === 'tree' ? 14 : (kind === 'dog' ? 12 : 11),
    laneU,
    phase: rand(0, 6.28),
  });
}

export function updateWorld(game, dt, assetsReady, onBestScore) {
  for (let i = game.pops.length - 1; i >= 0; i -= 1) {
    const p = game.pops[i];
    p.y -= 30 * dt;
    p.t -= dt;
    if (p.t <= 0) {
      game.pops.splice(i, 1);
    }
  }

  if (!assetsReady || game.mode !== GAME_PLAYING) {
    return;
  }

  game.elapsed += dt;
  game.speed = 1.7 + Math.min(2.2, game.elapsed * 0.017);
  game.scroll -= game.speed * 108 * dt;

  const pressure = 0.95 + Math.min(0.95, game.elapsed / 90);
  game.iceTimer -= dt * pressure;
  if (game.iceTimer <= 0) {
    game.iceTimer = 0;
    endGame(game, 'ICE arrested her', onBestScore);
    return;
  }

  game.animClock += dt;
  if (game.animClock >= 0.09) {
    game.animClock = 0;
    game.fi += 1;
  }

  if (game.player.reload > 0) {
    game.player.reload -= dt;
  }
  if (game.player.invuln > 0) {
    game.player.invuln -= dt;
  }

  game.player.bundleTick += dt;
  if (game.player.bundleTick >= 8) {
    game.player.bundleTick = 0;
    game.player.papers = Math.min(36, game.player.papers + 1);
  }

  if (game.player.jumpV !== 0 || game.player.jumpZ > 0) {
    game.player.jumpV -= 900 * dt;
    game.player.jumpZ += game.player.jumpV * dt;
    if (game.player.jumpZ <= 0) {
      game.player.jumpZ = 0;
      game.player.jumpV = 0;
    }
  }

  const movingLeft = game.held.has('arrowleft') || game.held.has('a') || game.touchLeft;
  const movingRight = game.held.has('arrowright') || game.held.has('d') || game.touchRight;
  const move = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
  game.player.x += move * (166 + game.speed * 10) * dt;

  const lane = laneAt(PLAYER_Y);
  game.player.x = clamp(game.player.x, lane.siL - 30, lane.rL + 36);

  if (game.touchThrow && game.player.reload <= 0) {
    firePaper(game);
  }

  game.spawnHomeT -= dt;
  game.spawnHazardT -= dt;

  if (game.spawnHomeT <= 0) {
    spawnHome(game);
    game.spawnHomeT = rand(0.7, 1.35) * (2.2 / (1 + game.speed * 0.25));
  }
  if (game.spawnHazardT <= 0) {
    spawnHazard(game);
    game.spawnHazardT = rand(0.7, 1.18) * (2.0 / (1 + game.speed * 0.2));
  }

  for (let i = game.papers.length - 1; i >= 0; i -= 1) {
    const p = game.papers[i];
    p.x += p.vx * dt;
    p.y += (p.vy + game.speed * 95) * dt;
    p.vy += 260 * dt;
    p.life -= dt;

    if (p.life <= 0 || p.y < -30 || p.y > H + 40 || p.x < -40 || p.x > W + 40) {
      game.papers.splice(i, 1);
      continue;
    }

    let delivered = false;
    for (let j = game.homes.length - 1; j >= 0; j -= 1) {
      const home = game.homes[j];
      if (home.delivered) {
        continue;
      }
      const g = homeGeometry(home);
      if (Math.abs(p.x - g.doorX) < 9 + g.s * 2 && Math.abs(p.y - g.doorY) < 10 + g.s * 2) {
        home.delivered = true;
        delivered = true;
        game.deliveries += 1;
        game.player.combo = Math.min(9, game.player.combo + 1);
        const points = 120 + game.player.combo * 30;
        const iceBonus = 3.2 + game.player.combo * 0.35;
        game.player.score += points;
        game.iceTimer = Math.min(ICE_MAX, game.iceTimer + iceBonus);
        addPop(game, g.doorX, home.y - 12, `+${points}`);
        addPop(game, g.doorX, home.y + 4, `ICE +${iceBonus.toFixed(1)}s`, '#9cffb2');
        if (Math.random() < 0.2) {
          game.player.papers = Math.min(36, game.player.papers + 2);
          addPop(game, g.doorX, home.y + 15, '+2 PAPER', '#b0ffcf');
        }
        break;
      }
    }

    if (delivered) {
      game.papers.splice(i, 1);
    }
  }

  for (let i = game.homes.length - 1; i >= 0; i -= 1) {
    const home = game.homes[i];
    home.y += (game.speed * 94 + 40) * dt;
    const laneH = laneAt(home.y);
    home.x = laneH.siL - home.offset * homeScale(home.y);

    if (home.y > 410) {
      if (!home.delivered) {
        game.player.combo = 0;
        game.iceTimer = Math.max(0, game.iceTimer - 1.1);
      }
      game.homes.splice(i, 1);
    }
  }

  for (let i = game.hazards.length - 1; i >= 0; i -= 1) {
    const hazard = game.hazards[i];
    hazard.y += (game.speed * 128 + (hazard.kind === 'dog' ? 28 : 0)) * dt;
    const laneO = laneAt(hazard.y);

    if (hazard.kind === 'dog') {
      const base = laneO.siL + laneO.sw * hazard.laneU;
      hazard.x = base + Math.sin(game.elapsed * 5 + hazard.phase) * 24;
    } else {
      hazard.x = laneO.siL + laneO.sw * hazard.laneU;
    }

    if (hazard.y > 422) {
      game.hazards.splice(i, 1);
      continue;
    }

    if (
      game.player.jumpZ < 11
      && game.player.invuln <= 0
      && overlapCircle(game.player.x, PLAYER_Y - 10, 13, hazard.x, hazard.y, hazard.r)
    ) {
      hurtPlayer(
        game,
        hazard.kind === 'dog' ? 'A dog knocked her down' : 'Hit an obstacle',
        onBestScore,
      );
      game.hazards.splice(i, 1);
    }
  }
}
