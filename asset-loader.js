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
    img.src = 'papergirl.png';
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

function loadHouseSprites(assets) {
  const pending = [];
  const regularCrops = [];
  let cornerCrop = null;

  const finalize = () => {
    assets.houseSprites.regular = regularCrops;
    assets.houseSprites.corner = cornerCrop;
    assets.houseSprites.ready = regularCrops.length > 0;
    if (assets.houseSprites.ready) {
      console.log(
        '[houses] sprite pack loaded regular='
        + regularCrops.length
        + ' corner='
        + (cornerCrop ? 'yes' : 'no'),
      );
    } else {
      console.warn('[houses] no house sprites loaded; using procedural homes');
    }
  };

  for (const src of HOUSE_REGULAR_SOURCES) {
    pending.push(new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const crop = cropOpaqueCanvas(img);
        if (crop) {
          regularCrops.push(crop);
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
  }

  pending.push(new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      cornerCrop = cropOpaqueCanvas(img);
      if (!cornerCrop) {
        console.warn('[houses] empty alpha for ' + HOUSE_CORNER_SOURCE);
      }
      resolve();
    };
    img.onerror = () => {
      console.warn('[houses] missing ' + HOUSE_CORNER_SOURCE);
      resolve();
    };
    img.src = HOUSE_CORNER_SOURCE;
  }));

  Promise.all(pending).then(finalize).catch(() => finalize());
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
