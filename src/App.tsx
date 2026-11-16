import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Globe,
  Play,
  PlusCircle,
  Settings,
  Trash2,
} from 'lucide-react';
import { GameHud } from './components/GameHud';
import { InventoryModal } from './components/InventoryModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { SettingsModal } from './components/SettingsModal';
import { soundEngine } from './game/audio';
import { BLOCK_IDS, getBlock } from './game/blocks';
import { CraftingRecipe } from './game/crafting';
import {
  ChatMessage,
  ConnectionStatus,
  MultiplayerClient,
  RemotePlayerState,
} from './game/multiplayerClient';
import {
  DEFAULT_HOTBAR,
  deleteWorldFromDB,
  GameMode,
  GameSettings,
  listSavedWorlds,
  loadSettings,
  SavedWorldData,
  saveSettings,
  saveWorldToDB,
} from './game/storage';
import { getTextureAtlas } from './game/textures';
import { EngineHudState, VoxelEngine } from './game/VoxelEngine';

const INITIAL_HUD: EngineHudState = {
  fps: 60,
  coords: [8, 32, 8],
  biome: 'Plains',
  timeOfDay: 0.42,
  dayCount: 1,
  health: 20,
  hunger: 20,
  pointerLocked: false,
  targetBlockName: null,
  breakProgress: 0,
  inWater: false,
};

