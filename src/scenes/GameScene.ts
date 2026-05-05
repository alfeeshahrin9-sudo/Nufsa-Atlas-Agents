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

  /** Ground layer graphics */
  private groundGraphics: Phaser.GameObjects.Graphics | null = null;

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
   * Creates the game map with collision.
   */
  private createMap(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const tileSize = 32;
    const cols = Math.ceil(width / tileSize);
    const rows = Math.ceil(height / tileSize);

    // Create background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x2a2a3e);
    bg.setDepth(-10);

    // Create ground layer (tatami mat pattern)
    this.groundGraphics = this.add.graphics();
    this.groundGraphics.setDepth(-5);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize;
        const y = row * tileSize;

        // Check if this is an edge tile (wall)
        const isEdge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;

        if (isEdge) {
          // Wall/border
          this.groundGraphics.fillStyle(0x1a1a2e, 1);
          this.groundGraphics.fillRect(x, y, tileSize, tileSize);
          this.groundGraphics.lineStyle(2, 0x3a3a4e);
          this.groundGraphics.strokeRect(x, y, tileSize, tileSize);
        } else {
          // Floor (tatami style)
          this.groundGraphics.fillStyle(0x3a3a4e, 1);
          this.groundGraphics.fillRect(x, y, tileSize, tileSize);
          this.groundGraphics.lineStyle(1, 0x4a4a5e, 0.5);
          this.groundGraphics.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
      }
    }

    // Create furniture (collision objects)
    this.createFurniture();
  }

  /**
   * Creates furniture and obstacles with collision.
   */
  private createFurniture(): void {
    const furnitureGraphics = this.add.graphics();
    furnitureGraphics.setDepth(0);

    // Table (top left area)
    furnitureGraphics.fillStyle(0x5a4a3a, 1);
    furnitureGraphics.fillRect(200, 150, 120, 80);
    furnitureGraphics.lineStyle(2, 0x3a2a1a);
    furnitureGraphics.strokeRect(200, 150, 120, 80);

    // Cabinet (top right)
    furnitureGraphics.fillStyle(0x4a3a2a, 1);
    furnitureGraphics.fillRect(700, 100, 100, 150);
    furnitureGraphics.lineStyle(2, 0x2a1a0a);
    furnitureGraphics.strokeRect(700, 100, 100, 150);

    // Screen/divider (middle right)
    furnitureGraphics.fillStyle(0x6a5a4a, 1);
    furnitureGraphics.fillRect(850, 300, 40, 200);

    // Low table (center)
    furnitureGraphics.fillStyle(0x5a4a3a, 1);
    furnitureGraphics.fillRect(450, 400, 100, 60);

    // Chairs/stools
    furnitureGraphics.fillStyle(0x4a3a2a, 1);
    furnitureGraphics.fillRect(350, 250, 50, 50);
    furnitureGraphics.fillRect(550, 250, 50, 50);

    // Create collision zones for furniture
    this.createCollisionZones([
      { x: 200, y: 150, w: 120, h: 80 },   // Table
      { x: 700, y: 100, w: 100, h: 150 },  // Cabinet
      { x: 850, y: 300, w: 40, h: 200 },   // Screen
      { x: 450, y: 400, w: 100, h: 60 },   // Low table
      { x: 350, y: 250, w: 50, h: 50 },    // Chair 1
      { x: 550, y: 250, w: 50, h: 50 },    // Chair 2
    ]);
  }

  /**
   * Creates invisible collision zones.
   */
  private createCollisionZones(zones: { x: number; y: number; w: number; h: number }[]): void {
    // Create a group for collision detection
    const staticGroup = this.physics.add.staticGroup();

    for (const zone of zones) {
      // Create invisible rectangle for collision
      const body = this.add.rectangle(zone.x + zone.w / 2, zone.y + zone.h / 2, zone.w, zone.h);
      body.setVisible(false);
      this.physics.add.existing(body, true); // true = static body
      staticGroup.add(body);
    }

    // Store reference for player collision
    (this as any).collisionZones = staticGroup;
  }

  /**
   * Creates the player character.
   */
  private createPlayer(): void {
    this.player = new PlayerController(this, {
      startX: 80,
      startingY: 80,
      speed: 150,
      spriteKey: 'player',
    });

    // Add collision with furniture
    if ((this as any).collisionZones) {
      this.physics.add.collider(this.player.sprite, (this as any).collisionZones);
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

    // Get player position and facing direction
    const playerPos = this.player.getPosition();
    const facingAngle = this.player.getFacingAngle();

    // Detect items in cone
    const detection = this.itemManager.detectInCone(playerPos, facingAngle);

    if (detection.found && detection.item) {
      // Item found!
      this.itemManager.collect(this, detection.item, () => {
        this.ui?.updateItemEntry(detection.item!.id, true);
        this.audio.playCollect();

        // Check win condition
        if (this.itemManager!.allItemsCollected()) {
          this.endGame(true);
        }
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
    const facingAngle = this.player.getFacingAngle();

    // Check if any item is in range for magnifier glow
    const detection = this.itemManager.detectInCone(playerPos, facingAngle);
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
    this.groundGraphics?.destroy();
  }
}
