import { Scene } from 'phaser';
import { SceneKeys, ItemData, GameConfig } from '../types/game.types';
import { UIManager } from '../system/UIManager';

/**
 * RoomScene displays a single large room photo as a drag-to-pan view,
 * launched on top of the paused GameScene when the player enters a Door
 * tile. Items that live in this room are rendered as clickable sprites
 * on top of the image. Shows an exit button and a read-only evidence
 * bar mirroring the bottom bar from GameScene.
 */
export class RoomScene extends Scene {
  private roomImageKey: string = '';
  private items: ItemData[] = []; // all global items (for the bar)
  private roomItems: ItemData[] = []; // items located in THIS room
  private collectedIds: Set<string> = new Set();

  /** Item entries on the bottom bar, keyed by item id, so we can tick them */
  private barEntries: Map<string, { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; check: Phaser.GameObjects.Text }> = new Map();

  /** Item sprites placed on the room image, keyed by item id */
  private roomItemSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  private dragging: boolean = false;
  private dragStartPointer: { x: number; y: number } = { x: 0, y: 0 };
  private dragStartImage: { x: number; y: number } = { x: 0, y: 0 };
  /** Suppress click on the item sprite if the pointer was actually dragging */
  private dragMoved: boolean = false;

  private roomImage: Phaser.GameObjects.Image | null = null;

  constructor() {
    super({ key: SceneKeys.Room });
  }

  create(data: { caseId: string; roomImageKey: string }): void {
    this.roomImageKey = data.roomImageKey;

    // Pull global config + state from the registry so we always have the
    // latest collected ids (including ones collected outdoors).
    const cfg = this.registry.get('gameConfig') as GameConfig;
    const gameState = this.registry.get('gameState') as
      | { collectedIds?: string[] }
      | undefined;
    this.items = cfg.items;
    this.collectedIds = new Set(gameState?.collectedIds ?? []);
    this.roomItems = cfg.items.filter(
      it => it.location.type === 'room' && it.location.area === this.roomImageKey
    );

    const w = this.scale.width;
    const h = this.scale.height;

    // Opaque background so the paused GameScene below is fully covered.
    const bg = this.add.rectangle(0, 0, w, h, 0x111111, 1);
    bg.setOrigin(0);

    this.createRoomImage(w, h);
    this.createRoomItemSprites();
    this.createExitButton(w);
    this.createEvidenceBar(w, h);
  }

