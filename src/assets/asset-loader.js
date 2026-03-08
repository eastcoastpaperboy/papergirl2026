import {
  cropOpaqueCanvas,
  detectFramePositions,
  fillInteriorTransparency,
  keyOutBorderMatte,
  solidifySheetAlpha,
} from './asset-processing.js';
import { loadCarAnimations } from './asset-loader-cars.js';
import {
  ANIM_FPS,
  CAR_DISPLAY_H,
  DOG_DISPLAY_H,
  DOG_FRAME_FILES,
  HOUSE_CORNER_SOURCE,
  HOUSE_REGULAR_SOURCES,
  HOUSE_SPRITE_DIR,
  PLAYER_SPRITE_DISPLAY_H,
  SPIN_FRAME_FILES,
  SPRITE_SHEET_COLS,
  SPRITE_SHEET_ROWS,
} from './asset-config.js';

export function createAssets() {
  return {
    sheet: null,
    frames: [[0, 0]],
    fw: 0,
    fh: 0,
    displayW: 0,
    displayH: 0,
    animated: false,
    animFrames: [],
    animFps: ANIM_FPS,
    dogAnim: {
      frames: [],
      fps: ANIM_FPS,
      displayH: DOG_DISPLAY_H,
      static: null,
    },
    carAnims: {
      fps: ANIM_FPS,
      displayH: CAR_DISPLAY_H,
      variants: {
        blue: { frames: [], static: null },
        red: { frames: [], static: null },
        green: { frames: [], static: null },
      },
    },
    houseSprites: {
      ready: false,
      regular: [],
      corner: null,
      cornerPool: [],
    },
    ready: true,
  };
}

function loadPlayerSprite(assets) {
  const loadPngFallback = () => {
    const img = new Image();
    img.onload = () => {
      try {
        const fw = Math.floor(img.width / SPRITE_SHEET_COLS);
        const fh = Math.floor(img.height / SPRITE_SHEET_ROWS);

        const tmp = document.createElement('canvas');
        tmp.width = img.width;
        tmp.height = img.height;
        const tctx = tmp.getContext('2d', { willReadFrequently: true });
        tctx.drawImage(img, 0, 0);
        solidifySheetAlpha(tctx, tmp.width, tmp.height);
        for (let row = 0; row < SPRITE_SHEET_ROWS; row += 1) {
          for (let col = 0; col < SPRITE_SHEET_COLS; col += 1) {
            fillInteriorTransparency(tctx, col * fw, row * fh, fw, fh);
          }
        }

        assets.sheet = tmp;
        assets.frames = detectFramePositions(tctx, fw, fh, SPRITE_SHEET_COLS, SPRITE_SHEET_ROWS);
        assets.fw = fw;
        assets.fh = fh;
        assets.displayH = PLAYER_SPRITE_DISPLAY_H;
        assets.displayW = Math.round(fw * (PLAYER_SPRITE_DISPLAY_H / fh));
        console.log('[papergirl] png fallback loaded, fw=' + fw + ' fh=' + fh + ' frames=' + JSON.stringify(assets.frames));
      } catch (e) {
        console.warn('papergirl png processing failed:', e);
      }
    };
    img.onerror = () => console.warn('papergirl.png not found');
    img.src = '/papergirl.png';
  };

  let failed = false;
  const rawFrames = new Array(SPIN_FRAME_FILES.length);
  let remaining = SPIN_FRAME_FILES.length;

  const failToFallback = (reason) => {
    if (failed) {
      return;
    }
    failed = true;
    console.warn(reason + ', using png fallback');
    loadPngFallback();
  };

  for (let idx = 0; idx < SPIN_FRAME_FILES.length; idx += 1) {
    const src = SPIN_FRAME_FILES[idx];
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (failed) {
        return;
      }
      try {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = img.width;
        frameCanvas.height = img.height;
        const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
        frameCtx.imageSmoothingEnabled = false;
        frameCtx.drawImage(img, 0, 0);
        const box = keyOutBorderMatte(frameCtx, frameCanvas.width, frameCanvas.height, true);
        if (!box) {
          failToFallback('spin frame matte keying failed');
          return;
        }
        rawFrames[idx] = { canvas: frameCanvas, box };
      } catch (e) {
        failToFallback('spin frame processing failed: ' + String(e));
        return;
      }

      remaining -= 1;
      if (remaining > 0 || failed) {
        return;
      }

      const first = rawFrames[0];
      if (!first) {
        failToFallback('spin frames missing');
        return;
      }
      const baseW = first.canvas.width;
      const baseH = first.canvas.height;

      let minX = baseW;
      let minY = baseH;
      let maxX = -1;
      let maxY = -1;
      for (const rf of rawFrames) {
        if (!rf || !rf.box) {
          failToFallback('spin frame bbox missing');
          return;
        }
        if (rf.box.x < minX) minX = rf.box.x;
        if (rf.box.y < minY) minY = rf.box.y;
        if (rf.box.x + rf.box.w - 1 > maxX) maxX = rf.box.x + rf.box.w - 1;
        if (rf.box.y + rf.box.h - 1 > maxY) maxY = rf.box.y + rf.box.h - 1;
      }

      const pad = 2;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.max(1, Math.min(baseW - cropX, (maxX - minX + 1) + pad * 2));
      const cropH = Math.max(1, Math.min(baseH - cropY, (maxY - minY + 1) + pad * 2));

      const processedFrames = [];
      for (const rf of rawFrames) {
        const out = document.createElement('canvas');
        out.width = cropW;
        out.height = cropH;
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.drawImage(rf.canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        processedFrames.push(out);
      }

      assets.animated = true;
      assets.animFrames = processedFrames;
      assets.fw = cropW;
      assets.fh = cropH;
      assets.displayH = PLAYER_SPRITE_DISPLAY_H;
      assets.displayW = Math.round(cropW * (PLAYER_SPRITE_DISPLAY_H / cropH));
      console.log('[papergirl] spin frames loaded=' + processedFrames.length + ' crop=' + cropW + 'x' + cropH);
    };
    img.onerror = () => failToFallback('spin frame image missing: ' + src);
    img.src = src;
  }
}

