import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Check,
  Copy,
  Crown,
  Heart,
  LogOut,
  MessageSquare,
  Save,
  Send,
  Settings,
  Sun,
  UserX,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getBlock } from '../game/blocks';
import { ChatMessage, ConnectionStatus, RemotePlayerState } from '../game/multiplayerClient';
import { GameMode } from '../game/storage';
import { EngineHudState } from '../game/VoxelEngine';

interface GameHudProps {
  hud: EngineHudState;
  gameMode: GameMode;
  worldName: string;
  hotbar: number[];
  selectedSlot: number;
  inventoryCounts: Record<number, number>;
  iconMap: Map<number, string>;
  showFps: boolean;
  isPaused: boolean;
  inventoryOpen: boolean;
  chatOpen: boolean;
  playersOpen: boolean;
  isMultiplayer: boolean;
  inviteCode: string | null;
  connectionStatus: ConnectionStatus;
  players: RemotePlayerState[];
  selfId: string | null;
  ownerId: string | null;
  chatMessages: ChatMessage[];
  saveToast: string | null;
  onSelectSlot: (slot: number) => void;
  onResume: () => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
  onSaveWorld: () => void;
  onLeaveWorld: () => void;
  onSetTimeOfDay: (t: number) => void;
  onSendChat: (text: string) => void;
  onCloseChat: () => void;
  onOpenChat: () => void;
  onTogglePlayers: () => void;
  onKickPlayer: (targetId: string) => void;
}

