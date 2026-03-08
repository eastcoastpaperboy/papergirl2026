export function solidifySheetAlpha(ctx, width, height) {
  const id = ctx.getImageData(0, 0, width, height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    // Keep fully transparent pixels; make all visible pixels fully opaque.
    d[i + 3] = a === 0 ? 0 : 255;
  }
  ctx.putImageData(id, 0, 0);
}

export function cropOpaqueCanvas(img, alphaCutoff = 6) {
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(img, 0, 0);
  const id = tctx.getImageData(0, 0, tmp.width, tmp.height);
  const d = id.data;

  let minX = tmp.width;
  let minY = tmp.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < tmp.height; y += 1) {
    for (let x = 0; x < tmp.width; x += 1) {
      const a = d[(y * tmp.width + x) * 4 + 3];
      if (a > alphaCutoff) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(tmp, minX, minY, w, h, 0, 0, w, h);
  return out;
}

export function fillInteriorTransparency(ctx, sx, sy, fw, fh) {
  const id = ctx.getImageData(sx, sy, fw, fh);
  const d = id.data;
  const count = fw * fh;
  const outside = new Uint8Array(count);
  const q = new Uint32Array(count);
  let head = 0;
  let tail = 0;

  const tryQueue = (x, y) => {
    if (x < 0 || x >= fw || y < 0 || y >= fh) {
      return;
    }
    const p = y * fw + x;
    if (outside[p]) {
      return;
    }
    if (d[p * 4 + 3] !== 0) {
      return;
    }
    outside[p] = 1;
    q[tail] = p;
    tail += 1;
  };

  for (let x = 0; x < fw; x += 1) {
    tryQueue(x, 0);
    tryQueue(x, fh - 1);
  }
  for (let y = 1; y < fh - 1; y += 1) {
    tryQueue(0, y);
    tryQueue(fw - 1, y);
  }

  while (head < tail) {
    const p = q[head];
    head += 1;
    const x = p % fw;
    const y = (p - x) / fw;
    tryQueue(x - 1, y);
    tryQueue(x + 1, y);
    tryQueue(x, y - 1);
    tryQueue(x, y + 1);
  }

  for (let p = 0; p < count; p += 1) {
    const aIndex = p * 4 + 3;
    if (d[aIndex] === 0 && outside[p] === 0) {
      d[aIndex] = 255;
    }
  }

  ctx.putImageData(id, sx, sy);
}

export function keyOutBorderMatte(ctx, width, height, measureBBox = false, matteOptions = {}) {
  const id = ctx.getImageData(0, 0, width, height);
  const d = id.data;
  const count = width * height;
  const visited = new Uint8Array(count);
  const q = new Uint32Array(count);
  let head = 0;
  let tail = 0;
  const satThreshold = matteOptions.satThreshold ?? 18;
  const maxThreshold = matteOptions.maxThreshold ?? 180;
  const useMaxThreshold = matteOptions.useMaxThreshold !== false;

  const isMatte = (p) => {
    const i = p * 4;
    if (d[i + 3] === 0) {
      return true;
    }
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    if (sat > satThreshold) {
      return false;
    }
    return useMaxThreshold ? max <= maxThreshold : true;
  };

  const tryQueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    const p = y * width + x;
    if (visited[p]) {
      return;
    }
    visited[p] = 1;
    if (!isMatte(p)) {
      return;
    }
    q[tail] = p;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    tryQueue(x, 0);
    tryQueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    tryQueue(0, y);
    tryQueue(width - 1, y);
  }

  while (head < tail) {
    const p = q[head];
    head += 1;
    const i = p * 4;
    d[i + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    tryQueue(x - 1, y);
    tryQueue(x + 1, y);
    tryQueue(x, y - 1);
    tryQueue(x, y + 1);
  }

  let bbox = null;
  if (measureBBox) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const a = d[(y * width + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= minX && maxY >= minY) {
      bbox = {
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
      };
    }
  }

  ctx.putImageData(id, 0, 0);
  return bbox;
}

function measureOpaqueBBox(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return null;
  }
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

// Extra cleanup pass for fully-opaque GIF frame extracts with matte backgrounds.
export function keyOutBorderEdgePalette(ctx, width, height, measureBBox = false, options = {}) {
  const id = ctx.getImageData(0, 0, width, height);
  const d = id.data;
  const count = width * height;
  const visited = new Uint8Array(count);
  const q = new Uint32Array(count);
  let head = 0;
  let tail = 0;

  const sampleStep = Math.max(1, options.sampleStep ?? 2);
  const minSamples = Math.max(8, options.minSamples ?? 24);
  const quant = Math.max(1, options.quant ?? 16);
  const paletteSize = Math.max(1, options.paletteSize ?? 5);
  const tolerance = Math.max(1, options.tolerance ?? 38);
  const toleranceSq = tolerance * tolerance;

  const bins = new Map();
  let sampleCount = 0;
  const addSample = (x, y) => {
    const i = (y * width + x) * 4;
    if (d[i + 3] === 0) {
      return;
    }
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const qr = Math.round(r / quant);
    const qg = Math.round(g / quant);
    const qb = Math.round(b / quant);
    const key = qr + ',' + qg + ',' + qb;
    const entry = bins.get(key) || { count: 0, rSum: 0, gSum: 0, bSum: 0 };
    entry.count += 1;
    entry.rSum += r;
    entry.gSum += g;
    entry.bSum += b;
    bins.set(key, entry);
    sampleCount += 1;
  };

  for (let x = 0; x < width; x += sampleStep) {
    addSample(x, 0);
    addSample(x, height - 1);
  }
  for (let y = sampleStep; y < height - sampleStep; y += sampleStep) {
    addSample(0, y);
    addSample(width - 1, y);
  }

  if (sampleCount < minSamples || bins.size === 0) {
    const bbox = measureBBox ? measureOpaqueBBox(d, width, height) : null;
    ctx.putImageData(id, 0, 0);
    return bbox;
  }

  const sorted = [...bins.values()].sort((a, b) => b.count - a.count);
  const topCount = sorted[0].count;
  const minBinCount = Math.max(2, Math.floor(topCount * 0.08));
  const palette = [];
  for (const entry of sorted) {
    if (palette.length >= paletteSize) {
      break;
    }
    if (entry.count < minBinCount && palette.length > 0) {
      break;
    }
    palette.push({
      r: entry.rSum / entry.count,
      g: entry.gSum / entry.count,
      b: entry.bSum / entry.count,
    });
  }

  if (palette.length === 0) {
    const bbox = measureBBox ? measureOpaqueBBox(d, width, height) : null;
    ctx.putImageData(id, 0, 0);
    return bbox;
  }

  const isPaletteBg = (p) => {
    const i = p * 4;
    if (d[i + 3] === 0) {
      return true;
    }
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    for (const swatch of palette) {
      const dr = r - swatch.r;
      const dg = g - swatch.g;
      const db = b - swatch.b;
      if ((dr * dr) + (dg * dg) + (db * db) <= toleranceSq) {
        return true;
      }
    }
    return false;
  };

  const tryQueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }
    const p = y * width + x;
    if (visited[p]) {
      return;
    }
    visited[p] = 1;
    if (!isPaletteBg(p)) {
      return;
    }
    q[tail] = p;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    tryQueue(x, 0);
    tryQueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    tryQueue(0, y);
    tryQueue(width - 1, y);
  }

  while (head < tail) {
    const p = q[head];
    head += 1;
    const i = p * 4;
    d[i + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    tryQueue(x - 1, y);
    tryQueue(x + 1, y);
    tryQueue(x, y - 1);
    tryQueue(x, y + 1);
  }

  const bbox = measureBBox ? measureOpaqueBBox(d, width, height) : null;
  ctx.putImageData(id, 0, 0);
  return bbox;
}

export function detectFramePositions(ctx, fw, fh, cols = 3, rows = 3) {
  const cellArea = fw * fh;
  const minUsefulPixels = Math.max(40, Math.floor(cellArea * 0.005));
  const alphaThreshold = 24;
  const frameStats = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const id = ctx.getImageData(col * fw, row * fh, fw, fh);
      const d = id.data;
      let opaquePixels = 0;

      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > alphaThreshold) {
          opaquePixels += 1;
        }
      }

      frameStats.push({ col, row, opaquePixels });
    }
  }

  const populated = frameStats.filter((f) => f.opaquePixels >= minUsefulPixels);
  if (populated.length === 0) {
    return [[1, 1]];
  }

  const maxOpaque = Math.max(...populated.map((f) => f.opaquePixels));
  const stable = populated.filter((f) => f.opaquePixels >= maxOpaque * 0.65);
  const chosen = stable.length > 0 ? stable : populated;

  return chosen
    .sort((a, b) => (a.row - b.row) || (a.col - b.col))
    .map((f) => [f.col, f.row]);
}