const HOUSE_IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i;

function stripQueryAndHash(path) {
  return String(path || '').split('#')[0].split('?')[0];
}

function normalizeHouseSource(path) {
  const clean = stripQueryAndHash(path).replace(/^\.\//, '');
  const spriteDir = stripQueryAndHash(HOUSE_SPRITE_DIR).replace(/\/$/, '');
  const spriteDirBare = spriteDir.replace(/^\//, '');
  if (!clean) {
    return '';
  }
  if (/^https?:\/\//i.test(clean) || clean.startsWith('/')) {
    return clean;
  }
  if (clean.startsWith(spriteDir + '/')) {
    return clean;
  }
  if (clean.startsWith(spriteDirBare + '/')) {
    return '/' + clean;
  }
  return spriteDir + '/' + clean;
}

function splitHouseSpriteSources(sources) {
  const unique = [...new Set((sources || [])
    .map((src) => normalizeHouseSource(src))
    .filter((src) => HOUSE_IMAGE_EXT_RE.test(stripQueryAndHash(src))))].sort();
  const cornerSources = unique.filter((src) => /corner/i.test(src));
  const regularOnly = unique.filter((src) => !/corner/i.test(src));
  const regularSources = regularOnly.length > 0 ? regularOnly : unique;
  return { regularSources, cornerSources };
}

async function discoverHouseSpriteSources() {
  try {
    const manifestRes = await fetch(HOUSE_SPRITE_DIR + '/manifest.json', { cache: 'no-store' });
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      const files = Array.isArray(manifest)
        ? manifest
        : (manifest && Array.isArray(manifest.files) ? manifest.files : []);
      if (files.length > 0) {
        return splitHouseSpriteSources(files);
      }
    }
  } catch (e) {
    // Ignore and try directory listing fallback.
  }

  try {
    const listingRes = await fetch(HOUSE_SPRITE_DIR + '/', { cache: 'no-store' });
    if (listingRes.ok) {
      const html = await listingRes.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const hrefs = Array.from(doc.querySelectorAll('a[href]'))
        .map((a) => stripQueryAndHash(a.getAttribute('href') || ''))
        .filter((href) => href && href !== '../' && !href.endsWith('/'));
      const files = hrefs.map((href) => {
        const parts = href.split('/');
        return parts[parts.length - 1];
      });
      if (files.length > 0) {
        return splitHouseSpriteSources(files);
      }
    }
  } catch (e) {
    // Ignore and use hardcoded fallback.
  }

  return splitHouseSpriteSources([
    ...HOUSE_REGULAR_SOURCES,
    HOUSE_CORNER_SOURCE,
  ]);
}

function loadHouseSprites(assets) {
  const pending = [];
  const regularCrops = [];
  const cornerCrops = [];

  const finalize = () => {
    if (regularCrops.length === 0 && cornerCrops.length > 0) {
      regularCrops.push(...cornerCrops);
    }
    assets.houseSprites.regular = regularCrops;
    assets.houseSprites.cornerPool = cornerCrops;
    assets.houseSprites.corner = cornerCrops.length > 0 ? cornerCrops[0] : null;
    assets.houseSprites.ready = regularCrops.length > 0;
    if (assets.houseSprites.ready) {
      console.log(
        '[houses] sprite pack loaded regular='
        + regularCrops.length
        + ' corner='
        + cornerCrops.length,
      );
    } else {
      console.warn('[houses] no house sprites loaded; using procedural homes');
    }
  };

  const enqueueLoad = (src, targetList) => {
    pending.push(new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const crop = cropOpaqueCanvas(img);
        if (crop) {
          targetList.push(crop);
        } else {
          console.warn('[houses] empty alpha for ' + src);
        }
        resolve();
      };
      img.onerror = () => {
        console.warn('[houses] missing ' + src);
        resolve();
      };
      img.src = src;
    }));
  };

  discoverHouseSpriteSources()
    .then(({ regularSources, cornerSources }) => {
      for (const src of regularSources) {
        enqueueLoad(src, regularCrops);
      }
      for (const src of cornerSources) {
        enqueueLoad(src, cornerCrops);
      }
      Promise.all(pending).then(finalize).catch(() => finalize());
    })
    .catch(() => finalize());
}

