import {
  GAME_PLAYING,
  H,
  PLAYER_Y,
  clamp,
} from '../core/entities.js';

export function drawHazards(ctx, hazards, assets, elapsed) {
  for (const hazard of hazards) {
    if (hazard.kind === 'tree') {
      const s = 1.55;
      ctx.fillStyle = '#5b3b1f';
      ctx.fillRect(
        Math.round(hazard.x - 2 * s),
        Math.round(hazard.y - 8 * s),
        Math.round(4 * s),
        Math.round(10 * s),
      );
      ctx.fillStyle = '#2f8d36';
      ctx.fillRect(
        Math.round(hazard.x - 9 * s),
        Math.round(hazard.y - 18 * s),
        Math.round(18 * s),
        Math.round(12 * s),
      );
      ctx.fillStyle = '#4cad54';
      ctx.fillRect(
        Math.round(hazard.x - 6 * s),
        Math.round(hazard.y - 21 * s),
        Math.round(12 * s),
        Math.round(4 * s),
      );
    } else if (hazard.kind === 'dog') {
      const dogAnim = assets && assets.dogAnim;
      if (dogAnim && dogAnim.frames && dogAnim.frames.length > 0) {
        const t = (elapsed || 0) * dogAnim.fps + hazard.phase * 1.8;
        const frame = dogAnim.frames[Math.floor(t) % dogAnim.frames.length];
        const scale = dogAnim.displayH / frame.height;
        const drawW = Math.max(8, Math.round(frame.width * scale));
        const drawH = Math.max(8, Math.round(frame.height * scale));
        const dx = Math.round(hazard.x - drawW * 0.5);
        const dy = Math.round(hazard.y - drawH + 4);
        ctx.drawImage(frame, dx, dy, drawW, drawH);
      } else if (dogAnim && dogAnim.static) {
        const frame = dogAnim.static;
        const scale = dogAnim.displayH / frame.height;
        const drawW = Math.max(8, Math.round(frame.width * scale));
        const drawH = Math.max(8, Math.round(frame.height * scale));
        const dx = Math.round(hazard.x - drawW * 0.5);
        const dy = Math.round(hazard.y - drawH + 4);
        ctx.drawImage(frame, dx, dy, drawW, drawH);
      } else {
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(hazard.x - 8, hazard.y - 6, 16, 10);
        ctx.fillStyle = '#24170e';
        ctx.fillRect(hazard.x + 5, hazard.y - 4, 4, 3);
      }
    } else if (hazard.kind === 'car') {
      const carAnims = assets && assets.carAnims;
      const carKey = hazard.carColor || 'red';
      const variant = carAnims && carAnims.variants ? carAnims.variants[carKey] : null;
      const depthScale = clamp(0.78 + (hazard.y / H) * 0.62, 0.78, 1.35);
      if (carAnims && variant && variant.frames && variant.frames.length > 0) {
        const t = (elapsed || 0) * carAnims.fps + hazard.phase * 1.5;
        const frame = variant.frames[Math.floor(t) % variant.frames.length];
        const scale = (carAnims.displayH * depthScale) / frame.height;
        const drawW = Math.max(10, Math.round(frame.width * scale));
        const drawH = Math.max(10, Math.round(frame.height * scale));
        const dx = Math.round(hazard.x - drawW * 0.5);
        const dy = Math.round(hazard.y - drawH + 4);
        const shadowW = Math.max(8, Math.round(drawW * 0.72));
        const shadowH = Math.max(2, Math.round(3 * depthScale));
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(Math.round(hazard.x - shadowW * 0.5), Math.round(hazard.y - shadowH + 1), shadowW, shadowH);
        ctx.drawImage(frame, dx, dy, drawW, drawH);
      } else if (variant && variant.static) {
        const frame = variant.static;
        const scale = ((carAnims ? carAnims.displayH : 30) * depthScale) / frame.height;
        const drawW = Math.max(10, Math.round(frame.width * scale));
        const drawH = Math.max(10, Math.round(frame.height * scale));
        const dx = Math.round(hazard.x - drawW * 0.5);
        const dy = Math.round(hazard.y - drawH + 4);
        const shadowW = Math.max(8, Math.round(drawW * 0.72));
        const shadowH = Math.max(2, Math.round(3 * depthScale));
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(Math.round(hazard.x - shadowW * 0.5), Math.round(hazard.y - shadowH + 1), shadowW, shadowH);
        ctx.drawImage(frame, dx, dy, drawW, drawH);
      } else {
        const x = Math.round(hazard.x);
        const y = Math.round(hazard.y);
        const s = depthScale;
        const shadowW = Math.max(8, Math.round(22 * s));
        const shadowH = Math.max(2, Math.round(3 * s));
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(Math.round(x - shadowW * 0.5), Math.round(y - shadowH + 1), shadowW, shadowH);
        ctx.fillStyle = '#111';
        ctx.fillRect(Math.round(x - 14 * s), Math.round(y - 4 * s), Math.round(6 * s), Math.round(4 * s));
        ctx.fillRect(Math.round(x + 8 * s), Math.round(y - 4 * s), Math.round(6 * s), Math.round(4 * s));
        ctx.fillStyle = '#bf3c3c';
        ctx.fillRect(Math.round(x - 14 * s), Math.round(y - 16 * s), Math.round(28 * s), Math.round(12 * s));
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(Math.round(x - 8 * s), Math.round(y - 14 * s), Math.round(16 * s), Math.round(5 * s));
        ctx.fillStyle = '#7a1f1f';
        ctx.fillRect(Math.round(x - 14 * s), Math.round(y - 10 * s), Math.round(28 * s), Math.round(2 * s));
        ctx.fillStyle = '#ffd77a';
        ctx.fillRect(Math.round(x - 14 * s), Math.round(y - 13 * s), Math.round(2 * s), Math.round(2 * s));
        ctx.fillRect(Math.round(x + 12 * s), Math.round(y - 13 * s), Math.round(2 * s), Math.round(2 * s));
      }
    } else if (hazard.kind === 'mailbox') {
      ctx.fillStyle = '#4d4d4d';
      ctx.fillRect(hazard.x - 1, hazard.y - 2, 2, 10);
      ctx.fillStyle = '#d75454';
      ctx.fillRect(hazard.x - 5, hazard.y - 12, 10, 10);
      ctx.fillStyle = '#262626';
      ctx.fillRect(hazard.x - 4, hazard.y - 7, 8, 1);
    } else if (hazard.kind === 'trashcan') {
      const x = Math.round(hazard.x);
      const y = Math.round(hazard.y);
      const s = 1.15;
      const bodyW = Math.round(10 * s);
      const bodyH = Math.round(12 * s);
      const bodyLeft = x - Math.floor(bodyW / 2);
      const bodyTop = y - bodyH;
      const lidW = Math.round(12 * s);
      const lidH = Math.max(2, Math.round(3 * s));
      const lidLeft = x - Math.floor(lidW / 2);
      const shadowW = Math.round(10 * s);
      const shadowH = Math.max(2, Math.round(2 * s));
      const barH = Math.round(8 * s);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.fillRect(x - Math.floor(shadowW / 2), y + 1, shadowW, shadowH);
      ctx.fillStyle = '#2e3942';
      ctx.fillRect(bodyLeft, bodyTop, bodyW, bodyH);
      ctx.fillStyle = '#576672';
      ctx.fillRect(lidLeft, bodyTop - lidH + 1, lidW, lidH);
      ctx.fillStyle = '#6f7f8a';
      ctx.fillRect(bodyLeft + 2, bodyTop + 2, 1, barH);
      ctx.fillRect(bodyLeft + bodyW - 3, bodyTop + 2, 1, barH);
      ctx.fillStyle = '#1f2730';
      ctx.fillRect(bodyLeft + 1, bodyTop + 1, Math.max(2, bodyW - 2), 1);
    } else {
      ctx.fillStyle = '#676767';
      ctx.fillRect(hazard.x - 4, hazard.y - 8, 8, 8);
    }
  }
}

