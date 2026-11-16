import React, { useMemo, useState } from 'react';
import { Hammer, Search, X } from 'lucide-react';
import { ALL_BLOCKS, BLOCK_CATEGORIES, BlockCategory, getBlock } from '../game/blocks';
import { CRAFTING_RECIPES, CraftingRecipe } from '../game/crafting';
import { GameMode } from '../game/storage';

interface InventoryModalProps {
  gameMode: GameMode;
  hotbar: number[];
  selectedSlot: number;
  inventoryCounts: Record<number, number>;
  iconMap: Map<number, string>;
  onSelectSlot: (slot: number) => void;
  onAssignToSlot: (slot: number, blockId: number) => void;
  onCraft: (recipe: CraftingRecipe) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  gameMode,
  hotbar,
  selectedSlot,
  inventoryCounts,
  iconMap,
  onSelectSlot,
  onAssignToSlot,
  onCraft,
  onClose,
}) => {
  const [category, setCategory] = useState<'All' | BlockCategory | 'Crafting'>('All');
  const [search, setSearch] = useState('');

  const filteredBlocks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_BLOCKS.filter((b) => {
      if (category !== 'All' && category !== 'Crafting' && b.category !== category) return false;
      if (gameMode === 'survival' && (inventoryCounts[b.id] || 0) <= 0) return false;
      if (q && !b.name.toLowerCase().includes(q) && !b.key.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, search, gameMode, inventoryCounts]);

  const canCraftRecipe = (recipe: CraftingRecipe) => {
    if (gameMode === 'creative') return true;
    return recipe.ingredients.every((ing) => (inventoryCounts[ing.blockId] || 0) >= ing.count);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#060911]/82 p-4">
      <div className="flex h-[84vh] w-full max-w-5xl flex-col rounded-xl border border-white/15 bg-[#101624] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold tracking-wide text-white">
              {gameMode === 'creative' ? 'Creative Catalog' : 'Survival Backpack'}
            </h2>
            <span className="font-mono-tabular text-xs text-slate-400">
              {gameMode === 'creative' ? `${ALL_BLOCKS.length} Blocks` : 'Collected Resources'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blocks..."
                className="w-full rounded-lg border border-white/15 bg-[#0b0f17] py-1.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400"
              />
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#161f33] text-slate-300 hover:bg-[#1e2942] hover:text-white"
              aria-label="Close inventory"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/10 px-5 py-2.5">
          <button
            onClick={() => setCategory('All')}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              category === 'All'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-[#161f33] text-slate-300 hover:bg-[#1f2b45] hover:text-white'
            }`}
          >
            All Blocks
          </button>
          {BLOCK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                category === cat
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-[#161f33] text-slate-300 hover:bg-[#1f2b45] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setCategory('Crafting')}
            className={`ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              category === 'Crafting'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-[#162925] text-emerald-300 hover:bg-[#1d3b34]'
            }`}
          >
            <Hammer className="h-3.5 w-3.5" />
            Crafting
          </button>
        </div>

        {/* Grid / Crafting Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {category === 'Crafting' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {CRAFTING_RECIPES.map((recipe) => {
                const outBlock = getBlock(recipe.outputId);
                if (!outBlock) return null;
                const craftable = canCraftRecipe(recipe);

                return (
                  <div
                    key={recipe.id}
                    className="flex flex-col justify-between rounded-lg border border-white/10 bg-[#0d1320] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={iconMap.get(outBlock.id)}
                        alt={outBlock.name}
                        className="pixelated h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">
                          {outBlock.name} <span className="font-mono-tabular text-sky-400">×{recipe.outputCount}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          {recipe.ingredients.map((ing) => {
                            const ingBlock = getBlock(ing.blockId);
                            const owned = gameMode === 'creative' ? '∞' : inventoryCounts[ing.blockId] || 0;
                            const enough = gameMode === 'creative' || (inventoryCounts[ing.blockId] || 0) >= ing.count;
                            return (
                              <span
                                key={ing.blockId}
                                className={enough ? 'text-slate-300' : 'text-rose-400'}
                              >
                                {ingBlock?.name}: {owned}/{ing.count}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => craftable && onCraft(recipe)}
                      disabled={!craftable}
                      className={`mt-3 w-full rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                        craftable
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'cursor-not-allowed bg-[#182033] text-slate-500'
                      }`}
                    >
                      {craftable ? 'Craft Item' : 'Missing Resources'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <p className="text-sm font-medium">
                {gameMode === 'survival'
                  ? 'No matching blocks collected yet. Break blocks in the world to gather resources.'
                  : 'No blocks matched your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8">
              {filteredBlocks.map((block) => {
                const count = inventoryCounts[block.id] || 0;
                const isSelected = hotbar[selectedSlot] === block.id;
                return (
                  <button
                    key={block.id}
                    onClick={() => onAssignToSlot(selectedSlot, block.id)}
                    title={`${block.name} (${block.category})`}
                    className={`group relative flex flex-col items-center rounded-lg border p-2.5 text-center transition-colors ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/15'
                        : 'border-white/10 bg-[#0c111d] hover:border-white/30 hover:bg-[#172136]'
                    }`}
                  >
                    <img
                      src={iconMap.get(block.id)}
                      alt={block.name}
                      className="pixelated h-10 w-10 transition-transform group-hover:scale-110"
                    />
                    <span className="mt-1.5 w-full truncate text-[11px] font-medium text-slate-200">
                      {block.name}
                    </span>
                    <span className="font-mono-tabular absolute right-1.5 top-1 text-[10px] font-semibold text-slate-400">
                      {gameMode === 'creative' ? '∞' : count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Hotbar Target Selector */}
        <div className="border-t border-white/10 bg-[#0b0f17] px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium text-slate-400">
              Select a hotbar slot below, then click any block above to equip it.
            </span>
            <div className="flex items-center gap-1.5">
              {hotbar.map((blockId, idx) => {
                const block = getBlock(blockId);
                const active = idx === selectedSlot;
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectSlot(idx)}
                    className={`relative flex h-12 w-12 items-center justify-center rounded-lg border transition-colors ${
                      active
                        ? 'border-sky-400 bg-sky-500/20'
                        : 'border-white/15 bg-[#131b2c] hover:border-white/35'
                    }`}
                    title={block?.name || `Slot ${idx + 1}`}
                  >
                    {block && (
                      <img src={iconMap.get(block.id)} alt={block.name} className="pixelated h-8 w-8" />
                    )}
                    <span className="font-mono-tabular absolute left-1 top-0.5 text-[10px] text-slate-400">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
