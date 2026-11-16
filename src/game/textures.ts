import * as THREE from 'three';
import { ALL_BLOCKS, BlockDefinition, TexturePattern } from './blocks';

const TILE_PX = 16;
const ATLAS_COLS = 32; // 32 * 16 = 512px wide
const ATLAS_ROWS = 16; // 16 * 16 = 256px tall (512 tile slots)

export interface FaceUVs {
  top: [number, number, number, number]; // u0, v0, u1, v1
  side: [number, number, number, number];
  bottom: [number, number, number, number];
}

export interface TextureAtlasBundle {
  texture: THREE.CanvasTexture;
  faceUVs: Map<number, FaceUVs>;
  iconDataUrls: Map<number, string>;
}

function hash2d(x: number, y: number, seed: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbStr(r: number, g: number, b: number, a = 1): string {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));
  return a >= 1 ? `rgb(${cr},${cg},${cb})` : `rgba(${cr},${cg},${cb},${a})`;
}

function shade(rgb: [number, number, number], delta: number, a = 1): string {
  return rgbStr(rgb[0] + delta, rgb[1] + delta, rgb[2] + delta, a);
}

function paintTile(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pattern: TexturePattern,
  baseHex: string,
  accentHex: string,
  secondaryHex: string | undefined,
  seed: number
) {
  const base = parseHex(baseHex);
  const accent = parseHex(accentHex);
  const sec = parseHex(secondaryHex || accentHex);

  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x, oy + y, 1, 1);
  };

  // Clear tile first for transparent patterns
  ctx.clearRect(ox, oy, TILE_PX, TILE_PX);

  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const r = hash2d(x, y, seed);
      const r2 = hash2d(x >> 1, y >> 1, seed + 77);
      const noise = (r - 0.5) * 26;

      switch (pattern) {
        case 'grass_top': {
          const blend = r > 0.72 ? accent : r < 0.2 ? sec : base;
          px(x, y, shade(blend, (r - 0.5) * 22));
          break;
        }
        case 'grass_side': {
          const grassDepth = 3 + Math.floor(hash2d(x, 0, seed + 13) * 3);
          if (y < grassDepth) {
            px(x, y, shade(y === grassDepth - 1 ? accent : base, (r - 0.5) * 20));
          } else {
            px(x, y, shade(r > 0.8 ? accent : sec, (r - 0.5) * 26));
          }
          break;
        }
        case 'podzol_top':
        case 'mycelium_top': {
          const useAccent = r > 0.65;
          px(x, y, shade(useAccent ? accent : base, (r2 - 0.5) * 20));
          break;
        }
        case 'podzol_side':
        case 'mycelium_side': {
          const depth = 3 + Math.floor(hash2d(x, 1, seed + 19) * 2);
          if (y < depth) {
            px(x, y, shade(base, (r - 0.5) * 18));
          } else {
            px(x, y, shade(sec, (r - 0.5) * 26));
          }
          break;
        }
        case 'dirt':
        case 'clay':
        case 'terracotta': {
          const pick = r > 0.84 ? accent : r < 0.14 ? sec : base;
          px(x, y, shade(pick, noise * 0.8));
          break;
        }
        case 'stone':
        case 'bedrock':
        case 'obsidian': {
          const streak = hash2d(Math.floor(x / 2), y, seed + 5);
          const c = streak > 0.75 ? accent : streak < 0.22 ? sec : base;
          px(x, y, shade(c, noise * 0.7));
          break;
        }
        case 'speckled':
        case 'gravel': {
          const p = r > 0.7 ? accent : r < 0.28 ? sec : base;
          px(x, y, shade(p, (r2 - 0.5) * 20));
          break;
        }
        case 'sand':
        case 'snow': {
          const p = r > 0.85 ? accent : r < 0.12 ? sec : base;
          px(x, y, shade(p, (r - 0.5) * 12));
          break;
        }
        case 'ice': {
          const diag = (x + y) % 9 === 0 || (x - y + 16) % 11 === 0;
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const col = diag || border ? accent : r > 0.7 ? sec : base;
          px(x, y, shade(col, (r - 0.5) * 10, 0.82));
          break;
        }
        case 'water': {
          const wave = Math.sin((x + y * 0.5) * 0.7) > 0.45;
          const col = wave ? accent : r > 0.8 ? sec : base;
          px(x, y, shade(col, (r - 0.5) * 14, 0.78));
          break;
        }
        case 'sandstone_top': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          px(x, y, shade(border ? accent : base, (r - 0.5) * 14));
          break;
        }
        case 'sandstone_side': {
          const band = y === 3 || y === 4 || y === 11;
          const col = band ? accent : y < 3 ? sec : base;
          px(x, y, shade(col, (r - 0.5) * 14));
          break;
        }
        case 'basalt': {
          const v = (x % 4 === 0) || r > 0.85;
          px(x, y, shade(v ? accent : base, (r - 0.5) * 16));
          break;
        }
        case 'log_top': {
          const dx = Math.abs(x - 7.5);
          const dy = Math.abs(y - 7.5);
          const dist = Math.max(dx, dy);
          if (dist > 6.4) {
            px(x, y, shade(base, noise * 0.6));
          } else {
            const ring = Math.floor(dist) % 2 === 0;
            px(x, y, shade(ring ? sec : accent, (r - 0.5) * 12));
          }
          break;
        }
        case 'log_side': {
          const groove = (x % 3 === 0 && r > 0.35) || r > 0.86;
          px(x, y, shade(groove ? accent : base, (r - 0.5) * 16));
          break;
        }
        case 'bamboo': {
          const node = y === 4 || y === 12;
          const stripe = x % 4 === 0;
          px(x, y, shade(node ? accent : stripe ? sec : base, (r - 0.5) * 12));
          break;
        }
        case 'planks': {
          const plankEdge = y % 4 === 0;
          const joint = (y < 4 && x === 7) || (y >= 4 && y < 8 && x === 13) || (y >= 8 && y < 12 && x === 4) || (y >= 12 && x === 10);
          const col = plankEdge || joint ? accent : r > 0.78 ? sec : base;
          px(x, y, shade(col, (r - 0.5) * 14));
          break;
        }
        case 'leaves': {
          // Cutout alpha foliage with rich dappled clusters
          if (r < 0.22 && (x + y) % 2 === 0) {
            // transparent hole
          } else {
            const c = r > 0.75 ? sec : r < 0.4 ? accent : base;
            px(x, y, shade(c, (r2 - 0.5) * 18));
          }
          break;
        }
        case 'ore': {
          const isVein =
            ((x >= 3 && x <= 5 && y >= 3 && y <= 5) ||
              (x >= 10 && x <= 12 && y >= 5 && y <= 7) ||
              (x >= 5 && x <= 7 && y >= 10 && y <= 13) ||
              (x >= 11 && x <= 13 && y >= 11 && y <= 13)) &&
            r > 0.25;
          if (isVein) {
            px(x, y, shade(r > 0.6 ? accent : sec, (r - 0.5) * 20));
          } else {
            px(x, y, shade(base, (r - 0.5) * 22));
          }
          break;
        }
        case 'mineral_block': {
          const edge = x === 0 || y === 0 || x === 15 || y === 15;
          const bevel = x === 1 || y === 1;
          const col = edge ? sec : bevel ? accent : base;
          px(x, y, shade(col, (r - 0.5) * 10));
          break;
        }
        case 'crystal': {
          const facet = ((x + y) % 5 === 0) || (Math.abs(x - y) < 2 && x > 3 && x < 12);
          const col = facet ? accent : r > 0.6 ? base : sec;
          px(x, y, shade(col, (r - 0.5) * 14));
          break;
        }
        case 'cobble':
        case 'mossy_cobble': {
          const mortar = (y % 5 === 0) || ((x + Math.floor(y / 5) * 3) % 6 === 0);
          if (pattern === 'mossy_cobble' && r > 0.74) {
            px(x, y, shade(accent, (r - 0.5) * 18));
          } else {
            px(x, y, shade(mortar ? sec : r > 0.6 ? accent : base, (r - 0.5) * 20));
          }
          break;
        }
        case 'bricks':
        case 'stone_bricks': {
          const row = Math.floor(y / 4);
          const mortarY = y % 4 === 0;
          const mortarX = (x + (row % 2) * 4) % 8 === 0;
          if (mortarY || mortarX) {
            px(x, y, shade(accent, (r - 0.5) * 10));
          } else {
            px(x, y, shade(r > 0.75 ? sec : base, (r - 0.5) * 16));
          }
          break;
        }
        case 'polished': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          px(x, y, shade(border ? accent : base, (r - 0.5) * 8));
          break;
        }
        case 'pillar': {
          const flute = x % 4 === 0;
          px(x, y, shade(flute ? accent : base, (r - 0.5) * 8));
          break;
        }
        case 'concrete': {
          px(x, y, shade(base, (r - 0.5) * 10));
          break;
        }
        case 'glass': {
          const frame = x === 0 || y === 0 || x === 15 || y === 15;
          const glint = (x === 3 && y === 3) || (x === 4 && y === 4) || (x === 11 && y === 10) || (x === 12 && y === 11);
          if (frame) {
            px(x, y, shade(sec, 0, 0.92));
          } else if (glint) {
            px(x, y, shade(accent, 0, 0.85));
          } else {
            px(x, y, shade(base, 0, 0.24));
          }
          break;
        }
        case 'steel_frame': {
          const frame = x <= 1 || y <= 1 || x >= 14 || y >= 14;
          const cross = Math.abs(x - y) <= 1 || Math.abs(x + y - 15) <= 1;
          const col = frame ? accent : cross ? base : sec;
          px(x, y, shade(col, (r - 0.5) * 10));
          break;
        }
        case 'bookshelf': {
          if (y <= 1 || y >= 14 || y === 7 || y === 8) {
            px(x, y, shade(base, (r - 0.5) * 12));
          } else {
            const bookColor = (x % 5 === 0) ? accent : (x % 3 === 0) ? sec : [185, 145, 78] as [number, number, number];
            const spine = x % 2 === 0 ? 12 : -8;
            px(x, y, shade(bookColor, spine));
          }
          break;
        }
        case 'crafting_top': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const grid = x % 5 === 0 || y % 5 === 0;
          px(x, y, shade(border || grid ? accent : base, (r - 0.5) * 10));
          break;
        }
        case 'crafting_side': {
          const tool = (x >= 4 && x <= 6 && y >= 4 && y <= 11) || (x >= 9 && x <= 11 && y >= 5 && y <= 10);
          px(x, y, shade(tool ? sec : y < 2 ? accent : base, (r - 0.5) * 12));
          break;
        }
        case 'furnace_front': {
          const mouth = x >= 4 && x <= 11 && y >= 8 && y <= 13;
          const slit = x >= 4 && x <= 11 && y >= 3 && y <= 5;
          const col = mouth ? sec : slit ? accent : base;
          px(x, y, shade(col, (r - 0.5) * 14));
          break;
        }
        case 'furnace_side': {
          px(x, y, shade(base, (r - 0.5) * 18));
          break;
        }
        case 'chest': {
          const border = x === 0 || y === 0 || x === 15 || y === 15 || y === 5;
          const latch = x >= 7 && x <= 8 && y >= 4 && y <= 7;
          px(x, y, shade(latch ? sec : border ? accent : base, (r - 0.5) * 10));
          break;
        }
        case 'tnt': {
          const band = y >= 5 && y <= 10;
          const letter = band && ((x >= 3 && x <= 5 && (y === 6 || x === 4)) || (x >= 7 && x <= 9 && (x === 7 || x === 9 || y === 7)) || (x >= 11 && x <= 13 && (y === 6 || x === 12)));
          const col = letter ? sec : band ? accent : base;
          px(x, y, shade(col, (r - 0.5) * 10));
          break;
        }
        case 'hay': {
          const band = y === 5 || y === 11;
          px(x, y, shade(band ? sec : x % 2 === 0 ? base : accent, (r - 0.5) * 12));
          break;
        }
        case 'melon':
        case 'pumpkin': {
          const rib = x % 4 === 0;
          const stem = y <= 1 && x >= 7 && x <= 8;
          px(x, y, shade(stem ? sec : rib ? accent : base, (r - 0.5) * 12));
          break;
        }
        case 'cactus': {
          const rib = x % 4 === 0;
          const spine = r > 0.91 && rib;
          px(x, y, shade(spine ? sec : rib ? accent : base, (r - 0.5) * 10));
          break;
        }
        case 'flower': {
          // Draw stem + blossom for cross mesh
          const stem = x >= 7 && x <= 8 && y >= 7;
          const petal = Math.hypot(x - 7.5, y - 4.5) < 3.6;
          const center = Math.hypot(x - 7.5, y - 4.5) < 1.3;
          if (center) px(x, y, shade(sec, 0));
          else if (petal) px(x, y, shade(base, (r - 0.5) * 14));
          else if (stem || (y >= 11 && Math.abs(x - 7.5) <= 2 && y <= 13)) px(x, y, shade(accent, 0));
          break;
        }
        case 'tall_grass': {
          const blade = (x === 3 || x === 6 || x === 9 || x === 12 || x === 14) && y >= 3 + (x % 5);
          const blade2 = (x === 4 || x === 7 || x === 10) && y >= 5 + (x % 4);
          if (blade || blade2) {
            px(x, y, shade(y < 7 ? sec : base, (r - 0.5) * 14));
          }
          break;
        }
        case 'coral':
        case 'sponge': {
          const pore = r > 0.78;
          px(x, y, shade(pore ? accent : r < 0.2 ? sec : base, (r - 0.5) * 16));
          break;
        }
        case 'glowstone':
        case 'sea_lantern': {
          const border = x <= 1 || y <= 1 || x >= 14 || y >= 14;
          const core = x >= 4 && x <= 11 && y >= 4 && y <= 11;
          const col = border ? sec : core || r > 0.55 ? accent : base;
          px(x, y, shade(col, (r - 0.5) * 14));
          break;
        }
        case 'lamp': {
          const frame = x <= 1 || y <= 1 || x >= 14 || y >= 14 || Math.abs(x - y) < 1;
          px(x, y, shade(frame ? sec : r > 0.4 ? accent : base, 0));
          break;
        }
        case 'magma':
        case 'lava': {
          const crack = Math.sin(x * 0.6 + y * 0.4) + Math.cos(y * 0.7 - x * 0.3) > 0.7;
          const col = crack ? accent : r > 0.5 ? base : sec;
          px(x, y, shade(col, (r - 0.5) * 14));
          break;
        }
        case 'torch': {
          const flame = x >= 6 && x <= 9 && y >= 2 && y <= 6;
          const post = x >= 6 && x <= 9 && y > 6;
          const col = flame ? (y <= 4 ? accent : sec) : post ? [120, 82, 42] as [number, number, number] : base;
          px(x, y, shade(col, (r - 0.5) * 10));
          break;
        }
        case 'runic': {
          const border = x === 1 || y === 1 || x === 14 || y === 14;
          const glyph =
            (x >= 5 && x <= 10 && (y === 4 || y === 11)) ||
            (y >= 4 && y <= 11 && (x === 5 || x === 10)) ||
            (x === 7 && y >= 6 && y <= 9);
          px(x, y, shade(border || glyph ? accent : r > 0.6 ? sec : base, (r - 0.5) * 10));
          break;
        }
        case 'prism': {
          const wave = (x + y) % 6 < 2;
          px(x, y, shade(wave ? accent : (x - y + 16) % 6 < 2 ? sec : base, (r - 0.5) * 12));
          break;
        }
        case 'scales': {
          const row = Math.floor(y / 4);
          const scaleEdge = y % 4 === 3 || (x + row * 2) % 4 === 0;
          px(x, y, shade(scaleEdge ? sec : r > 0.7 ? accent : base, (r - 0.5) * 12));
          break;
        }
        case 'ember': {
          const core = Math.hypot(x - 7.5, y - 7.5) < 4.5;
          px(x, y, shade(core ? accent : r > 0.65 ? sec : base, (r - 0.5) * 16));
          break;
        }
        case 'flux': {
          const circuit = (x === 4 || x === 11 || y === 4 || y === 11) && (x + y) % 2 === 0;
          px(x, y, shade(circuit ? accent : r > 0.8 ? sec : base, 0));
          break;
        }
      }
    }
  }
}