function formatClock(timeOfDay: number): string {
  const hoursFloat = ((timeOfDay + 0.25) % 1) * 24;
  const h = Math.floor(hoursFloat);
  const m = Math.floor((hoursFloat - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  gameMode,
  worldName,
  hotbar,
  selectedSlot,
  inventoryCounts,
  iconMap,
  showFps,
  isPaused,
  inventoryOpen,
  chatOpen,
  playersOpen,
  isMultiplayer,
  inviteCode,
  connectionStatus,
  players,
  selfId,
  ownerId,
  chatMessages,
  saveToast,
  onSelectSlot,
  onResume,
  onOpenInventory,
  onOpenSettings,
  onSaveWorld,
  onLeaveWorld,
  onSetTimeOfDay,
  onSendChat,
  onCloseChat,
  onOpenChat,
  onTogglePlayers,
  onKickPlayer,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => chatInputRef.current?.focus(), 20);
    }
  }, [chatOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
    onCloseChat();
  };

  const isOwner = Boolean(selfId && ownerId && selfId === ownerId);
  const selectedBlock = getBlock(hotbar[selectedSlot]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Underwater Tint */}
      {hud.inWater && <div className="fixed inset-0 bg-sky-700/30 pointer-events-none" />}

      {/* Centered Crosshair */}
      {!isPaused && !inventoryOpen && !chatOpen && !playersOpen && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-6 w-6 items-center justify-center">
            <div className="h-4 w-0.5 bg-white/85 shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
            <div className="absolute h-0.5 w-4 bg-white/85 shadow-[0_0_2px_rgba(0,0,0,0.9)]" />
          </div>
          {hud.breakProgress > 0.02 && (
            <div className="mt-3 h-1.5 w-16 -translate-x-5 overflow-hidden rounded-full bg-black/60">
              <div
                className="h-full bg-sky-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.round(hud.breakProgress * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Top-Left World Telemetry */}
      <div className="fixed left-4 top-4 flex flex-col gap-1.5">
        <div className="rounded-lg border border-white/10 bg-[#0b0f17]/82 px-3.5 py-2 text-xs text-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-white">{worldName}</span>
            <span className="text-slate-500">·</span>
            <span className="capitalize text-sky-400">{gameMode}</span>
            {showFps && (
              <>
                <span className="text-slate-500">·</span>
                <span className="font-mono-tabular text-emerald-400">{hud.fps} FPS</span>
              </>
            )}
          </div>
          <div className="font-mono-tabular mt-1 flex items-center gap-2 text-[11px] text-slate-400">
            <span>
              XYZ {hud.coords[0]}, {hud.coords[1]}, {hud.coords[2]}
            </span>
            <span>·</span>
            <span>{hud.biome}</span>
            <span>·</span>
            <span>
              Day {hud.dayCount} · {formatClock(hud.timeOfDay)}
            </span>
          </div>
          {hud.targetBlockName && (
            <div className="mt-1 text-[11px] font-medium text-amber-300">
              Target: {hud.targetBlockName}
            </div>
          )}
        </div>

        {saveToast && (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-950/90 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            {saveToast}
          </div>
        )}
      </div>

      {/* Top-Right Multiplayer Status & Actions */}
      <div className="pointer-events-auto fixed right-4 top-4 flex items-center gap-2">
        {isMultiplayer && inviteCode && (
          <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#0b0f17]/88 px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span
                className={
                  connectionStatus === 'connected'
                    ? 'font-semibold text-emerald-300'
                    : 'font-semibold text-amber-300'
                }
              >
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'reconnecting'
                    ? 'Reconnecting...'
                    : connectionStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected'}
              </span>
            </div>

            <span className="text-slate-600">|</span>

            <button
              onClick={handleCopyCode}
              className="font-mono-tabular flex items-center gap-1.5 rounded bg-[#162033] px-2 py-1 font-bold text-sky-300 hover:bg-[#1e2c45]"
              title="Copy 6-digit invite code"
            >
              <span>Code: {inviteCode}</span>
              {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>

            <button
              onClick={onTogglePlayers}
              className="flex items-center gap-1.5 rounded bg-[#162033] px-2.5 py-1 font-semibold text-slate-200 hover:bg-[#1e2c45]"
              title="Players (P)"
            >
              <Users className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-mono-tabular">{players.length}</span>
            </button>

            <button
              onClick={onLeaveWorld}
              className="flex items-center gap-1 rounded bg-rose-950/80 px-2.5 py-1 font-semibold text-rose-200 hover:bg-rose-900"
              title="Leave multiplayer world"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Leave</span>
            </button>
          </div>
        )}

        <button
          onClick={onOpenInventory}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b0f17]/88 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#162033]"
          title="Inventory (E)"
        >
          <Backpack className="h-3.5 w-3.5 text-sky-400" />
          <span>Blocks (E)</span>
        </button>

        {isMultiplayer && (
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0b0f17]/88 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#162033]"
            title="Chat (T)"
          >
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>Chat</span>
          </button>
        )}
      </div>

      {/* Bottom-Left Multiplayer Chat Box */}
      {isMultiplayer && (chatMessages.length > 0 || chatOpen) && (
        <div className="fixed bottom-28 left-4 w-80 sm:w-96">
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#0b0f17]/78 p-2.5 text-xs">
            {chatMessages.slice(-16).map((m) => (
              <div key={m.id} className="leading-relaxed">
                {m.system ? (
                  <span className="italic text-amber-300">{m.text}</span>
                ) : (
                  <>
                    <span className="font-semibold text-sky-300">{m.senderName}: </span>
                    <span className="text-slate-100">{m.text}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {chatOpen && (
            <form
              onSubmit={handleChatSubmit}
              className="pointer-events-auto mt-1.5 flex items-center gap-1.5"
            >
              <input
                ref={chatInputRef}
                type="text"
                maxLength={180}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    onCloseChat();
                  }
                }}
                placeholder="Type a message (filtered)..."
                className="flex-1 rounded-lg border border-sky-400/50 bg-[#0b0f17]/95 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Bottom-Center Survival Bars + 9-Slot Hotbar */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {gameMode === 'survival' && (
          <div className="flex w-full items-center justify-between px-1">
            {/* Health */}
            <div className="flex items-center gap-1 rounded-md bg-[#0b0f17]/82 px-2.5 py-1">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span className="font-mono-tabular text-xs font-bold text-white">{hud.health}/20</span>
            </div>

            {selectedBlock && (
              <span className="rounded-md bg-[#0b0f17]/82 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {selectedBlock.name}
              </span>
            )}

            {/* Hunger */}
            <div className="flex items-center gap-1 rounded-md bg-[#0b0f17]/82 px-2.5 py-1">
              <span className="text-xs font-bold text-amber-400">Food</span>
              <span className="font-mono-tabular text-xs font-bold text-white">{hud.hunger}/20</span>
            </div>
          </div>
        )}

        {gameMode === 'creative' && selectedBlock && (
          <div className="rounded-md bg-[#0b0f17]/82 px-3 py-1 text-xs font-semibold text-slate-200">
            {selectedBlock.name}
          </div>
        )}

        <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0b0f17]/88 p-1.5 shadow-xl">
          {hotbar.map((blockId, idx) => {
            const block = getBlock(blockId);
            const active = idx === selectedSlot;
            const count = gameMode === 'creative' ? '∞' : inventoryCounts[blockId] || 0;
            return (
              <button
                key={idx}
                onClick={() => onSelectSlot(idx)}
                className={`relative flex h-13 w-13 items-center justify-center rounded-lg border transition-transform ${
                  active
                    ? 'scale-105 border-sky-400 bg-sky-500/20'
                    : 'border-white/10 bg-[#131b2c]/90 hover:border-white/30'
                }`}
                title={block?.name || `Slot ${idx + 1}`}
              >
                {block && (
                  <img
                    src={iconMap.get(block.id)}
                    alt={block.name}
                    className={`pixelated h-9 w-9 ${gameMode === 'survival' && count === 0 ? 'opacity-30 grayscale' : ''}`}
                  />
                )}
                <span className="font-mono-tabular absolute left-1 top-0.5 text-[10px] text-slate-400">
                  {idx + 1}
                </span>
                <span className="font-mono-tabular absolute bottom-0.5 right-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Player List Drawer */}
      {isMultiplayer && playersOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#060911]/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#101624] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Connected Players</h3>
                <p className="font-mono-tabular text-xs text-slate-400">
                  Invite Code: {inviteCode} · {players.length}/8 Online
                </p>
              </div>
              <button
                onClick={onTogglePlayers}
                className="rounded-lg border border-white/15 bg-[#161f33] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e2942]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0b0f17] px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {p.username} {p.id === selfId ? '(You)' : ''}
                    </span>
                    {p.isOwner && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <Crown className="h-3.5 w-3.5" />
                        Owner
                      </span>
                    )}
                  </div>

                  {isOwner && p.id !== selfId && (
                    <button
                      onClick={() => onKickPlayer(p.id)}
                      className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-950/70 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-3">
              <button
                onClick={onLeaveWorld}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
              >
                <LogOut className="h-3.5 w-3.5" />
                Leave World
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Overlay (Pointer Unlocked) */}
      {isPaused && !inventoryOpen && !chatOpen && !playersOpen && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#060911]/75 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#101624] p-6 shadow-2xl">
            <h2 className="font-display text-center text-2xl font-bold text-white">
              {worldName}
            </h2>
            <p className="mt-1 text-center text-xs text-slate-400">
              Click Resume to lock cursor and play · ESC to pause
            </p>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={onResume}
                className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400"
              >
                Resume World
              </button>

              <button
                onClick={onSaveWorld}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#161f33] py-2.5 text-sm font-semibold text-white hover:bg-[#1e2942]"
              >
                <Save className="h-4 w-4 text-emerald-400" />
                Save World Progress
              </button>

              <button
                onClick={onOpenSettings}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#161f33] py-2.5 text-sm font-semibold text-white hover:bg-[#1e2942]"
              >
                <Settings className="h-4 w-4 text-sky-400" />
                Settings
              </button>

              {/* Time of Day Quick Switch */}
              <div className="rounded-lg border border-white/10 bg-[#0b0f17] p-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Set Time of Day</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Dawn', t: 0.25 },
                    { label: 'Noon', t: 0.5 },
                    { label: 'Sunset', t: 0.75 },
                    { label: 'Night', t: 0.0 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => onSetTimeOfDay(item.t)}
                      className="rounded bg-[#161f33] py-1 text-[11px] font-semibold text-slate-200 hover:bg-sky-500 hover:text-slate-950"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onLeaveWorld}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/60 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-900"
              >
                <LogOut className="h-4 w-4" />
                Return to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
