import * as THREE from 'three';
import { BLOCK_IDS, getBlock, isBlockLiquid, isBlockTransparent } from './blocks';
import { FaceUVs } from './textures';
import { CHUNK_HEIGHT, CHUNK_SIZE } from './worldGen';

export interface ChunkMeshBuffers {
  opaque: THREE.BufferGeometry | null;
  cutout: THREE.BufferGeometry | null;
  transparent: THREE.BufferGeometry | null;
  emissive: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
}

class MeshBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  colors: number[] = [];
  indices: number[] = [];
  vertCount = 0;

  pushQuad(
    v0: [number, number, number],
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number],
    n: [number, number, number],
    uv: [number, number, number, number],
    c0: [number, number, number],
    c1: [number, number, number],
    c2: [number, number, number],
    c3: [number, number, number],
    flipDiag = false
  ) {
    const [u0, vMin, u1, vMax] = uv;
    const base = this.vertCount;

    this.positions.push(
      v0[0], v0[1], v0[2],
      v1[0], v1[1], v1[2],
      v2[0], v2[1], v2[2],
      v3[0], v3[1], v3[2]
    );

    for (let i = 0; i < 4; i++) {
      this.normals.push(n[0], n[1], n[2]);
    }

    this.uvs.push(
      u0, vMin,
      u1, vMin,
      u1, vMax,
      u0, vMax
    );

    this.colors.push(
      c0[0], c0[1], c0[2],
      c1[0], c1[1], c1[2],
      c2[0], c2[1], c2[2],
      c3[0], c3[1], c3[2]
    );

    if (flipDiag) {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base + 0);
    } else {
      this.indices.push(base + 0, base + 1, base + 2, base + 0, base + 2, base + 3);
    }
    this.vertCount += 4;
  }

  toGeometry(): THREE.BufferGeometry | null {
    if (this.vertCount === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geo.setIndex(this.indices);
    geo.computeBoundingSphere();
    return geo;
  }
}

type BlockGetter = (wx: number, wy: number, wz: number) => number;

function isOccluder(id: number): boolean {
  if (id === 0) return false;
  const def = getBlock(id);
  if (!def) return false;
  return def.solid && !def.transparent;
}

function calcVertexAO(s1: boolean, s2: boolean, corner: boolean): number {
  if (s1 && s2) return 0.48;
  const occ = (s1 ? 1 : 0) + (s2 ? 1 : 0) + (corner ? 1 : 0);
  if (occ === 0) return 1.0;
  if (occ === 1) return 0.84;
  if (occ === 2) return 0.66;
  return 0.50;
}

const FACES: {
  dir: [number, number, number];
  corners: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
  aoAxes: [[number, number, number], [number, number, number]];
  shade: number;
  faceType: 'top' | 'bottom' | 'side';
}[] = [
  // +Y Top
  {
    dir: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    aoAxes: [[1, 0, 0], [0, 0, 1]],
    shade: 1.0,
    faceType: 'top',
  },
  // -Y Bottom
  {
    dir: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    aoAxes: [[1, 0, 0], [0, 0, 1]],
    shade: 0.62,
    faceType: 'bottom',
  },
  // +X East
  {
    dir: [1, 0, 0],
    corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    aoAxes: [[0, 1, 0], [0, 0, 1]],
    shade: 0.84,
    faceType: 'side',
  },
  // -X West
  {
    dir: [-1, 0, 0],
    corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    aoAxes: [[0, 1, 0], [0, 0, 1]],
    shade: 0.80,
    faceType: 'side',
  },
  // +Z South
  {
    dir: [0, 0, 1],
    corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    aoAxes: [[1, 0, 0], [0, 1, 0]],
    shade: 0.90,
    faceType: 'side',
  },
  // -Z North
  {
    dir: [0, 0, -1],
    corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    aoAxes: [[1, 0, 0], [0, 1, 0]],
    shade: 0.86,
    faceType: 'side',
  },
];

