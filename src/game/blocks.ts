export type BlockCategory =
  | 'Natural'
  | 'Wood'
  | 'Minerals'
  | 'Building'
  | 'Decorative'
  | 'Lighting'
  | 'Fantasy';

export const BLOCK_CATEGORIES: BlockCategory[] = [
  'Natural',
  'Wood',
  'Minerals',
  'Building',
  'Decorative',
  'Lighting',
  'Fantasy',
];

export type TexturePattern =
  | 'grass_top'
  | 'grass_side'
  | 'dirt'
  | 'stone'
  | 'sand'
  | 'gravel'
  | 'clay'
  | 'snow'
  | 'ice'
  | 'obsidian'
  | 'bedrock'
  | 'podzol_top'
  | 'podzol_side'
  | 'mycelium_top'
  | 'mycelium_side'
  | 'terracotta'
  | 'mossy_cobble'
  | 'sandstone_side'
  | 'sandstone_top'
  | 'basalt'
  | 'speckled'
  | 'log_top'
  | 'log_side'
  | 'planks'
  | 'leaves'
  | 'bamboo'
  | 'ore'
  | 'mineral_block'
  | 'crystal'
  | 'cobble'
  | 'bricks'
  | 'stone_bricks'
  | 'polished'
  | 'pillar'
  | 'concrete'
  | 'glass'
  | 'steel_frame'
  | 'bookshelf'
  | 'crafting_top'
  | 'crafting_side'
  | 'furnace_side'
  | 'furnace_front'
  | 'chest'
  | 'tnt'
  | 'hay'
  | 'melon'
  | 'pumpkin'
  | 'cactus'
  | 'flower'
  | 'tall_grass'
  | 'coral'
  | 'sponge'
  | 'glowstone'
  | 'sea_lantern'
  | 'lamp'
  | 'magma'
  | 'lava'
  | 'torch'
  | 'water'
  | 'runic'
  | 'prism'
  | 'scales'
  | 'ember'
  | 'flux';

export interface TextureRecipe {
  topPattern: TexturePattern;
  sidePattern: TexturePattern;
  bottomPattern: TexturePattern;
  baseColor: string;
  accentColor: string;
  secondaryColor?: string;
}

export interface BlockDefinition {
  id: number;
  key: string;
  name: string;
  category: BlockCategory;
  solid: boolean;
  transparent: boolean;
  liquid?: boolean;
  crossMesh?: boolean;
  emissiveColor?: string;
  emissiveIntensity?: number;
  hardness: number;
  dropId?: number;
  edibleHunger?: number;
  recipe: TextureRecipe;
}

export const BLOCK_IDS = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  OAK_LOG: 5,
  OAK_LEAVES: 6,
  GLASS: 7,
  WATER: 8,
  COAL_ORE: 9,
  IRON_ORE: 10,
  GOLD_ORE: 11,
  DIAMOND_ORE: 12,
  SNOW: 13,
  BRICKS: 14,
  GLOWSTONE: 15,
  OBSIDIAN: 16,
  BEDROCK: 17,
  COBBLESTONE: 18,
  OAK_PLANKS: 19,
  BIRCH_LOG: 20,
  BIRCH_LEAVES: 21,
  SPRUCE_LOG: 22,
  SPRUCE_LEAVES: 23,
  ICE: 24,
  LAVA: 25,
  TORCH_CUBE: 26,
  AMETHYST_CLUSTER: 27,
  CACTUS: 28,
  ROSE_BUSH: 29,
  DANDELION: 30,
  TALL_GRASS: 31,
  BLUE_ORCHID: 32,
  SANDSTONE: 33,
  GRAVEL: 34,
  CLAY: 35,
  MELON: 36,
  PUMPKIN: 37,
} as const;

