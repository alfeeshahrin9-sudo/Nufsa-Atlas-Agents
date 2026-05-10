import { Scene } from 'phaser';
import { SceneKeys, CaseData, ItemData } from '../types/game.types';
import { PlayerController } from '../system/PlayerController';
import { ItemManager } from '../system/ItemManager';
import { UIManager } from '../system/UIManager';
import { getAudioManager } from '../system/AudioManager';

/**
 * GameScene is the main gameplay scene.
 * Handles player movement, item detection, collection, and win/lose conditions.
 */
export class GameScene extends Scene {
  /** Current case configuration */
  private caseData: CaseData | null = null;

  /** Player controller instance */
  private player: PlayerController | null = null;

  /** Item manager instance */
  private itemManager: ItemManager | null = null;

  /** UI manager instance */
  private ui: UIManager | null = null;

  /** Audio manager instance */
  private audio = getAudioManager();

  /** Time remaining in seconds */
  private timeRemaining: number = 300;

  /** Timer event for countdown */
  private timerEvent: Phaser.Time.TimerEvent | null = null;

  /** Whether the game is paused (e.g., modal open) */
  private isPaused: boolean = false;

  /** Tilemap reference */
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;

  /** Collision layer reference */
  private collisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  constructor() {
    super({ key: SceneKeys.Game });
  }

  create(): void {
    // Initialize audio manager with this scene
    this.audio.init(this);

    // Get case data from registry
    const casesConfig = this.registry.get('casesConfig') as Record<string, any>;
    this.caseData = casesConfig['japan'] as CaseData;

    if (!this.caseData) {
      console.error('No case data found!');
      return;
    }

    // Initialize time
    this.timeRemaining = this.caseData.timeLimitSeconds;

    // Create the map (with fallback to procedural generation)
    this.createMap();

    // Create player
    this.createPlayer();

    // Create item manager
    this.itemManager = new ItemManager(this, [...this.caseData.items]);

    // Create UI
    this.ui = new UIManager(this);
    this.ui.populateItemList(this, this.caseData.items);
    this.ui.updateTimer(this.timeRemaining);

    // Wire up callbacks
    this.wireCallbacks();

    // Start countdown timer
    this.startTimer();

    // Start background music
    if (this.caseData.ambientAudioKey) {
      this.audio.playMusic(this.caseData.ambientAudioKey);
    }

    // Track input for idle detection
    this.input.on('pointerdown', () => {
      // Could track for idle detection if needed
    });
  }

  /**
   * Creates the game map from Tiled tilemap.
   */
  private createMap(): void {
    // -----------------------------------------------------------------------
    // Japan map (kept for reference, currently disabled in favor of autumn)
    // -----------------------------------------------------------------------
    // this.tilemap = this.make.tilemap({ key: 'japan-map' });
    // const tileset = this.tilemap.addTilesetImage('tiles-japan', 'tiles-japan');
    // if (!tileset) {
    //   console.error('Failed to add tileset image');
    //   return;
    // }
    // const groundLayer = this.tilemap.createLayer('Ground', tileset, 0, 0);
    // const behindLayer = this.tilemap.createLayer('Behind', tileset, 0, 0);
    // const buildingsLayer = this.tilemap.createLayer('Buildings', tileset, 0, 0);
    // const decorationsLayer = this.tilemap.createLayer('Decorations', tileset, 0, 0);
    // if (groundLayer) groundLayer.setDepth(-2);
    // if (behindLayer) behindLayer.setDepth(10);
    // if (buildingsLayer) buildingsLayer.setDepth(0);
    // if (decorationsLayer) decorationsLayer.setDepth(1);
    // this.collisionLayer = this.tilemap.createLayer('Collision', tileset, 0, 0);
    // if (this.collisionLayer) {
    //   this.collisionLayer.setVisible(false);
    //   this.collisionLayer.setCollisionByProperty({ collides: true });
    //   this.collisionLayer.setCollisionByExclusion([-1, 0]);
    // }

    // -----------------------------------------------------------------------
    // Autumn forest map (64x48 tiles at 16x16 px = 1024x768 world)
    // -----------------------------------------------------------------------
    this.tilemap = this.make.tilemap({ key: 'autumn-map' });
    const tilesSet = this.tilemap.addTilesetImage('Autumn_Forest_Tiles', 'autumn-tiles');
    const objectsSet = this.tilemap.addTilesetImage('Autumn_Forest_Objects', 'autumn-objects');
    // The map JSON registers Autumn_Forest_Tiles a second time at firstgid
    // 2401 (originally an external .tsx reference). Phaser needs an explicit
    // mapping so the duplicate uses the already-loaded tiles image.
    const tilesSet2 = this.tilemap.addTilesetImage('Autumn_Forest_Tiles_2', 'autumn-tiles');
    if (!tilesSet || !objectsSet || !tilesSet2) {
      console.error('Failed to add autumn tileset image(s)');
      return;
    }
    // Layers can reference tiles from any set, so pass them all as an array.
    const sets = [tilesSet, objectsSet, tilesSet2];

    // Each layer is created and assigned a render depth. Tunable knob: any
    // layer that should render ABOVE the player (e.g., tall trees) gets a
    // depth >= player depth (player is at depth 0).
    const layerDepths: Array<{ name: string; depth: number }> = [
      { name: 'Ground', depth: -2 },
      { name: 'leaves', depth: -1 },
      { name: 'Decorations', depth: 0 },
      { name: 'objects', depth: 0 },
      { name: 'extra smol deco', depth: 0 },
      { name: 'extra extra smol deco', depth: 0 },
      { name: 'Buildings', depth: 0 },
      { name: 'smoll tree', depth: 10 },
      { name: 'Behind', depth: 10 },
    ];
    for (const { name, depth } of layerDepths) {
      const layer = this.tilemap.createLayer(name, sets, 0, 0);
      if (layer) layer.setDepth(depth);
    }

    // Collision layer: invisible, every non-empty tile blocks movement.
    this.collisionLayer = this.tilemap.createLayer('Collision', sets, 0, 0);
    if (this.collisionLayer) {
      this.collisionLayer.setVisible(false);
      this.collisionLayer.setCollisionByExclusion([-1, 0]);
    }
  }

