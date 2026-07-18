import { AssetLoader } from "./AssetLoader";
import { WorldState, tileKey } from "./TimelineRunner";
import { CharacterDef, MapDef, SpriteSheetDef } from "./types";

/**
 * Draws a scripted-scene world onto a canvas. Renders at native pixel
 * resolution offscreen, then blits at the largest integer multiple that fits
 * (nearest-neighbor), letterboxed and centered.
 */
export class SceneRenderer {
  private off: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private ctx: CanvasRenderingContext2D;

  constructor(
    private canvas: HTMLCanvasElement,
    private map: MapDef,
    private characters: Record<string, CharacterDef>,
    private assets: AssetLoader,
  ) {
    this.off = document.createElement("canvas");
    this.off.width = map.cols * map.tileSize;
    this.off.height = map.rows * map.tileSize;
    this.offCtx = this.off.getContext("2d")!;
    this.ctx = canvas.getContext("2d")!;
    this.offCtx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Size the backing store to device pixels. Call on mount + resize. */
  fitTo(cssW: number, cssH: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  render(world: WorldState): void {
    this.drawWorld(world);
    this.blit(world);
  }

  private frameFor(sheet: SpriteSheetDef, anim: string, facing: string, elapsedMs: number) {
    const def =
      sheet.animations[`${anim}-${facing}`] ?? sheet.animations[anim] ?? sheet.animations.idle;
    if (!def) return { index: 0, flip: false };
    const step = Math.floor((elapsedMs / 1000) * def.fps);
    const index =
      def.loop === false
        ? def.frames[Math.min(step, def.frames.length - 1)]
        : def.frames[step % def.frames.length];
    // Flip when facing left and the sheet has no dedicated -left variant.
    const flip = facing === "left" && !sheet.animations[`${anim}-left`];
    return { index, flip };
  }

  private drawWorld(world: WorldState): void {
    const { map } = this;
    const ctx = this.offCtx;
    const ts = map.tileSize;
    ctx.clearRect(0, 0, this.off.width, this.off.height);

    const bg = this.assets.get(map.backgroundUrl);
    if (bg) ctx.drawImage(bg, 0, 0);
    else {
      ctx.fillStyle = "#3a6b35";
      ctx.fillRect(0, 0, this.off.width, this.off.height);
    }

    // Tile state overlays
    if (map.tileOverlays) {
      for (let y = 0; y < map.rows; y++) {
        for (let x = 0; x < map.cols; x++) {
          const state = world.tiles.get(tileKey({ x, y }));
          if (!state) continue;
          const url = map.tileOverlays[state];
          const img = url ? this.assets.get(url) : undefined;
          if (img) ctx.drawImage(img, x * ts, y * ts);
        }
      }
    }

    // Actors, painter's order by y so lower actors overlap upper ones
    const actors = [...world.actors.values()]
      .filter((a) => a.visible)
      .sort((a, b) => a.pos.y - b.pos.y);
    for (const a of actors) {
      const def = this.characters[a.id];
      const sheet = def?.sprite;
      if (!sheet) continue;
      const img = this.assets.get(sheet.url);
      if (!img) continue;
      const anim = a.anim ?? "idle";
      const { index, flip } = this.frameFor(sheet, anim, a.facing, world.now - a.animStartedAt);
      const cols = Math.max(1, Math.floor(img.width / sheet.frameW));
      const sx = (index % cols) * sheet.frameW;
      const sy = Math.floor(index / cols) * sheet.frameH;
      // Anchor: bottom-center of the sprite sits at the tile-coord point.
      let px = a.pos.x * ts + ts / 2 - sheet.frameW / 2;
      const py = (a.pos.y + 1) * ts - sheet.frameH;
      const shakeUntil = world.shakes.get(a.id);
      if (shakeUntil && shakeUntil > world.now) {
        px += Math.round(Math.sin(world.now / 30) * 1.5);
      }
      ctx.save();
      if (flip) {
        ctx.translate(px + sheet.frameW, py);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, sheet.frameW, sheet.frameH, 0, 0, sheet.frameW, sheet.frameH);
      } else {
        ctx.drawImage(img, sx, sy, sheet.frameW, sheet.frameH, px, py, sheet.frameW, sheet.frameH);
      }
      ctx.restore();
    }
  }

  private blit(world: WorldState): void {
    const { canvas, ctx, off } = this;
    ctx.fillStyle = "#14100c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(1, Math.floor(Math.min(canvas.width / off.width, canvas.height / off.height)));
    const w = off.width * scale;
    const h = off.height * scale;
    const ox = Math.floor((canvas.width - w) / 2);
    const oy = Math.floor((canvas.height - h) / 2);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, ox, oy, w, h);

    // Emotes & speech bubbles drawn post-scale so text stays legible.
    const ts = this.map.tileSize;
    const markers = [
      ...world.emotes.map((m) => ({ ...m, bubble: false })),
      ...world.bubbles.map((m) => ({ ...m, bubble: true })),
    ];
    for (const m of markers) {
      const a = world.actors.get(m.actorId);
      if (!a) continue;
      const sheet = this.characters[m.actorId]?.sprite;
      const spriteH = sheet?.frameH ?? ts;
      const cx = ox + (a.pos.x * ts + ts / 2) * scale;
      const cy = oy + ((a.pos.y + 1) * ts - spriteH - 4) * scale;
      const fontPx = Math.max(12, 5 * scale);
      ctx.font = `bold ${fontPx}px "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      if (m.bubble) {
        const tw = ctx.measureText(m.text).width;
        const pad = 4 * scale;
        ctx.fillStyle = "#f4ecd8";
        ctx.fillRect(cx - tw / 2 - pad, cy - fontPx - pad, tw + pad * 2, fontPx + pad * 1.5);
        ctx.fillStyle = "#2a1f14";
        ctx.fillText(m.text, cx, cy);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#14100c";
        ctx.lineWidth = Math.max(2, scale);
        ctx.strokeText(m.text, cx, cy);
        ctx.fillText(m.text, cx, cy);
      }
    }
  }
}
