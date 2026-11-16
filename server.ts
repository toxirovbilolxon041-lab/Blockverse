import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3000;
const MAX_PLAYERS_PER_WORLD = 8;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const WORLDS_FILE = path.join(DATA_DIR, 'multiplayer-worlds.json');

interface PersistedWorld {
  code: string;
  name: string;
  seed: string;
  mode: 'creative' | 'survival';
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
  timeOfDay: number;
  modifiedBlocks: Record<string, number>;
}

interface ConnectedPlayer {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  heldBlockId: number;
  sprinting: boolean;
  ws: WebSocket;
}

interface ChatEntry {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

interface ActiveRoom {
  world: PersistedWorld;
  players: Map<string, ConnectedPlayer>;
  chat: ChatEntry[];
}

const PLAYER_COLORS = [
  '#38bdf8',
  '#34d399',
  '#f472b6',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#2dd4bf',
  '#f97316',
];

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy', 'cunt',
  'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard', 'kys',
];

function filterSafeText(raw: string): string {
  let clean = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 180);

  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    clean = clean.replace(regex, (m) => '*'.repeat(m.length));
  }
  return clean;
}

function sanitizeUsername(raw: string): string {
  const clean = String(raw || '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .slice(0, 18);
  return clean || `Player${Math.floor(100 + Math.random() * 900)}`;
}

const rooms = new Map<string, ActiveRoom>();
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function loadPersistedWorlds() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(WORLDS_FILE)) return;
    const raw = fs.readFileSync(WORLDS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as PersistedWorld[];
    if (Array.isArray(parsed)) {
      for (const w of parsed) {
        if (w && w.code && /^\d{6}$/.test(w.code)) {
          rooms.set(w.code, {
            world: w,
            players: new Map(),
            chat: [],
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to load multiplayer worlds:', err);
  }
}

function schedulePersistWorlds() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    persistWorldsNow();
  }, 1500);
}

function persistWorldsNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list: PersistedWorld[] = [];
    for (const room of rooms.values()) {
      list.push(room.world);
    }
    fs.writeFileSync(WORLDS_FILE, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to persist multiplayer worlds:', err);
  }
}

function generateUniqueInviteCode(): string {
  for (let i = 0; i < 1000; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-6);
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(room: ActiveRoom, payload: unknown, excludePlayerId?: string) {
  const msg = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (excludePlayerId && player.id === excludePlayerId) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(msg);
    }
  }
}

function serializePlayers(room: ActiveRoom) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    username: p.username,
    color: p.color,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    pitch: p.pitch,
    heldBlockId: p.heldBlockId,
    sprinting: p.sprinting,
    isOwner: p.id === room.world.ownerId,
  }));
}

