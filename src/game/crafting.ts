import { BLOCK_IDS } from './blocks';

export interface CraftingIngredient {
  blockId: number;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  outputId: number;
  outputCount: number;
  ingredients: CraftingIngredient[];
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'oak_planks',
    outputId: BLOCK_IDS.OAK_PLANKS,
    outputCount: 4,
    ingredients: [{ blockId: BLOCK_IDS.OAK_LOG, count: 1 }],
  },
  {
    id: 'birch_planks',
    outputId: 53,
    outputCount: 4,
    ingredients: [{ blockId: BLOCK_IDS.BIRCH_LOG, count: 1 }],
  },
  {
    id: 'spruce_planks',
    outputId: 54,
    outputCount: 4,
    ingredients: [{ blockId: BLOCK_IDS.SPRUCE_LOG, count: 1 }],
  },
  {
    id: 'cherry_planks',
    outputId: 62,
    outputCount: 4,
    ingredients: [{ blockId: 61, count: 1 }],
  },
  {
    id: 'crafting_table',
    outputId: 103,
    outputCount: 1,
    ingredients: [{ blockId: BLOCK_IDS.OAK_PLANKS, count: 4 }],
  },
  {
    id: 'chest',
    outputId: 105,
    outputCount: 1,
    ingredients: [{ blockId: BLOCK_IDS.OAK_PLANKS, count: 6 }],
  },
  {
    id: 'bookshelf',
    outputId: 102,
    outputCount: 1,
    ingredients: [{ blockId: BLOCK_IDS.OAK_PLANKS, count: 6 }],
  },
  {
    id: 'torch_cube',
    outputId: BLOCK_IDS.TORCH_CUBE,
    outputCount: 4,
    ingredients: [
      { blockId: BLOCK_IDS.COAL_ORE, count: 1 },
      { blockId: BLOCK_IDS.OAK_PLANKS, count: 1 },
    ],
  },
  {
    id: 'furnace',
    outputId: 104,
    outputCount: 1,
    ingredients: [{ blockId: BLOCK_IDS.COBBLESTONE, count: 8 }],
  },
  {
    id: 'stone_bricks',
    outputId: 81,
    outputCount: 4,
    ingredients: [{ blockId: BLOCK_IDS.COBBLESTONE, count: 4 }],
  },
  {
    id: 'bricks',
    outputId: BLOCK_IDS.BRICKS,
    outputCount: 4,
    ingredients: [{ blockId: BLOCK_IDS.CLAY, count: 4 }],
  },
  {
    id: 'glass',
    outputId: BLOCK_IDS.GLASS,
    outputCount: 4,
    ingredients: [{ blockId: BLOCK_IDS.SAND, count: 4 }],
  },
  {
    id: 'sandstone',
    outputId: BLOCK_IDS.SANDSTONE,
    outputCount: 2,
    ingredients: [{ blockId: BLOCK_IDS.SAND, count: 4 }],
  },
  {
    id: 'iron_block',
    outputId: 74,
    outputCount: 1,
    ingredients: [
      { blockId: BLOCK_IDS.IRON_ORE, count: 3 },
      { blockId: BLOCK_IDS.COAL_ORE, count: 1 },
    ],
  },
  {
    id: 'gold_block',
    outputId: 75,
    outputCount: 1,
    ingredients: [
      { blockId: BLOCK_IDS.GOLD_ORE, count: 3 },
      { blockId: BLOCK_IDS.COAL_ORE, count: 1 },
    ],
  },
  {
    id: 'diamond_block',
    outputId: 76,
    outputCount: 1,
    ingredients: [{ blockId: BLOCK_IDS.DIAMOND_ORE, count: 3 }],
  },
  {
    id: 'glowstone',
    outputId: BLOCK_IDS.GLOWSTONE,
    outputCount: 2,
    ingredients: [
      { blockId: BLOCK_IDS.GOLD_ORE, count: 1 },
      { blockId: BLOCK_IDS.TORCH_CUBE, count: 2 },
    ],
  },
  {
    id: 'sea_lantern',
    outputId: 111,
    outputCount: 2,
    ingredients: [
      { blockId: BLOCK_IDS.GLASS, count: 2 },
      { blockId: BLOCK_IDS.GLOWSTONE, count: 1 },
    ],
  },
  {
    id: 'aetherium_crystal',
    outputId: 116,
    outputCount: 2,
    ingredients: [
      { blockId: BLOCK_IDS.AMETHYST_CLUSTER, count: 2 },
      { blockId: BLOCK_IDS.DIAMOND_ORE, count: 1 },
    ],
  },
];
