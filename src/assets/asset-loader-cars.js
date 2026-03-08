import {
  cropOpaqueCanvas,
  keyOutBorderEdgePalette,
  keyOutBorderMatte,
} from './asset-processing.js';
import { ANIM_FPS, CAR_ANIM_SOURCES, CAR_DISPLAY_H } from './asset-config.js';

export function loadCarAnimations(assets) {
  assets.carAnims.fps = ANIM_FPS;
  assets.carAnims.displayH = CAR_DISPLAY_H;

  const loadVariant = (key, cfg) => {
    const slot = assets.carAnims.variants[key];
    if (!slot) {
      return;
    }
    const matteOpts = {
      satThreshold: 26,
      useMaxThreshold: false,
    };
    const frameFiles = cfg.frames || [];
    if (!frameFiles.length) {
      return;
    }

    const rawFrames = new Array(frameFiles.length);
    let remaining = frameFiles.length;
    let failed = false;

    const loadGifFallback = (reason) => {
      if (failed) {
        return;
      }
      failed = true;
      console.warn('[car:' + key + '] ' + reason + ', using gif static fallback');
      const img = new Image();
      img.onload = () => {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = img.width;
        frameCanvas.height = img.height;
        const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
        frameCtx.imageSmoothingEnabled = false;
        frameCtx.drawImage(img, 0, 0);
        let box = keyOutBorderMatte(frameCtx, frameCanvas.width, frameCanvas.height, true, matteOpts);
        box = keyOutBorderEdgePalette(frameCtx, frameCanvas.width, frameCanvas.height, true) || box;
        if (box) {
          const pad = 2;
          const cropX = Math.max(0, box.x - pad);
          const cropY = Math.max(0, box.y - pad);
          const cropW = Math.max(1, Math.min(frameCanvas.width - cropX, box.w + pad * 2));
          const cropH = Math.max(1, Math.min(frameCanvas.height - cropY, box.h + pad * 2));
          const out = document.createElement('canvas');
          out.width = cropW;
          out.height = cropH;
          const octx = out.getContext('2d');
          octx.imageSmoothingEnabled = false;
          octx.drawImage(frameCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          slot.static = out;
        } else {
          const crop = cropOpaqueCanvas(img);
          slot.static = crop || img;
        }
        console.log('[car:' + key + '] gif fallback loaded');
      };
      img.onerror = () => console.warn('[car:' + key + '] missing ' + cfg.gif);
      img.src = cfg.gif;
    };

    for (let idx = 0; idx < frameFiles.length; idx += 1) {
      const src = frameFiles[idx];
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
          let box = keyOutBorderMatte(frameCtx, frameCanvas.width, frameCanvas.height, true, matteOpts);
          box = keyOutBorderEdgePalette(frameCtx, frameCanvas.width, frameCanvas.height, true) || box;
          if (!box) {
            loadGifFallback('frame matte keying failed');
            return;
          }
          rawFrames[idx] = { canvas: frameCanvas, box };
        } catch (e) {
          loadGifFallback('frame processing failed: ' + String(e));
          return;
        }

        remaining -= 1;
        if (remaining > 0 || failed) {
          return;
        }

        const first = rawFrames[0];
        if (!first) {
          loadGifFallback('missing first frame');
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
            loadGifFallback('frame bbox missing');
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

        slot.frames = processedFrames;
        console.log(
          '[car:' + key + '] running frames loaded='
          + processedFrames.length
          + ' crop='
          + cropW
          + 'x'
          + cropH,
        );
      };
      img.onerror = () => loadGifFallback('frame missing: ' + src);
      img.src = src;
    }
  };

  for (const [key, cfg] of Object.entries(CAR_ANIM_SOURCES)) {
    loadVariant(key, cfg);
  }
}