function loadDogAnimation(assets) {
  assets.dogAnim.fps = ANIM_FPS;
  assets.dogAnim.displayH = DOG_DISPLAY_H;

  if (!DOG_FRAME_FILES.length) {
    return;
  }

  const rawFrames = new Array(DOG_FRAME_FILES.length);
  let remaining = DOG_FRAME_FILES.length;
  let failed = false;

  const loadGifFallback = (reason) => {
    if (failed) {
      return;
    }
    failed = true;
    console.warn(reason + ', using dog_running.gif static fallback');
    const img = new Image();
    img.onload = () => {
      const crop = cropOpaqueCanvas(img);
      assets.dogAnim.static = crop || img;
      console.log('[dog] gif fallback loaded');
    };
    img.onerror = () => console.warn('[dog] missing dog_running.gif');
    img.src = 'dog_running.gif';
  };

  for (let idx = 0; idx < DOG_FRAME_FILES.length; idx += 1) {
    const src = DOG_FRAME_FILES[idx];
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (failed) {
        return;
      }
      try {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = img.width;
        frameCanvas.height = img.height;
        const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
        frameCtx.imageSmoothingEnabled = false;
        frameCtx.drawImage(img, 0, 0);
        const box = keyOutBorderMatte(frameCtx, frameCanvas.width, frameCanvas.height, true);
        if (!box) {
          loadGifFallback('[dog] frame matte keying failed');
          return;
        }
        rawFrames[idx] = { canvas: frameCanvas, box };
      } catch (e) {
        loadGifFallback('[dog] frame processing failed: ' + String(e));
        return;
      }

      remaining -= 1;
      if (remaining > 0 || failed) {
        return;
      }

      const first = rawFrames[0];
      if (!first) {
        loadGifFallback('[dog] missing first frame');
        return;
      }
      const baseW = first.canvas.width;
      const baseH = first.canvas.height;

      let minX = baseW;
      let minY = baseH;
      let maxX = -1;
      let maxY = -1;
      for (const rf of rawFrames) {
        if (!rf || !rf.box) {
          loadGifFallback('[dog] frame bbox missing');
          return;
        }
        if (rf.box.x < minX) minX = rf.box.x;
        if (rf.box.y < minY) minY = rf.box.y;
        if (rf.box.x + rf.box.w - 1 > maxX) maxX = rf.box.x + rf.box.w - 1;
        if (rf.box.y + rf.box.h - 1 > maxY) maxY = rf.box.y + rf.box.h - 1;
      }

      const pad = 2;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.max(1, Math.min(baseW - cropX, (maxX - minX + 1) + pad * 2));
      const cropH = Math.max(1, Math.min(baseH - cropY, (maxY - minY + 1) + pad * 2));

      const processedFrames = [];
      for (const rf of rawFrames) {
        const out = document.createElement('canvas');
        out.width = cropW;
        out.height = cropH;
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.drawImage(rf.canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        processedFrames.push(out);
      }

      assets.dogAnim.frames = processedFrames;
      console.log('[dog] running frames loaded=' + processedFrames.length + ' crop=' + cropW + 'x' + cropH);
    };
    img.onerror = () => loadGifFallback('[dog] frame missing: ' + src);
    img.src = src;
  }
}

export function loadAssets(assets) {
  loadPlayerSprite(assets);
  loadHouseSprites(assets);
  loadDogAnimation(assets);
  loadCarAnimations(assets);
}