const RAW_BLOCKS: BlockDefinition[] = [
  // ================= NATURAL (27 blocks) =================
  {
    id: 1, key: 'grass', name: 'Grass Block', category: 'Natural',
    solid: true, transparent: false, hardness: 0.6, dropId: 2,
    recipe: { topPattern: 'grass_top', sidePattern: 'grass_side', bottomPattern: 'dirt', baseColor: '#4da83b', accentColor: '#367c28', secondaryColor: '#7a5233' },
  },
  {
    id: 2, key: 'dirt', name: 'Rich Dirt', category: 'Natural',
    solid: true, transparent: false, hardness: 0.5,
    recipe: { topPattern: 'dirt', sidePattern: 'dirt', bottomPattern: 'dirt', baseColor: '#7a5233', accentColor: '#5c3c24', secondaryColor: '#926644' },
  },
  {
    id: 3, key: 'stone', name: 'Stone', category: 'Natural',
    solid: true, transparent: false, hardness: 1.5, dropId: 18,
    recipe: { topPattern: 'stone', sidePattern: 'stone', bottomPattern: 'stone', baseColor: '#7e848d', accentColor: '#636972', secondaryColor: '#969ca6' },
  },
  {
    id: 4, key: 'sand', name: 'Golden Sand', category: 'Natural',
    solid: true, transparent: false, hardness: 0.5,
    recipe: { topPattern: 'sand', sidePattern: 'sand', bottomPattern: 'sand', baseColor: '#e2cf93', accentColor: '#cbb472', secondaryColor: '#f0e1b0' },
  },
  {
    id: 8, key: 'water', name: 'Ocean Water', category: 'Natural',
    solid: false, transparent: true, liquid: true, hardness: 100,
    recipe: { topPattern: 'water', sidePattern: 'water', bottomPattern: 'water', baseColor: '#1d74b8', accentColor: '#38bdf8', secondaryColor: '#0e4c85' },
  },
  {
    id: 13, key: 'snow', name: 'Powder Snow', category: 'Natural',
    solid: true, transparent: false, hardness: 0.4,
    recipe: { topPattern: 'snow', sidePattern: 'snow', bottomPattern: 'snow', baseColor: '#eef6fc', accentColor: '#cfe2f2', secondaryColor: '#ffffff' },
  },
  {
    id: 16, key: 'obsidian', name: 'Obsidian', category: 'Natural',
    solid: true, transparent: false, hardness: 5.0,
    recipe: { topPattern: 'obsidian', sidePattern: 'obsidian', bottomPattern: 'obsidian', baseColor: '#1e162e', accentColor: '#3b2859', secondaryColor: '#0e0a17' },
  },
  {
    id: 17, key: 'bedrock', name: 'Bedrock', category: 'Natural',
    solid: true, transparent: false, hardness: 999,
    recipe: { topPattern: 'bedrock', sidePattern: 'bedrock', bottomPattern: 'bedrock', baseColor: '#2c2f36', accentColor: '#17191d', secondaryColor: '#484c56' },
  },
  {
    id: 24, key: 'ice', name: 'Glacial Ice', category: 'Natural',
    solid: true, transparent: true, hardness: 0.7,
    recipe: { topPattern: 'ice', sidePattern: 'ice', bottomPattern: 'ice', baseColor: '#8ad4f5', accentColor: '#bfe9fc', secondaryColor: '#5eb6e2' },
  },
  {
    id: 33, key: 'sandstone', name: 'Sandstone', category: 'Natural',
    solid: true, transparent: false, hardness: 1.2,
    recipe: { topPattern: 'sandstone_top', sidePattern: 'sandstone_side', bottomPattern: 'sandstone_top', baseColor: '#d9c282', accentColor: '#baa05c', secondaryColor: '#ead9a4' },
  },
  {
    id: 34, key: 'gravel', name: 'River Gravel', category: 'Natural',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'gravel', sidePattern: 'gravel', bottomPattern: 'gravel', baseColor: '#7b7877', accentColor: '#595655', secondaryColor: '#9b9694' },
  },
  {
    id: 35, key: 'clay', name: 'Potter Clay', category: 'Natural',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'clay', sidePattern: 'clay', bottomPattern: 'clay', baseColor: '#9ca3b5', accentColor: '#80889c', secondaryColor: '#b4bccf' },
  },
  {
    id: 38, key: 'packed_ice', name: 'Packed Ice', category: 'Natural',
    solid: true, transparent: false, hardness: 0.9,
    recipe: { topPattern: 'ice', sidePattern: 'ice', bottomPattern: 'ice', baseColor: '#69b4e3', accentColor: '#9fd4f5', secondaryColor: '#4a93c4' },
  },
  {
    id: 39, key: 'podzol', name: 'Forest Podzol', category: 'Natural',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'podzol_top', sidePattern: 'podzol_side', bottomPattern: 'dirt', baseColor: '#6a4726', accentColor: '#4a3119', secondaryColor: '#875c35' },
  },
  {
    id: 40, key: 'mycelium', name: 'Mycelium', category: 'Natural',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'mycelium_top', sidePattern: 'mycelium_side', bottomPattern: 'dirt', baseColor: '#766173', accentColor: '#564354', secondaryColor: '#7a5233' },
  },
  {
    id: 41, key: 'terracotta', name: 'Terracotta', category: 'Natural',
    solid: true, transparent: false, hardness: 1.2,
    recipe: { topPattern: 'terracotta', sidePattern: 'terracotta', bottomPattern: 'terracotta', baseColor: '#9b5c42', accentColor: '#7d4530', secondaryColor: '#b37054' },
  },
  {
    id: 42, key: 'mossy_cobble', name: 'Mossy Cobblestone', category: 'Natural',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'mossy_cobble', sidePattern: 'mossy_cobble', bottomPattern: 'mossy_cobble', baseColor: '#6f7775', accentColor: '#487e3c', secondaryColor: '#545b5a' },
  },
  {
    id: 43, key: 'red_sand', name: 'Red Desert Sand', category: 'Natural',
    solid: true, transparent: false, hardness: 0.5,
    recipe: { topPattern: 'sand', sidePattern: 'sand', bottomPattern: 'sand', baseColor: '#be6733', accentColor: '#9b4f22', secondaryColor: '#d97f47' },
  },
  {
    id: 44, key: 'red_sandstone', name: 'Red Sandstone', category: 'Natural',
    solid: true, transparent: false, hardness: 1.2,
    recipe: { topPattern: 'sandstone_top', sidePattern: 'sandstone_side', bottomPattern: 'sandstone_top', baseColor: '#b35b2a', accentColor: '#8f441c', secondaryColor: '#cc713d' },
  },
  {
    id: 45, key: 'basalt', name: 'Volcanic Basalt', category: 'Natural',
    solid: true, transparent: false, hardness: 1.6,
    recipe: { topPattern: 'basalt', sidePattern: 'basalt', bottomPattern: 'basalt', baseColor: '#44464e', accentColor: '#2d2f36', secondaryColor: '#5b5e68' },
  },
  {
    id: 46, key: 'granite', name: 'Raw Granite', category: 'Natural',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'speckled', sidePattern: 'speckled', bottomPattern: 'speckled', baseColor: '#9c6c5d', accentColor: '#754d41', secondaryColor: '#bf8f80' },
  },
  {
    id: 47, key: 'diorite', name: 'Raw Diorite', category: 'Natural',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'speckled', sidePattern: 'speckled', bottomPattern: 'speckled', baseColor: '#c5c7cc', accentColor: '#8e9199', secondaryColor: '#e4e6eb' },
  },
  {
    id: 48, key: 'andesite', name: 'Raw Andesite', category: 'Natural',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'speckled', sidePattern: 'speckled', bottomPattern: 'speckled', baseColor: '#86898f', accentColor: '#666970', secondaryColor: '#a4a7ad' },
  },
  {
    id: 49, key: 'tuff', name: 'Ash Tuff', category: 'Natural',
    solid: true, transparent: false, hardness: 1.4,
    recipe: { topPattern: 'stone', sidePattern: 'stone', bottomPattern: 'stone', baseColor: '#696c62', accentColor: '#4f5249', secondaryColor: '#818578' },
  },
  {
    id: 50, key: 'dripstone', name: 'Dripstone Block', category: 'Natural',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'speckled', sidePattern: 'speckled', bottomPattern: 'speckled', baseColor: '#8c7260', accentColor: '#695142', secondaryColor: '#a58a77' },
  },
  {
    id: 51, key: 'calcite', name: 'White Calcite', category: 'Natural',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'stone', sidePattern: 'stone', bottomPattern: 'stone', baseColor: '#e0e2dc', accentColor: '#c0c4ba', secondaryColor: '#f4f5f0' },
  },
  {
    id: 52, key: 'mud', name: 'Wet Mud', category: 'Natural',
    solid: true, transparent: false, hardness: 0.5,
    recipe: { topPattern: 'dirt', sidePattern: 'dirt', bottomPattern: 'dirt', baseColor: '#3b373e', accentColor: '#29252b', secondaryColor: '#4e4952' },
  },

  // ================= WOOD (22 blocks) =================
  {
    id: 5, key: 'oak_log', name: 'Oak Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#6b4d2e', accentColor: '#4a331d', secondaryColor: '#c29b61' },
  },
  {
    id: 19, key: 'oak_planks', name: 'Oak Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#b58a52', accentColor: '#8a6434', secondaryColor: '#cca268' },
  },
  {
    id: 6, key: 'oak_leaves', name: 'Oak Leaves', category: 'Wood',
    solid: true, transparent: true, hardness: 0.3,
    recipe: { topPattern: 'leaves', sidePattern: 'leaves', bottomPattern: 'leaves', baseColor: '#3d8732', accentColor: '#275c1f', secondaryColor: '#56a649' },
  },
  {
    id: 20, key: 'birch_log', name: 'Birch Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#dcd9d0', accentColor: '#383836', secondaryColor: '#c8b482' },
  },
  {
    id: 53, key: 'birch_planks', name: 'Birch Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#d4c38e', accentColor: '#b09d66', secondaryColor: '#e4d5a6' },
  },
  {
    id: 21, key: 'birch_leaves', name: 'Birch Leaves', category: 'Wood',
    solid: true, transparent: true, hardness: 0.3,
    recipe: { topPattern: 'leaves', sidePattern: 'leaves', bottomPattern: 'leaves', baseColor: '#5f9945', accentColor: '#406e2c', secondaryColor: '#7cb560' },
  },
  {
    id: 22, key: 'spruce_log', name: 'Spruce Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#422d1a', accentColor: '#291a0e', secondaryColor: '#916e47' },
  },
  {
    id: 54, key: 'spruce_planks', name: 'Spruce Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#755331', accentColor: '#543a1f', secondaryColor: '#8d6741' },
  },
  {
    id: 23, key: 'spruce_leaves', name: 'Spruce Needles', category: 'Wood',
    solid: true, transparent: true, hardness: 0.3,
    recipe: { topPattern: 'leaves', sidePattern: 'leaves', bottomPattern: 'leaves', baseColor: '#2c593e', accentColor: '#1b3b28', secondaryColor: '#407555' },
  },
  {
    id: 55, key: 'jungle_log', name: 'Jungle Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#594524', accentColor: '#3a4a24', secondaryColor: '#a67b4d' },
  },
  {
    id: 56, key: 'jungle_planks', name: 'Jungle Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#aa7753', accentColor: '#825638', secondaryColor: '#c28e69' },
  },
  {
    id: 57, key: 'acacia_log', name: 'Acacia Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#69625b', accentColor: '#47423c', secondaryColor: '#b56138' },
  },
  {
    id: 58, key: 'acacia_planks', name: 'Acacia Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#b86237', accentColor: '#8f4722', secondaryColor: '#d1784b' },
  },
  {
    id: 59, key: 'dark_oak_log', name: 'Dark Oak Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.2,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#3a2a1b', accentColor: '#24180e', secondaryColor: '#694e35' },
  },
  {
    id: 60, key: 'dark_oak_planks', name: 'Dark Oak Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#47301b', accentColor: '#2e1e0f', secondaryColor: '#5c4026' },
  },
  {
    id: 61, key: 'cherry_log', name: 'Cherry Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#473238', accentColor: '#2e1d22', secondaryColor: '#d998a3' },
  },
  {
    id: 62, key: 'cherry_planks', name: 'Cherry Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#e2a6b2', accentColor: '#bd7c89', secondaryColor: '#f0bfc9' },
  },
  {
    id: 63, key: 'cherry_leaves', name: 'Cherry Blossoms', category: 'Wood',
    solid: true, transparent: true, hardness: 0.3,
    recipe: { topPattern: 'leaves', sidePattern: 'leaves', bottomPattern: 'leaves', baseColor: '#f2a2bc', accentColor: '#cf7492', secondaryColor: '#ffc9db' },
  },
  {
    id: 64, key: 'mangrove_log', name: 'Mangrove Log', category: 'Wood',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#5c4338', accentColor: '#3e2b23', secondaryColor: '#8f4038' },
  },
  {
    id: 65, key: 'mangrove_planks', name: 'Mangrove Planks', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'planks', bottomPattern: 'planks', baseColor: '#853c36', accentColor: '#612722', secondaryColor: '#a14f48' },
  },
  {
    id: 66, key: 'bamboo_block', name: 'Bamboo Block', category: 'Wood',
    solid: true, transparent: false, hardness: 0.9,
    recipe: { topPattern: 'log_top', sidePattern: 'bamboo', bottomPattern: 'log_top', baseColor: '#7ea83e', accentColor: '#567824', secondaryColor: '#a6cc5c' },
  },
  {
    id: 67, key: 'stripped_oak', name: 'Stripped Oak', category: 'Wood',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'log_top', sidePattern: 'planks', bottomPattern: 'log_top', baseColor: '#c49b60', accentColor: '#a07943', secondaryColor: '#d9b37a' },
  },

  // ================= MINERALS (18 blocks) =================
  {
    id: 9, key: 'coal_ore', name: 'Coal Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 1.8,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#1d1f24', secondaryColor: '#5e636b' },
  },
  {
    id: 10, key: 'iron_ore', name: 'Iron Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.0,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#d4ad90', secondaryColor: '#9e7558' },
  },
  {
    id: 11, key: 'gold_ore', name: 'Gold Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.2,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#f5c73d', secondaryColor: '#b88614' },
  },
  {
    id: 12, key: 'diamond_ore', name: 'Diamond Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.6,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#48e5f0', secondaryColor: '#179ea8' },
  },
  {
    id: 68, key: 'emerald_ore', name: 'Emerald Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.5,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#2de068', secondaryColor: '#138a3b' },
  },
  {
    id: 69, key: 'redstone_ore', name: 'Redstone Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.2, emissiveColor: '#8c1111', emissiveIntensity: 0.3,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#ef3232', secondaryColor: '#991515' },
  },
  {
    id: 70, key: 'lapis_ore', name: 'Lapis Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.1,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#2a62db', secondaryColor: '#17388a' },
  },
  {
    id: 71, key: 'copper_ore', name: 'Copper Ore', category: 'Minerals',
    solid: true, transparent: false, hardness: 1.8,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#7a8088', accentColor: '#d97648', secondaryColor: '#479c84' },
  },
  {
    id: 27, key: 'amethyst_cluster', name: 'Amethyst Crystal', category: 'Minerals',
    solid: true, transparent: false, hardness: 1.5, emissiveColor: '#7e3ff2', emissiveIntensity: 0.45,
    recipe: { topPattern: 'crystal', sidePattern: 'crystal', bottomPattern: 'crystal', baseColor: '#7c45ba', accentColor: '#c88cff', secondaryColor: '#4f2482' },
  },
  {
    id: 72, key: 'crystal_quartz', name: 'Crystal Quartz', category: 'Minerals',
    solid: true, transparent: false, hardness: 1.4, emissiveColor: '#b8d8f8', emissiveIntensity: 0.25,
    recipe: { topPattern: 'crystal', sidePattern: 'crystal', bottomPattern: 'crystal', baseColor: '#d7e8f7', accentColor: '#ffffff', secondaryColor: '#9bc0e0' },
  },
  {
    id: 73, key: 'coal_block', name: 'Block of Coal', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.2,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#202229', accentColor: '#363945', secondaryColor: '#121317' },
  },
  {
    id: 74, key: 'iron_block', name: 'Block of Iron', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.6,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#d8dde6', accentColor: '#f2f5fa', secondaryColor: '#9aa2b0' },
  },
  {
    id: 75, key: 'gold_block', name: 'Block of Gold', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.6,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#f5c531', accentColor: '#fff08a', secondaryColor: '#bd8811' },
  },
  {
    id: 76, key: 'diamond_block', name: 'Block of Diamond', category: 'Minerals',
    solid: true, transparent: false, hardness: 3.2,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#48dce6', accentColor: '#a6f9ff', secondaryColor: '#1b99a3' },
  },
  {
    id: 77, key: 'emerald_block', name: 'Block of Emerald', category: 'Minerals',
    solid: true, transparent: false, hardness: 3.0,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#26cc5e', accentColor: '#82ffad', secondaryColor: '#118036' },
  },
  {
    id: 78, key: 'copper_block', name: 'Block of Copper', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.4,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#c76842', accentColor: '#e88d68', secondaryColor: '#8c4123' },
  },
  {
    id: 79, key: 'amethyst_block', name: 'Block of Amethyst', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.0,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#864dc4', accentColor: '#b782f2', secondaryColor: '#58298c' },
  },
  {
    id: 80, key: 'lapis_block', name: 'Lapis Lazuli Block', category: 'Minerals',
    solid: true, transparent: false, hardness: 2.4,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#214ea8', accentColor: '#4a7ce0', secondaryColor: '#133170' },
  },

  // ================= BUILDING (24 blocks) =================
  {
    id: 18, key: 'cobblestone', name: 'Cobblestone', category: 'Building',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'cobble', sidePattern: 'cobble', bottomPattern: 'cobble', baseColor: '#797d85', accentColor: '#52565e', secondaryColor: '#989ca6' },
  },
  {
    id: 81, key: 'stone_bricks', name: 'Stone Bricks', category: 'Building',
    solid: true, transparent: false, hardness: 1.6,
    recipe: { topPattern: 'stone_bricks', sidePattern: 'stone_bricks', bottomPattern: 'stone_bricks', baseColor: '#7d828a', accentColor: '#545861', secondaryColor: '#999fa8' },
  },
  {
    id: 82, key: 'mossy_stone_bricks', name: 'Mossy Stone Bricks', category: 'Building',
    solid: true, transparent: false, hardness: 1.6,
    recipe: { topPattern: 'stone_bricks', sidePattern: 'stone_bricks', bottomPattern: 'stone_bricks', baseColor: '#747c78', accentColor: '#467a3a', secondaryColor: '#545958' },
  },
  {
    id: 83, key: 'cracked_stone_bricks', name: 'Cracked Bricks', category: 'Building',
    solid: true, transparent: false, hardness: 1.4,
    recipe: { topPattern: 'stone_bricks', sidePattern: 'stone_bricks', bottomPattern: 'stone_bricks', baseColor: '#70747c', accentColor: '#373a40', secondaryColor: '#8d929c' },
  },
  {
    id: 14, key: 'bricks', name: 'Clay Bricks', category: 'Building',
    solid: true, transparent: false, hardness: 1.6,
    recipe: { topPattern: 'bricks', sidePattern: 'bricks', bottomPattern: 'bricks', baseColor: '#9c4b39', accentColor: '#c9c0b5', secondaryColor: '#753324' },
  },
  {
    id: 84, key: 'smooth_stone', name: 'Smooth Stone', category: 'Building',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'polished', sidePattern: 'polished', bottomPattern: 'polished', baseColor: '#989ca3', accentColor: '#72767d', secondaryColor: '#b6bac2' },
  },
  {
    id: 85, key: 'polished_granite', name: 'Polished Granite', category: 'Building',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'polished', sidePattern: 'polished', bottomPattern: 'polished', baseColor: '#9c6758', accentColor: '#734639', secondaryColor: '#ba8272' },
  },
  {
    id: 86, key: 'polished_diorite', name: 'Polished Diorite', category: 'Building',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'polished', sidePattern: 'polished', bottomPattern: 'polished', baseColor: '#cfd1d6', accentColor: '#9ea1a8', secondaryColor: '#eaecf0' },
  },
  {
    id: 87, key: 'polished_andesite', name: 'Polished Andesite', category: 'Building',
    solid: true, transparent: false, hardness: 1.5,
    recipe: { topPattern: 'polished', sidePattern: 'polished', bottomPattern: 'polished', baseColor: '#84888f', accentColor: '#61656b', secondaryColor: '#a3a7b0' },
  },
  {
    id: 88, key: 'quartz_block', name: 'Quartz Block', category: 'Building',
    solid: true, transparent: false, hardness: 1.2,
    recipe: { topPattern: 'polished', sidePattern: 'polished', bottomPattern: 'polished', baseColor: '#ece8df', accentColor: '#cfc9bc', secondaryColor: '#faf7f0' },
  },
  {
    id: 89, key: 'quartz_pillar', name: 'Quartz Pillar', category: 'Building',
    solid: true, transparent: false, hardness: 1.2,
    recipe: { topPattern: 'polished', sidePattern: 'pillar', bottomPattern: 'polished', baseColor: '#ece8df', accentColor: '#cfc9bc', secondaryColor: '#faf7f0' },
  },
  {
    id: 90, key: 'concrete_white', name: 'White Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#cfd4da', accentColor: '#bcc2ca' },
  },
  {
    id: 91, key: 'concrete_red', name: 'Crimson Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#9e2626', accentColor: '#7d1b1b' },
  },
  {
    id: 92, key: 'concrete_blue', name: 'Cobalt Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#2c419c', accentColor: '#20307a' },
  },
  {
    id: 93, key: 'concrete_yellow', name: 'Amber Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#e0ad26', accentColor: '#ba8b16' },
  },
  {
    id: 94, key: 'concrete_green', name: 'Emerald Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#486927', accentColor: '#35501b' },
  },
  {
    id: 95, key: 'concrete_black', name: 'Charcoal Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#16181f', accentColor: '#0e0f14' },
  },
  {
    id: 96, key: 'concrete_orange', name: 'Sunset Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#de621f', accentColor: '#b34b14' },
  },
  {
    id: 97, key: 'concrete_purple', name: 'Violet Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#6b2a9c', accentColor: '#501c78' },
  },
  {
    id: 98, key: 'concrete_cyan', name: 'Teal Concrete', category: 'Building',
    solid: true, transparent: false, hardness: 1.3,
    recipe: { topPattern: 'concrete', sidePattern: 'concrete', bottomPattern: 'concrete', baseColor: '#1a7c8c', accentColor: '#125c69' },
  },
  {
    id: 7, key: 'glass', name: 'Clear Glass', category: 'Building',
    solid: true, transparent: true, hardness: 0.4,
    recipe: { topPattern: 'glass', sidePattern: 'glass', bottomPattern: 'glass', baseColor: '#c7f0ff', accentColor: '#ffffff', secondaryColor: '#8ad4f5' },
  },
  {
    id: 99, key: 'glass_blue', name: 'Azure Glass', category: 'Building',
    solid: true, transparent: true, hardness: 0.4,
    recipe: { topPattern: 'glass', sidePattern: 'glass', bottomPattern: 'glass', baseColor: '#3b82f6', accentColor: '#93c5fd', secondaryColor: '#1d4ed8' },
  },
  {
    id: 100, key: 'glass_amber', name: 'Amber Glass', category: 'Building',
    solid: true, transparent: true, hardness: 0.4,
    recipe: { topPattern: 'glass', sidePattern: 'glass', bottomPattern: 'glass', baseColor: '#f59e0b', accentColor: '#fde68a', secondaryColor: '#b45309' },
  },
  {
    id: 101, key: 'steel_frame', name: 'Steel Truss', category: 'Building',
    solid: true, transparent: false, hardness: 2.2,
    recipe: { topPattern: 'steel_frame', sidePattern: 'steel_frame', bottomPattern: 'steel_frame', baseColor: '#4c5666', accentColor: '#7d8899', secondaryColor: '#2a303b' },
  },

  // ================= DECORATIVE (16 blocks) =================
  {
    id: 102, key: 'bookshelf', name: 'Bookshelf', category: 'Decorative',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'planks', sidePattern: 'bookshelf', bottomPattern: 'planks', baseColor: '#b58a52', accentColor: '#9e2e2e', secondaryColor: '#2f65a8' },
  },
  {
    id: 103, key: 'crafting_table', name: 'Crafting Bench', category: 'Decorative',
    solid: true, transparent: false, hardness: 1.0,
    recipe: { topPattern: 'crafting_top', sidePattern: 'crafting_side', bottomPattern: 'planks', baseColor: '#b58a52', accentColor: '#5c3c24', secondaryColor: '#788291' },
  },
  {
    id: 104, key: 'furnace', name: 'Stone Furnace', category: 'Decorative',
    solid: true, transparent: false, hardness: 1.6,
    recipe: { topPattern: 'stone', sidePattern: 'furnace_front', bottomPattern: 'stone', baseColor: '#747880', accentColor: '#292b30', secondaryColor: '#eb6c28' },
  },
  {
    id: 105, key: 'chest', name: 'Storage Crate', category: 'Decorative',
    solid: true, transparent: false, hardness: 1.1,
    recipe: { topPattern: 'chest', sidePattern: 'chest', bottomPattern: 'chest', baseColor: '#9e6c34', accentColor: '#422c14', secondaryColor: '#d9c45b' },
  },
  {
    id: 106, key: 'tnt', name: 'Blasting TNT', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.5,
    recipe: { topPattern: 'tnt', sidePattern: 'tnt', bottomPattern: 'tnt', baseColor: '#c9342c', accentColor: '#f2f2f2', secondaryColor: '#222429' },
  },
  {
    id: 107, key: 'hay_bale', name: 'Hay Bale', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'hay', sidePattern: 'hay', bottomPattern: 'hay', baseColor: '#d1b03f', accentColor: '#9c7e20', secondaryColor: '#b5362c' },
  },
  {
    id: 36, key: 'melon', name: 'Sweet Melon', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.7, edibleHunger: 5,
    recipe: { topPattern: 'melon', sidePattern: 'melon', bottomPattern: 'melon', baseColor: '#699e33', accentColor: '#3b6116', secondaryColor: '#91c253' },
  },
  {
    id: 37, key: 'pumpkin', name: 'Harvest Pumpkin', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.7, edibleHunger: 4,
    recipe: { topPattern: 'pumpkin', sidePattern: 'pumpkin', bottomPattern: 'pumpkin', baseColor: '#d9761c', accentColor: '#9c4e0b', secondaryColor: '#4b6e24' },
  },
  {
    id: 28, key: 'cactus', name: 'Desert Cactus', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.5,
    recipe: { topPattern: 'cactus', sidePattern: 'cactus', bottomPattern: 'cactus', baseColor: '#438236', accentColor: '#28541f', secondaryColor: '#d8e3b3' },
  },
  {
    id: 29, key: 'rose_bush', name: 'Wild Rose', category: 'Decorative',
    solid: false, transparent: true, crossMesh: true, hardness: 0.1,
    recipe: { topPattern: 'flower', sidePattern: 'flower', bottomPattern: 'flower', baseColor: '#e0314b', accentColor: '#3c852d', secondaryColor: '#ff7085' },
  },
  {
    id: 30, key: 'dandelion', name: 'Dandelion', category: 'Decorative',
    solid: false, transparent: true, crossMesh: true, hardness: 0.1,
    recipe: { topPattern: 'flower', sidePattern: 'flower', bottomPattern: 'flower', baseColor: '#f5cc27', accentColor: '#428f32', secondaryColor: '#fff196' },
  },
  {
    id: 32, key: 'blue_orchid', name: 'Blue Orchid', category: 'Decorative',
    solid: false, transparent: true, crossMesh: true, hardness: 0.1,
    recipe: { topPattern: 'flower', sidePattern: 'flower', bottomPattern: 'flower', baseColor: '#2aa8f2', accentColor: '#367d39', secondaryColor: '#9ee0ff' },
  },
  {
    id: 31, key: 'tall_grass', name: 'Prairie Grass', category: 'Decorative',
    solid: false, transparent: true, crossMesh: true, hardness: 0.1,
    recipe: { topPattern: 'tall_grass', sidePattern: 'tall_grass', bottomPattern: 'tall_grass', baseColor: '#4ca638', accentColor: '#337524', secondaryColor: '#70c95b' },
  },
  {
    id: 108, key: 'coral_pink', name: 'Reef Coral Pink', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'coral', sidePattern: 'coral', bottomPattern: 'coral', baseColor: '#e35699', accentColor: '#ad2f6c', secondaryColor: '#ff96c8' },
  },
  {
    id: 109, key: 'coral_cyan', name: 'Reef Coral Cyan', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'coral', sidePattern: 'coral', bottomPattern: 'coral', baseColor: '#29b6cc', accentColor: '#187c8c', secondaryColor: '#7ae8fa' },
  },
  {
    id: 110, key: 'sponge', name: 'Sea Sponge', category: 'Decorative',
    solid: true, transparent: false, hardness: 0.6,
    recipe: { topPattern: 'sponge', sidePattern: 'sponge', bottomPattern: 'sponge', baseColor: '#cfbf3c', accentColor: '#94861e', secondaryColor: '#ebe071' },
  },

  // ================= LIGHTING (8 blocks) =================
  {
    id: 15, key: 'glowstone', name: 'Glowstone', category: 'Lighting',
    solid: true, transparent: false, hardness: 0.8, emissiveColor: '#ffcf66', emissiveIntensity: 0.85,
    recipe: { topPattern: 'glowstone', sidePattern: 'glowstone', bottomPattern: 'glowstone', baseColor: '#e0a546', accentColor: '#fff0a8', secondaryColor: '#9e6b21' },
  },
  {
    id: 111, key: 'sea_lantern', name: 'Sea Lantern', category: 'Lighting',
    solid: true, transparent: false, hardness: 0.9, emissiveColor: '#8ef5f5', emissiveIntensity: 0.8,
    recipe: { topPattern: 'sea_lantern', sidePattern: 'sea_lantern', bottomPattern: 'sea_lantern', baseColor: '#88cfcc', accentColor: '#e6ffff', secondaryColor: '#4e8f8d' },
  },
  {
    id: 112, key: 'jack_o_lantern', name: 'Jack o\'Lantern', category: 'Lighting',
    solid: true, transparent: false, hardness: 0.8, emissiveColor: '#ff9d2e', emissiveIntensity: 0.75,
    recipe: { topPattern: 'pumpkin', sidePattern: 'furnace_front', bottomPattern: 'pumpkin', baseColor: '#d9761c', accentColor: '#ffe385', secondaryColor: '#9c4e0b' },
  },
  {
    id: 113, key: 'redstone_lamp', name: 'Radiant Lamp', category: 'Lighting',
    solid: true, transparent: false, hardness: 0.9, emissiveColor: '#ffbe6b', emissiveIntensity: 0.85,
    recipe: { topPattern: 'lamp', sidePattern: 'lamp', bottomPattern: 'lamp', baseColor: '#e09a4a', accentColor: '#ffeaab', secondaryColor: '#543519' },
  },
  {
    id: 26, key: 'torch_cube', name: 'Lantern Sconce', category: 'Lighting',
    solid: true, transparent: false, hardness: 0.4, emissiveColor: '#ffb74d', emissiveIntensity: 0.9,
    recipe: { topPattern: 'torch', sidePattern: 'torch', bottomPattern: 'planks', baseColor: '#4a3828', accentColor: '#ffdf6b', secondaryColor: '#ff7b24' },
  },
  {
    id: 114, key: 'magma_block', name: 'Magma Block', category: 'Lighting',
    solid: true, transparent: false, hardness: 1.4, emissiveColor: '#ff511c', emissiveIntensity: 0.65,
    recipe: { topPattern: 'magma', sidePattern: 'magma', bottomPattern: 'magma', baseColor: '#3b2421', accentColor: '#ff7b1c', secondaryColor: '#c92f14' },
  },
  {
    id: 25, key: 'lava', name: 'Molten Lava', category: 'Lighting',
    solid: true, transparent: false, hardness: 3.0, emissiveColor: '#ff5514', emissiveIntensity: 1.0,
    recipe: { topPattern: 'lava', sidePattern: 'lava', bottomPattern: 'lava', baseColor: '#e84917', accentColor: '#ffcb3d', secondaryColor: '#a12308' },
  },
  {
    id: 115, key: 'shroomlight', name: 'Shroomlight', category: 'Lighting',
    solid: true, transparent: false, hardness: 0.7, emissiveColor: '#ffa654', emissiveIntensity: 0.75,
    recipe: { topPattern: 'glowstone', sidePattern: 'glowstone', bottomPattern: 'glowstone', baseColor: '#e88b35', accentColor: '#ffd485', secondaryColor: '#b55618' },
  },

  // ================= FANTASY (12 blocks) =================
  {
    id: 116, key: 'aetherium_crystal', name: 'Aetherium Crystal', category: 'Fantasy',
    solid: true, transparent: false, hardness: 2.4, emissiveColor: '#38e8ff', emissiveIntensity: 0.8,
    recipe: { topPattern: 'crystal', sidePattern: 'crystal', bottomPattern: 'crystal', baseColor: '#12859c', accentColor: '#75f6ff', secondaryColor: '#0b4b63' },
  },
  {
    id: 117, key: 'void_obsidian', name: 'Void Obsidian', category: 'Fantasy',
    solid: true, transparent: false, hardness: 4.0, emissiveColor: '#9b30ff', emissiveIntensity: 0.45,
    recipe: { topPattern: 'runic', sidePattern: 'runic', bottomPattern: 'runic', baseColor: '#140c21', accentColor: '#a855f7', secondaryColor: '#2e1652' },
  },
  {
    id: 118, key: 'astral_prism', name: 'Astral Prism', category: 'Fantasy',
    solid: true, transparent: false, hardness: 2.0, emissiveColor: '#f472b6', emissiveIntensity: 0.55,
    recipe: { topPattern: 'prism', sidePattern: 'prism', bottomPattern: 'prism', baseColor: '#4f3a8c', accentColor: '#f9a8d4', secondaryColor: '#60a5fa' },
  },
  {
    id: 119, key: 'starstone', name: 'Starstone', category: 'Fantasy',
    solid: true, transparent: false, hardness: 2.2, emissiveColor: '#fde047', emissiveIntensity: 0.4,
    recipe: { topPattern: 'ore', sidePattern: 'ore', bottomPattern: 'ore', baseColor: '#1e2742', accentColor: '#fef08a', secondaryColor: '#60a5fa' },
  },
  {
    id: 120, key: 'runic_slate', name: 'Runic Slate', category: 'Fantasy',
    solid: true, transparent: false, hardness: 2.0, emissiveColor: '#2dd4bf', emissiveIntensity: 0.4,
    recipe: { topPattern: 'runic', sidePattern: 'runic', bottomPattern: 'runic', baseColor: '#27303d', accentColor: '#2dd4bf', secondaryColor: '#161b24' },
  },
  {
    id: 121, key: 'dragon_scale', name: 'Dragon Scale', category: 'Fantasy',
    solid: true, transparent: false, hardness: 3.0,
    recipe: { topPattern: 'scales', sidePattern: 'scales', bottomPattern: 'scales', baseColor: '#471d3a', accentColor: '#8c2d6e', secondaryColor: '#260d1e' },
  },
  {
    id: 122, key: 'shadow_glass', name: 'Shadow Glass', category: 'Fantasy',
    solid: true, transparent: true, hardness: 0.8,
    recipe: { topPattern: 'glass', sidePattern: 'glass', bottomPattern: 'glass', baseColor: '#241838', accentColor: '#7e22ce', secondaryColor: '#0c0714' },
  },
  {
    id: 123, key: 'ember_core', name: 'Ember Core', category: 'Fantasy',
    solid: true, transparent: false, hardness: 2.2, emissiveColor: '#fb7185', emissiveIntensity: 0.75,
    recipe: { topPattern: 'ember', sidePattern: 'ember', bottomPattern: 'ember', baseColor: '#521520', accentColor: '#fb923c', secondaryColor: '#f43f5e' },
  },
  {
    id: 124, key: 'neon_flux', name: 'Neon Flux', category: 'Fantasy',
    solid: true, transparent: false, hardness: 1.5, emissiveColor: '#22d3ee', emissiveIntensity: 0.85,
    recipe: { topPattern: 'flux', sidePattern: 'flux', bottomPattern: 'flux', baseColor: '#0e2938', accentColor: '#22d3ee', secondaryColor: '#34d399' },
  },
  {
    id: 125, key: 'solarite', name: 'Solarite Alloy', category: 'Fantasy',
    solid: true, transparent: false, hardness: 2.8, emissiveColor: '#facc15', emissiveIntensity: 0.45,
    recipe: { topPattern: 'mineral_block', sidePattern: 'mineral_block', bottomPattern: 'mineral_block', baseColor: '#d99116', accentColor: '#fef08a', secondaryColor: '#854d0e' },
  },
  {
    id: 126, key: 'frostweave', name: 'Frostweave', category: 'Fantasy',
    solid: true, transparent: false, hardness: 1.2, emissiveColor: '#7dd3fc', emissiveIntensity: 0.3,
    recipe: { topPattern: 'prism', sidePattern: 'prism', bottomPattern: 'prism', baseColor: '#3b6ea5', accentColor: '#bae6fd', secondaryColor: '#1e3a5f' },
  },
  {
    id: 127, key: 'enchanted_timber', name: 'Enchanted Timber', category: 'Fantasy',
    solid: true, transparent: false, hardness: 1.4, emissiveColor: '#a78bfa', emissiveIntensity: 0.35,
    recipe: { topPattern: 'log_top', sidePattern: 'log_side', bottomPattern: 'log_top', baseColor: '#3e2d6b', accentColor: '#c4b5fd', secondaryColor: '#241845' },
  },
];

// Sort cleanly by ID so every lookup is O(1)
export const ALL_BLOCKS: BlockDefinition[] = [...RAW_BLOCKS].sort((a, b) => a.id - b.id);

export const BLOCK_BY_ID = new Map<number, BlockDefinition>();
for (const block of ALL_BLOCKS) {
  BLOCK_BY_ID.set(block.id, block);
}

export function getBlock(id: number): BlockDefinition | undefined {
  return BLOCK_BY_ID.get(id);
}

export function isBlockSolid(id: number): boolean {
  if (id === 0) return false;
  return BLOCK_BY_ID.get(id)?.solid ?? false;
}

export function isBlockTransparent(id: number): boolean {
  if (id === 0) return true;
  return BLOCK_BY_ID.get(id)?.transparent ?? false;
}

export function isBlockLiquid(id: number): boolean {
  return id === BLOCK_IDS.WATER;
}