  /**
   * Creates the player character.
   */
  private createPlayer(): void {
    this.player = new PlayerController(this, {
      startX: 300,
      startingY: 300,
      speed: 150,
      spriteKey: 'player-idle-1',
    });

    // Add collision with tilemap collision layer
    if (this.collisionLayer) {
      this.physics.add.collider(this.player.sprite, this.collisionLayer);
    }
  }

  /**
   * Wires up event callbacks between systems.
   */
  private wireCallbacks(): void {
    // Item collected callback
    this.itemManager!.onItemCollected = (item: ItemData) => {
      this.onItemCollected(item);
    };

    // Magnifier button callback
    this.ui!.onMagnifierPressed = () => {
      this.onMagnifierPressed();
    };

    // Modal state callback
    this.ui!.onModalStateChanged = (isOpen: boolean) => {
      this.isPaused = isOpen;
    };
  }

  /**
   * Starts the countdown timer.
   */
  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000, // 1 second
      callback: this.onTimerTick,
      callbackScope: this,
      repeat: this.timeRemaining,
    });
  }

  /**
   * Called every second by the timer.
   */
  private onTimerTick(): void {
    if (this.isPaused) return;

    this.timeRemaining--;
    this.ui?.updateTimer(this.timeRemaining);

    // Check for time's up
    if (this.timeRemaining <= 0) {
      this.endGame(false);
    }
  }

  /**
   * Called when the magnifier button is pressed.
   * Triggers item detection.
   */
  private onMagnifierPressed(): void {
    if (!this.player || !this.itemManager || this.isPaused) return;

    // Play detection sound
    this.audio.playDetect();

    // Get player position
    const playerPos = this.player.getPosition();

    // Detect items in a 3x3 tile area centered on the player
    const detection = this.itemManager.detectInArea(playerPos);

    if (detection.found && detection.item) {
      // Item found! Capture once so the closure isn't accessing the
      // detection object after async tweens complete.
      const collectedItem = detection.item;
      this.itemManager.collect(this, collectedItem, () => {
        this.audio.playCollect();
        // Show celebration popup. Tick the bottom-bar entry and check win
        // only after the popup closes, so the player sees the popup then
        // sees the list update naturally.
        this.ui?.showItemPopup(this, collectedItem, () => {
          this.ui?.updateItemEntry(collectedItem.id, true);
          if (this.itemManager!.allItemsCollected()) {
            this.endGame(true);
          }
        });
      });
    }
  }

  /**
   * Called when an item is collected.
   */
  private onItemCollected(item: ItemData): void {
    console.log(`Collected: ${item.name}`);
  }

  /**
   * Updates detection system.
   */
  private updateDetection(): void {
    if (!this.player || !this.itemManager || !this.ui) return;

    const playerPos = this.player.getPosition();

    // Check if any item is in range for magnifier glow
    const detection = this.itemManager.detectInArea(playerPos);
    this.ui.setMagnifierGlow(detection.found);
  }

  update(time: number): void {
    if (this.isPaused) return;

    // Update player
    this.player?.update();

    // Update detection system
    this.updateDetection();

    // Update magnifier glow animation
    this.ui?.updateMagnifierGlow(time);
  }

  /**
   * Ends the game with win or lose result.
   */
  private endGame(won: boolean): void {
    this.isPaused = true;
    this.timerEvent?.remove();

    // Play appropriate sound
    if (won) {
      this.audio.playWin();
    } else {
      this.audio.playLose();
    }

    // Show game over UI
    const itemsFound = this.itemManager?.getCollectedCount() || 0;
    const totalItems = this.caseData?.items.length || 10;

    this.ui?.showGameOver(this, won, itemsFound, totalItems);

    // Transition to result scene after delay
    this.time.delayedCall(2000, () => {
      this.scene.start(SceneKeys.Result, {
        won,
        itemsFound,
        totalItems,
        timeRemaining: this.timeRemaining,
      });
    });
  }

  /**
   * Cleans up when scene shuts down.
   */
  shutdown(): void {
    this.timerEvent?.remove();
    this.player?.destroy();
    this.itemManager?.destroy();
    this.ui?.destroy();
    this.audio.stopMusic();
  }
}
