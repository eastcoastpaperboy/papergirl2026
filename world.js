import {
  GAME_OVER,
  GAME_PLAYING,
  H,
  ICE_MAX,
  ICE_START,
  HOME_STYLE_COUNT,
  PLAYER_Y,
  W,
  clamp,
  laneAt,
  homeScale,
  homeGeometry,
  isIntersectionBand,
  overlapCircle,
  rand,
} from './entities.js';
import {
  CAR_EDGE_PAD,
  DOG_AVOID_MARGIN,
  DOG_GRASS_REACH,
  DOG_SIDEWALK_PAD,
  HAZARD_INTERSECTION_PAD,
  HAZARD_SPAWN_MAX,
  HAZARD_SPAWN_MIN,
  HAZARD_SPAWN_Y,
  HOME_INTERSECTION_PAD,
  HOME_MIN_VERTICAL_GAP,
  HOME_OFFSET_MAX,
  HOME_OFFSET_MIN,
  HOME_SPAWN_Y,
  PLAYER_LEFT_EXT,
  PLAYER_RIGHT_EXT,
} from './world-config.js';

function carVisualHalfWidth(y) {
  // Car GIF frames are wide; keep center far enough from curb to avoid sidewalk overlap.
  return Math.round(clamp(30 + (y / H) * 18, 28, 48));
}

function hazardHitCircle(hazard) {
  if (hazard.kind === 'tree') {
    // Tree canopy is above trunk origin, so move hitbox up and tighten radius.
    const s = clamp(0.78 + (hazard.y / H) * 0.62, 0.78, 1.35);
    return {
      x: hazard.x,
      y: hazard.y - 11 * s,
      r: Math.max(8, Math.round(8 * s)),
    };
  }
  if (hazard.kind === 'dog') {
    return { x: hazard.x, y: hazard.y - 4, r: 10 };
  }
  if (hazard.kind === 'car') {
    return { x: hazard.x, y: hazard.y - 7, r: 14 };
  }
  return { x: hazard.x, y: hazard.y - 4, r: 9 };
}

function resolveDogAvoidanceX(dog, hazards, selfIndex, minX, maxX) {
  const dogHit = { x: dog.x, y: dog.y - 4, r: 10 };
  for (let pass = 0; pass < 2; pass += 1) {
    let moved = false;
    for (let j = 0; j < hazards.length; j += 1) {
      if (j === selfIndex) {
        continue;
      }
      const other = hazards[j];
      if (!other) {
        continue;
      }
      const otherHit = hazardHitCircle(other);
      const avoidR = dogHit.r + otherHit.r + DOG_AVOID_MARGIN;
      if (Math.abs(dogHit.y - otherHit.y) > avoidR + 6) {
        continue;
      }
      const dx = dogHit.x - otherHit.x;
      const absDx = Math.abs(dx);
      if (absDx >= avoidR) {
        continue;
      }
      const dir = dx === 0 ? (Math.sin(dog.phase + j) >= 0 ? 1 : -1) : Math.sign(dx);
      const push = avoidR - absDx + 0.75;
      dogHit.x = clamp(dogHit.x + dir * push, minX, maxX);
      moved = true;
    }
    if (!moved) {
      break;
    }
  }
  return dogHit.x;
}

export function resetPlayerX(game) {
  const lane = laneAt(PLAYER_Y);
  game.player.x = lane.siL + lane.sw * 0.46;
}

function addPop(game, x, y, text, color = '#ffe066') {
  game.pops.push({ x, y, text, color, t: 0.8 });
}

export function startGame(game) {
  game.mode = GAME_PLAYING;
  game.elapsed = 0;
  game.scroll = 0;
  game.speed = 0.9;
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
  game.player.facing = 1;
  game.player.turnInput = 0;
  resetPlayerX(game);

  game.papers.length = 0;
  game.homes.length = 0;
  game.hazards.length = 0;
  game.pops.length = 0;

  game.spawnHomeT = 0.35;
  game.spawnHazardT = 0.4;
  game.homeSpawnIndex = 0;
  game.bikeHitSfxTick = 0;
  game.paperHitSfxTick = 0;
  game.scoreEntryActive = false;
  game.scoreSubmittedForRound = false;
}