const INITIAL_SURVIVAL_COUNTS: Record<number, number> = {
  [BLOCK_IDS.OAK_PLANKS]: 16,
  [BLOCK_IDS.TORCH_CUBE]: 8,
  [BLOCK_IDS.MELON]: 4,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const mpClientRef = useRef<MultiplayerClient | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => {
    const s = loadSettings();
    soundEngine.setVolume(s.soundVolume);
    return s;
  });

  const [screen, setScreen] = useState<'menu' | 'loading' | 'playing'>('menu');
  const [loadingText, setLoadingText] = useState('Generating Infinite Terrain...');
  const [webglError, setWebglError] = useState<string | null>(null);

  // Active modals in menu / game
  const [newWorldModalOpen, setNewWorldModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [multiplayerOpen, setMultiplayerOpen] = useState(false);
  const [savedWorlds, setSavedWorlds] = useState<SavedWorldData[]>([]);

  // New world form
  const [draftWorldName, setDraftWorldName] = useState('Aether Valley');
  const [draftSeed, setDraftSeed] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [draftMode, setDraftMode] = useState<GameMode>('creative');

  // Active world state
  const [activeWorldId, setActiveWorldId] = useState<string>('world_default');
  const [activeWorldName, setActiveWorldName] = useState<string>('Aether Valley');
  const [activeSeed, setActiveSeed] = useState<string>('blockverse-2026');
  const [gameMode, setGameMode] = useState<GameMode>('creative');
  const [worldCreatedAt, setWorldCreatedAt] = useState<number>(Date.now());

  // Gameplay HUD & Inventory state
  const [hud, setHud] = useState<EngineHudState>(INITIAL_HUD);
  const [hotbar, setHotbar] = useState<number[]>([...DEFAULT_HOTBAR]);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [inventoryCounts, setInventoryCounts] = useState<Record<number, number>>({
    ...INITIAL_SURVIVAL_COUNTS,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Multiplayer State
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [mpInviteCode, setMpInviteCode] = useState<string | null>(null);
  const [mpStatus, setMpStatus] = useState<ConnectionStatus>('disconnected');
  const [mpPlayers, setMpPlayers] = useState<RemotePlayerState[]>([]);
  const [mpSelfId, setMpSelfId] = useState<string | null>(null);
  const [mpOwnerId, setMpOwnerId] = useState<string | null>(null);
  const [mpChat, setMpChat] = useState<ChatMessage[]>([]);
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpConnecting, setMpConnecting] = useState(false);

  // Refs for synchronous access inside Three.js loop callbacks
  const hotbarRef = useRef(hotbar);
  hotbarRef.current = hotbar;
  const selectedSlotRef = useRef(selectedSlot);
  selectedSlotRef.current = selectedSlot;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const inventoryCountsRef = useRef(inventoryCounts);
  inventoryCountsRef.current = inventoryCounts;
  const isMultiplayerRef = useRef(isMultiplayer);
  isMultiplayerRef.current = isMultiplayer;

  const atlas = useMemo(() => getTextureAtlas(4), []);

  const showToast = useCallback((msg: string) => {
    setSaveToast(msg);
    window.setTimeout(() => setSaveToast(null), 2600);
  }, []);

  // Load saved worlds list on mount
  const refreshSavedWorlds = useCallback(async () => {
    const list = await listSavedWorlds();
    setSavedWorlds(list);
  }, []);

  useEffect(() => {
    refreshSavedWorlds();
  }, [refreshSavedWorlds]);

  // Initialize Three.js VoxelEngine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new VoxelEngine(canvasMountRef.current, settings, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onBlockChanged: (x, y, z, blockId, prevId) => {
        if (isMultiplayerRef.current) {
          mpClientRef.current?.sendBlockUpdate(x, y, z, blockId);
        }
        if (gameModeRef.current === 'survival') {
          if (blockId === 0 && prevId > 0) {
            const def = getBlock(prevId);
            const dropId = def?.dropId || prevId;
            setInventoryCounts((prev) => ({
              ...prev,
              [dropId]: (prev[dropId] || 0) + 1,
            }));
          } else if (blockId > 0 && prevId === 0) {
            setInventoryCounts((prev) => ({
              ...prev,
              [blockId]: Math.max(0, (prev[blockId] || 0) - 1),
            }));
          }
        }
      },
      onEatFood: (blockId) => {
        setInventoryCounts((prev) => ({
          ...prev,
          [blockId]: Math.max(0, (prev[blockId] || 0) - 1),
        }));
      },
      onPlayerMoveSync: (x, y, z, yaw, pitch, heldBlockId, sprinting) => {
        if (isMultiplayerRef.current) {
          mpClientRef.current?.sendMove(x, y, z, yaw, pitch, heldBlockId, sprinting);
        }
      },
      onHotbarKey: (idx) => setSelectedSlot(idx),
      onHotbarScroll: (delta) => setSelectedSlot((prev) => (prev + delta + 9) % 9),
      onToggleInventory: () => {
        setInventoryOpen((open) => {
          const next = !open;
          engineRef.current?.setPaused(next);
          if (!next) engineRef.current?.requestPointerLock();
          return next;
        });
      },
      onToggleChat: () => {
        if (!isMultiplayerRef.current) return;
        setChatOpen((open) => {
          const next = !open;
          engineRef.current?.setPaused(next);
          return next;
        });
      },
      onTogglePlayers: () => {
        if (!isMultiplayerRef.current) return;
        setPlayersOpen((open) => {
          const next = !open;
          engineRef.current?.setPaused(next);
          return next;
        });
      },
      onPauseRequest: () => {
        setIsPaused(true);
        engineRef.current?.setPaused(true);
      },
      onWebGLError: (msg) => setWebglError(msg),
      getSelectedBlockId: () => hotbarRef.current[selectedSlotRef.current] || BLOCK_IDS.GRASS,
      canPlaceSelectedBlock: () => {
        const id = hotbarRef.current[selectedSlotRef.current];
        if (!id) return false;
        if (gameModeRef.current === 'creative') return true;
        return (inventoryCountsRef.current[id] || 0) > 0;
      },
    });

    engineRef.current = engine;

    // Initialize WebSocket Multiplayer Client
    const mp = new MultiplayerClient({
      onStatusChange: (status) => {
        setMpStatus(status);
        if (status === 'connected') setMpConnecting(false);
      },
      onWorldState: (state) => {
        setMpConnecting(false);
        setMultiplayerOpen(false);
        setIsMultiplayer(true);
        setMpInviteCode(state.code);
        setMpSelfId(state.selfId);
        setMpOwnerId(state.ownerId);
        setMpPlayers(state.players);
        setMpChat(state.chat || []);
        setActiveWorldName(state.name);
        setActiveSeed(state.seed);
        setGameMode(state.mode);
        setHotbar([...DEFAULT_HOTBAR]);
        setInventoryCounts({ ...INITIAL_SURVIVAL_COUNTS });

        setLoadingText(`Joining ${state.name} (${state.code})...`);
        setScreen('loading');

        window.setTimeout(() => {
          engineRef.current?.initWorld(state.seed, state.mode, state.modifiedBlocks, {
            timeOfDay: state.timeOfDay,
            startPlaying: true,
          });
          engineRef.current?.syncRemotePlayerList(state.players, state.selfId);
          setScreen('playing');
          setIsPaused(true);
          engineRef.current?.setPaused(true);
          showToast(`Joined Private World · Code ${state.code}`);
        }, 80);
      },
      onPlayerList: (players) => {
        setMpPlayers(players);
        setMpSelfId((currSelf) => {
          if (currSelf) engineRef.current?.syncRemotePlayerList(players, currSelf);
          return currSelf;
        });
      },
      onPlayerMove: (pid, x, y, z, yaw, pitch, heldBlockId, sprinting) => {
        engineRef.current?.updateRemotePlayerMove(pid, x, y, z, yaw, pitch, heldBlockId, sprinting);
      },
      onBlockUpdate: (x, y, z, blockId, byPlayerId) => {
        if (byPlayerId !== mp.getClientId()) {
          engineRef.current?.applyRemoteBlockUpdate(x, y, z, blockId);
        }
      },
      onChatMessage: (entry) => {
        setMpChat((prev) => [...prev.slice(-50), entry]);
      },
      onKicked: (message) => {
        engineRef.current?.setModeMenu();
        setIsMultiplayer(false);
        setMpInviteCode(null);
        setScreen('menu');
        setMpError(message);
        setMultiplayerOpen(true);
      },
      onError: (message) => {
        setMpConnecting(false);
        setMpError(message);
      },
      onSaved: () => {
        showToast('Multiplayer World Saved to Server');
      },
    });
    mpClientRef.current = mp;

    return () => {
      mp.disconnect();
      engine.dispose();
    };
  }, []);

  const handleSettingsChange = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.updateSettings(next);
  };

  const launchSinglePlayerWorld = (
    id: string,
    name: string,
    seed: string,
    mode: GameMode,
    existing?: SavedWorldData
  ) => {
    soundEngine.playClick();
    setNewWorldModalOpen(false);
    setIsMultiplayer(false);
    setMpInviteCode(null);
    setActiveWorldId(id);
    setActiveWorldName(name);
    setActiveSeed(seed);
    setGameMode(mode);
    setWorldCreatedAt(existing?.createdAt || Date.now());
    setHotbar(existing?.hotbar?.length === 9 ? existing.hotbar : [...DEFAULT_HOTBAR]);
    setInventoryCounts(existing?.inventoryCounts || { ...INITIAL_SURVIVAL_COUNTS });

    setLoadingText(`Generating ${name}...`);
    setScreen('loading');

    window.setTimeout(() => {
      engineRef.current?.initWorld(seed, mode, existing?.modifiedBlocks || {}, {
        playerPos: existing?.playerPos,
        yaw: existing?.playerYaw,
        pitch: existing?.playerPitch,
        timeOfDay: existing?.timeOfDay,
        health: existing?.health,
        hunger: existing?.hunger,
        startPlaying: true,
      });
      setScreen('playing');
      setIsPaused(false);
      engineRef.current?.setPaused(false);
      engineRef.current?.requestPointerLock();
    }, 80);
  };

  const handleQuickPlay = () => {
    if (savedWorlds.length > 0) {
      const latest = savedWorlds[0];
      launchSinglePlayerWorld(latest.id, latest.name, latest.seed, latest.mode, latest);
    } else {
      const id = `world_${Date.now()}`;
      launchSinglePlayerWorld(id, draftWorldName || 'Aether Valley', draftSeed, draftMode);
    }
  };

  const handleSaveCurrentWorld = useCallback(async () => {
    if (!engineRef.current) return;
    const snap = engineRef.current.getSnapshotState();
    if (isMultiplayer) {
      mpClientRef.current?.saveWorld(snap.timeOfDay);
      return;
    }

    const payload: SavedWorldData = {
      id: activeWorldId,
      name: activeWorldName,
      seed: activeSeed,
      mode: gameMode,
      createdAt: worldCreatedAt,
      updatedAt: Date.now(),
      playerPos: snap.playerPos,
      playerYaw: snap.playerYaw,
      playerPitch: snap.playerPitch,
      timeOfDay: snap.timeOfDay,
      health: snap.health,
      hunger: snap.hunger,
      hotbar,
      inventoryCounts,
      modifiedBlocks: snap.modifiedBlocks,
    };

    await saveWorldToDB(payload);
    await refreshSavedWorlds();
    showToast('World Progress Saved');
  }, [
    activeWorldId,
    activeWorldName,
    activeSeed,
    gameMode,
    worldCreatedAt,
    hotbar,
    inventoryCounts,
    isMultiplayer,
    refreshSavedWorlds,
    showToast,
  ]);

  // Auto-save single-player world every 30s
  useEffect(() => {
    if (screen !== 'playing' || isMultiplayer) return;
    const timer = window.setInterval(() => {
      handleSaveCurrentWorld();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [screen, isMultiplayer, handleSaveCurrentWorld]);

  const handleLeaveWorld = async () => {
    if (!isMultiplayer && screen === 'playing') {
      await handleSaveCurrentWorld();
    }
    if (isMultiplayer) {
      mpClientRef.current?.disconnect();
    }
    setIsMultiplayer(false);
    setMpInviteCode(null);
    setInventoryOpen(false);
    setChatOpen(false);
    setPlayersOpen(false);
    setIsPaused(false);
    engineRef.current?.setModeMenu();
    setScreen('menu');
  };

  const handleCraft = (recipe: CraftingRecipe) => {
    if (gameMode === 'survival') {
      const hasAll = recipe.ingredients.every(
        (ing) => (inventoryCounts[ing.blockId] || 0) >= ing.count
      );
      if (!hasAll) return;

      setInventoryCounts((prev) => {
        const next = { ...prev };
        for (const ing of recipe.ingredients) {
          next[ing.blockId] = Math.max(0, (next[ing.blockId] || 0) - ing.count);
        }
        next[recipe.outputId] = (next[recipe.outputId] || 0) + recipe.outputCount;
        return next;
      });
    }

    soundEngine.playCraft();
    setHotbar((prev) => {
      const next = [...prev];
      if (!next.includes(recipe.outputId)) {
        next[selectedSlot] = recipe.outputId;
      }
      return next;
    });
  };

  const handleAssignToSlot = (slot: number, blockId: number) => {
    soundEngine.playClick();
    setHotbar((prev) => {
      const next = [...prev];
      next[slot] = blockId;
      return next;
    });
  };

  const handleDeleteSavedWorld = async (id: string) => {
    await deleteWorldFromDB(id);
    await refreshSavedWorlds();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0f17] text-slate-100">
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 h-full w-full" />

      {/* WebGL Error Fallback */}
      {webglError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f17] p-6">
          <div className="max-w-md rounded-xl border border-rose-500/40 bg-[#121928] p-6 text-center shadow-2xl">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
            <h2 className="font-display mt-3 text-xl font-bold text-white">Graphics Context Unavailable</h2>
            <p className="mt-2 text-sm text-slate-300">{webglError}</p>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {screen === 'loading' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#080c14]/92 p-6">
          <div className="font-display text-3xl font-extrabold tracking-wider text-white">
            BLOCKVERSE
          </div>
          <p className="mt-2 text-sm text-sky-300">{loadingText}</p>
          <div className="mt-6 h-2 w-64 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-3/4 rounded-full bg-sky-400 transition-all duration-300" />
          </div>
        </div>
      )}

      {/* Main Menu */}
      {screen === 'menu' && (
        <div className="fixed inset-0 z-20 flex flex-col justify-between bg-gradient-to-r from-[#070b14]/88 via-[#070b14]/45 to-transparent p-8 sm:p-12">
          <div className="flex items-center justify-between">
            <span className="font-mono-tabular text-xs font-semibold tracking-widest text-sky-300">
              VOXEL SANDBOX ENGINE
            </span>
            <span className="font-mono-tabular text-xs text-slate-300">
              {settings.username}
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
              BLOCKVERSE
            </h1>
            <p className="mt-2 font-display text-lg font-semibold tracking-widest text-sky-400">
              INFINITE WORLD
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Explore procedural biomes, crystal caverns, dynamic skies, 127 functional blocks, animated wildlife, and online multiplayer realms.
            </p>

            <div className="mt-7 flex flex-col gap-2.5">
              <button
                onClick={handleQuickPlay}
                className="flex items-center justify-between rounded-xl bg-sky-500 px-5 py-3.5 text-left font-display text-base font-bold text-slate-950 shadow-lg transition-colors hover:bg-sky-400"
              >
                <span>{savedWorlds.length > 0 ? `Play: ${savedWorlds[0].name}` : 'Play World'}</span>
                <Play className="h-5 w-5 fill-slate-950" />
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setNewWorldModalOpen(true);
                }}
                className="flex items-center justify-between rounded-xl border border-white/15 bg-[#101624]/92 px-5 py-3 text-left text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-[#182238]"
              >
                <span>New World & Saved Realms</span>
                <PlusCircle className="h-4 w-4 text-emerald-400" />
              </button>

              <button
                onClick={() => {
                  soundEngine.playClick();
                  setMpError(null);
                  setMultiplayerOpen(true);
                }}
                className="flex items-center justify-between rounded-xl border border-white/15 bg-[#101624]/92 px-5 py-3 text-left text-sm font-semibold text-white transition-colors hover:border-sky-400/50 hover:bg-[#182238]"
              >
                <span>Multiplayer (Invite Codes)</span>
                <Globe className="h-4 w-4 text-sky-400" />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setSettingsOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#101624]/92 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#182238]"
                >
                  <Settings className="h-4 w-4 text-slate-300" />
                  <span>Settings</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setCreditsOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#101624]/92 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#182238]"
                >
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>Credits</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>WASD Move</span>
            <span>·</span>
            <span>Mouse Look / Break / Place</span>
            <span>·</span>
            <span>E Inventory (127 Blocks)</span>
            <span>·</span>
            <span>1-9 Hotbar</span>
          </div>
        </div>
      )}

      {/* Active Gameplay HUD */}
      {screen === 'playing' && (
        <GameHud
          hud={hud}
          gameMode={gameMode}
          worldName={activeWorldName}
          hotbar={hotbar}
          selectedSlot={selectedSlot}
          inventoryCounts={inventoryCounts}
          iconMap={atlas.iconDataUrls}
          showFps={settings.showFps}
          isPaused={isPaused}
          inventoryOpen={inventoryOpen}
          chatOpen={chatOpen}
          playersOpen={playersOpen}
          isMultiplayer={isMultiplayer}
          inviteCode={mpInviteCode}
          connectionStatus={mpStatus}
          players={mpPlayers}
          selfId={mpSelfId}
          ownerId={mpOwnerId}
          chatMessages={mpChat}
          saveToast={saveToast}
          onSelectSlot={(idx) => setSelectedSlot(idx)}
          onResume={() => {
            setIsPaused(false);
            engineRef.current?.setPaused(false);
            engineRef.current?.requestPointerLock();
          }}
          onOpenInventory={() => {
            setInventoryOpen(true);
            engineRef.current?.setPaused(true);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onSaveWorld={handleSaveCurrentWorld}
          onLeaveWorld={handleLeaveWorld}
          onSetTimeOfDay={(t) => engineRef.current?.setTimeOfDay(t)}
          onSendChat={(txt) => mpClientRef.current?.sendChat(txt)}
          onCloseChat={() => {
            setChatOpen(false);
            setIsPaused(false);
            engineRef.current?.setPaused(false);
            engineRef.current?.requestPointerLock();
          }}
          onOpenChat={() => {
            setChatOpen(true);
            engineRef.current?.setPaused(true);
          }}
          onTogglePlayers={() => {
            setPlayersOpen((open) => {
              const next = !open;
              engineRef.current?.setPaused(next);
              if (!next) {
                setIsPaused(false);
                engineRef.current?.requestPointerLock();
              }
              return next;
            });
          }}
          onKickPlayer={(tid) => mpClientRef.current?.kickPlayer(tid)}
        />
      )}

      {/* Inventory & Crafting Modal */}
      {screen === 'playing' && inventoryOpen && (
        <InventoryModal
          gameMode={gameMode}
          hotbar={hotbar}
          selectedSlot={selectedSlot}
          inventoryCounts={inventoryCounts}
          iconMap={atlas.iconDataUrls}
          onSelectSlot={(s) => setSelectedSlot(s)}
          onAssignToSlot={handleAssignToSlot}
          onCraft={handleCraft}
          onClose={() => {
            setInventoryOpen(false);
            setIsPaused(false);
            engineRef.current?.setPaused(false);
            engineRef.current?.requestPointerLock();
          }}
        />
      )}

      {/* New World & Saved Worlds Modal */}
      {newWorldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/85 p-4">
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-xl border border-white/15 bg-[#101624] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="font-display text-xl font-bold text-white">Create or Load World</h2>
              <button
                onClick={() => setNewWorldModalOpen(false)}
                className="rounded-lg border border-white/15 bg-[#161f33] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
              {/* Create New World */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-sky-400">New Single-Player World</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">World Name</label>
                  <input
                    type="text"
                    maxLength={28}
                    value={draftWorldName}
                    onChange={(e) => setDraftWorldName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">World Seed</label>
                  <input
                    type="text"
                    maxLength={24}
                    value={draftSeed}
                    onChange={(e) => setDraftSeed(e.target.value)}
                    className="font-mono-tabular mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">Mode</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDraftMode('creative')}
                      className={`rounded-lg border py-2 text-xs font-semibold ${
                        draftMode === 'creative'
                          ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                          : 'border-white/10 bg-[#0b0f17] text-slate-400'
                      }`}
                    >
                      Creative
                    </button>
                    <button
                      onClick={() => setDraftMode('survival')}
                      className={`rounded-lg border py-2 text-xs font-semibold ${
                        draftMode === 'survival'
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-[#0b0f17] text-slate-400'
                      }`}
                    >
                      Survival
                    </button>
                  </div>
                </div>

                <button
                  onClick={() =>
                    launchSinglePlayerWorld(
                      `world_${Date.now()}`,
                      draftWorldName.trim() || 'New Realm',
                      draftSeed.trim() || String(Date.now()),
                      draftMode
                    )
                  }
                  className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400"
                >
                  Generate & Enter World
                </button>
              </div>

              {/* Saved Worlds */}
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-emerald-400">Saved Worlds ({savedWorlds.length})</h3>
                <div className="mt-3 max-h-72 flex-1 space-y-2 overflow-y-auto pr-1">
                  {savedWorlds.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-[#0b0f17] p-4 text-center text-xs text-slate-500">
                      No saved worlds yet. Worlds auto-save as you play.
                    </div>
                  ) : (
                    savedWorlds.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b0f17] p-3"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="truncate text-sm font-semibold text-white">{w.name}</div>
                          <div className="font-mono-tabular text-[11px] text-slate-400">
                            {w.mode} · Seed {w.seed}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => launchSinglePlayerWorld(w.id, w.name, w.seed, w.mode, w)}
                            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteSavedWorld(w.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/30 bg-rose-950/60 text-rose-300 hover:bg-rose-900"
                            title="Delete world"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Modal */}
      {multiplayerOpen && (
        <MultiplayerModal
          defaultUsername={settings.username}
          error={mpError}
          connecting={mpConnecting}
          onCreatePrivateWorld={(uname, wname, seed, mode) => {
            setMpConnecting(true);
            setMpError(null);
            handleSettingsChange({ ...settings, username: uname });
            mpClientRef.current?.createPrivateWorld(uname, wname, seed, mode);
          }}
          onJoinPrivateWorld={(code, uname) => {
            setMpConnecting(true);
            setMpError(null);
            handleSettingsChange({ ...settings, username: uname });
            mpClientRef.current?.joinPrivateWorld(code, uname);
          }}
          onClose={() => {
            setMultiplayerOpen(false);
            setMpConnecting(false);
          }}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Credits Modal */}
      {creditsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/85 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#101624] p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold text-white">BLOCKVERSE</h2>
            <p className="text-xs font-semibold tracking-wider text-sky-400">INFINITE WORLD EDITION</p>
            <div className="mt-4 space-y-2.5 text-sm text-slate-300">
              <p>Built with Three.js WebGL, procedural voxel meshing with baked vertex ambient occlusion, Simplex noise biome generation, and WebSocket real-time multiplayer.</p>
              <div className="rounded-lg border border-white/10 bg-[#0b0f17] p-3 text-xs text-slate-400 space-y-1">
                <div>127 Unique Procedural Voxel Blocks</div>
                <div>6 Biomes · Crystal Caverns · Animated Water</div>
                <div>6 Composite Animated Creature Species</div>
                <div>IndexedDB Persistence & Private 6-Digit Multiplayer</div>
              </div>
            </div>
            <button
              onClick={() => setCreditsOpen(false)}
              className="mt-5 w-full rounded-lg bg-sky-500 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
