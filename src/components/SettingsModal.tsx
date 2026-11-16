import React, { useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { GameSettings } from '../game/storage';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // ignore fullscreen errors in sandboxed iframes
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/85 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-white/15 bg-[#101624] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="font-display text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#161f33] text-slate-300 hover:text-white"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {/* Player Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300">Player Username</label>
            <input
              type="text"
              maxLength={18}
              value={settings.username}
              onChange={(e) => onChange({ ...settings, username: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#0b0f17] px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
            />
          </div>

          {/* Graphics Quality */}
          <div>
            <label className="block text-xs font-semibold text-slate-300">Graphics Quality</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onChange({ ...settings, graphicsQuality: q })}
                  className={`rounded-lg border py-2 text-xs font-semibold capitalize transition-colors ${
                    settings.graphicsQuality === q
                      ? 'border-sky-400 bg-sky-500 text-slate-950'
                      : 'border-white/10 bg-[#0b0f17] text-slate-300 hover:border-white/25'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Sound Volume</span>
                <span className="font-mono-tabular text-sky-400">{Math.round(settings.soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.soundVolume}
                onChange={(e) => onChange({ ...settings, soundVolume: Number(e.target.value) })}
                className="mt-2 w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Mouse Sensitivity</span>
                <span className="font-mono-tabular text-sky-400">{settings.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.5}
                step={0.1}
                value={settings.mouseSensitivity}
                onChange={(e) => onChange({ ...settings, mouseSensitivity: Number(e.target.value) })}
                className="mt-2 w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Render Distance</span>
                <span className="font-mono-tabular text-sky-400">{settings.renderDistance} Chunks</span>
              </div>
              <input
                type="range"
                min={3}
                max={8}
                step={1}
                value={settings.renderDistance}
                onChange={(e) => onChange({ ...settings, renderDistance: Number(e.target.value) })}
                className="mt-2 w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Field of View</span>
                <span className="font-mono-tabular text-sky-400">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min={60}
                max={105}
                step={5}
                value={settings.fov}
                onChange={(e) => onChange({ ...settings, fov: Number(e.target.value) })}
                className="mt-2 w-full accent-sky-400"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => onChange({ ...settings, showFps: !settings.showFps })}
              className={`rounded-lg border px-3 py-2.5 text-xs font-semibold ${
                settings.showFps
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/10 bg-[#0b0f17] text-slate-400'
              }`}
            >
              FPS Counter: {settings.showFps ? 'On' : 'Off'}
            </button>

            <button
              onClick={() => onChange({ ...settings, invertY: !settings.invertY })}
              className={`rounded-lg border px-3 py-2.5 text-xs font-semibold ${
                settings.invertY
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-300'
                  : 'border-white/10 bg-[#0b0f17] text-slate-400'
              }`}
            >
              Invert Y: {settings.invertY ? 'On' : 'Off'}
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#161f33] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#1e2942]"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>

          {/* Controls Summary */}
          <div className="rounded-lg border border-white/10 bg-[#0b0f17] p-4">
            <div className="text-xs font-semibold text-slate-300">Controls</div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-400 sm:grid-cols-3">
              <div><span className="font-mono-tabular text-slate-200">WASD</span> Move</div>
              <div><span className="font-mono-tabular text-slate-200">SPACE</span> Jump / Swim</div>
              <div><span className="font-mono-tabular text-slate-200">SHIFT</span> Sprint</div>
              <div><span className="font-mono-tabular text-slate-200">Left Click</span> Break Block</div>
              <div><span className="font-mono-tabular text-slate-200">Right Click</span> Place / Eat</div>
              <div><span className="font-mono-tabular text-slate-200">1-9 / Wheel</span> Select Slot</div>
              <div><span className="font-mono-tabular text-slate-200">E</span> Inventory & Craft</div>
              <div><span className="font-mono-tabular text-slate-200">T / Enter</span> Chat</div>
              <div><span className="font-mono-tabular text-slate-200">P</span> Player List</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg bg-sky-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
