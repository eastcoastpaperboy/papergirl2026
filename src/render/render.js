import { W } from '../core/entities.js';
import { drawBase, drawHomes } from './render-background.js';
import {
  drawHazards,
  drawPapers,
  drawPlayer,
  drawPops,
} from './render-actors.js';
import {
  drawHUD,
  drawLoading,
  drawModeOverlay,
  drawTouchControls,
} from './render-ui.js';

export function drawScene(ctx, game, assets) {
  if (!assets.ready) {
    drawLoading(ctx);
    return;
  }

  ctx.clearRect(0, 0, W, ctx.canvas.height);
  drawBase(ctx, game.scroll);
  drawHomes(ctx, game.homes, assets);
  drawHazards(ctx, game.hazards, assets, game.elapsed);
  drawPapers(ctx, game.papers);
  drawPlayer(ctx, game, assets);
  drawPops(ctx, game.pops);
  drawHUD(ctx, game);
  drawTouchControls(ctx, game);
  drawModeOverlay(ctx, game);
}