function buildIsometricIcon(
  atlasCanvas: HTMLCanvasElement,
  topSlot: number,
  sideSlot: number,
  block: BlockDefinition
): string {
  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = 40;
  iconCanvas.height = 40;
  const ctx = iconCanvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const getTileRect = (slot: number) => ({
    sx: (slot % ATLAS_COLS) * TILE_PX,
    sy: Math.floor(slot / ATLAS_COLS) * TILE_PX,
  });

  if (block.crossMesh) {
    const s = getTileRect(sideSlot);
    ctx.drawImage(atlasCanvas, s.sx, s.sy, TILE_PX, TILE_PX, 4, 4, 32, 32);
    return iconCanvas.toDataURL();
  }

  // Draw crisp isometric voxel icon using affine transforms
  const topRect = getTileRect(topSlot);
  const sideRect = getTileRect(sideSlot);

  // Top face diamond
  ctx.save();
  ctx.translate(20, 4);
  ctx.transform(1, 0.5, -1, 0.5, 0, 0);
  ctx.drawImage(atlasCanvas, topRect.sx, topRect.sy, TILE_PX, TILE_PX, 0, 0, 15, 15);
  ctx.restore();

  // Left face
  ctx.save();
  ctx.translate(5, 11.5);
  ctx.transform(1, 0.5, 0, 1.12, 0, 0);
  ctx.drawImage(atlasCanvas, sideRect.sx, sideRect.sy, TILE_PX, TILE_PX, 0, 0, 15, 15);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, 0, 15, 15);
  ctx.restore();

  // Right face
  ctx.save();
  ctx.translate(20, 19);
  ctx.transform(1, -0.5, 0, 1.12, 0, 0);
  ctx.drawImage(atlasCanvas, sideRect.sx, sideRect.sy, TILE_PX, TILE_PX, 0, 0, 15, 15);
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fillRect(0, 0, 15, 15);
  ctx.restore();

  return iconCanvas.toDataURL();
}

