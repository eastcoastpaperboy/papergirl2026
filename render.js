import {
  GAME_OVER,
  GAME_PAUSED,
  GAME_PLAYING,
  GAME_TITLE,
  H,
  HOME_STYLES,
  ICE_MAX,
  PLAYER_Y,
  W,
  clamp,
  homeGeometry,
  laneAt,
} from './entities.js';

function drawBase(ctx, scroll) {
  for (let y = 0; y < H; y += 1) {
    const lane = laneAt(y);
    const si = Math.max(0, lane.siL);
    const houseL = Math.max(0, si - 40);

    if (si > 0) {
      ctx.fillStyle = '#2b812e';
      ctx.fillRect(0, y, si, 1);
    }

    ctx.fillStyle = '#624f3f';
    ctx.fillRect(houseL, y, Math.max(0, si - houseL), 1);

    if (((y + Math.floor(scroll * 0.5)) % 30) < 2) {
      ctx.fillStyle = '#8e755f';
      ctx.fillRect(houseL, y, Math.max(0, si - houseL), 1);
    }

    ctx.fillStyle = '#bebebe';
    ctx.fillRect(si, y, lane.sw, 1);

    if ((y + Math.floor(scroll)) % 48 === 0) {
      ctx.fillStyle = '#999';
      ctx.fillRect(si, y, lane.sw, 1);
    }

    ctx.fillStyle = '#444';
    ctx.fillRect(lane.cL, y, 1, 1);
    ctx.fillStyle = '#888';
    ctx.fillRect(lane.cL + 1, y, 2, 1);
    ctx.fillStyle = '#444';
    ctx.fillRect(lane.cL + 3, y, 1, 1);

    if (lane.rL < W) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(Math.max(0, lane.rL), y, W - Math.max(0, lane.rL), 1);
      const stripeX = lane.rL + lane.rw * 0.52;
      if (((y + Math.floor(scroll * 1.5)) % 52) < 18) {
        ctx.fillStyle = '#d6cf62';
        ctx.fillRect(stripeX, y, 2, 1);
      }
    }
  }
}