function endGame(game, reason, onBestScore) {
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

function hurtPlayer(game, reason, onBestScore) {
  if (game.player.invuln > 0 || game.mode !== GAME_PLAYING) {
    return;
  }
  game.player.lives -= 1;
  game.player.combo = 0;
  game.player.invuln = 1.5;
  game.bikeHitSfxTick += 1;
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
    vx: -190 - rand(0, 25),
    vy: -130,
    life: 1.45,
  });
}

function spawnHome(game) {
  const homesPerBlock = 5;
  const blockSlot = game.homeSpawnIndex % homesPerBlock;
  const isCorner = blockSlot === 0 || blockSlot === homesPerBlock - 1;
  const w = 92 + rand(-8, 18);
  const h = 36 + rand(-3, 5);
  // Smaller offset moves houses and delivery targets closer to sidewalk.
  const offset = rand(HOME_OFFSET_MIN, HOME_OFFSET_MAX);
  game.homes.push({
    x: 0,
    y: HOME_SPAWN_Y,
    w,
    h,
    offset,
    style: Math.floor(rand(0, HOME_STYLE_COUNT)),
    corner: isCorner,
    fence: Math.random() < 0.58,
    delivered: false,
  });
  game.homeSpawnIndex += 1;
}

function spawnHazard(game) {
  const carColors = ['blue', 'red', 'green'];
  const PAIR_SPAWN_CHANCE = 0.45;
  const pushHazard = (kind, laneU) => {
    game.hazards.push({
      x: 0,
      y: HAZARD_SPAWN_Y,
      kind,
      carColor: kind === 'car' ? carColors[Math.floor(Math.random() * carColors.length)] : null,
      r: kind === 'tree' ? 11 : (kind === 'dog' ? 10 : (kind === 'car' ? 14 : 9)),
      laneU,
      phase: rand(0, 6.28),
    });
  };

  const roll = Math.random();
  const kind = roll < 0.46
    ? 'tree'
    : (roll < 0.67 ? 'mailbox' : (roll < 0.70 ? 'dog' : 'car'));
  const laneU = kind === 'dog'
    ? rand(-0.72, 0.68)
    : (kind === 'tree'
      ? rand(-0.95, -0.15)
      : (kind === 'car' ? rand(0.12, 0.34) : rand(0.22, 0.92)));
  pushHazard(kind, laneU);

  // Occasionally pair a car and dog in the same spawn wave.
  if (kind === 'car' && Math.random() < PAIR_SPAWN_CHANCE) {
    pushHazard('dog', rand(-0.58, 0.82));
  } else if (kind === 'dog' && Math.random() < PAIR_SPAWN_CHANCE) {
    pushHazard('car', rand(0.14, 0.34));
  }
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
  game.speed = 0.9 + Math.min(1.2, game.elapsed * 0.009);
  const roadDy = game.speed * 98 * dt;
  game.scroll -= roadDy;

  const pressure = 0.95 + Math.min(0.95, game.elapsed / 90);
  game.iceTimer -= dt * pressure;
  if (game.iceTimer <= 0) {
    game.iceTimer = 0;
    endGame(game, 'ICE arrested her', onBestScore);
    return;
  }

  game.animClock += dt;
  if (game.animClock >= 0.20) {
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
  game.player.turnInput = move;
  if (move !== 0) {
    game.player.facing = move > 0 ? 1 : -1;
  }
  game.player.x += move * (148 + game.speed * 10) * dt;

  const lane = laneAt(PLAYER_Y);
  game.player.x = clamp(game.player.x, lane.siL - PLAYER_LEFT_EXT, lane.rL + PLAYER_RIGHT_EXT);

  if (game.touchThrow && game.player.reload <= 0) {
    firePaper(game);
  }

  game.spawnHomeT -= dt;
  game.spawnHazardT -= dt;

  if (game.spawnHomeT <= 0) {
    const newestHome = game.homes.length > 0 ? game.homes[game.homes.length - 1] : null;
    const canSpawnHome = !newestHome || (newestHome.y - HOME_SPAWN_Y) >= HOME_MIN_VERTICAL_GAP;
    const homeInIntersection = isIntersectionBand(HOME_SPAWN_Y, game.scroll, HOME_INTERSECTION_PAD);
    if (canSpawnHome && !homeInIntersection) {
      spawnHome(game);
      game.spawnHomeT = rand(0.95, 1.55) * (2.2 / (1 + game.speed * 0.25));
    } else {
      game.spawnHomeT = 0.12;
    }
  }
  if (game.spawnHazardT <= 0) {
    const hazardInIntersection = isIntersectionBand(HAZARD_SPAWN_Y, game.scroll, HAZARD_INTERSECTION_PAD);
    if (!hazardInIntersection) {
      spawnHazard(game);
      game.spawnHazardT = rand(HAZARD_SPAWN_MIN, HAZARD_SPAWN_MAX) * (1.4 / (1 + game.speed * 0.24));
    } else {
      game.spawnHazardT = 0.08;
    }
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
      if (Math.abs(p.x - g.doorX) < 18 + g.s * 4 && Math.abs(p.y - g.doorY) < 14 + g.s * 3) {
        home.delivered = true;
        delivered = true;
        game.paperHitSfxTick += 1;
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
    home.y += roadDy;
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
    const hazardDy = roadDy + (hazard.kind === 'dog' ? 28 * dt : (hazard.kind === 'car' ? 42 * dt : 0));
    hazard.y += hazardDy;
    const laneO = laneAt(hazard.y);

    if (hazard.kind === 'dog') {
      const base = laneO.siL + laneO.sw * hazard.laneU;
      const sway = Math.sin(game.elapsed * 5 + hazard.phase) * 18;
      const minDogX = laneO.siL - DOG_GRASS_REACH;
      const maxDogX = laneO.siL + laneO.sw - DOG_SIDEWALK_PAD;
      hazard.x = clamp(base + sway, minDogX, maxDogX);
    } else if (hazard.kind === 'car') {
      const base = laneO.rL + laneO.rw * hazard.laneU;
      const halfW = carVisualHalfWidth(hazard.y);
      const minRoadX = laneO.rL + halfW + CAR_EDGE_PAD;
      const maxRoadX = laneO.rL + laneO.rw - halfW - CAR_EDGE_PAD;
      hazard.x = maxRoadX > minRoadX
        ? clamp(base, minRoadX, maxRoadX)
        : (laneO.rL + laneO.rw * 0.5);
    } else {
      hazard.x = laneO.siL + laneO.sw * hazard.laneU;
    }

    if (hazard.y > 422) {
      game.hazards.splice(i, 1);
      continue;
    }
  }

  for (let i = 0; i < game.hazards.length; i += 1) {
    const hazard = game.hazards[i];
    if (hazard.kind !== 'dog') {
      continue;
    }
    const laneO = laneAt(hazard.y);
    const minDogX = laneO.siL - DOG_GRASS_REACH;
    const maxDogX = laneO.siL + laneO.sw - DOG_SIDEWALK_PAD;
    hazard.x = resolveDogAvoidanceX(hazard, game.hazards, i, minDogX, maxDogX);
  }

  for (let i = game.hazards.length - 1; i >= 0; i -= 1) {
    const hazard = game.hazards[i];
    const hit = hazardHitCircle(hazard);
    if (
      game.player.jumpZ < 11
      && game.player.invuln <= 0
      && overlapCircle(game.player.x, PLAYER_Y - 10, 12, hit.x, hit.y, hit.r)
    ) {
      hurtPlayer(
        game,
        hazard.kind === 'dog'
          ? 'A dog knocked her down'
          : (hazard.kind === 'car' ? 'Hit by a car' : 'Hit an obstacle'),
        onBestScore,
      );
      game.hazards.splice(i, 1);
    }
  }
}