export function buildChunkMeshes(
  cx: number,
  cz: number,
  chunkData: Uint8Array,
  getWorldBlock: BlockGetter,
  faceUVs: Map<number, FaceUVs>
): ChunkMeshBuffers {
  const opaque = new MeshBuilder();
  const cutout = new MeshBuilder();
  const transparent = new MeshBuilder();
  const emissive = new MeshBuilder();
  const water = new MeshBuilder();

  const baseX = cx * CHUNK_SIZE;
  const baseZ = cz * CHUNK_SIZE;

  const getLocalOrWorld = (lx: number, y: number, lz: number): number => {
    if (y < 0 || y >= CHUNK_HEIGHT) return 0;
    if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
      return chunkData[lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
    }
    return getWorldBlock(baseX + lx, y, baseZ + lz);
  };

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = chunkData[lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE];
        if (id === 0) continue;

        const blockDef = getBlock(id);
        const uvSet = faceUVs.get(id);
        if (!blockDef || !uvSet) continue;

        // Cross-shaped foliage / flowers
        if (blockDef.crossMesh) {
          const uv = uvSet.side;
          const col: [number, number, number] = [0.95, 0.95, 0.95];
          const x0 = lx + 0.14;
          const x1 = lx + 0.86;
          const z0 = lz + 0.14;
          const z1 = lz + 0.86;
          const y0 = y;
          const y1 = y + 0.88;

          cutout.pushQuad([x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [0, 1, 0], uv, col, col, col, col);
          cutout.pushQuad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1], [0, 1, 0], uv, col, col, col, col);
          cutout.pushQuad([x0, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z1], [0, 1, 0], uv, col, col, col, col);
          cutout.pushQuad([x1, y0, z0], [x0, y0, z1], [x0, y1, z1], [x1, y1, z0], [0, 1, 0], uv, col, col, col, col);
          continue;
        }

        const isLiquid = id === BLOCK_IDS.WATER;
        const isLeaves =
          id === BLOCK_IDS.OAK_LEAVES ||
          id === BLOCK_IDS.BIRCH_LEAVES ||
          id === BLOCK_IDS.SPRUCE_LEAVES ||
          id === 63;

        const targetBuilder = isLiquid
          ? water
          : isLeaves
            ? cutout
            : blockDef.emissiveColor
              ? emissive
              : blockDef.transparent
                ? transparent
                : opaque;

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nx = lx + face.dir[0];
          const ny = y + face.dir[1];
          const nz = lz + face.dir[2];

          const neighbor = getLocalOrWorld(nx, ny, nz);

          if (isLiquid) {
            if (neighbor === BLOCK_IDS.WATER) continue;
            if (neighbor !== 0 && !isBlockTransparent(neighbor)) continue;
          } else if (isLeaves) {
            // Render outer faces of leaf clusters + faces next to non-opaque blocks
            if (neighbor !== 0 && !isBlockTransparent(neighbor)) continue;
          } else if (blockDef.transparent) {
            if (neighbor === id || (neighbor !== 0 && !isBlockTransparent(neighbor))) continue;
          } else {
            if (neighbor !== 0 && !isBlockTransparent(neighbor) && !isBlockLiquid(neighbor)) continue;
          }

          const uv = face.faceType === 'top' ? uvSet.top : face.faceType === 'bottom' ? uvSet.bottom : uvSet.side;

          // Compute vertex positions (water surface lowered slightly when exposed to air above)
          const topDrop = isLiquid && getLocalOrWorld(lx, y + 1, lz) === 0 ? 0.14 : 0;
          const p0: [number, number, number] = [
            lx + face.corners[0][0],
            y + face.corners[0][1] - (face.corners[0][1] === 1 ? topDrop : 0),
            lz + face.corners[0][2],
          ];
          const p1: [number, number, number] = [
            lx + face.corners[1][0],
            y + face.corners[1][1] - (face.corners[1][1] === 1 ? topDrop : 0),
            lz + face.corners[1][2],
          ];
          const p2: [number, number, number] = [
            lx + face.corners[2][0],
            y + face.corners[2][1] - (face.corners[2][1] === 1 ? topDrop : 0),
            lz + face.corners[2][2],
          ];
          const p3: [number, number, number] = [
            lx + face.corners[3][0],
            y + face.corners[3][1] - (face.corners[3][1] === 1 ? topDrop : 0),
            lz + face.corners[3][2],
          ];

          if (isLiquid || blockDef.emissiveColor) {
            const s = blockDef.emissiveColor ? 1.0 : face.shade;
            const c: [number, number, number] = [s, s, s];
            targetBuilder.pushQuad(p0, p1, p2, p3, face.dir, uv, c, c, c, c);
            continue;
          }

          // Baked Voxel Ambient Occlusion per corner
          const aos: number[] = [];
          for (let ci = 0; ci < 4; ci++) {
            const corner = face.corners[ci];
            const ax0 = face.aoAxes[0];
            const ax1 = face.aoAxes[1];

            const sign0 = corner[0] * ax0[0] + corner[1] * ax0[1] + corner[2] * ax0[2] === 1 ? 1 : -1;
            const sign1 = corner[0] * ax1[0] + corner[1] * ax1[1] + corner[2] * ax1[2] === 1 ? 1 : -1;

            const s1 = isOccluder(
              getLocalOrWorld(nx + ax0[0] * sign0, ny + ax0[1] * sign0, nz + ax0[2] * sign0)
            );
            const s2 = isOccluder(
              getLocalOrWorld(nx + ax1[0] * sign1, ny + ax1[1] * sign1, nz + ax1[2] * sign1)
            );
            const cOcc = isOccluder(
              getLocalOrWorld(
                nx + ax0[0] * sign0 + ax1[0] * sign1,
                ny + ax0[1] * sign0 + ax1[1] * sign1,
                nz + ax0[2] * sign0 + ax1[2] * sign1
              )
            );

            aos.push(calcVertexAO(s1, s2, cOcc) * face.shade);
          }

          const flipDiag = aos[0] + aos[2] < aos[1] + aos[3];
          targetBuilder.pushQuad(
            p0,
            p1,
            p2,
            p3,
            face.dir,
            uv,
            [aos[0], aos[0], aos[0]],
            [aos[1], aos[1], aos[1]],
            [aos[2], aos[2], aos[2]],
            [aos[3], aos[3], aos[3]],
            flipDiag
          );
        }
      }
    }
  }

  return {
    opaque: opaque.toGeometry(),
    cutout: cutout.toGeometry(),
    transparent: transparent.toGeometry(),
    emissive: emissive.toGeometry(),
    water: water.toGeometry(),
  };
}
