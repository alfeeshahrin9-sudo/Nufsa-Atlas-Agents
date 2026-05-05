/**
 * Core game type definitions for the Hidden Object Detective game.
 * All interfaces are designed for type-safe data-driven gameplay.
 */

// ============================================================================
// Item System Types
// ============================================================================

/**
 * Represents a collectible item in the game world.
 * Items are positioned at specific coordinates and can be detected/collected.
 */
export interface ItemData {
  /** Unique identifier for this item (e.g., "yukata", "katana") */
  id: string;
  /** Display name shown in UI (e.g., "Bloody Yukata") */
  name: string;
  /** Description text shown when player clicks the item in the list */
  description: string;
  /** World position where the item is placed */
  position: { x: number; y: number };
  /** Phaser texture key for the item sprite */
  spriteKey: string;
  /** Whether this item has been collected by the player */
  collected: boolean;
}

// ============================================================================
// Case/Level System Types
// ============================================================================

/**
 * Represents a complete case/level configuration.
 * Loaded from cases.json at game start.
 */
export interface CaseData {
  /** Location name (e.g., "Kyoto, Japan") */
  location: string;
  /** Time limit in seconds for the case */
  timeLimitSeconds: number;
  /** Number of items required to win */
  requiredItems: number;
  /** All items that can be found in this case */
  items: ItemData[];
  /** Key for the map asset to load */
  mapKey: string;
  /** Optional ambient audio track key */
  ambientAudioKey?: string;
}

/**
 * Structure of the cases.json file.
 * Maps case IDs to their configurations.
 */
export interface CasesConfig {
  [caseId: string]: CaseData;
}

// ============================================================================
// Player System Types
// ============================================================================

/**
 * The four cardinal directions the player can face.
 * Used for detection cone calculation and sprite flipping.
 */
export type FacingDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Current state of the player character.
 */
export interface PlayerState {
  /** Whether the player is currently moving */
  isMoving: boolean;
  /** Direction the player is facing (last movement direction) */
  facingDirection: FacingDirection;
  /** Movement speed in pixels per second */
  speed: number;
}

/**
 * Configuration for the player controller.
 */
export interface PlayerConfig {
  /** Starting X position */
  startX: number;
  /** Starting Y position */
  startingY: number;
  /** Movement speed */
  speed: number;
  /** Texture key for the player sprite */
  spriteKey: string;
}

// ============================================================================
// Detection System Types
// ============================================================================

/**
 * Result of a detection attempt.
 */
export interface DetectionResult {
  /** Whether an item was detected */
  found: boolean;
  /** The detected item data, if any */
  item: ItemData | null;
  /** Distance to the detected item in pixels */
  distance: number;
}

/**
 * Configuration for the detection system.
 */
export interface DetectionConfig {
  /** How far the player can detect items (in pixels) */
  range: number;
  /** Width of detection cone in degrees */
  coneAngle: number;
}

// ============================================================================
// UI System Types
// ============================================================================

/**
 * State of the item list UI entry.
 */
export interface ItemListEntry {
  /** Reference to the item data */
  item: ItemData;
  /** Container for this entry */
  container: Phaser.GameObjects.Container;
  /** Text label showing item name */
  text: Phaser.GameObjects.Text;
  /** Checkmark icon (visible when collected) */
  checkmark: Phaser.GameObjects.Text;
}

// ============================================================================
// Game Flow Types
// ============================================================================

/**
 * Possible game states.
 */
export type GameState = 'playing' | 'won' | 'lost';

/**
 * Result of a completed game.
 */
export interface GameResult {
  /** Whether the player won */
  success: boolean;
  /** Number of items found */
  itemsFound: number;
  /** Total items available */
  totalItems: number;
  /** Time remaining when game ended (in seconds) */
  timeRemaining: number;
}

// ============================================================================
// Scene Keys
// ============================================================================

/**
 * Enum for scene identification.
 * Use these keys when starting, stopping, or switching scenes.
 */
export enum SceneKeys {
  Boot = 'BootScene',
  Game = 'GameScene',
  Result = 'ResultScene',
}

// ============================================================================
// Asset Keys
// ============================================================================

/**
 * Enum for texture/asset keys.
 * Centralized to prevent typos and make refactoring easier.
 */
export enum AssetKeys {
  // Maps
  JapanMap = 'japan-map',
  JapanTileset = 'tiles-japan',

  // Character
  Player = 'player',

  // UI
  MagnifierButton = 'magnifier-btn',
  PanelBackground = 'panel-bg',

  // Items (dynamically loaded based on cases.json)
  // Format: Item_<id>

  // Audio
  AmbientJapan = 'ambient-japan',
  CollectSFX = 'collect-sfx',
  DetectSFX = 'detect-sfx',
  WinSFX = 'win-sfx',
  LoseSFX = 'lose-sfx',
}