  /**
   * Adds the room image at native size, centered, with drag-to-pan
   * interaction and edge clamping.
   */
  private createRoomImage(viewW: number, viewH: number): void {
    const img = this.add.image(0, 0, this.roomImageKey);
    img.setOrigin(0, 0);
    img.setDepth(0);

    const initX = Math.min(0, (viewW - img.width) / 2);
    const initY = Math.min(0, (viewH - img.height) / 2);
    img.setPosition(initX, initY);

    img.setInteractive({ draggable: false });

    img.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragMoved = false;
      this.dragStartPointer = { x: pointer.x, y: pointer.y };
      this.dragStartImage = { x: img.x, y: img.y };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const dx = pointer.x - this.dragStartPointer.x;
      const dy = pointer.y - this.dragStartPointer.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.dragMoved = true;
      const newX = this.clampAxis(this.dragStartImage.x + dx, viewW, img.width);
      const newY = this.clampAxis(this.dragStartImage.y + dy, viewH, img.height);
      img.setPosition(newX, newY);
      this.syncItemSpritePositions();
    });

    this.input.on('pointerup', () => {
      this.dragging = false;
    });
    this.input.on('pointerupoutside', () => {
      this.dragging = false;
    });

    this.roomImage = img;
  }

  /**
   * Creates one clickable Phaser sprite per uncollected item that lives
   * in this room. Positioned at item.location.x/y (image-pixel coords),
   * offset by the room image's current top-left position.
   */
  private createRoomItemSprites(): void {
    if (!this.roomImage) return;
    for (const item of this.roomItems) {
      if (this.collectedIds.has(item.id)) continue;

      const sprite = this.add.sprite(0, 0, item.spriteKey);
      sprite.setDepth(5);
      // Match outdoor-item normalization (~28px target).
      const targetSize = 56; // bigger here since room images are huge
      const naturalSize = Math.max(sprite.width, sprite.height) || targetSize;
      sprite.setScale(targetSize / naturalSize);
      sprite.setInteractive({ useHandCursor: true });

      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // Mirror the room image's drag tracking so that a drag started
        // ON an item still pans the image instead of registering a click.
        if (this.roomImage) {
          this.dragging = true;
          this.dragMoved = false;
          this.dragStartPointer = { x: pointer.x, y: pointer.y };
          this.dragStartImage = { x: this.roomImage.x, y: this.roomImage.y };
        }
      });
      sprite.on('pointerup', () => {
        if (!this.dragMoved) this.collectRoomItem(item);
      });

      this.roomItemSprites.set(item.id, sprite);
    }
    this.syncItemSpritePositions();
  }

  /**
   * Updates each room-item sprite's screen position to track the room
   * image's current top-left.
   */
  private syncItemSpritePositions(): void {
    if (!this.roomImage) return;
    for (const item of this.roomItems) {
      const sprite = this.roomItemSprites.get(item.id);
      if (!sprite) continue;
      sprite.setPosition(this.roomImage.x + item.location.x, this.roomImage.y + item.location.y);
    }
  }

  /**
   * Handles a click on an item inside the room. Hides the sprite,
   * persists into the global collectedIds, plays the celebration popup,
   * ticks the bar entry, and triggers win-or-resume on completion.
   */
  private collectRoomItem(item: ItemData): void {
    if (this.collectedIds.has(item.id)) return;

    const sprite = this.roomItemSprites.get(item.id);
    if (sprite) {
      sprite.disableInteractive();
      this.tweens.add({
        targets: sprite,
        scale: sprite.scale * 1.5,
        alpha: 0,
        duration: 250,
        onComplete: () => sprite.destroy(),
      });
      this.roomItemSprites.delete(item.id);
    }

    this.collectedIds.add(item.id);
    this.persistCollected();

    UIManager.createItemPopup(this, item, () => {
      this.markBarEntry(item.id);
      // Win check — if all 10 globally collected, end the game directly
      // from here. Otherwise just leave the player in the room.
      if (this.collectedIds.size >= this.items.length) {
        this.triggerWin();
      }
    });
  }

  /**
   * Writes the current collectedIds into the global gameState in the
   * registry so GameScene sees the update on resume.
   */
  private persistCollected(): void {
    const prev = (this.registry.get('gameState') as
      | { timeRemaining?: number; collectedIds?: string[] }
      | undefined) ?? {};
    this.registry.set('gameState', {
      ...prev,
      collectedIds: [...this.collectedIds],
    });
  }

  /**
   * Updates the local bottom-bar entry for an item to its collected
   * (green + check) appearance.
   */
  private markBarEntry(itemId: string): void {
    const entry = this.barEntries.get(itemId);
    if (!entry) return;
    entry.bg.setStrokeStyle(2, 0x00ff00);
    entry.text.setColor('#00ff00');
    entry.text.setStyle({ fontStyle: 'bold' });
    entry.check.setText('✓');
  }

  /**
   * All items collected → end the game from here. Stops both this
   * scene and GameScene and starts ResultScene with timing info pulled
   * from the registry (set by GameScene on each tick / on openRoom).
   */
  private triggerWin(): void {
    const gameState = this.registry.get('gameState') as
      | { timeRemaining?: number }
      | undefined;
    const timeRemaining = gameState?.timeRemaining ?? 0;
    this.scene.stop(SceneKeys.Game);
    this.scene.start(SceneKeys.Result, {
      won: true,
      itemsFound: this.items.length,
      totalItems: this.items.length,
      timeRemaining,
    });
  }

  /**
   * Clamps an image-axis position so the image edges can't pass beyond
   * the viewport edges. If the image is smaller than the viewport, the
   * valid range collapses and the position is pinned to 0.
   */
  private clampAxis(value: number, viewSize: number, imgSize: number): number {
    const minPos = Math.min(0, viewSize - imgSize);
    const maxPos = 0;
    if (minPos > maxPos) return 0;
    return Math.max(minPos, Math.min(maxPos, value));
  }

  /**
   * Top-right "✕" button. Closes RoomScene and resumes GameScene.
   */
  private createExitButton(viewW: number): void {
    const size = 56;
    const padding = 16;
    const cx = viewW - padding - size / 2;
    const cy = padding + size / 2;

    const bg = this.add.circle(cx, cy, size / 2, 0xaa2a2a, 0.95);
    bg.setStrokeStyle(3, 0xffffff);
    bg.setDepth(100);
    bg.setInteractive({ useHandCursor: true });

    const x = this.add.text(cx, cy, '✕', {
      fontFamily: 'GameFont, Arial',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    x.setOrigin(0.5);
    x.setDepth(101);

    bg.on('pointerover', () => bg.setFillStyle(0xff4444, 0.95));
    bg.on('pointerout', () => bg.setFillStyle(0xaa2a2a, 0.95));
    bg.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume(SceneKeys.Game);
    });
  }

  /**
   * Bottom evidence bar — same look as GameScene's bar, showing all
   * global items with checkmark state. Read-only (no click → modal).
   */
  private createEvidenceBar(viewW: number, viewH: number): void {
    const panelHeight = 100;
    const panelY = viewH - panelHeight - 10;

    const panelBg = this.add.rectangle(
      viewW / 2,
      panelY + panelHeight / 2,
      viewW - 20,
      panelHeight,
      0x1a1a2e,
      0.95
    );
    panelBg.setStrokeStyle(2, 0x4a4a6a);
    panelBg.setDepth(50);

    const title = this.add.text(20, panelY + 10, 'EVIDENCE', {
      fontFamily: 'GameFont, Arial',
      fontSize: '14px',
      color: '#8888aa',
      fontStyle: 'bold',
    });
    title.setDepth(51);

    const startX = 20;
    const spacing = 95;
    const entriesY = panelY + 40;

    this.items.forEach((item, index) => {
      const x = startX + (index % 10) * spacing;
      const y = entriesY + Math.floor(index / 10) * 35;
      const collected = this.collectedIds.has(item.id);

      const bg = this.add.rectangle(x, y, 85, 28, 0x2a2a3e, 1);
      bg.setStrokeStyle(2, collected ? 0x00ff00 : 0x555555);
      bg.setOrigin(0, 0);
      bg.setDepth(51);

      const shortName = item.name.length > 10 ? item.name.substring(0, 9) + '…' : item.name;
      const nameText = this.add.text(x + 4, y + 4, shortName, {
        fontFamily: 'GameFont, Arial',
        fontSize: '11px',
        color: collected ? '#00ff00' : '#888888',
        fontStyle: collected ? 'bold' : 'normal',
      });
      nameText.setDepth(52);

      const check = this.add.text(x + 75, y + 2, collected ? '✓' : '', {
        fontFamily: 'GameFont, Arial',
        fontSize: '16px',
        color: '#00ff00',
        fontStyle: 'bold',
      });
      check.setDepth(52);

      this.barEntries.set(item.id, { bg, text: nameText, check });
    });
  }
}