let cachedAtlas: TextureAtlasBundle | null = null;

export function getTextureAtlas(maxAnisotropy = 4): TextureAtlasBundle {
  if (cachedAtlas) return cachedAtlas;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE_PX;
  canvas.height = ATLAS_ROWS * TILE_PX;
  const ctx = canvas.getContext('2d')!;

  const faceUVs = new Map<number, FaceUVs>();
  const iconDataUrls = new Map<number, string>();

  let slotCursor = 0;

  const allocTile = (
    pattern: TexturePattern,
    baseColor: string,
    accentColor: string,
    secondaryColor: string | undefined,
    seed: number
  ): { slot: number; uv: [number, number, number, number] } => {
    const slot = slotCursor++;
    const col = slot % ATLAS_COLS;
    const row = Math.floor(slot / ATLAS_COLS);
    const ox = col * TILE_PX;
    const oy = row * TILE_PX;

    paintTile(ctx, ox, oy, pattern, baseColor, accentColor, secondaryColor, seed);

    // Slight inset (0.0005) prevents subpixel seam flickering at chunk boundaries
    const padU = 0.0004;
    const padV = 0.0008;
    const u0 = col / ATLAS_COLS + padU;
    const u1 = (col + 1) / ATLAS_COLS - padU;
    // Canvas y=0 is top, Three.js CanvasTexture flipY=true means row 0 is at v=1
    const v1 = 1 - row / ATLAS_ROWS - padV;
    const v0 = 1 - (row + 1) / ATLAS_ROWS + padV;

    return { slot, uv: [u0, v0, u1, v1] };
  };

  for (const block of ALL_BLOCKS) {
    const { topPattern, sidePattern, bottomPattern, baseColor, accentColor, secondaryColor } =
      block.recipe;

    const topRes = allocTile(topPattern, baseColor, accentColor, secondaryColor, block.id * 31 + 1);
    const sameSide =
      sidePattern === topPattern &&
      (sidePattern === 'stone' ||
        sidePattern === 'dirt' ||
        sidePattern === 'sand' ||
        sidePattern === 'leaves' ||
        sidePattern === 'planks' ||
        sidePattern === 'ore' ||
        sidePattern === 'concrete' ||
        sidePattern === 'glass');

    const sideRes = sameSide
      ? topRes
      : allocTile(sidePattern, baseColor, accentColor, secondaryColor, block.id * 31 + 2);

    const sameBottom = bottomPattern === topPattern || bottomPattern === sidePattern;
    const bottomRes =
      bottomPattern === topPattern
        ? topRes
        : sameBottom
          ? sideRes
          : allocTile(bottomPattern, baseColor, accentColor, secondaryColor, block.id * 31 + 3);

    faceUVs.set(block.id, {
      top: topRes.uv,
      side: sideRes.uv,
      bottom: bottomRes.uv,
    });

    iconDataUrls.set(block.id, buildIsometricIcon(canvas, topRes.slot, sideRes.slot, block));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  texture.needsUpdate = true;

  cachedAtlas = { texture, faceUVs, iconDataUrls };
  return cachedAtlas;
}
