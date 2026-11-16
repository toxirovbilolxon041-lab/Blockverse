import * as THREE from 'three';
import { soundEngine } from './audio';
import { BLOCK_IDS, getBlock, isBlockLiquid, isBlockSolid } from './blocks';
import { CreatureManager } from './creatures';
import { buildChunkMeshes } from './mesher';
import { RemotePlayerState } from './multiplayerClient';
import { createSkyAndLighting, SkyRig } from './skyAndLighting';
import { GameMode, GameSettings } from './storage';
import { getTextureAtlas, TextureAtlasBundle } from './textures';
import { BiomeType, CHUNK_HEIGHT, CHUNK_SIZE, SEA_LEVEL, WorldGenerator } from './worldGen';

interface LoadedChunk {
  cx: number;
  cz: number;
  key: string;
  data: Uint8Array;
  group: THREE.Group;
  meshes: THREE.Mesh[];
}

interface BreakParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface RemoteAvatar {
  id: string;
  username: string;
  color: string;
  group: THREE.Group;
  targetPos: THREE.Vector3;
  targetYaw: number;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armR: THREE.Object3D;
  walkPhase: number;
  sprinting: boolean;
}

export interface EngineHudState {
  fps: number;
  coords: [number, number, number];
  biome: BiomeType;
  timeOfDay: number;
  dayCount: number;
  health: number;
  hunger: number;
  pointerLocked: boolean;
  targetBlockName: string | null;
  breakProgress: number;
  inWater: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: EngineHudState) => void;
  onBlockChanged: (x: number, y: number, z: number, blockId: number, previousId: number) => void;
  onEatFood: (blockId: number, hungerGain: number) => void;
  onPlayerMoveSync?: (
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    heldBlockId: number,
    sprinting: boolean
  ) => void;
  onHotbarKey?: (index: number) => void;
  onHotbarScroll?: (delta: number) => void;
  onToggleInventory?: () => void;
  onToggleChat?: () => void;
  onTogglePlayers?: () => void;
  onPauseRequest?: () => void;
  onWorldLoaded?: () => void;
  onWebGLError?: (msg: string) => void;
  getSelectedBlockId: () => number;
  canPlaceSelectedBlock: () => boolean;
}

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

function detectSoftwareGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function checkWebGLAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function createNameplateSprite(username: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10, 15, 28, 0.78)';
  ctx.beginPath();
  ctx.roundRect(16, 12, 224, 40, 10);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(username.slice(0, 16), 128, 33);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.8, 0.45, 1);
  sprite.position.set(0, 2.35, 0);
  return sprite;
}

function createPlayerAvatarMesh(username: string, color: string): RemoteAvatar {
  const group = new THREE.Group();
  const torsoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#e2b89b', roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
  const visorMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.5 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.74, 0.3), torsoMat);
  torso.position.set(0, 1.07, 0);
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
  head.position.set(0, 1.67, 0);
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.12), visorMat);
  visor.position.set(0, 1.7, 0.21);
  group.add(visor);

  const armGeo = new THREE.BoxGeometry(0.2, 0.66, 0.2);
  const armL = new THREE.Mesh(armGeo, torsoMat);
  armL.position.set(-0.37, 1.1, 0);
  const armR = new THREE.Mesh(armGeo, torsoMat);
  armR.position.set(0.37, 1.1, 0);
  group.add(armL, armR);

  const legGeo = new THREE.BoxGeometry(0.23, 0.7, 0.24);
  const legL = new THREE.Mesh(legGeo, pantsMat);
  legL.position.set(-0.14, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, pantsMat);
  legR.position.set(0.14, 0.35, 0);
  group.add(legL, legR);

  group.add(createNameplateSprite(username, color));

  return {
    id: '',
    username,
    color,
    group,
    targetPos: new THREE.Vector3(),
    targetYaw: 0,
    legL,
    legR,
    armR,
    walkPhase: 0,
    sprinting: false,
  };
}

