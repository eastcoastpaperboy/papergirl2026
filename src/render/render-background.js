import {
  CROSS_STREET_HEIGHT,
  CROSS_STREET_PERIOD,
  H,
  W,
  homeGeometry,
  laneAt,
  wrapMod,
} from '../core/entities.js';

const HOUSE_VISUAL_SCALE = 2.0;
// Negative tilts homes so the base rises toward the top-right, matching sidewalk perspective.
const HOUSE_SPRITE_ROTATION_RAD = 0.10;

export function drawBase(ctx, scroll) {
  const scrollPx = scroll;

  for (let y = 0; y < H; y += 1) {
    const lane = laneAt(y);
    const si = Math.max(0, lane.siL);
    const houseL = Math.max(0, si - 40);
    const crossPhase = wrapMod(y + scrollPx, CROSS_STREET_PERIOD);
    const inCrossStreet = crossPhase < CROSS_STREET_HEIGHT;
    const crossEdge = inCrossStreet && (crossPhase < 2 || crossPhase >= CROSS_STREET_HEIGHT - 2);

    if (inCrossStreet) {
      const crossRight = Math.min(W, Math.round(lane.rL + lane.rw * 0.2));
      ctx.fillStyle = crossEdge ? '#8e8e8e' : '#2e2e2e';
      ctx.fillRect(0, y, crossRight, 1);

      if (!crossEdge && crossPhase > 5 && crossPhase < CROSS_STREET_HEIGHT - 5) {
        const dash = wrapMod(crossPhase - 6, 12) < 6;
        if (dash) {
          ctx.fillStyle = '#d8d8d8';
          ctx.fillRect(Math.max(0, lane.siL + 3), y, Math.max(0, lane.sw - 6), 1);
        }
      }

      if (lane.rL < W) {
        ctx.fillStyle = '#171717';
        ctx.fillRect(Math.max(0, lane.rL), y, W - Math.max(0, lane.rL), 1);
        if (crossPhase > 4 && crossPhase < CROSS_STREET_HEIGHT - 4) {
          const stopX = lane.rL + Math.floor(lane.rw * 0.18);
          ctx.fillStyle = '#d6cf62';
          ctx.fillRect(stopX, y, 2, 1);
        }
      }
      continue;
    }

    if (si > 0) {
      ctx.fillStyle = '#2b812e';
      ctx.fillRect(0, y, si, 1);
    }

    ctx.fillStyle = '#624f3f';
    ctx.fillRect(houseL, y, Math.max(0, si - houseL), 1);

    if (wrapMod(y + scroll * 0.5, 30) < 2) {
      ctx.fillStyle = '#8e755f';
      ctx.fillRect(houseL, y, Math.max(0, si - houseL), 1);
    }

    ctx.fillStyle = '#bebebe';
    ctx.fillRect(si, y, lane.sw, 1);

    if (wrapMod(y + scroll, 48) < 1) {
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
      if (wrapMod(y + scroll * 1.5, 52) < 18) {
        ctx.fillStyle = '#d6cf62';
        ctx.fillRect(stripeX, y, 2, 1);
      }
    }
  }
}

