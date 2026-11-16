import { BLOCK_IDS } from './blocks';

export type GameMode = 'creative' | 'survival';

export interface SavedWorldData {
  id: string;
  name: string;
  seed: string;
  mode: GameMode;
  createdAt: number;
  updatedAt: number;
  playerPos: [number, number, number];
  playerYaw: number;
  playerPitch: number;
  timeOfDay: number;
  health: number;
  hunger: number;
  hotbar: number[]; // length 9
  inventoryCounts: Record<number, number>;
  modifiedBlocks: Record<string, number>; // "x,y,z" -> blockId
}

export interface GameSettings {
  graphicsQuality: 'low' | 'medium' | 'high';
  soundVolume: number; // 0..1
  mouseSensitivity: number; // 0.3..2.5
  renderDistance: number; // 3..8 chunks
  showFps: boolean;
  fov: number; // 60..105
  invertY: boolean;
  username: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'high',
  soundVolume: 0.65,
  mouseSensitivity: 1.0,
  renderDistance: 5,
  showFps: true,
  fov: 75,
  invertY: false,
  username: `Explorer${Math.floor(100 + Math.random() * 900)}`,
};

export const DEFAULT_HOTBAR: number[] = [
  BLOCK_IDS.GRASS,
  BLOCK_IDS.STONE,
  BLOCK_IDS.OAK_LOG,
  BLOCK_IDS.OAK_PLANKS,
  BLOCK_IDS.COBBLESTONE,
  BLOCK_IDS.BRICKS,
  BLOCK_IDS.GLASS,
  BLOCK_IDS.GLOWSTONE,
  116, // Aetherium Crystal
];

const SETTINGS_KEY = 'blockverse_settings_v1';
const DB_NAME = 'blockverse_worlds_db';
const STORE_NAME = 'worlds';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSavedWorlds(): Promise<SavedWorldData[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as SavedWorldData[]) || [];
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveWorldToDB(world: SavedWorldData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(world);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteWorldFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
