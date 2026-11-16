import { createNoise2D, createNoise3D, NoiseFunction2D, NoiseFunction3D } from 'simplex-noise';
import { BLOCK_IDS } from './blocks';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const SEA_LEVEL = 20;

export type BiomeType = 'Ocean' | 'Beach' | 'Plains' | 'Forest' | 'Desert' | 'Mountains' | 'Snow';

function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringSeed(seed: string | number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed | 0;
  const str = String(seed || 'blockverse');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

function hashCoords(x: number, y: number, z: number, seed: number): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647) + Math.imul(seed, 1597334677);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export class WorldGenerator {
  public readonly seedNum: number;
  private noiseElev: NoiseFunction2D;
  private noiseDetail: NoiseFunction2D;
  private noiseTemp: NoiseFunction2D;
  private noiseMoisture: NoiseFunction2D;
  private noiseCave: NoiseFunction3D;

  constructor(seed: string | number) {
    this.seedNum = hashStringSeed(seed);
    const rng = mulberry32(this.seedNum);
    this.noiseElev = createNoise2D(rng);
    this.noiseDetail = createNoise2D(rng);
    this.noiseTemp = createNoise2D(rng);
    this.noiseMoisture = createNoise2D(rng);
    this.noiseCave = createNoise3D(rng);
  }

  public getBiomeAt(wx: number, wz: number): { biome: BiomeType; height: number; temp: number; moisture: number } {
    const temp = this.noiseTemp(wx * 0.0045, wz * 0.0045);
    const moisture = this.noiseMoisture(wx * 0.005, wz * 0.005);

    const cont = this.noiseElev(wx * 0.0055, wz * 0.0055);
    const ridge = Math.abs(this.noiseElev(wx * 0.014 + 200, wz * 0.014 + 200));
    const detail =
      this.noiseDetail(wx * 0.025, wz * 0.025) * 3.5 +
      this.noiseDetail(wx * 0.07, wz * 0.07) * 1.4;

    let baseH = SEA_LEVEL + 2 + cont * 11 + detail;
    let biome: BiomeType = 'Plains';

    if (cont < -0.34) {
      biome = 'Ocean';
      baseH = SEA_LEVEL - 8 + (cont + 0.34) * 16 + detail * 0.4;
    } else if (cont < -0.22) {
      biome = 'Beach';
      baseH = SEA_LEVEL + (cont + 0.28) * 10 + detail * 0.3;
    } else if (cont > 0.38 || (ridge < 0.14 && cont > 0.15)) {
      biome = 'Mountains';
      const peak = Math.max(0, cont - 0.25) * 26 + (0.2 - Math.min(0.2, ridge)) * 32;
      baseH = SEA_LEVEL + 8 + peak + detail * 1.2;
    } else if (temp < -0.26) {
      biome = 'Snow';
      baseH = SEA_LEVEL + 4 + cont * 9 + detail * 0.8;
    } else if (temp > 0.28 && moisture < 0.12) {
      biome = 'Desert';
      baseH = SEA_LEVEL + 3 + cont * 6 + Math.sin(wx * 0.08 + wz * 0.04) * 1.6 + detail * 0.5;
    } else if (moisture > 0.05) {
      biome = 'Forest';
      baseH = SEA_LEVEL + 3 + cont * 8 + detail * 0.7;
    }

    const height = Math.max(4, Math.min(CHUNK_HEIGHT - 10, Math.floor(baseH)));
    return { biome, height, temp, moisture };
  }

  public getSpawnHeight(wx: number, wz: number): number {
    const { height } = this.getBiomeAt(wx, wz);
    return Math.max(SEA_LEVEL + 1, height) + 2;
  }

  public generateChunk(cx: number, cz: number, modifiedBlocks?: Map<string, number>): Uint8Array {
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    const set = (lx: number, y: number, lz: number, id: number) => {
      if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) return;
      data[lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = id;
    };
    const get = (lx: number, y: number, lz: number): number => {
      if (lx < 0 || lx >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || lz < 0 || lz >= CHUNK_SIZE) return 0;
      return data[lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    };

    const baseX = cx * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    const surfaceHeights = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);
    const surfaceBiomes: BiomeType[] = new Array(CHUNK_SIZE * CHUNK_SIZE);

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = baseX + lx;
        const wz = baseZ + lz;
        const info = this.getBiomeAt(wx, wz);
        surfaceHeights[lx + lz * CHUNK_SIZE] = info.height;
        surfaceBiomes[lx + lz * CHUNK_SIZE] = info.biome;

        for (let y = 0; y <= info.height; y++) {
          if (y === 0) {
            set(lx, y, lz, BLOCK_IDS.BEDROCK);
            continue;
          }

          // Underground Caves & Crystal Caverns
          if (y < info.height - 3 && y > 2) {
            const caveVal = this.noiseCave(wx * 0.055, y * 0.075, wz * 0.055);
            const caveVal2 = this.noiseCave(wx * 0.03 + 100, y * 0.04 + 100, wz * 0.03 + 100);
            if (caveVal > 0.44 || (caveVal > 0.28 && caveVal2 > 0.35)) {
              if (y <= 5) {
                set(lx, y, lz, BLOCK_IDS.LAVA);
              } else {
                // Crystal cavern rim decoration
                const cr = hashCoords(wx, y, wz, this.seedNum + 88);
                if (y <= 14 && cr > 0.965) {
                  set(lx, y, lz, cr > 0.985 ? 116 /* aetherium */ : BLOCK_IDS.AMETHYST_CLUSTER);
                } else if (y <= 16 && cr < 0.015) {
                  set(lx, y, lz, BLOCK_IDS.GLOWSTONE);
                }
              }
              continue;
            }
          }

          // Surface & Subsurface layers
          if (y === info.height) {
            if (info.height < SEA_LEVEL - 1) {
              set(lx, y, lz, hashCoords(wx, y, wz, this.seedNum) > 0.72 ? BLOCK_IDS.GRAVEL : BLOCK_IDS.SAND);
            } else if (info.biome === 'Desert') {
              set(lx, y, lz, BLOCK_IDS.SAND);
            } else if (info.biome === 'Beach') {
              set(lx, y, lz, BLOCK_IDS.SAND);
            } else if (info.biome === 'Snow' || info.height >= 38) {
              set(lx, y, lz, BLOCK_IDS.SNOW);
            } else if (info.biome === 'Mountains' && info.height >= 31) {
              set(lx, y, lz, BLOCK_IDS.STONE);
            } else {
              set(lx, y, lz, BLOCK_IDS.GRASS);
            }
          } else if (y >= info.height - 3) {
            if (info.biome === 'Desert' || info.biome === 'Beach' || info.height < SEA_LEVEL) {
              set(lx, y, lz, y === info.height - 3 && info.biome === 'Desert' ? BLOCK_IDS.SANDSTONE : BLOCK_IDS.SAND);
            } else if (info.biome === 'Mountains' && info.height >= 31) {
              set(lx, y, lz, BLOCK_IDS.STONE);
            } else {
              set(lx, y, lz, BLOCK_IDS.DIRT);
            }
          } else {
            // Deep stone + mineral veins
            const r = hashCoords(wx, y, wz, this.seedNum + 19);
            if (y <= 4 && r > 0.85) {
              set(lx, y, lz, BLOCK_IDS.OBSIDIAN);
            } else if (y <= 14 && r > 0.986) {
              set(lx, y, lz, BLOCK_IDS.DIAMOND_ORE);
            } else if (info.biome === 'Mountains' && y <= 24 && r > 0.984 && r <= 0.986) {
              set(lx, y, lz, 68 /* emerald_ore */);
            } else if (y <= 18 && r > 0.978 && r <= 0.986) {
              set(lx, y, lz, 69 /* redstone_ore */);
            } else if (y <= 22 && r > 0.968 && r <= 0.978) {
              set(lx, y, lz, BLOCK_IDS.GOLD_ORE);
            } else if (y <= 20 && r > 0.962 && r <= 0.968) {
              set(lx, y, lz, 70 /* lapis_ore */);
            } else if (y <= 34 && r > 0.94 && r <= 0.962) {
              set(lx, y, lz, BLOCK_IDS.IRON_ORE);
            } else if (y <= 38 && r > 0.922 && r <= 0.94) {
              set(lx, y, lz, 71 /* copper_ore */);
            } else if (y <= 44 && r > 0.89 && r <= 0.922) {
              set(lx, y, lz, BLOCK_IDS.COAL_ORE);
            } else if (y >= 16 && y <= 24 && r < 0.04) {
              set(lx, y, lz, 46 /* granite */);
            } else {
              set(lx, y, lz, BLOCK_IDS.STONE);
            }
          }
        }

        // Fill Water / Ice up to SEA_LEVEL
        if (info.height < SEA_LEVEL) {
          for (let y = info.height + 1; y <= SEA_LEVEL; y++) {
            if (y === SEA_LEVEL && info.biome === 'Snow') {
              set(lx, y, lz, BLOCK_IDS.ICE);
            } else {
              set(lx, y, lz, BLOCK_IDS.WATER);
            }
          }
          // Underwater coral accents in deep oceans
          const coralRoll = hashCoords(wx, info.height, wz, this.seedNum + 303);
          if (info.height <= SEA_LEVEL - 4 && coralRoll > 0.965) {
            set(lx, info.height + 1, lz, coralRoll > 0.982 ? 108 /* coral_pink */ : 109 /* coral_cyan */);
          }
        }
      }
    }

    // Flora, Trees, Cacti & Flowers (seeded across chunk boundaries using deterministic margin)
    for (let lz = -2; lz < CHUNK_SIZE + 2; lz++) {
      for (let lx = -2; lx < CHUNK_SIZE + 2; lx++) {
        const wx = baseX + lx;
        const wz = baseZ + lz;
        const info = this.getBiomeAt(wx, wz);
        if (info.height < SEA_LEVEL + 1) continue;

        const r = hashCoords(wx, 0, wz, this.seedNum + 515);

        // Trees
        const treeThreshold =
          info.biome === 'Forest' ? 0.962 : info.biome === 'Snow' ? 0.978 : info.biome === 'Plains' ? 0.993 : 2.0;

        if (r > treeThreshold) {
          const isCherry = info.biome === 'Forest' && hashCoords(wx, 1, wz, this.seedNum + 99) > 0.86;
          const isBirch = info.biome === 'Forest' && !isCherry && hashCoords(wx, 2, wz, this.seedNum + 99) > 0.55;
          const isSpruce = info.biome === 'Snow';

          const logId = isSpruce
            ? BLOCK_IDS.SPRUCE_LOG
            : isCherry
              ? 61
              : isBirch
                ? BLOCK_IDS.BIRCH_LOG
                : BLOCK_IDS.OAK_LOG;
          const leafId = isSpruce
            ? BLOCK_IDS.SPRUCE_LEAVES
            : isCherry
              ? 63
              : isBirch
                ? BLOCK_IDS.BIRCH_LEAVES
                : BLOCK_IDS.OAK_LEAVES;

          const trunkH = isSpruce ? 6 : 4 + Math.floor(hashCoords(wx, 3, wz, this.seedNum) * 2);
          const baseY = info.height + 1;

          for (let ty = 0; ty < trunkH; ty++) {
            set(lx, baseY + ty, lz, logId);
          }

          if (isSpruce) {
            for (let ly = 2; ly <= trunkH + 1; ly++) {
              const rad = ly === trunkH + 1 ? 0 : ly >= trunkH - 1 ? 1 : 2;
              for (let dz = -rad; dz <= rad; dz++) {
                for (let dx = -rad; dx <= rad; dx++) {
                  if (Math.abs(dx) === rad && Math.abs(dz) === rad && rad > 1) continue;
                  if (dx === 0 && dz === 0 && ly < trunkH) continue;
                  if (get(lx + dx, baseY + ly, lz + dz) === 0) {
                    set(lx + dx, baseY + ly, lz + dz, leafId);
                  }
                }
              }
            }
          } else {
            for (let ly = trunkH - 2; ly <= trunkH + 1; ly++) {
              const rad = ly === trunkH + 1 ? 1 : 2;
              for (let dz = -rad; dz <= rad; dz++) {
                for (let dx = -rad; dx <= rad; dx++) {
                  if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && (ly === trunkH || hashCoords(wx + dx, ly, wz + dz, 7) > 0.4)) {
                    continue;
                  }
                  if (dx === 0 && dz === 0 && ly < trunkH) continue;
                  if (get(lx + dx, baseY + ly, lz + dz) === 0) {
                    set(lx + dx, baseY + ly, lz + dz, leafId);
                  }
                }
              }
            }
          }
          continue;
        }

        // Only place ground props inside this chunk
        if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) continue;
        if (get(lx, info.height + 1, lz) !== 0) continue;

        if (info.biome === 'Desert' && r > 0.985) {
          const ch = 2 + Math.floor(hashCoords(wx, 5, wz, this.seedNum) * 2);
          for (let cy = 1; cy <= ch; cy++) {
            set(lx, info.height + cy, lz, BLOCK_IDS.CACTUS);
          }
        } else if (info.biome === 'Plains' || info.biome === 'Forest') {
          if (r > 0.87 && r <= 0.945) {
            set(lx, info.height + 1, lz, BLOCK_IDS.TALL_GRASS);
          } else if (r > 0.945 && r <= 0.956) {
            const fRoll = hashCoords(wx, 9, wz, this.seedNum);
            set(
              lx,
              info.height + 1,
              lz,
              fRoll > 0.66 ? BLOCK_IDS.ROSE_BUSH : fRoll > 0.33 ? BLOCK_IDS.DANDELION : BLOCK_IDS.BLUE_ORCHID
            );
          } else if (r > 0.956 && r <= 0.958) {
            set(lx, info.height + 1, lz, hashCoords(wx, 11, wz, this.seedNum) > 0.5 ? BLOCK_IDS.PUMPKIN : BLOCK_IDS.MELON);
          }
        }
      }
    }

    // Apply player / server block modifications for this chunk
    if (modifiedBlocks && modifiedBlocks.size > 0) {
      for (const [key, blockId] of modifiedBlocks.entries()) {
        const parts = key.split(',');
        if (parts.length !== 3) continue;
        const wx = Number(parts[0]);
        const wy = Number(parts[1]);
        const wz = Number(parts[2]);
        const lx = wx - baseX;
        const lz = wz - baseZ;
        if (lx >= 0 && lx < CHUNK_SIZE && wy >= 0 && wy < CHUNK_HEIGHT && lz >= 0 && lz < CHUNK_SIZE) {
          set(lx, wy, lz, blockId);
        }
      }
    }

    return data;
  }
}