export function drawHomes(ctx, homes, assets) {
  const ordered = [...homes].sort((a, b) => a.y - b.y);
  const housePack = assets && assets.houseSprites;
  const hasSpriteHomes = Boolean(housePack && housePack.ready && housePack.regular.length > 0);
  const pickSprite = (pool, seed, fallbackIndex = 0) => {
    if (!pool || pool.length === 0) {
      return null;
    }
    let idx = fallbackIndex;
    if (Number.isFinite(seed)) {
      idx = Math.floor(seed * pool.length);
    }
    idx = ((idx % pool.length) + pool.length) % pool.length;
    return pool[idx];
  };
  const palettes = [
    {
      front: '#d72626',
      side: '#b51e1e',
      brick: '#8f1a1a',
      roof: '#0b0b0d',
      shingle: '#ececec',
      trim: '#f1f1f1',
      glass: '#0f1015',
      bed: '#0b0b0b',
      flower: '#ef4a2f',
      shrub: '#2aba45',
      fence: '#1f6b29',
    },
    {
      front: '#cc2d1f',
      side: '#ad2317',
      brick: '#841c14',
      roof: '#111112',
      shingle: '#dbdbdb',
      trim: '#efefef',
      glass: '#121317',
      bed: '#0d0d0d',
      flower: '#f0553b',
      shrub: '#29ba43',
      fence: '#1f6b29',
    },
    {
      front: '#d2322a',
      side: '#b72822',
      brick: '#861f19',
      roof: '#101011',
      shingle: '#e6e6e6',
      trim: '#f4f4f4',
      glass: '#101117',
      bed: '#0c0c0c',
      flower: '#eb4835',
      shrub: '#2fbf47',
      fence: '#1f6b29',
    },
  ];

  const drawWindow = (x, y, w, h, unit, palette) => {
    const px = Math.round(x);
    const py = Math.round(y);
    const ww = Math.max(4, Math.round(w));
    const hh = Math.max(5, Math.round(h));
    const b = Math.max(1, Math.round(unit));

    ctx.fillStyle = palette.trim;
    ctx.fillRect(px, py, ww, hh);
    ctx.fillStyle = palette.glass;
    ctx.fillRect(px + b, py + b, ww - b * 2, hh - b * 2);

    const midX = px + Math.floor(ww / 2) - Math.floor(b / 2);
    const midY = py + Math.floor(hh / 2) - Math.floor(b / 2);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(midX, py + b, b, hh - b * 2);
    ctx.fillRect(px + b, midY, ww - b * 2, b);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + b + 1, py + b + 1, b, b);
    ctx.fillRect(px + Math.floor(ww * 0.62), py + Math.floor(hh * 0.18), b, b);
  };

  const drawWalkway = (home, g, doorCenterX) => {
    const anchorX = Number.isFinite(doorCenterX) ? doorCenterX : g.doorX;
    const walkTopX = anchorX - 2 * g.s;
    const walkTopY = g.baseY + 1 * g.s;
    const walkBotX = home.x - 8 * g.s;
    const walkBotY = home.y + 4.5 * g.s;
    ctx.fillStyle = '#d8d8d8';
    ctx.beginPath();
    ctx.moveTo(walkTopX - 2 * g.s, walkTopY);
    ctx.lineTo(walkTopX + 4 * g.s, walkTopY);
    ctx.lineTo(walkBotX + 12 * g.s, walkBotY);
    ctx.lineTo(walkBotX - 8 * g.s, walkBotY);
    ctx.closePath();
    ctx.fill();
  };

  const drawFence = (home, g, palette) => {
    if (!home.fence) {
      return;
    }
    ctx.fillStyle = palette.fence;
    const fx = g.frontX + 7 * g.s;
    const fy = home.y + 5.5 * g.s;
    ctx.fillRect(fx, fy, 34 * g.s, 2 * g.s);
    for (let k = 0; k < 8; k += 1) {
      ctx.fillRect(fx + k * (4.5 * g.s), fy - 5 * g.s, 1.5 * g.s, 7 * g.s);
    }
  };

  for (const home of ordered) {
    const palette = palettes[home.style % palettes.length];
    const g = homeGeometry(home);

    if (hasSpriteHomes) {
      const regularPool = housePack.regular;
      const cornerPool = housePack.cornerPool && housePack.cornerPool.length > 0
        ? housePack.cornerPool
        : regularPool;
      const sprite = home.corner
        ? pickSprite(cornerPool, home.spriteSeed, home.style)
        : pickSprite(regularPool, home.spriteSeed, home.style);
      if (sprite) {
        const targetW = g.houseW + g.sideWidth + 14 * g.s;
        const targetH = g.houseH + g.roofH + 12 * g.s;
        const scale = Math.max(targetW / sprite.width, targetH / sprite.height) * HOUSE_VISUAL_SCALE;
        const drawW = Math.max(12, Math.round(sprite.width * scale));
        const drawH = Math.max(12, Math.round(sprite.height * scale));
        const lane = laneAt(home.y);
        const sidewalkGap = Math.max(0, Math.round(1 * g.s));
        const houseNudge = Math.round(60 * g.s); // increase to move closer
        const anchorX = Math.round(lane.siL - sidewalkGap + houseNudge);
        const anchorY = Math.round(g.baseY + 1 * g.s);
        ctx.save();
        ctx.translate(anchorX, anchorY);
        ctx.rotate(HOUSE_SPRITE_ROTATION_RAD);
        ctx.drawImage(sprite, -drawW, -drawH, drawW, drawH);
        ctx.restore();
        drawWalkway(home, g, g.doorX);
        drawFence(home, g, palette);
        continue;
      }
    }

    const unit = Math.max(1, Math.round(2 * g.s));
    const frontH = g.houseH * 0.9;
    const frontTop = g.baseY - frontH;
    const wingW = 28 * g.s;
    const wingH = frontH * 0.56;
    const wingX = g.frontX - wingW * 0.4;
    const wingTop = g.baseY - wingH;

    const bedY = g.baseY - 8 * g.s;
    const bedH = 8 * g.s;
    ctx.fillStyle = palette.bed;
    ctx.fillRect(g.frontX - 8 * g.s, bedY, g.houseW + g.sideWidth + 16 * g.s, bedH);

    ctx.fillStyle = palette.front;
    ctx.fillRect(g.frontX, frontTop, g.houseW, frontH);
    ctx.fillStyle = palette.side;
    ctx.fillRect(g.frontX + g.houseW * 0.74, frontTop + unit, g.sideWidth, frontH - unit);

    ctx.fillStyle = palette.brick;
    for (let yy = frontTop + unit; yy < g.baseY - unit; yy += unit * 2) {
      const rowOffset = Math.floor((yy - frontTop) / (unit * 2)) % 2 === 0 ? 0 : unit;
      for (let xx = g.frontX + unit + rowOffset; xx < g.frontX + g.houseW - unit; xx += unit * 3) {
        ctx.fillRect(Math.round(xx), Math.round(yy), unit, unit);
      }
    }

    ctx.fillStyle = palette.front;
    ctx.fillRect(wingX, wingTop, wingW, wingH);
    ctx.fillStyle = palette.brick;
    for (let yy = wingTop + unit; yy < g.baseY - unit; yy += unit * 2) {
      const rowOffset = Math.floor((yy - wingTop) / (unit * 2)) % 2 === 0 ? 0 : unit;
      for (let xx = wingX + unit + rowOffset; xx < wingX + wingW - unit; xx += unit * 3) {
        ctx.fillRect(Math.round(xx), Math.round(yy), unit, unit);
      }
    }

    const roofMain = [
      [g.frontX - 6 * g.s, frontTop + unit],
      [g.frontX + g.houseW * 0.82, frontTop + unit],
      [g.frontX + g.houseW + g.sideWidth + 6 * g.s, frontTop - g.roofH],
      [g.frontX + g.houseW * 0.16, frontTop - g.roofH],
    ];
    ctx.fillStyle = palette.roof;
    ctx.beginPath();
    ctx.moveTo(roofMain[0][0], roofMain[0][1]);
    for (let i = 1; i < roofMain.length; i += 1) {
      ctx.lineTo(roofMain[i][0], roofMain[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = palette.shingle;
    const roofMinX = g.frontX - 4 * g.s;
    const roofMaxX = g.frontX + g.houseW + g.sideWidth;
    const roofMinY = frontTop - g.roofH + unit;
    const roofMaxY = frontTop + unit;
    for (let yy = roofMinY; yy < roofMaxY; yy += unit * 2) {
      const row = Math.floor((yy - roofMinY) / (unit * 2));
      const offset = (row % 2) * unit;
      for (let xx = roofMinX + offset; xx < roofMaxX; xx += unit * 3) {
        ctx.fillRect(Math.round(xx), Math.round(yy), unit * 1.3, unit * 0.7);
      }
    }

    const roofWing = [
      [wingX - 4 * g.s, wingTop + unit],
      [wingX + wingW * 0.68, wingTop + unit],
      [wingX + wingW + 5 * g.s, wingTop - g.roofH * 0.7],
      [wingX + wingW * 0.22, wingTop - g.roofH * 0.7],
    ];
    ctx.fillStyle = palette.roof;
    ctx.beginPath();
    ctx.moveTo(roofWing[0][0], roofWing[0][1]);
    for (let i = 1; i < roofWing.length; i += 1) {
      ctx.lineTo(roofWing[i][0], roofWing[i][1]);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d4d4d4';
    const porchX = g.frontX + g.houseW * 0.42;
    const porchY = g.baseY - 22 * g.s;
    ctx.beginPath();
    ctx.moveTo(porchX - 2 * g.s, porchY + 8 * g.s);
    ctx.lineTo(porchX + 16 * g.s, porchY + 8 * g.s);
    ctx.lineTo(porchX + 22 * g.s, porchY);
    ctx.lineTo(porchX + 4 * g.s, porchY);
    ctx.closePath();
    ctx.fill();

    const doorW = 6.5 * g.s;
    const doorH = 16 * g.s;
    const doorX = g.frontX + g.houseW * 0.48;
    const doorY = g.baseY - doorH;
    ctx.fillStyle = '#080808';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(doorX - unit, doorY, unit, doorH);
    ctx.fillRect(doorX + doorW, doorY, unit, doorH);

    const canopyTopY = doorY - 4 * g.s;
    ctx.fillStyle = palette.trim;
    ctx.beginPath();
    ctx.moveTo(doorX - 1 * g.s, doorY - unit);
    ctx.lineTo(doorX + doorW + 1.5 * g.s, doorY - unit);
    ctx.lineTo(doorX + doorW + 8 * g.s, canopyTopY);
    ctx.lineTo(doorX + 5 * g.s, canopyTopY);
    ctx.closePath();
    ctx.fill();

    const winW = 8 * g.s;
    const winH = 9 * g.s;
    drawWindow(g.frontX + 10 * g.s, frontTop + 7 * g.s, winW, winH, unit, palette);
    drawWindow(g.frontX + 28 * g.s, frontTop + 7 * g.s, winW, winH, unit, palette);
    drawWindow(g.frontX + g.houseW * 0.78, frontTop + 8 * g.s, winW, winH, unit, palette);
    drawWindow(wingX + 7 * g.s, wingTop + 6 * g.s, winW * 0.86, winH * 0.95, unit, palette);
    drawWindow(wingX + 7 * g.s, wingTop + 18 * g.s, winW * 0.86, winH * 0.95, unit, palette);

    drawWalkway(home, g, doorX + doorW * 0.45);

    ctx.fillStyle = palette.flower;
    for (let k = 0; k < 9; k += 1) {
      const fx = g.frontX + 4 * g.s + k * (5 * g.s);
      ctx.fillRect(fx, bedY + 2 * g.s, 2 * g.s, 2 * g.s);
      if (k % 2 === 0) {
        ctx.fillRect(fx + 2 * g.s, bedY + 4 * g.s, 2 * g.s, 2 * g.s);
      }
    }
    ctx.fillStyle = palette.shrub;
    ctx.fillRect(g.frontX + g.houseW * 0.58, bedY + 2 * g.s, 4 * g.s, 3 * g.s);
    ctx.fillRect(g.frontX + g.houseW * 0.68, bedY + 2 * g.s, 4 * g.s, 3 * g.s);

    drawFence(home, g, palette);
  }
}