function drawHomes(ctx, homes) {
  const ordered = [...homes].sort((a, b) => a.y - b.y);

  for (const home of ordered) {
    const style = HOME_STYLES[home.style % HOME_STYLES.length];
    const g = homeGeometry(home);
    const px = Math.max(1, Math.floor(2 * g.s));

    const driveTopX = g.frontX + g.houseW * 0.62;
    const driveTopY = g.baseY + 1;
    const driveBotX = home.x - 2 * g.s;
    const driveBotY = home.y + 4 * g.s;

    ctx.fillStyle = '#bfbfbf';
    ctx.beginPath();
    ctx.moveTo(driveTopX, driveTopY);
    ctx.lineTo(driveTopX + g.houseW * 0.2, driveTopY);
    ctx.lineTo(driveBotX + 15 * g.s, driveBotY);
    ctx.lineTo(driveBotX - 8 * g.s, driveBotY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(g.frontX - 5 * g.s, g.baseY - 8 * g.s, g.houseW + 26 * g.s, 8 * g.s);

    ctx.fillStyle = style.wall;
    ctx.fillRect(g.frontX, g.baseY - g.houseH, g.houseW, g.houseH);
    ctx.fillStyle = style.wallShade;
    ctx.fillRect(g.frontX + g.houseW * 0.74, g.baseY - g.houseH, g.sideWidth, g.houseH * 0.95);

    ctx.fillStyle = style.accent;
    for (let yy = g.baseY - g.houseH + px; yy < g.baseY; yy += px * 2) {
      for (let xx = g.frontX + px; xx < g.frontX + g.houseW; xx += px * 2) {
        ctx.fillRect(xx, yy, 1, 1);
      }
    }

    const roofA = { x: g.frontX - 10 * g.s, y: g.baseY - g.houseH + 2 * g.s };
    const roofB = { x: g.frontX + g.houseW * 0.57, y: g.baseY - g.houseH - g.roofH };
    const roofC = { x: g.frontX + g.houseW + g.sideWidth, y: g.baseY - g.houseH - g.roofH * 0.63 };
    const roofD = { x: g.frontX + g.houseW * 0.34, y: g.baseY - g.houseH + 2 * g.s };

    ctx.fillStyle = style.roofDark;
    ctx.beginPath();
    ctx.moveTo(roofA.x, roofA.y);
    ctx.lineTo(roofB.x, roofB.y);
    ctx.lineTo(roofC.x, roofC.y);
    ctx.lineTo(roofD.x, roofD.y);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(roofA.x, roofA.y);
    ctx.lineTo(roofB.x, roofB.y);
    ctx.lineTo(roofC.x, roofC.y);
    ctx.lineTo(roofD.x, roofD.y);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = style.roofLight;
    for (let yy = roofB.y; yy < roofA.y + 4 * g.s; yy += px * 3) {
      for (let xx = roofA.x - g.houseW * 0.5; xx < roofC.x + 10; xx += px * 6) {
        const offset = (Math.floor((yy - roofB.y) / (px * 3)) % 2) === 0 ? 0 : px * 3;
        ctx.fillRect(xx + offset, yy, px * 2, px);
      }
    }
    ctx.restore();

    ctx.fillStyle = style.accent;
    ctx.fillRect(g.frontX + g.houseW * 0.76, g.baseY - g.houseH * 0.55, g.houseW * 0.18, g.houseH * 0.52);

    const winW = 8 * g.s;
    const winH = 7 * g.s;

    ctx.fillStyle = style.accent;
    ctx.fillRect(g.frontX + 10 * g.s, g.baseY - g.houseH * 0.62, winW, winH);
    ctx.fillRect(g.frontX + 24 * g.s, g.baseY - g.houseH * 0.62, winW, winH);
    ctx.fillRect(g.frontX + 38 * g.s, g.baseY - g.houseH * 0.62, winW, winH);
    ctx.fillRect(g.frontX + 12 * g.s, g.baseY - g.houseH * 0.34, winW, winH);
    ctx.fillRect(g.frontX + 28 * g.s, g.baseY - g.houseH * 0.34, winW, winH);

    ctx.fillStyle = '#d7d7d7';
    ctx.fillRect(g.frontX + 11 * g.s, g.baseY - g.houseH * 0.6, winW - 2, 1);
    ctx.fillRect(g.frontX + 25 * g.s, g.baseY - g.houseH * 0.6, winW - 2, 1);
    ctx.fillRect(g.frontX + 39 * g.s, g.baseY - g.houseH * 0.6, winW - 2, 1);

    ctx.fillStyle = style.accent;
    ctx.fillRect(g.doorX - 3 * g.s, g.doorY - 11 * g.s, 6 * g.s, 11 * g.s);

    const mbX = home.x + 7 * g.s;
    const mbY = home.y - 4 * g.s;

    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(mbX, mbY - 8 * g.s, 2 * g.s, 8 * g.s);
    ctx.fillStyle = home.delivered ? '#9cffb2' : style.wallShade;
    ctx.fillRect(mbX - 6 * g.s, mbY - 12 * g.s, 9 * g.s, 6 * g.s);
    ctx.fillStyle = style.accent;
    ctx.fillRect(mbX - 3 * g.s, mbY - 10 * g.s, 3 * g.s, 2 * g.s);

    ctx.fillStyle = '#2cae31';
    for (let k = 0; k < 4; k += 1) {
      ctx.fillRect(g.frontX + 7 * g.s + k * (7 * g.s), g.baseY - 6 * g.s, 4 * g.s, 3 * g.s);
    }

    ctx.fillStyle = style.flower;
    for (let k = 0; k < 6; k += 1) {
      ctx.fillRect(g.frontX + g.houseW + 3 * g.s + k * (4 * g.s), g.baseY - 6 * g.s, 2 * g.s, 2 * g.s);
    }

    if (home.fence) {
      ctx.fillStyle = '#f2f2f2';
      const fx = g.frontX + 9 * g.s;
      const fy = home.y + 5 * g.s;
      ctx.fillRect(fx, fy, 30 * g.s, 2 * g.s);
      for (let k = 0; k < 5; k += 1) {
        ctx.fillRect(fx + k * (6 * g.s), fy - 4 * g.s, 2 * g.s, 8 * g.s);
      }
    }
  }
}

function drawHazards(ctx, hazards) {
  for (const hazard of hazards) {
    if (hazard.kind === 'tree') {
      ctx.fillStyle = '#5b3b1f';
      ctx.fillRect(hazard.x - 2, hazard.y - 8, 4, 10);
      ctx.fillStyle = '#2f8d36';
      ctx.fillRect(hazard.x - 9, hazard.y - 18, 18, 12);
      ctx.fillStyle = '#4cad54';
      ctx.fillRect(hazard.x - 6, hazard.y - 21, 12, 4);
    } else if (hazard.kind === 'dog') {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(hazard.x - 8, hazard.y - 6, 16, 10);
      ctx.fillStyle = '#24170e';
      ctx.fillRect(hazard.x + 5, hazard.y - 4, 4, 3);
    } else {
      ctx.fillStyle = '#4d4d4d';
      ctx.fillRect(hazard.x - 1, hazard.y - 2, 2, 10);
      ctx.fillStyle = '#d75454';
      ctx.fillRect(hazard.x - 5, hazard.y - 12, 10, 10);
      ctx.fillStyle = '#262626';
      ctx.fillRect(hazard.x - 4, hazard.y - 7, 8, 1);
    }
  }
}

function drawPapers(ctx, papers) {
  for (const paper of papers) {
    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(paper.x - 3, paper.y - 2, 6, 4);
    ctx.fillStyle = '#d4d4d4';
    ctx.fillRect(paper.x - 2, paper.y - 1, 4, 2);
  }
}

function drawPops(ctx, pops) {
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  for (const pop of pops) {
    const alpha = clamp(pop.t / 0.8, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawPlayer(ctx, game, assets) {
  if (!assets.imgs.length) {
    return;
  }
  if (game.player.invuln > 0 && Math.floor(game.player.invuln * 18) % 2 === 0) {
    return;
  }

  const img = assets.imgs[game.fi % assets.imgs.length];
  const py = PLAYER_Y - game.player.jumpZ;

  if (game.player.jumpZ > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(game.player.x - 11, PLAYER_Y - 8, 22, 5);
  }

  ctx.drawImage(img, game.player.x - img.width / 2, py - img.height, img.width, img.height);
}

function drawHUD(ctx, game) {
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  ctx.fillRect(8, 8, 330, 66);

  ctx.fillStyle = '#ffe066';
  ctx.font = '12px monospace';
  ctx.fillText(`SCORE ${String(game.player.score).padStart(6, '0')}`, 14, 24);

  ctx.fillStyle = '#b8efff';
  ctx.fillText(`LIVES ${game.player.lives}`, 14, 40);
  ctx.fillText(`PAPERS ${game.player.papers}`, 14, 56);

  ctx.fillStyle = '#ffd5a8';
  ctx.fillText(`DELIVERIES ${game.deliveries}`, 145, 24);

  ctx.fillStyle = game.iceTimer < 7 ? '#ff7a7a' : '#9cffb2';
  ctx.fillText(`ICE ETA ${game.iceTimer.toFixed(1)}s`, 145, 40);

  const barX = 145;
  const barY = 48;
  const barW = 178;
  const barH = 10;

  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = game.iceTimer < 7 ? '#ff6b6b' : '#7cff9b';
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * (game.iceTimer / ICE_MAX), barH - 2);
}

function drawCenteredBox(ctx, title, line1, line2) {
  ctx.fillStyle = 'rgba(0,0,0,0.84)';
  ctx.fillRect(56, 108, 400, 176);

  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 108, 400, 176);

  ctx.fillStyle = '#ffe066';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 150);

  ctx.fillStyle = '#f0f0f0';
  ctx.font = '12px monospace';
  ctx.fillText(line1, W / 2, 188);
  ctx.fillText(line2, W / 2, 208);

  ctx.fillStyle = '#9fd5ff';
  ctx.fillText('ARROWS / A,D MOVE   UP JUMP   SPACE THROW', W / 2, 236);
  ctx.fillText('P PAUSE   B BACK TO CITY', W / 2, 256);
  ctx.textAlign = 'left';
}

function drawTouchControls(ctx, game) {
  if (!game.touchEnabled || game.mode !== GAME_PLAYING) {
    return;
  }

  const y = H - 56;
  const w = 124;

  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(6, y, w, 48);
  ctx.fillRect(132, y, w, 48);
  ctx.fillRect(258, y, w, 48);
  ctx.fillRect(384, y, w, 48);

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe066';
  ctx.font = '12px monospace';
  ctx.fillText('LEFT', 44, H - 26);
  ctx.fillText('RIGHT', 166, H - 26);
  ctx.fillText('JUMP', 299, H - 26);
  ctx.fillText('THROW', 418, H - 26);
}

function drawLoading(ctx, assets) {
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffe066';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`LOADING ${assets.loaded}/${assets.srcs.length}`, W / 2, H / 2);
  ctx.textAlign = 'left';
}

export function drawScene(ctx, game, assets) {
  if (!assets.ready) {
    drawLoading(ctx, assets);
    return;
  }

  ctx.clearRect(0, 0, W, H);
  drawBase(ctx, game.scroll);
  drawHomes(ctx, game.homes);
  drawHazards(ctx, game.hazards);
  drawPapers(ctx, game.papers);
  drawPlayer(ctx, game, assets);
  drawPops(ctx, game.pops);
  drawHUD(ctx, game);
  drawTouchControls(ctx, game);

  if (game.mode === GAME_TITLE) {
    drawCenteredBox(
      ctx,
      'PAPERGIRL 2026 - HOUSTON',
      'Deliver papers to homes to push ICE back',
      'Avoid trees, dogs, and mailboxes.',
    );

    ctx.fillStyle = '#9cffb2';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`BEST ${String(game.bestScore).padStart(6, '0')}`, W / 2, 298);
    ctx.textAlign = 'left';
  } else if (game.mode === GAME_PAUSED) {
    drawCenteredBox(ctx, 'PAUSED', 'Press P or ENTER to resume', 'Press B to return to city select');
  } else if (game.mode === GAME_OVER) {
    drawCenteredBox(
      ctx,
      'BUSTED',
      game.gameOverReason,
      `Score ${String(game.player.score).padStart(6, '0')}  Deliveries ${game.deliveries}`,
    );

    ctx.fillStyle = '#9cffb2';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER to run it again', W / 2, 298);
    ctx.textAlign = 'left';
  }
}
