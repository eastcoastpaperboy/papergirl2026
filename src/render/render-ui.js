import {
  GAME_OVER,
  GAME_PAUSED,
  GAME_PLAYING,
  GAME_TITLE,
  H,
  ICE_MAX,
  W,
} from '../core/entities.js';

export function drawHUD(ctx, game) {
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

function drawCenteredBox(ctx, title, line1, line2, showControls = true) {
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

  if (showControls) {
    ctx.fillStyle = '#9fd5ff';
    ctx.fillText('ARROWS / A,D MOVE   UP JUMP   SPACE THROW', W / 2, 236);
    ctx.fillText('P PAUSE   B BACK TO CITY', W / 2, 256);
  }
  ctx.textAlign = 'left';
}

export function drawTouchControls(ctx, game) {
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

export function drawModeOverlay(ctx, game) {
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
      false,
    );

    ctx.fillStyle = '#9cffb2';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press ENTER to run it again', W / 2, 248);
    ctx.textAlign = 'left';
  }
}

export function drawLoading(ctx) {
  ctx.fillStyle = '#060606';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#ffe066';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING...', W / 2, H / 2);
  ctx.textAlign = 'left';
}