export class VoxelEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private settings: GameSettings;
  private isSoftwareGl: boolean;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private skyRig!: SkyRig;
  private atlas!: TextureAtlasBundle;

  private matOpaque!: THREE.MeshStandardMaterial;
  private matCutout!: THREE.MeshStandardMaterial;
  private matTransparent!: THREE.MeshStandardMaterial;
  private matEmissive!: THREE.MeshStandardMaterial;
  private matWater!: THREE.MeshPhysicalMaterial;
  private waterTimeUniform = { value: 0 };

  private worldGen!: WorldGenerator;
  private chunks = new Map<string, LoadedChunk>();
  private modifiedBlocks = new Map<string, number>();
  private creatures!: CreatureManager;
  private remoteAvatars = new Map<string, RemoteAvatar>();
  private particles: BreakParticle[] = [];
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);

  private selectionBox!: THREE.LineSegments;
  private targetHit: {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
    blockId: number;
  } | null = null;

  private mode: 'menu' | 'playing' = 'menu';
  private gameMode: GameMode = 'creative';
  private paused = false;

  // Player physics & state
  private playerPos = new THREE.Vector3(8, 32, 8);
  private playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private playerPitch = 0;
  private onGround = false;
  private highestY = 32;
  private health = 20;
  private hunger = 20;
  private timeOfDay = 0.42;
  private dayCount = 1;
  private keys: Record<string, boolean> = {};
  private pointerLocked = false;
  private stepTimer = 0;
  private hungerTimer = 0;
  private breakProgress = 0;
  private breakingKey = '';
  private mouseLeftDown = false;
  private lastSyncSent = 0;
  private initialLoadDone = false;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private currentFps = 60;
  private hudTimer = 0;

  constructor(container: HTMLElement, settings: GameSettings, callbacks: EngineCallbacks) {
    this.container = container;
    this.settings = { ...settings };
    this.callbacks = callbacks;

    if (!checkWebGLAvailable()) {
      this.isSoftwareGl = true;
      callbacks.onWebGLError?.(
        'WebGL is unavailable in this browser or device. Please enable hardware acceleration or use a WebGL-capable browser.'
      );
      return;
    }

    this.isSoftwareGl = detectSoftwareGL();
    this.initRendererAndScene();
    this.initWorld('blockverse-2026', 'creative', {});
    this.bindEvents();
    this.startLoop();
  }

  private initRendererAndScene() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.applyQualityToRenderer();

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.callbacks.onWebGLError?.('WebGL rendering context was lost. Attempting recovery...');
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, width / height, 0.1, 520);

    this.skyRig = createSkyAndLighting(this.scene, this.renderer, this.isSoftwareGl);
    this.atlas = getTextureAtlas(this.renderer.capabilities.getMaxAnisotropy());

    this.matOpaque = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.04,
    });

    this.matCutout = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.matTransparent = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      roughness: 0.15,
      metalness: 0.1,
      depthWrite: false,
    });

    this.matEmissive = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      emissiveMap: this.atlas.texture,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.95,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.matWater = new THREE.MeshPhysicalMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.matWater.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = this.waterTimeUniform;
      shader.vertexShader =
        `uniform float uWaterTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float wave = sin(transformed.x * 1.4 + uWaterTime * 2.1) * 0.045 + cos(transformed.z * 1.6 + uWaterTime * 1.7) * 0.04;
          transformed.y += wave;
          `
        );
    };

    // Crisp target block outline
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006));
    this.selectionBox = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 })
    );
    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    this.creatures = new CreatureManager(this.scene);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private applyQualityToRenderer() {
    if (!this.renderer) return;
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (this.settings.graphicsQuality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (this.settings.graphicsQuality === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }

  public updateSettings(next: GameSettings) {
    const rdChanged = next.renderDistance !== this.settings.renderDistance;
    this.settings = { ...next };
    soundEngine.setVolume(next.soundVolume);
    if (this.camera) {
      this.camera.fov = next.fov;
      this.camera.updateProjectionMatrix();
    }
    this.applyQualityToRenderer();
    if (rdChanged) {
      this.pruneDistantChunks();
    }
  }

  public setModeMenu() {
    this.mode = 'menu';
    this.paused = false;
    this.exitPointerLock();
    this.clearRemotePlayers();
  }

  public initWorld(
    seed: string,
    gameMode: GameMode,
    modifiedBlocks: Record<string, number>,
    options?: {
      playerPos?: [number, number, number];
      yaw?: number;
      pitch?: number;
      timeOfDay?: number;
      health?: number;
      hunger?: number;
      startPlaying?: boolean;
    }
  ) {
    // Clear old chunks
    for (const c of this.chunks.values()) {
      this.disposeChunk(c);
    }
    this.chunks.clear();
    this.clearRemotePlayers();

    this.modifiedBlocks = new Map<string, number>();
    for (const [k, v] of Object.entries(modifiedBlocks || {})) {
      this.modifiedBlocks.set(k, v);
    }

    this.worldGen = new WorldGenerator(seed);
    this.gameMode = gameMode;
    this.timeOfDay = options?.timeOfDay ?? 0.42;
    this.health = options?.health ?? 20;
    this.hunger = options?.hunger ?? 20;

    if (options?.playerPos) {
      this.playerPos.set(options.playerPos[0], options.playerPos[1], options.playerPos[2]);
    } else {
      const spawnY = this.worldGen.getSpawnHeight(8, 8);
      this.playerPos.set(8.5, spawnY, 8.5);
    }
    this.highestY = this.playerPos.y;
    this.playerVel.set(0, 0, 0);
    this.playerYaw = options?.yaw ?? 0;
    this.playerPitch = options?.pitch ?? -0.1;

    this.mode = options?.startPlaying ? 'playing' : 'menu';
    this.paused = false;
    this.initialLoadDone = false;

    // Generate immediate spawn radius synchronously so player never falls into unloaded void
    const pcx = Math.floor(this.playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(this.playerPos.z / CHUNK_SIZE);
    const immediateRadius = Math.min(2, this.settings.renderDistance);
    for (let dz = -immediateRadius; dz <= immediateRadius; dz++) {
      for (let dx = -immediateRadius; dx <= immediateRadius; dx++) {
        this.ensureChunkData(pcx + dx, pcz + dz);
      }
    }
    for (let dz = -immediateRadius; dz <= immediateRadius; dz++) {
      for (let dx = -immediateRadius; dx <= immediateRadius; dx++) {
        this.rebuildChunkMesh(pcx + dx, pcz + dz);
      }
    }

    this.creatures.spawnInitial(
      this.playerPos,
      (x, z) => this.getGroundY(x, z),
      (x, y, z) => this.getBlockAt(x, y, z) === BLOCK_IDS.WATER
    );

    this.initialLoadDone = true;
    this.callbacks.onWorldLoaded?.();
  }

  public setPaused(p: boolean) {
    this.paused = p;
    if (p) {
      this.keys = {};
      this.mouseLeftDown = false;
      this.exitPointerLock();
    }
  }

  public requestPointerLock() {
    if (!this.renderer || this.mode !== 'playing' || this.paused) return;
    try {
      this.renderer.domElement.requestPointerLock();
    } catch {
      // ignore pointer lock rejection
    }
  }

  public exitPointerLock() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // ignore
      }
    }
  }

  public getSnapshotState() {
    const mods: Record<string, number> = {};
    for (const [k, v] of this.modifiedBlocks.entries()) {
      mods[k] = v;
    }
    return {
      playerPos: [this.playerPos.x, this.playerPos.y, this.playerPos.z] as [number, number, number],
      playerYaw: this.playerYaw,
      playerPitch: this.playerPitch,
      timeOfDay: this.timeOfDay,
      health: this.health,
      hunger: this.hunger,
      modifiedBlocks: mods,
    };
  }

  public setTimeOfDay(t: number) {
    this.timeOfDay = ((t % 1) + 1) % 1;
  }

  public restoreHunger(amount: number) {
    this.hunger = Math.min(20, this.hunger + amount);
  }

  // Multiplayer Remote Sync Methods
  public syncRemotePlayerList(players: RemotePlayerState[], selfId: string) {
    const activeIds = new Set<string>();
    for (const p of players) {
      if (p.id === selfId) continue;
      activeIds.add(p.id);
      let avatar = this.remoteAvatars.get(p.id);
      if (!avatar) {
        avatar = createPlayerAvatarMesh(p.username, p.color);
        avatar.id = p.id;
        avatar.group.position.set(p.x, p.y, p.z);
        avatar.targetPos.set(p.x, p.y, p.z);
        avatar.targetYaw = p.yaw;
        this.scene.add(avatar.group);
        this.remoteAvatars.set(p.id, avatar);
      } else {
        avatar.targetPos.set(p.x, p.y, p.z);
        avatar.targetYaw = p.yaw;
        avatar.sprinting = p.sprinting;
      }
    }

    for (const [id, av] of this.remoteAvatars.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(av.group);
        this.remoteAvatars.delete(id);
      }
    }
  }

  public updateRemotePlayerMove(
    playerId: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
    _pitch: number,
    _heldBlockId: number,
    sprinting: boolean
  ) {
    const av = this.remoteAvatars.get(playerId);
    if (!av) return;
    av.targetPos.set(x, y, z);
    av.targetYaw = yaw;
    av.sprinting = sprinting;
  }

  public applyRemoteBlockUpdate(x: number, y: number, z: number, blockId: number) {
    this.setBlockAt(x, y, z, blockId, true);
  }

  public clearRemotePlayers() {
    for (const av of this.remoteAvatars.values()) {
      this.scene?.remove(av.group);
    }
    this.remoteAvatars.clear();
  }

  private chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  private ensureChunkData(cx: number, cz: number): LoadedChunk {
    const key = this.chunkKey(cx, cz);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const data = this.worldGen.generateChunk(cx, cz, this.modifiedBlocks);
    const group = new THREE.Group();
    group.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
    this.scene.add(group);

    const chunk: LoadedChunk = { cx, cz, key, data, group, meshes: [] };
    this.chunks.set(key, chunk);
    return chunk;
  }

  private rebuildChunkMesh(cx: number, cz: number) {
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk) return;

    for (const m of chunk.meshes) {
      chunk.group.remove(m);
      m.geometry.dispose();
    }
    chunk.meshes = [];

    const buffers = buildChunkMeshes(
      cx,
      cz,
      chunk.data,
      (wx, wy, wz) => this.getBlockAt(wx, wy, wz),
      this.atlas.faceUVs
    );

    const addBucket = (
      geo: THREE.BufferGeometry | null,
      mat: THREE.Material,
      castShadow: boolean,
      receiveShadow: boolean,
      renderOrder = 0
    ) => {
      if (!geo) return;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.renderOrder = renderOrder;
      chunk.group.add(mesh);
      chunk.meshes.push(mesh);
    };

    addBucket(buffers.opaque, this.matOpaque, true, true, 0);
    addBucket(buffers.cutout, this.matCutout, true, true, 0);
    addBucket(buffers.emissive, this.matEmissive, false, false, 0);
    addBucket(buffers.transparent, this.matTransparent, false, true, 1);
    addBucket(buffers.water, this.matWater, false, true, 2);
  }

  private disposeChunk(chunk: LoadedChunk) {
    for (const m of chunk.meshes) {
      chunk.group.remove(m);
      m.geometry.dispose();
    }
    chunk.meshes = [];
    this.scene.remove(chunk.group);
  }

  private pruneDistantChunks() {
    const pcx = Math.floor(this.playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(this.playerPos.z / CHUNK_SIZE);
    const maxR = this.settings.renderDistance + 2;

    for (const [key, c] of this.chunks.entries()) {
      if (Math.abs(c.cx - pcx) > maxR || Math.abs(c.cz - pcz) > maxR) {
        this.disposeChunk(c);
        this.chunks.delete(key);
      }
    }
  }

  private streamChunksBudget() {
    const pcx = Math.floor(this.playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(this.playerPos.z / CHUNK_SIZE);
    const r = this.mode === 'menu' ? Math.min(4, this.settings.renderDistance) : this.settings.renderDistance;

    let built = 0;
    const budget = this.isSoftwareGl ? 2 : 3;

    for (let ring = 0; ring <= r; ring++) {
      for (let dz = -ring; dz <= ring; dz++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = this.chunkKey(cx, cz);
          const existing = this.chunks.get(key);
          if (!existing || existing.meshes.length === 0) {
            this.ensureChunkData(cx, cz);
            this.rebuildChunkMesh(cx, cz);
            built++;
            if (built >= budget) return;
          }
        }
      }
    }
  }

  public getBlockAt(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return 0;
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk) {
      const mod = this.modifiedBlocks.get(`${wx},${wy},${wz}`);
      return mod !== undefined ? mod : 0;
    }
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.data[lx + lz * CHUNK_SIZE + wy * CHUNK_SIZE * CHUNK_SIZE];
  }

  public setBlockAt(wx: number, wy: number, wz: number, blockId: number, fromRemote = false) {
    if (wy <= 0 || wy >= CHUNK_HEIGHT) return;
    const prev = this.getBlockAt(wx, wy, wz);
    if (prev === blockId) return;

    this.modifiedBlocks.set(`${wx},${wy},${wz}`, blockId);

    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (chunk) {
      const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      chunk.data[lx + lz * CHUNK_SIZE + wy * CHUNK_SIZE * CHUNK_SIZE] = blockId;
      this.rebuildChunkMesh(cx, cz);

      // Rebuild adjacent chunks if block sits on chunk border
      if (lx === 0) this.rebuildChunkMesh(cx - 1, cz);
      if (lx === CHUNK_SIZE - 1) this.rebuildChunkMesh(cx + 1, cz);
      if (lz === 0) this.rebuildChunkMesh(cx, cz - 1);
      if (lz === CHUNK_SIZE - 1) this.rebuildChunkMesh(cx, cz + 1);
    }

    if (prev !== 0 && blockId === 0) {
      this.spawnBreakParticles(wx, wy, wz, prev);
    }

    if (!fromRemote) {
      this.callbacks.onBlockChanged(wx, wy, wz, blockId, prev);
    }
  }

  private getGroundY(wx: number, wz: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 1; y--) {
      const id = this.getBlockAt(wx, y, wz);
      if (id !== 0 && isBlockSolid(id)) {
        return y + 1;
      }
    }
    return SEA_LEVEL + 1;
  }

  private spawnBreakParticles(wx: number, wy: number, wz: number, blockId: number) {
    const def = getBlock(blockId);
    const col = def?.recipe.baseColor || '#94a3b8';
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 });

    const count = this.isSoftwareGl ? 6 : 12;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.set(
        wx + 0.2 + Math.random() * 0.6,
        wy + 0.2 + Math.random() * 0.6,
        wz + 0.2 + Math.random() * 0.6
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4.5, 2 + Math.random() * 3.5, (Math.random() - 0.5) * 4.5),
        life: 0.45 + Math.random() * 0.35,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += 5 * dt;
      p.mesh.rotation.y += 4 * dt;
      p.mesh.scale.setScalar(Math.max(0.1, p.life * 1.8));
    }
  }

  private raycastVoxel(maxDist = 6.2) {
    _rayOrigin.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
    this.camera.getWorldDirection(_rayDir);

    let x = Math.floor(_rayOrigin.x);
    let y = Math.floor(_rayOrigin.y);
    let z = Math.floor(_rayOrigin.z);

    const stepX = _rayDir.x >= 0 ? 1 : -1;
    const stepY = _rayDir.y >= 0 ? 1 : -1;
    const stepZ = _rayDir.z >= 0 ? 1 : -1;

    const tDeltaX = _rayDir.x === 0 ? 1e9 : Math.abs(1 / _rayDir.x);
    const tDeltaY = _rayDir.y === 0 ? 1e9 : Math.abs(1 / _rayDir.y);
    const tDeltaZ = _rayDir.z === 0 ? 1e9 : Math.abs(1 / _rayDir.z);

    let tMaxX =
      _rayDir.x === 0 ? 1e9 : ((_rayDir.x > 0 ? x + 1 - _rayOrigin.x : _rayOrigin.x - x) * tDeltaX);
    let tMaxY =
      _rayDir.y === 0 ? 1e9 : ((_rayDir.y > 0 ? y + 1 - _rayOrigin.y : _rayOrigin.y - y) * tDeltaY);
    let tMaxZ =
      _rayDir.z === 0 ? 1e9 : ((_rayDir.z > 0 ? z + 1 - _rayOrigin.z : _rayOrigin.z - z) * tDeltaZ);

    let nx = 0;
    let ny = 0;
    let nz = 0;
    let dist = 0;

    while (dist < maxDist) {
      const id = this.getBlockAt(x, y, z);
      if (id !== 0 && !isBlockLiquid(id)) {
        return { x, y, z, nx, ny, nz, blockId: id };
      }

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        dist = tMaxX;
        tMaxX += tDeltaX;
        x += stepX;
        nx = -stepX;
        ny = 0;
        nz = 0;
      } else if (tMaxY < tMaxZ) {
        dist = tMaxY;
        tMaxY += tDeltaY;
        y += stepY;
        nx = 0;
        ny = -stepY;
        nz = 0;
      } else {
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        z += stepZ;
        nx = 0;
        ny = 0;
        nz = -stepZ;
      }
    }

    return null;
  }

  private collidesAt(px: number, py: number, pz: number): boolean {
    const r = 0.28;
    const h = 1.78;
    const minX = Math.floor(px - r);
    const maxX = Math.floor(px + r);
    const minY = Math.floor(py + 0.02);
    const maxY = Math.floor(py + h);
    const minZ = Math.floor(pz - r);
    const maxZ = Math.floor(pz + r);

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (isBlockSolid(this.getBlockAt(x, y, z))) return true;
        }
      }
    }
    return false;
  }

  private damagePlayer(amount: number) {
    if (this.gameMode !== 'survival') return;
    this.health = Math.max(0, this.health - amount);
    soundEngine.playDamage();
    if (this.health <= 0) {
      this.health = 20;
      this.hunger = 20;
      const sy = this.worldGen.getSpawnHeight(8, 8);
      this.playerPos.set(8.5, sy, 8.5);
      this.playerVel.set(0, 0, 0);
      this.highestY = sy;
    }
  }

  private handlePrimaryAction(isInitialClick: boolean) {
    if (!this.targetHit) {
      this.breakProgress = 0;
      return;
    }
    const { x, y, z, blockId } = this.targetHit;
    if (blockId === BLOCK_IDS.BEDROCK) return;

    if (this.gameMode === 'creative') {
      if (isInitialClick) {
        soundEngine.playBreak(1.0);
        this.setBlockAt(x, y, z, 0);
      }
      return;
    }

    // Survival breaking progress
    const key = `${x},${y},${z}`;
    if (this.breakingKey !== key) {
      this.breakingKey = key;
      this.breakProgress = 0;
    }
  }

  private handlePlaceAction() {
    const selectedId = this.callbacks.getSelectedBlockId();
    const def = getBlock(selectedId);

    // Eat food in survival if hungry
    if (this.gameMode === 'survival' && def?.edibleHunger && this.hunger < 20) {
      if (this.callbacks.canPlaceSelectedBlock()) {
        this.restoreHunger(def.edibleHunger);
        this.callbacks.onEatFood(selectedId, def.edibleHunger);
        soundEngine.playCraft();
        return;
      }
    }

    if (!this.targetHit) return;
    if (!this.callbacks.canPlaceSelectedBlock()) return;

    const px = this.targetHit.x + this.targetHit.nx;
    const py = this.targetHit.y + this.targetHit.ny;
    const pz = this.targetHit.z + this.targetHit.nz;
    if (py <= 0 || py >= CHUNK_HEIGHT) return;

    // Prevent placing block inside player's body
    const playerMinX = this.playerPos.x - 0.28;
    const playerMaxX = this.playerPos.x + 0.28;
    const playerMinY = this.playerPos.y;
    const playerMaxY = this.playerPos.y + 1.8;
    const playerMinZ = this.playerPos.z - 0.28;
    const playerMaxZ = this.playerPos.z + 0.28;

    const overlapsPlayer =
      px + 1 > playerMinX &&
      px < playerMaxX &&
      py + 1 > playerMinY &&
      py < playerMaxY &&
      pz + 1 > playerMinZ &&
      pz < playerMaxZ;

    if (overlapsPlayer && def?.solid) return;

    soundEngine.playPlace();
    this.setBlockAt(px, py, pz, selectedId);
  }

  private updatePlayer(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    const isInWater =
      this.getBlockAt(
        Math.floor(this.playerPos.x),
        Math.floor(this.playerPos.y + 0.5),
        Math.floor(this.playerPos.z)
      ) === BLOCK_IDS.WATER;

    const sprinting = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    const baseSpeed = isInWater ? 4.2 : sprinting ? 8.2 : 5.2;

    // Dynamic FOV widening while sprinting
    const targetFov = this.settings.fov + (sprinting && (this.keys['KeyW'] || this.keys['ArrowUp']) ? 7 : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, clampedDt);
      this.camera.updateProjectionMatrix();
    }

    _forward.set(-Math.sin(this.playerYaw), 0, -Math.cos(this.playerYaw));
    _right.set(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));
    _moveDir.set(0, 0, 0);

    if (this.keys['KeyW'] || this.keys['ArrowUp']) _moveDir.add(_forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) _moveDir.sub(_forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) _moveDir.add(_right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) _moveDir.sub(_right);
    if (_moveDir.lengthSq() > 0) _moveDir.normalize();

    this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, _moveDir.x * baseSpeed, 14, clampedDt);
    this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, _moveDir.z * baseSpeed, 14, clampedDt);

    if (isInWater) {
      this.playerVel.y -= 6.5 * clampedDt;
      if (this.keys['Space']) {
        this.playerVel.y = 4.5;
      } else {
        this.playerVel.y = Math.max(this.playerVel.y, -2.5);
      }
      this.highestY = this.playerPos.y;
    } else {
      this.playerVel.y -= 24.0 * clampedDt;
      if (this.keys['Space'] && this.onGround) {
        this.playerVel.y = 8.4;
        this.onGround = false;
        soundEngine.playJump();
      }
    }

    // Resolve X
    const nx = this.playerPos.x + this.playerVel.x * clampedDt;
    if (!this.collidesAt(nx, this.playerPos.y, this.playerPos.z)) {
      this.playerPos.x = nx;
    } else {
      this.playerVel.x = 0;
    }

    // Resolve Z
    const nz = this.playerPos.z + this.playerVel.z * clampedDt;
    if (!this.collidesAt(this.playerPos.x, this.playerPos.y, nz)) {
      this.playerPos.z = nz;
    } else {
      this.playerVel.z = 0;
    }

    // Resolve Y
    const ny = this.playerPos.y + this.playerVel.y * clampedDt;
    if (!this.collidesAt(this.playerPos.x, ny, this.playerPos.z)) {
      this.playerPos.y = ny;
      this.onGround = false;
      if (this.playerPos.y > this.highestY) {
        this.highestY = this.playerPos.y;
      }
    } else {
      if (this.playerVel.y < 0) {
        const fallDist = this.highestY - this.playerPos.y;
        if (fallDist > 4.5 && !isInWater) {
          this.damagePlayer(Math.floor((fallDist - 3.5) * 2));
        }
        this.onGround = true;
        this.highestY = this.playerPos.y;
      }
      this.playerVel.y = 0;
    }

    // Prevent falling below bedrock
    if (this.playerPos.y < 1) {
      this.playerPos.y = this.worldGen.getSpawnHeight(Math.floor(this.playerPos.x), Math.floor(this.playerPos.z));
      this.playerVel.set(0, 0, 0);
    }

    // Footsteps
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if ((this.onGround || isInWater) && horizSpeed > 1.2) {
      this.stepTimer -= clampedDt * (sprinting ? 1.45 : 1);
      if (this.stepTimer <= 0) {
        soundEngine.playStep(isInWater);
        this.stepTimer = 0.36;
      }
    }

    // Survival hunger & regen
    if (this.gameMode === 'survival') {
      this.hungerTimer += clampedDt * (sprinting ? 2.4 : 1);
      if (this.hungerTimer > 14) {
        this.hungerTimer = 0;
        if (this.hunger > 0) this.hunger = Math.max(0, this.hunger - 1);
        if (this.hunger >= 16 && this.health < 20) {
          this.health = Math.min(20, this.health + 1);
        } else if (this.hunger === 0 && this.health > 2) {
          this.damagePlayer(1);
        }
      }
    }

    // Survival continuous breaking
    if (this.mouseLeftDown && this.pointerLocked && this.gameMode === 'survival') {
      if (this.targetHit && this.targetHit.blockId !== BLOCK_IDS.BEDROCK) {
        const def = getBlock(this.targetHit.blockId);
        const hardness = Math.max(0.15, def?.hardness ?? 1.0);
        this.breakProgress += clampedDt / (hardness * 0.55);
        if (this.breakProgress >= 1) {
          soundEngine.playBreak(hardness);
          this.setBlockAt(this.targetHit.x, this.targetHit.y, this.targetHit.z, 0);
          this.breakProgress = 0;
          this.breakingKey = '';
        }
      } else {
        this.breakProgress = 0;
      }
    } else if (!this.mouseLeftDown) {
      this.breakProgress = 0;
    }

    // Camera transform
    this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.playerYaw;
    this.camera.rotation.x = this.playerPitch;

    // Target voxel highlight
    this.targetHit = this.raycastVoxel();
    if (this.targetHit) {
      this.selectionBox.visible = true;
      this.selectionBox.position.set(this.targetHit.x + 0.5, this.targetHit.y + 0.5, this.targetHit.z + 0.5);
    } else {
      this.selectionBox.visible = false;
    }

    // Multiplayer sync at ~20Hz
    if (this.callbacks.onPlayerMoveSync && this.elapsed - this.lastSyncSent > 0.05) {
      this.lastSyncSent = this.elapsed;
      this.callbacks.onPlayerMoveSync(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        this.playerYaw,
        this.playerPitch,
        this.callbacks.getSelectedBlockId(),
        sprinting
      );
    }
  }

  private updateRemoteAvatars(dt: number) {
    for (const av of this.remoteAvatars.values()) {
      const prevX = av.group.position.x;
      const prevZ = av.group.position.z;
      av.group.position.x = THREE.MathUtils.damp(av.group.position.x, av.targetPos.x, 12, dt);
      av.group.position.y = THREE.MathUtils.damp(av.group.position.y, av.targetPos.y, 12, dt);
      av.group.position.z = THREE.MathUtils.damp(av.group.position.z, av.targetPos.z, 12, dt);
      av.group.rotation.y = av.targetYaw + Math.PI;

      const moved = Math.hypot(av.group.position.x - prevX, av.group.position.z - prevZ);
      if (moved > 0.005) {
        av.walkPhase += dt * (av.sprinting ? 14 : 9);
        const swing = Math.sin(av.walkPhase) * 0.55;
        av.legL.rotation.x = swing;
        av.legR.rotation.x = -swing;
        av.armR.rotation.x = -swing * 0.8;
      } else {
        av.legL.rotation.x = THREE.MathUtils.damp(av.legL.rotation.x, 0, 10, dt);
        av.legR.rotation.x = THREE.MathUtils.damp(av.legR.rotation.x, 0, 10, dt);
        av.armR.rotation.x = THREE.MathUtils.damp(av.armR.rotation.x, 0, 10, dt);
      }
    }
  }

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl && gl.fenceSync) {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (this.disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            this.frameId = window.setTimeout(cb, 80);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (this.disposed) return;

      const dt = Math.min(0.1, this.clock.getDelta());
      this.elapsed += dt;
      this.waterTimeUniform.value = this.elapsed;

      this.fpsAccum += dt;
      this.fpsFrames++;
      if (this.fpsAccum >= 0.5) {
        this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
        this.fpsAccum = 0;
        this.fpsFrames = 0;
      }

      // Advance day/night cycle (full day = ~12 minutes)
      if (!this.paused) {
        const prevTime = this.timeOfDay;
        this.timeOfDay = (this.timeOfDay + dt / 720) % 1;
        if (this.timeOfDay < prevTime) {
          this.dayCount++;
        }
      }

      if (this.mode === 'menu') {
        // Cinematic animated menu background camera gliding over terrain
        const orbitAngle = this.elapsed * 0.08;
        const camX = 8 + Math.cos(orbitAngle) * 26;
        const camZ = 8 + Math.sin(orbitAngle) * 26;
        const ground = this.worldGen.getBiomeAt(Math.floor(camX), Math.floor(camZ)).height;
        const camY = Math.max(SEA_LEVEL + 10, ground + 12) + Math.sin(this.elapsed * 0.35) * 2;
        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(8, SEA_LEVEL + 4, 8);
        this.selectionBox.visible = false;
      } else if (!this.paused) {
        this.updatePlayer(dt);
      }

      this.streamChunksBudget();
      this.updateParticles(dt);
      this.updateRemoteAvatars(dt);

      const isNight = this.timeOfDay < 0.22 || this.timeOfDay > 0.78;
      this.creatures.update(
        dt,
        this.elapsed,
        this.mode === 'menu' ? this.camera.position : this.playerPos,
        isNight,
        this.mode === 'playing' && this.gameMode === 'survival' && !this.paused,
        (x, z) => this.getGroundY(x, z),
        (x, y, z) => this.getBlockAt(x, y, z) === BLOCK_IDS.WATER,
        (dmg) => this.damagePlayer(dmg)
      );

      this.skyRig.update(
        this.timeOfDay,
        this.mode === 'menu' ? this.camera.position : this.playerPos,
        this.settings.renderDistance,
        this.elapsed
      );

      this.renderer.render(this.scene, this.camera);

      this.hudTimer += dt;
      if (this.hudTimer >= 0.1 && this.mode === 'playing' && this.initialLoadDone) {
        this.hudTimer = 0;
        const bx = Math.floor(this.playerPos.x);
        const by = Math.floor(this.playerPos.y);
        const bz = Math.floor(this.playerPos.z);
        const biomeInfo = this.worldGen.getBiomeAt(bx, bz);
        const inWater = this.getBlockAt(bx, Math.floor(this.playerPos.y + 1.4), bz) === BLOCK_IDS.WATER;
        const targetDef = this.targetHit ? getBlock(this.targetHit.blockId) : undefined;

        this.callbacks.onHudUpdate({
          fps: this.currentFps,
          coords: [bx, by, bz],
          biome: biomeInfo.biome,
          timeOfDay: this.timeOfDay,
          dayCount: this.dayCount,
          health: this.health,
          hunger: this.hunger,
          pointerLocked: this.pointerLocked,
          targetBlockName: targetDef?.name || null,
          breakProgress: this.breakProgress,
          inWater,
        });
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onPointerLockChange = () => {
    const locked = document.pointerLockElement === this.renderer?.domElement;
    this.pointerLocked = locked;
    if (!locked && this.mode === 'playing' && !this.paused) {
      this.callbacks.onPauseRequest?.();
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.pointerLocked || this.mode !== 'playing' || this.paused) return;
    const sens = 0.0022 * this.settings.mouseSensitivity;
    this.playerYaw -= e.movementX * sens;
    const ySign = this.settings.invertY ? 1 : -1;
    this.playerPitch = THREE.MathUtils.clamp(
      this.playerPitch + e.movementY * sens * ySign,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05
    );
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    if (!this.pointerLocked) {
      this.requestPointerLock();
      return;
    }
    if (e.button === 0) {
      this.mouseLeftDown = true;
      this.handlePrimaryAction(true);
    } else if (e.button === 2) {
      this.handlePlaceAction();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseLeftDown = false;
      this.breakProgress = 0;
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    if (this.mode === 'playing') {
      e.preventDefault();
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    this.callbacks.onHotbarScroll?.(e.deltaY > 0 ? 1 : -1);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'playing') return;
    this.keys[e.code] = true;

    if (e.code === 'KeyE' && this.pointerLocked) {
      e.preventDefault();
      this.callbacks.onToggleInventory?.();
      return;
    }
    if ((e.code === 'KeyT' || e.code === 'Enter') && this.pointerLocked) {
      e.preventDefault();
      this.callbacks.onToggleChat?.();
      return;
    }
    if (e.code === 'KeyP' && this.pointerLocked) {
      e.preventDefault();
      this.callbacks.onTogglePlayers?.();
      return;
    }
    if (e.code.startsWith('Digit') && !this.paused) {
      const n = Number(e.code.replace('Digit', ''));
      if (n >= 1 && n <= 9) {
        this.callbacks.onHotbarKey?.(n - 1);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    for (const c of this.chunks.values()) {
      this.disposeChunk(c);
    }
    this.chunks.clear();
    this.skyRig?.dispose();
    this.matOpaque?.dispose();
    this.matCutout?.dispose();
    this.matTransparent?.dispose();
    this.matEmissive?.dispose();
    this.matWater?.dispose();
    this.particleGeo?.dispose();
    this.renderer?.dispose();
  }
}
