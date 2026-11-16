import React, { useState } from 'react';
import { Globe, KeyRound, Plus, Users, X } from 'lucide-react';
import { GameMode } from '../game/storage';

interface MultiplayerModalProps {
  defaultUsername: string;
  error: string | null;
  connecting: boolean;
  onCreatePrivateWorld: (username: string, worldName: string, seed: string, mode: GameMode) => void;
  onJoinPrivateWorld: (code: string, username: string) => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  defaultUsername,
  error,
  connecting,
  onCreatePrivateWorld,
  onJoinPrivateWorld,
  onClose,
}) => {
  const [tab, setTab] = useState<'join' | 'create'>('create');
  const [username, setUsername] = useState(defaultUsername);
  const [worldName, setWorldName] = useState('Skyline Sanctuary');
  const [seed, setSeed] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [mode, setMode] = useState<GameMode>('creative');
  const [inviteCode, setInviteCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!username.trim()) {
      setLocalError('Please enter a player username.');
      return;
    }
    onCreatePrivateWorld(
      username.trim(),
      worldName.trim() || 'Private Realm',
      seed.trim() || 'blockverse',
      mode
    );
  };

  const handleSubmitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const cleanCode = inviteCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setLocalError('Enter a valid 6-digit invitation code.');
      return;
    }
    if (!username.trim()) {
      setLocalError('Please enter a player username.');
      return;
    }
    onJoinPrivateWorld(cleanCode, username.trim());
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/85 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#101624] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-xl font-bold text-white">Online Multiplayer</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#161f33] text-slate-300 hover:text-white"
            aria-label="Close multiplayer menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#0b0f17] p-1">
            <button
              type="button"
              onClick={() => {
                setTab('create');
                setLocalError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-colors ${
                tab === 'create'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Create Private World
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('join');
                setLocalError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold transition-colors ${
                tab === 'join'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Join with Code
            </button>
          </div>

          {displayError && (
            <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/50 px-3.5 py-2.5 text-xs font-medium text-rose-200">
              {displayError}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleSubmitCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Your Username</label>
                <input
                  type="text"
                  maxLength={18}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Private World Name</label>
                <input
                  type="text"
                  maxLength={32}
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">World Seed</label>
                  <input
                    type="text"
                    maxLength={24}
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="font-mono-tabular mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Game Mode</label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMode('creative')}
                      className={`rounded-lg border py-2 text-xs font-semibold ${
                        mode === 'creative'
                          ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                          : 'border-white/10 bg-[#0b0f17] text-slate-400'
                      }`}
                    >
                      Creative
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('survival')}
                      className={`rounded-lg border py-2 text-xs font-semibold ${
                        mode === 'survival'
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-[#0b0f17] text-slate-400'
                      }`}
                    >
                      Survival
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Users className="h-4 w-4 shrink-0 text-sky-400" />
                <span>Generates a private 6-digit invite code for up to 8 friends online.</span>
              </div>

              <button
                type="submit"
                disabled={connecting}
                className="w-full rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-50"
              >
                {connecting ? 'Creating Private Realm...' : 'Launch Private Multiplayer World'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitJoin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Your Username</label>
                <input
                  type="text"
                  maxLength={18}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">6-Digit Invitation Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="482910"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono-tabular mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-4 py-3 text-center text-2xl font-bold tracking-[0.35em] text-white placeholder-slate-600 outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={connecting}
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                {connecting ? 'Connecting to World...' : 'Join Private World'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