async function startServer() {
  loadPersistedWorlds();

  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeWorlds: rooms.size });
  });

  app.get('/api/multiplayer/world/:code', (req, res) => {
    const code = String(req.params.code || '').trim();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'World not found for that 6-digit code.' });
      return;
    }
    res.json({
      code: room.world.code,
      name: room.world.name,
      mode: room.world.mode,
      ownerName: room.world.ownerName,
      playerCount: room.players.size,
      maxPlayers: MAX_PLAYERS_PER_WORLD,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentRoom: ActiveRoom | null = null;
    let currentPlayerId: string | null = null;
    let lastBlockAction = 0;

    const leaveCurrentRoom = (reason = 'left') => {
      if (!currentRoom || !currentPlayerId) return;
      const player = currentRoom.players.get(currentPlayerId);
      if (player) {
        currentRoom.players.delete(currentPlayerId);
        broadcastToRoom(currentRoom, {
          type: 'player:left',
          playerId: currentPlayerId,
          username: player.username,
          reason,
          players: serializePlayers(currentRoom),
        });
        const sysMsg: ChatEntry = {
          id: `${Date.now()}-${Math.random()}`,
          senderId: 'system',
          senderName: 'System',
          text: `${player.username} ${reason === 'kicked' ? 'was removed by the world owner' : 'left the world'}.`,
          timestamp: Date.now(),
          system: true,
        };
        currentRoom.chat.push(sysMsg);
        if (currentRoom.chat.length > 60) currentRoom.chat.shift();
        broadcastToRoom(currentRoom, { type: 'chat:message', entry: sysMsg });
      }
      currentRoom = null;
      currentPlayerId = null;
    };

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'ping') {
        sendJson(ws, { type: 'pong', ts: Date.now() });
        return;
      }

      if (type === 'world:create') {
        leaveCurrentRoom();
        const clientId = String(msg.clientId || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).slice(0, 48);
        const username = sanitizeUsername(String(msg.username || 'Host'));
        const worldName = filterSafeText(String(msg.worldName || 'Private Realm')).slice(0, 32) || 'Private Realm';
        const seed = String(msg.seed || Math.floor(100000 + Math.random() * 900000)).slice(0, 32);
        const mode = msg.mode === 'survival' ? 'survival' : 'creative';
        const code = generateUniqueInviteCode();

        const world: PersistedWorld = {
          code,
          name: worldName,
          seed,
          mode,
          ownerId: clientId,
          ownerName: username,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          timeOfDay: 0.42,
          modifiedBlocks: {},
        };

        const room: ActiveRoom = {
          world,
          players: new Map(),
          chat: [],
        };
        rooms.set(code, room);

        const player: ConnectedPlayer = {
          id: clientId,
          username,
          color: PLAYER_COLORS[0],
          x: 8,
          y: 32,
          z: 8,
          yaw: 0,
          pitch: 0,
          heldBlockId: 1,
          sprinting: false,
          ws,
        };
        room.players.set(clientId, player);
        currentRoom = room;
        currentPlayerId = clientId;
        persistWorldsNow();

        sendJson(ws, {
          type: 'world:state',
          code: world.code,
          name: world.name,
          seed: world.seed,
          mode: world.mode,
          ownerId: world.ownerId,
          selfId: clientId,
          timeOfDay: world.timeOfDay,
          modifiedBlocks: world.modifiedBlocks,
          players: serializePlayers(room),
          chat: room.chat,
        });
        return;
      }

      if (type === 'world:join') {
        leaveCurrentRoom();
        const code = String(msg.code || '').trim();
        const clientId = String(msg.clientId || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).slice(0, 48);
        const username = sanitizeUsername(String(msg.username || 'Explorer'));

        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, { type: 'error', message: 'Invalid invitation code. No private world found.' });
          return;
        }
        if (room.players.size >= MAX_PLAYERS_PER_WORLD && !room.players.has(clientId)) {
          sendJson(ws, { type: 'error', message: 'This world is currently full (max 8 players).' });
          return;
        }

        // Handle reconnect with same clientId cleanly
        const existing = room.players.get(clientId);
        if (existing && existing.ws !== ws) {
          try {
            existing.ws.close(4001, 'Reconnected from another session');
          } catch {
            // ignore
          }
          room.players.delete(clientId);
        }

        const color = PLAYER_COLORS[room.players.size % PLAYER_COLORS.length];
        const player: ConnectedPlayer = {
          id: clientId,
          username,
          color,
          x: existing ? existing.x : 8,
          y: existing ? existing.y : 32,
          z: existing ? existing.z : 8,
          yaw: existing ? existing.yaw : 0,
          pitch: existing ? existing.pitch : 0,
          heldBlockId: existing ? existing.heldBlockId : 1,
          sprinting: false,
          ws,
        };
        room.players.set(clientId, player);
        currentRoom = room;
        currentPlayerId = clientId;

        sendJson(ws, {
          type: 'world:state',
          code: room.world.code,
          name: room.world.name,
          seed: room.world.seed,
          mode: room.world.mode,
          ownerId: room.world.ownerId,
          selfId: clientId,
          timeOfDay: room.world.timeOfDay,
          modifiedBlocks: room.world.modifiedBlocks,
          players: serializePlayers(room),
          chat: room.chat,
        });

        broadcastToRoom(
          room,
          {
            type: 'player:joined',
            player: {
              id: player.id,
              username: player.username,
              color: player.color,
              x: player.x,
              y: player.y,
              z: player.z,
              yaw: player.yaw,
              pitch: player.pitch,
              heldBlockId: player.heldBlockId,
              sprinting: player.sprinting,
              isOwner: player.id === room.world.ownerId,
            },
            players: serializePlayers(room),
          },
          clientId
        );

        const sysMsg: ChatEntry = {
          id: `${Date.now()}-${Math.random()}`,
          senderId: 'system',
          senderName: 'System',
          text: `${username} joined the world.`,
          timestamp: Date.now(),
          system: true,
        };
        room.chat.push(sysMsg);
        if (room.chat.length > 60) room.chat.shift();
        broadcastToRoom(room, { type: 'chat:message', entry: sysMsg });
        return;
      }

      if (!currentRoom || !currentPlayerId) return;
      const self = currentRoom.players.get(currentPlayerId);
      if (!self) return;

      if (type === 'player:move') {
        const x = Number(msg.x);
        const y = Number(msg.y);
        const z = Number(msg.z);
        const yaw = Number(msg.yaw);
        const pitch = Number(msg.pitch);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;

        self.x = x;
        self.y = y;
        self.z = z;
        self.yaw = Number.isFinite(yaw) ? yaw : 0;
        self.pitch = Number.isFinite(pitch) ? pitch : 0;
        self.heldBlockId = Math.max(0, Math.min(127, Number(msg.heldBlockId) || 0));
        self.sprinting = Boolean(msg.sprinting);

        broadcastToRoom(
          currentRoom,
          {
            type: 'player:moved',
            playerId: currentPlayerId,
            x: self.x,
            y: self.y,
            z: self.z,
            yaw: self.yaw,
            pitch: self.pitch,
            heldBlockId: self.heldBlockId,
            sprinting: self.sprinting,
          },
          currentPlayerId
        );
        return;
      }

      if (type === 'block:update') {
        const now = Date.now();
        if (now - lastBlockAction < 25) return; // basic anti-spam guard
        lastBlockAction = now;

        const bx = Math.floor(Number(msg.x));
        const by = Math.floor(Number(msg.y));
        const bz = Math.floor(Number(msg.z));
        const blockId = Math.floor(Number(msg.blockId));

        if (!Number.isFinite(bx) || !Number.isFinite(by) || !Number.isFinite(bz)) return;
        if (by <= 0 || by >= 64) return;
        if (blockId < 0 || blockId > 127) return;

        const key = `${bx},${by},${bz}`;
        currentRoom.world.modifiedBlocks[key] = blockId;
        currentRoom.world.updatedAt = Date.now();
        schedulePersistWorlds();

        broadcastToRoom(currentRoom, {
          type: 'block:updated',
          x: bx,
          y: by,
          z: bz,
          blockId,
          byPlayerId: currentPlayerId,
        });
        return;
      }

      if (type === 'chat:send') {
        const text = filterSafeText(String(msg.text || ''));
        if (!text) return;

        const entry: ChatEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: currentPlayerId,
          senderName: self.username,
          text,
          timestamp: Date.now(),
        };
        currentRoom.chat.push(entry);
        if (currentRoom.chat.length > 60) currentRoom.chat.shift();
        broadcastToRoom(currentRoom, { type: 'chat:message', entry });
        return;
      }

      if (type === 'player:kick') {
        if (currentRoom.world.ownerId !== currentPlayerId) {
          sendJson(ws, { type: 'error', message: 'Only the world owner can remove players.' });
          return;
        }
        const targetId = String(msg.targetId || '');
        if (!targetId || targetId === currentPlayerId) return;
        const target = currentRoom.players.get(targetId);
        if (!target) return;

        sendJson(target.ws, {
          type: 'player:kicked',
          message: 'You were removed from this private world by the owner.',
        });
        currentRoom.players.delete(targetId);
        try {
          target.ws.close(4002, 'Kicked by owner');
        } catch {
          // ignore
        }

        broadcastToRoom(currentRoom, {
          type: 'player:left',
          playerId: targetId,
          username: target.username,
          reason: 'kicked',
          players: serializePlayers(currentRoom),
        });
        const sysMsg: ChatEntry = {
          id: `${Date.now()}-${Math.random()}`,
          senderId: 'system',
          senderName: 'System',
          text: `${target.username} was removed by ${self.username}.`,
          timestamp: Date.now(),
          system: true,
        };
        currentRoom.chat.push(sysMsg);
        broadcastToRoom(currentRoom, { type: 'chat:message', entry: sysMsg });
        return;
      }

      if (type === 'world:save') {
        if (Number.isFinite(Number(msg.timeOfDay))) {
          currentRoom.world.timeOfDay = Number(msg.timeOfDay);
        }
        currentRoom.world.updatedAt = Date.now();
        persistWorldsNow();
        sendJson(ws, { type: 'world:saved', updatedAt: currentRoom.world.updatedAt });
        return;
      }

      if (type === 'world:leave') {
        leaveCurrentRoom('left');
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom('disconnected');
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BLOCKVERSE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
