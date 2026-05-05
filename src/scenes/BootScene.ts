import { Scene } from 'phaser';
import { SceneKeys } from '../types/game.types';
import casesData from '../data/cases.json';

/**
 * BootScene handles all asset loading and initial setup.
 * Displays a loading screen while assets are loaded.
 * Generates placeholder textures for any missing assets.
 */
export class BootScene extends Scene {
  /** Game configuration data loaded from cases.json */
  private casesConfig: Record<string, any> = {};

  constructor() {
    super({ key: SceneKeys.Boot });
  }

  preload(): void {
    // Display loading text
    const loadingText = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 50,
      'Loading...',
      {
        fontFamily: 'GameFont, Arial, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
      }
    );
    loadingText.setOrigin(0.5);

    // Create loading bar background
    const progressBarBg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2 + 20,
      300,
      30,
      0x2a2a3e
    );
    progressBarBg.setStrokeStyle(2, 0x4a4a6a);

    // Create loading bar
    const progressBar = this.add.rectangle(
      this.scale.width / 2 - 145,
      this.scale.height / 2 + 20,
      290,
      20,
      0x4a88ff
    );

    // Listen for progress events
    this.load.on('progress', (value: number) => {
      progressBar.width = 290 * value;
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBarBg.destroy();
      loadingText.destroy();
    });

    // Store cases config
    this.casesConfig = casesData;

    // Load Tiled map and tileset
    this.load.tilemapTiledJSON('japan-map', 'assets/maps/map-japan.json');
    this.load.image('tiles-japan', 'assets/tiles/tiles-japan.png');

    // Load player spritesheet
    this.load.spritesheet('player', 'assets/character/detective.png', {
      frameWidth: 28,
      frameHeight: 28,
    });

    // Audio is optional - try to load but don't fail if missing
    this.load.audio('ambient-japan', 'assets/audio/ambient-japan.mp3');
    this.load.audio('collect-sfx', 'assets/audio/collect-sfx.mp3');
    this.load.audio('detect-sfx', 'assets/audio/detect-sfx.mp3');
    this.load.audio('win-sfx', 'assets/audio/win-sfx.mp3');
    this.load.audio('lose-sfx', 'assets/audio/lose-sfx.mp3');
  }

  create(): void {
    // Generate all placeholder textures
    this.createPlaceholderTextures();

    // Store cases config in registry for other scenes to access
    this.registry.set('casesConfig', this.casesConfig);

    // Start the game scene
    this.scene.start(SceneKeys.Game);
  }

  /**
   * Creates placeholder textures for all assets.
   * This ensures the game can run even without art assets.
   */
  private createPlaceholderTextures(): void {
    const graphics = this.make.graphics({});

    // ========================================================================
    // Tile textures (for the map)
    // ========================================================================

    // Floor tile (tatami mat style)
    graphics.clear();
    graphics.fillStyle(0x3a3a4e, 1);
    graphics.fillRect(0, 0, 32, 32);
    // Add tatami line pattern
    graphics.lineStyle(1, 0x4a4a5e, 0.5);
    graphics.strokeRect(2, 2, 28, 28);
    graphics.lineStyle(1, 0x4a4a5e, 0.3);
    for (let i = 4; i < 32; i += 8) {
      graphics.moveTo(i, 4);
      graphics.lineTo(i, 28);
    }
    graphics.strokePath();
    graphics.generateTexture('japan-tiles', 32, 32);

    // Wall tile
    graphics.clear();
    graphics.fillStyle(0x2a2a3e, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(2, 0x3a3a4e);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('wall-tile', 32, 32);

    // ========================================================================
    // Player character (detective)
    // ========================================================================
    graphics.clear();
    // Body
    graphics.fillStyle(0x4a5a7a, 1);
    graphics.fillRect(8, 12, 16, 16);
    // Head
    graphics.fillStyle(0xffdbac, 1);
    graphics.fillRect(10, 4, 12, 10);
    // Hair
    graphics.fillStyle(0x3a2a1a, 1);
    graphics.fillRect(9, 2, 14, 6);
    // Coat details
    graphics.fillStyle(0x3a4a6a, 1);
    graphics.fillRect(10, 14, 4, 12);
    graphics.fillRect(18, 14, 4, 12);
    // Generate texture
    graphics.generateTexture('player', 32, 32);

    // ========================================================================
    // Item sprites (10 unique items with different colors/shapes)
    // ========================================================================
    const itemConfigs = [
      { id: 'yukata', color: 0xff6b6b, shape: 'rectangle' },
      { id: 'katana', color: 0xc0c0c0, shape: 'line' },
      { id: 'matcha', color: 0x4ecdc4, shape: 'circle' },
      { id: 'fan', color: 0xff6b9d, shape: 'fan' },
      { id: 'mask', color: 0xffeead, shape: 'mask' },
      { id: 'scroll', color: 0xd4a574, shape: 'scroll' },
      { id: 'coin', color: 0xffd700, shape: 'coin' },
      { id: 'hairpin', color: 0x96ceb4, shape: 'pin' },
      { id: 'bell', color: 0xcd7f32, shape: 'bell' },
      { id: 'dagger', color: 0x8b4513, shape: 'dagger' },
    ];

    for (const item of itemConfigs) {
      graphics.clear();
      const centerX = 12;
      const centerY = 12;

      switch (item.shape) {
        case 'rectangle': // Yukata
          graphics.fillStyle(item.color, 1);
          graphics.fillRect(4, 4, 16, 16);
          graphics.fillStyle(0x8b0000, 1); // Blood stain
          graphics.fillRect(14, 8, 4, 6);
          break;

        case 'line': // Katana
          graphics.fillStyle(item.color, 1);
          graphics.fillRect(4, 10, 16, 4); // Blade
          graphics.fillStyle(0x8b4513, 1);
          graphics.fillRect(2, 8, 4, 8); // Handle
          break;

        case 'circle': // Matcha bowl
          graphics.fillStyle(item.color, 1);
          graphics.fillCircle(centerX, centerY, 8);
          graphics.fillStyle(0x2d5a4a, 1); // Tea inside
          graphics.fillCircle(centerX, centerY, 5);
          break;

        case 'fan':
          graphics.fillStyle(item.color, 1);
          graphics.fillTriangle(4, 12, 20, 8, 20, 16);
          graphics.lineStyle(1, 0xffffff, 0.5);
          graphics.moveTo(4, 12);
          graphics.lineTo(20, 8);
          graphics.moveTo(4, 12);
          graphics.lineTo(20, 12);
          graphics.moveTo(4, 12);
          graphics.lineTo(20, 16);
          graphics.strokePath();
          break;

        case 'mask': // Kitsune mask
          graphics.fillStyle(item.color, 1);
          graphics.fillEllipse(centerX, centerY, 14, 18);
          graphics.fillStyle(0xff4444, 1); // Red markings
          graphics.fillTriangle(8, 4, 12, 2, 16, 4);
          graphics.fillTriangle(8, 20, 12, 22, 16, 20);
          graphics.fillStyle(0x000000, 1); // Eyes
          graphics.fillRect(8, 8, 3, 3);
          graphics.fillRect(13, 8, 3, 3);
          break;

        case 'scroll':
          graphics.fillStyle(item.color, 1);
          graphics.fillRect(4, 2, 16, 20);
          graphics.fillStyle(0x8b6f47, 1); // Scroll ends
          graphics.fillRect(2, 2, 4, 4);
          graphics.fillRect(2, 18, 4, 4);
          graphics.fillRect(18, 2, 4, 4);
          graphics.fillRect(18, 18, 4, 4);
          break;

        case 'coin': // Koban coin
          graphics.fillStyle(item.color, 1);
          graphics.fillEllipse(centerX, centerY, 12, 18);
          graphics.lineStyle(2, 0xdaa520, 0.5);
          graphics.strokeEllipse(centerX, centerY, 8, 14);
          break;

        case 'pin': // Hairpin
          graphics.fillStyle(item.color, 1);
          graphics.fillRect(10, 4, 4, 16);
          graphics.fillStyle(0x228b22, 1); // Jade flower
          graphics.fillCircle(12, 4, 5);
          break;

        case 'bell':
          graphics.fillStyle(item.color, 1);
          graphics.fillCircle(centerX, 10, 8);
          graphics.fillRect(10, 18, 4, 4);
          graphics.fillStyle(0x000000, 1);
          graphics.fillCircle(centerX, 10, 3); // Hole
          break;

        case 'dagger':
          graphics.fillStyle(item.color, 1); // Handle
          graphics.fillRect(4, 10, 8, 6);
          graphics.fillStyle(0x708090, 1); // Blade
          graphics.fillTriangle(12, 10, 22, 13, 12, 16);
          graphics.fillStyle(0x8b0000, 1); // Blood
          graphics.fillRect(18, 12, 3, 3);
          break;
      }

      graphics.generateTexture(`item_${item.id}`, 24, 24);
    }

    // ========================================================================
    // UI elements
    // ========================================================================

    // Magnifier button
    graphics.clear();
    graphics.fillStyle(0x4a4a6a, 1);
    graphics.fillCircle(40, 40, 38);
    graphics.lineStyle(3, 0x6a6a8a);
    graphics.strokeCircle(40, 40, 38);
    // Glass
    graphics.fillStyle(0x88ccff, 0.7);
    graphics.fillCircle(35, 35, 22);
    graphics.lineStyle(2, 0xaaddff);
    graphics.strokeCircle(35, 35, 22);
    // Handle
    graphics.fillStyle(0x6a5a4a, 1);
    graphics.fillRect(50, 50, 10, 18);
    graphics.generateTexture('magnifier-btn', 80, 80);

    // Panel background (seamless tileable)
    graphics.clear();
    graphics.fillStyle(0x1a1a2e, 0.95);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(1, 0x2a2a3e);
    graphics.strokeRect(0, 0, 32, 32);
    graphics.generateTexture('panel-bg', 32, 32);

    // Checkmark
    graphics.clear();
    graphics.lineStyle(4, 0x00ff00);
    graphics.moveTo(4, 12);
    graphics.lineTo(10, 18);
    graphics.lineTo(20, 6);
    graphics.strokePath();
    graphics.generateTexture('checkmark', 24, 24);

    graphics.destroy();
  }
}