export function drawPapers(ctx, papers) {
  const paperW = 7;
  const paperH = 5;
  const paperInnerW = 5;
  const paperInnerH = 3;
  for (const paper of papers) {
    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(paper.x - paperW / 2, paper.y - paperH / 2, paperW, paperH);
    ctx.fillStyle = '#d4d4d4';
    ctx.fillRect(
      paper.x - paperInnerW / 2,
      paper.y - paperInnerH / 2,
      paperInnerW,
      paperInnerH,
    );
  }
}

export function drawPops(ctx, pops) {
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

export function drawPlayer(ctx, game, assets) {
  const pedaling = game.mode === GAME_PLAYING && game.player.jumpZ <= 1;
  const pedalPhase = game.elapsed * 18;
  const pedalBob = pedaling ? Math.sin(pedalPhase) * 0.45 : 0;
  const py = PLAYER_Y - game.player.jumpZ + pedalBob;

  if (game.player.jumpZ > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(game.player.x - 11, PLAYER_Y - 8, 22, 5);
  }

  const facing = game.player.facing < 0 ? -1 : 1;
  const turn = game.player.turnInput > 0 ? 1 : (game.player.turnInput < 0 ? -1 : 0);
  const isTurning = turn !== 0;
  const applyFacingFlip = isTurning && facing < 0;
  const straightTurnRad = turn === 0 ? (-20 * Math.PI) / 180 : 0;
  const leanRad = turn * 0.10 + straightTurnRad;
  const pivotX = Math.round(game.player.x);
  const pivotY = Math.round(py - 8);

  ctx.save();
  ctx.globalAlpha = game.player.invuln > 0 ? 0.72 : 1.0;
  ctx.translate(pivotX, pivotY);
  if (applyFacingFlip) {
    ctx.scale(-1, 1);
  }
  if (leanRad !== 0) {
    ctx.rotate(leanRad);
  }
  ctx.translate(-pivotX, -pivotY);

  const fi = Math.floor(game.fi) % assets.frames.length;
  const [fcol, frow] = assets.frames[fi];
  if (assets.animated && assets.animFrames && assets.animFrames.length > 0) {
    const neutralIndex = Math.min(
      assets.animFrames.length - 1,
      Math.floor(assets.animFrames.length * 0.5),
    );
    const animTime = game.mode === GAME_PLAYING ? game.elapsed : 0;
    const nearCenter = [
      Math.max(0, neutralIndex - 1),
      neutralIndex,
      Math.min(assets.animFrames.length - 1, neutralIndex + 1),
      neutralIndex,
    ];
    const straightFps = assets.animFps * 0.6;
    const animIndex = nearCenter[Math.floor(animTime * straightFps) % nearCenter.length];
    const frame = assets.animFrames[animIndex];
    const scale = assets.displayH / frame.height;
    const drawW = Math.round(frame.width * scale);
    const drawH = Math.round(frame.height * scale);
    const dx = Math.round(game.player.x - drawW / 2);
    const dy = Math.round(py - drawH);
    ctx.drawImage(frame, dx, dy, drawW, drawH);
  } else if (assets.sheet) {
    const rows = Math.max(1, Math.round(assets.sheet.height / assets.fh));
    const topBleed = frow > 0 ? Math.floor(assets.fh * 0.60) : 0;
    const bottomBleed = frow < rows - 1 ? Math.floor(assets.fh * 0.30) : 0;
    const sy = Math.max(0, frow * assets.fh - topBleed);
    const requestedSh = assets.fh + (frow * assets.fh - sy) + bottomBleed;
    const sh = Math.min(assets.sheet.height - sy, requestedSh);

    const scale = assets.displayH / assets.fh;
    const drawW = Math.round(assets.fw * scale);
    const drawH = Math.round(sh * scale);
    const frameBottomInSource = (frow * assets.fh + assets.fh) - sy;
    const frameBottomInDraw = Math.round(frameBottomInSource * scale);

    const dx = Math.round(game.player.x - drawW / 2);
    const dy = Math.round(py - frameBottomInDraw);
    ctx.drawImage(assets.sheet,
      fcol * assets.fw, sy, assets.fw, sh,
      dx, dy, drawW, drawH);
  } else {
    // Placeholder: simple silhouette until papergirl.png is loaded
    const cx = game.player.x;
    // Body
    ctx.fillStyle = '#f05585';
    ctx.fillRect(cx - 7, py - 28, 14, 16);
    // Head
    ctx.fillStyle = '#f5c098';
    ctx.fillRect(cx - 5, py - 38, 10, 10);
    // Hair
    ctx.fillStyle = '#3b1f0e';
    ctx.fillRect(cx - 6, py - 40, 12, 4);
    // Legs
    ctx.fillStyle = '#2244dd';
    ctx.fillRect(cx - 6, py - 12, 5, 12);
    ctx.fillRect(cx + 1, py - 12, 5, 12);
    // Wheels (bike suggestion)
    ctx.fillStyle = '#888';
    ctx.fillRect(cx - 14, py - 6, 10, 6);
    ctx.fillRect(cx + 4, py - 6, 10, 6);
  }

  ctx.restore();
}
