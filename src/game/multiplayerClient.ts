export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface RemotePlayerState {
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
  isOwner: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface WorldSyncPayload {
  code: string;
  name: string;
  seed: string;
  mode: 'creative' | 'survival';
  ownerId: string;
  selfId: string;
  timeOfDay: number;
  modifiedBlocks: Record<string, number>;
  players: RemotePlayerState[];
  chat: ChatMessage[];
}

export interface MultiplayerCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onWorldState: (state: WorldSyncPayload) => void;
  onPlayerList: (players: RemotePlayerState[]) => void;
  onPlayerMove: (playerId: string, x: number, y: number, z: number, yaw: number, pitch: number, heldBlockId: number, sprinting: boolean) => void;
  onBlockUpdate: (x: number, y: number, z: number, blockId: number, byPlayerId: string) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onKicked: (message: string) => void;
  onError: (message: string) => void;
  onSaved: () => void;
}

function getOrCreateClientId(): string {
  const key = 'blockverse_mp_client_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `bv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private status: ConnectionStatus = 'disconnected';
  private clientId = getOrCreateClientId();
  private activeSession:
    | { kind: 'create'; username: string; worldName: string; seed: string; mode: 'creative' | 'survival' }
    | { kind: 'join'; code: string; username: string }
    | null = null;
  private manualDisconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;
  private pendingBlocks: { x: number; y: number; z: number; blockId: number }[] = [];

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.callbacks.onStatusChange(s);
  }

  private getWsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }

  public createPrivateWorld(username: string, worldName: string, seed: string, mode: 'creative' | 'survival') {
    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.activeSession = { kind: 'create', username, worldName, seed, mode };
    this.connect();
  }

  public joinPrivateWorld(code: string, username: string) {
    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.activeSession = { kind: 'join', code: code.trim(), username };
    this.connect();
  }

  private connect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(this.getWsUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');

      if (this.activeSession?.kind === 'create') {
        this.send({
          type: 'world:create',
          clientId: this.clientId,
          username: this.activeSession.username,
          worldName: this.activeSession.worldName,
          seed: this.activeSession.seed,
          mode: this.activeSession.mode,
        });
      } else if (this.activeSession?.kind === 'join') {
        this.send({
          type: 'world:join',
          clientId: this.clientId,
          code: this.activeSession.code,
          username: this.activeSession.username,
        });
      }

      // Flush any buffered offline block edits on reconnect
      if (this.pendingBlocks.length > 0) {
        const queued = [...this.pendingBlocks];
        this.pendingBlocks = [];
        for (const b of queued) {
          this.sendBlockUpdate(b.x, b.y, b.z, b.blockId);
        }
      }

      if (this.pingInterval) window.clearInterval(this.pingInterval);
      this.pingInterval = window.setInterval(() => {
        this.send({ type: 'ping' });
      }, 15000);
    };

    ws.onmessage = (ev) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      const type = String(msg.type || '');

      if (type === 'world:state') {
        const payload = msg as unknown as WorldSyncPayload;
        // Switch activeSession to join on reconnect so reconnecting rejoins same 6-digit code
        this.activeSession = {
          kind: 'join',
          code: payload.code,
          username:
            payload.players.find((p) => p.id === payload.selfId)?.username ||
            (this.activeSession?.username ?? 'Explorer'),
        };
        this.callbacks.onWorldState(payload);
      } else if (type === 'player:joined' || type === 'player:left') {
        this.callbacks.onPlayerList((msg.players as RemotePlayerState[]) || []);
      } else if (type === 'player:moved') {
        this.callbacks.onPlayerMove(
          String(msg.playerId),
          Number(msg.x),
          Number(msg.y),
          Number(msg.z),
          Number(msg.yaw),
          Number(msg.pitch),
          Number(msg.heldBlockId) || 0,
          Boolean(msg.sprinting)
        );
      } else if (type === 'block:updated') {
        this.callbacks.onBlockUpdate(
          Number(msg.x),
          Number(msg.y),
          Number(msg.z),
          Number(msg.blockId),
          String(msg.byPlayerId || '')
        );
      } else if (type === 'chat:message') {
        this.callbacks.onChatMessage(msg.entry as ChatMessage);
      } else if (type === 'player:kicked') {
        this.manualDisconnect = true;
        this.activeSession = null;
        this.callbacks.onKicked(String(msg.message || 'Removed by owner.'));
      } else if (type === 'world:saved') {
        this.callbacks.onSaved();
      } else if (type === 'error') {
        this.manualDisconnect = true;
        this.callbacks.onError(String(msg.message || 'Connection error.'));
      }
    };

    ws.onclose = () => {
      if (this.pingInterval) {
        window.clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      if (this.manualDisconnect || !this.activeSession) {
        this.setStatus('disconnected');
        return;
      }
      this.setStatus('reconnecting');
      const delay = Math.min(8000, 1000 * Math.pow(1.5, this.reconnectAttempts));
      this.reconnectAttempts++;
      this.reconnectTimer = window.setTimeout(() => {
        if (!this.manualDisconnect && this.activeSession) {
          this.connect();
        }
      }, delay);
    };

    ws.onerror = () => {
      // onclose handles reconnect
    };
  }

  private send(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public sendMove(x: number, y: number, z: number, yaw: number, pitch: number, heldBlockId: number, sprinting: boolean) {
    this.send({ type: 'player:move', x, y, z, yaw, pitch, heldBlockId, sprinting });
  }

  public sendBlockUpdate(x: number, y: number, z: number, blockId: number) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingBlocks.push({ x, y, z, blockId });
      return;
    }
    this.send({ type: 'block:update', x, y, z, blockId });
  }

  public sendChat(text: string) {
    this.send({ type: 'chat:send', text });
  }

  public kickPlayer(targetId: string) {
    this.send({ type: 'player:kick', targetId });
  }

  public saveWorld(timeOfDay: number) {
    this.send({ type: 'world:save', timeOfDay });
  }

  public disconnect() {
    this.manualDisconnect = true;
    this.activeSession = null;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      try {
        this.send({ type: 'world:leave' });
        this.ws.close(1000, 'Left world');
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}
