import { ItemData, DetectionResult, DetectionConfig } from '../types/game.types';

/**
 * ItemManager handles all item-related functionality.
 * Spawns items, handles detection logic, and manages collection.
 */
export class ItemManager {
  /** All items for the current case */
  private items: ItemData[];

  /** Sprite references for uncollected items */
  private itemSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  /** Graphics for debug visualization */
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;

  /** Detection configuration */
  private config: DetectionConfig = {
    range: 128, // 4 tiles
    coneAngle: 45, // 45 degrees in front
  };

  /** Callback when an item is collected */
  public onItemCollected?: (item: ItemData) => void;

  /** Callback when detection finds an item */
  public onItemDetected?: (item: ItemData) => void;

  constructor(scene: Phaser.Scene, items: ItemData[]) {
    this.items = items;
    this.spawnItems(scene);
  }

  /**
   * Spawns all items at their configured positions.
   * Items are scaled down and slightly hidden to make them harder to spot.
   */
  private spawnItems(scene: Phaser.Scene): void {
    for (const item of this.items) {
      if (item.collected) continue;

      // Create item sprite
      const sprite = scene.add.sprite(item.position.x, item.position.y, item.spriteKey);
      sprite.setDepth(5); // Above tiles, below player
      sprite.setScale(0.6); // Small/hard to see
      sprite.setAlpha(0.8); // Slightly transparent
      sprite.setAngle(Phaser.Math.Between(-15, 15)); // Slight random rotation
      sprite.setVisible(false); // Hidden until detected (optional - can remove for visible items)

      // Store reference
      this.itemSprites.set(item.id, sprite);
    }
  }

  /**
   * Enables debug visualization for detection cone.
   */
  public enableDebug(scene: Phaser.Scene): void {
    this.debugGraphics = scene.add.graphics();
    this.debugGraphics.setDepth(100);
  }

  /**
   * Draws the detection cone for debugging.
   */
  public drawDetectionCone(origin: Phaser.Math.Vector2, angle: number): void {
    if (!this.debugGraphics) return;

    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(2, 0x00ff00, 0.7);
    this.debugGraphics.fillStyle(0x00ff00, 0.1);

    const coneAngleRad = Phaser.Math.DegToRad(this.config.coneAngle);
    const startAngle = angle - coneAngleRad / 2;
    const endAngle = angle + coneAngleRad / 2;

    // Draw cone wedge
    this.debugGraphics.beginPath();
    this.debugGraphics.moveTo(origin.x, origin.y);
    this.debugGraphics.arc(origin.x, origin.y, this.config.range, startAngle, endAngle);
    this.debugGraphics.closePath();
    this.debugGraphics.strokePath();
    this.debugGraphics.fillPath();
  }

  /**
   * Clears the debug graphics.
   */
  public clearDebug(): void {
    this.debugGraphics?.clear();
  }

  /**
   * Detects items in a 1x3 tile area (96 pixels) in front of the player.
   * Returns the closest item within detection range.
   */
  public detect(
    playerPos: Phaser.Math.Vector2,
    facingAngle: number
  ): DetectionResult {
    const result: DetectionResult = {
      found: false,
      item: null,
      distance: Infinity,
    };

    // Calculate detection area (1x3 tiles in front)
    const detectionDistance = 96; // 3 tiles
    const detectionWidth = 32; // 1 tile

    // Direction vector based on facing angle
    const dirX = Math.cos(facingAngle);
    const dirY = Math.sin(facingAngle);

    // Detection area center
    const detectX = playerPos.x + dirX * detectionDistance;
    const detectY = playerPos.y + dirY * detectionDistance;

    for (const item of this.items) {
      if (item.collected) continue;

      const dx = item.position.x - detectX;
      const dy = item.position.y - detectY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if item is within the 1x3 detection box
      // Allow some tolerance for the width (1 tile = 32px, so +/- 16px)
      if (distance <= detectionWidth / 2 + 16) {
        // Also check that it's in front of player (not behind)
        const dotProduct = dx * dirX + dy * dirY;
        if (dotProduct > 0 && distance < result.distance) {
          result.found = true;
          result.item = item;
          result.distance = distance;
        }
      }
    }

    return result;
  }

  /**
   * Alternative detection using angle-based cone.
   * More accurate for gameplay but slightly more expensive.
   */
  public detectInCone(
    playerPos: Phaser.Math.Vector2,
    facingAngle: number
  ): DetectionResult {
    const result: DetectionResult = {
      found: false,
      item: null,
      distance: Infinity,
    };

    const coneAngleRad = Phaser.Math.DegToRad(this.config.coneAngle / 2);

    for (const item of this.items) {
      if (item.collected) continue;

      const dx = item.position.x - playerPos.x;
      const dy = item.position.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if within range
      if (distance > this.config.range) continue;

      // Calculate angle to item
      const angleToItem = Math.atan2(dy, dx);

      // Normalize angle difference
      let angleDiff = angleToItem - facingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Check if within cone
      if (Math.abs(angleDiff) <= coneAngleRad && distance < result.distance) {
        result.found = true;
        result.item = item;
        result.distance = distance;
      }
    }

    return result;
  }

  /**
   * Collects an item, removing it from the scene.
   * Plays collection animation if provided.
   */
  public collect(
    scene: Phaser.Scene,
    item: ItemData,
    onComplete?: () => void
  ): void {
    const sprite = this.itemSprites.get(item.id);
    if (!sprite) {
      onComplete?.();
      return;
    }

    // Mark as collected
    item.collected = true;

    // Collection animation: scale up and fade out
    scene.tweens.add({
      targets: sprite,
      scale: sprite.scale * 1.5,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        sprite.destroy();
        this.itemSprites.delete(item.id);
        onComplete?.();
      },
    });

    // Notify listeners
    this.onItemCollected?.(item);
  }

  /**
   * Checks if a specific item is still available.
   */
  public isItemCollected(itemId: string): boolean {
    const item = this.items.find(i => i.id === itemId);
    return item?.collected ?? true;
  }

  /**
   * Returns all items (collected and uncollected).
   */
  public getAllItems(): ItemData[] {
    return this.items;
  }

  /**
   * Returns only uncollected items.
   */
  public getUncollectedItems(): ItemData[] {
    return this.items.filter(item => !item.collected);
  }

  /**
   * Returns the count of collected items.
   */
  public getCollectedCount(): number {
    return this.items.filter(item => item.collected).length;
  }

  /**
   * Checks if all items have been collected.
   */
  public allItemsCollected(): boolean {
    return this.getCollectedCount() >= this.items.length;
  }

  /**
   * Makes an item sprite visible (for hint system).
   */
  public revealItem(itemId: string, scene: Phaser.Scene): void {
    const sprite = this.itemSprites.get(itemId);
    if (sprite && !sprite.visible) {
      // Pulse animation to draw attention
      sprite.setVisible(true);
      scene.tweens.add({
        targets: sprite,
        alpha: 1,
        scale: 0.8,
        duration: 200,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          sprite.setAlpha(0.8);
          sprite.setScale(0.6);
        },
      });
    }
  }

  /**
   * Destroys the item manager and cleans up resources.
   */
  public destroy(): void {
    this.itemSprites.forEach(sprite => sprite.destroy());
    this.itemSprites.clear();
    this.debugGraphics?.destroy();
  }
}
