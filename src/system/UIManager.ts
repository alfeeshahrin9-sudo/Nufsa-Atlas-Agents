import { ItemData, ItemListEntry } from '../types/game.types';

/**
 * UIManager handles all UI components.
 * Timer, item list, magnifier button, and description modal.
 */
export class UIManager {
  /** Container for all UI elements */
  private uiContainer: Phaser.GameObjects.Container;

  /** Timer display */
  private timerText: Phaser.GameObjects.Text | null = null;

  /** Item list panel and entries */
  private itemListPanel: Phaser.GameObjects.Container | null = null;
  private itemEntries: Map<string, ItemListEntry> = new Map();

  /** Magnifier button */
  private magnifierBtn: Phaser.GameObjects.Container | null = null;
  private magnifierGlow: Phaser.GameObjects.Graphics | null = null;

  /** Description modal */
  private modalContainer: Phaser.GameObjects.Container | null = null;
  private modalName: Phaser.GameObjects.Text | null = null;
  private modalDescription: Phaser.GameObjects.Text | null = null;

  /** Callback when magnifier is pressed */
  public onMagnifierPressed?: () => void;

  /** Callback when modal is shown/hidden (for pause control) */
  public onModalStateChanged?: (isOpen: boolean) => void;

  /** Whether the magnifier should glow (item in range) */
  private shouldGlow: boolean = false;

  constructor(scene: Phaser.Scene) {
    // Create main UI container (fixed to camera)
    this.uiContainer = scene.add.container(0, 0);
    this.uiContainer.setDepth(1000);
    this.uiContainer.setScrollFactor(0);

    this.createTimer(scene);
    this.createItemList(scene);
    this.createMagnifierButton(scene);
    this.createModal(scene);
  }

  /**
   * Creates the countdown timer at top-center.
   */
  private createTimer(scene: Phaser.Scene): void {
    const screenWidth = scene.scale.width;

    this.timerText = scene.add.text(screenWidth / 2, 20, '5:00', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    });
    this.timerText.setOrigin(0.5, 0);
    this.timerText.setScrollFactor(0);

    this.uiContainer.add(this.timerText);
  }

  /**
   * Creates the item list panel at the bottom.
   * Shows all items with gray (uncollected) or green + checkmark (collected).
   */
  private createItemList(scene: Phaser.Scene): void {
    const screenWidth = scene.scale.width;
    const screenHeight = scene.scale.height;
    const panelHeight = 100;
    const panelY = screenHeight - panelHeight - 10;

    // Background panel
    const panelBg = scene.add.rectangle(screenWidth / 2, panelY + panelHeight / 2, screenWidth - 20, panelHeight, 0x1a1a2e, 0.85);
    panelBg.setStrokeStyle(2, 0x4a4a6a);
    panelBg.setScrollFactor(0);
    panelBg.setDepth(999);

    // Title
    const title = scene.add.text(20, panelY + 10, 'EVIDENCE', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8888aa',
      fontStyle: 'bold',
    });
    title.setScrollFactor(0);
    title.setDepth(1000);

    // Container for item entries
    this.itemListPanel = scene.add.container(0, panelY + 40);
    this.itemListPanel.setScrollFactor(0);
    this.itemListPanel.setDepth(1000);

    this.uiContainer.add([panelBg, title, this.itemListPanel]);
  }

  /**
   * Populates the item list with entries.
   * Call after creating the panel.
   */
  public populateItemList(scene: Phaser.Scene, items: ItemData[]): void {
    if (!this.itemListPanel) return;

    // Clear existing entries
    this.itemListPanel.removeAll(true);
    this.itemEntries.clear();

    const startX = 20;
    const spacing = 95;

    items.forEach((item, index) => {
      const x = startX + (index % 10) * spacing;
      const y = Math.floor(index / 10) * 35;

      // Create entry container
      const entryContainer = scene.add.container(x, y);

      // Background for item name
      const bg = scene.add.rectangle(0, 0, 85, 28, 0x2a2a3e, 1);
      bg.setStrokeStyle(2, item.collected ? 0x00ff00 : 0x555555);
      bg.setOrigin(0, 0);

      // Item name text
      const shortName = item.name.length > 10 ? item.name.substring(0, 9) + '…' : item.name;
      const nameText = scene.add.text(4, 4, shortName, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: item.collected ? '#00ff00' : '#888888',
        fontStyle: item.collected ? 'bold' : 'normal',
      });

      // Checkmark (visible when collected)
      const checkmark = scene.add.text(75, 2, item.collected ? '✓' : '', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#00ff00',
        fontStyle: 'bold',
      });

      entryContainer.add([bg, nameText, checkmark]);

      // Make the bg rectangle interactive directly (reliable hit area)
      bg.setInteractive({ useHandCursor: true });

      // Store entry reference
      const entry: ItemListEntry = {
        item,
        container: entryContainer,
        text: nameText,
        checkmark,
      };
      this.itemEntries.set(item.id, entry);

      // Click handler - show description modal
      bg.on('pointerdown', () => {
        this.showModal(scene, item);
      });

      // Hover effect
      bg.on('pointerover', () => {
        bg.setFillStyle(0x3a3a4e);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x2a2a3e);
      });

      this.itemListPanel!.add(entryContainer);
    });
  }

  /**
   * Creates the magnifier button at bottom-right.
   */
  private createMagnifierButton(scene: Phaser.Scene): void {
    const screenWidth = scene.scale.width;
    const screenHeight = scene.scale.height;
    const btnSize = 80;
    const padding = 20;

    const btnX = screenWidth - padding - btnSize / 2;
    const btnY = screenHeight - padding - btnSize / 2 - 50; // Above item panel

    // Glow effect (behind button)
    this.magnifierGlow = scene.add.graphics();
    this.magnifierGlow.setDepth(998);
    this.magnifierGlow.setScrollFactor(0);

    // Button background circle - this is the interactive visual element
    const btnBg = scene.add.circle(btnX, btnY, btnSize / 2, 0x4a4a6a);
    btnBg.setStrokeStyle(3, 0x8888aa);
    btnBg.setDepth(999);
    btnBg.setScrollFactor(0);
    btnBg.setInteractive({ useHandCursor: true });

    // Magnifier icon (simple circle with handle)
    const iconGroup = scene.add.container(btnX, btnY);

    // Glass part
    const glass = scene.add.circle(0, 0, 25, 0x88ccff, 0.6);
    glass.setStrokeStyle(4, 0xaaddff);

    // Handle
    const handle = scene.add.rectangle(18, 18, 8, 25, 0x8888aa);
    handle.setRotation(Math.PI / 4);

    iconGroup.add([glass, handle]);
    iconGroup.setDepth(1000);
    iconGroup.setScrollFactor(0);

    // Track magnifier as the visual circle (used for glow positioning)
    this.magnifierBtn = iconGroup;

    // Press animation - tween the icon group for visual feedback
    btnBg.on('pointerdown', () => {
      scene.tweens.add({
        targets: [btnBg, iconGroup],
        scale: 0.9,
        duration: 100,
        yoyo: true,
      });
      this.onMagnifierPressed?.();
    });

    // Hover effect
    btnBg.on('pointerover', () => {
      btnBg.setStrokeStyle(3, 0xaabbcc);
    });
    btnBg.on('pointerout', () => {
      btnBg.setStrokeStyle(3, 0x8888aa);
    });

    this.uiContainer.add([this.magnifierGlow, btnBg, iconGroup]);
  }

  /**
   * Sets whether the magnifier button should glow.
   */
  public setMagnifierGlow(enabled: boolean): void {
    this.shouldGlow = enabled;
  }

  /**
   * Updates the magnifier glow effect.
   * Call every frame.
   */
  public updateMagnifierGlow(time: number): void {
    if (!this.magnifierGlow || !this.magnifierBtn) return;

    if (this.shouldGlow) {
      this.magnifierGlow.clear();
      // Bright pulsing glow when item is in range
      const glowIntensity = 0.4 + Math.sin(time / 150) * 0.2;
      this.magnifierGlow.fillStyle(0x00ff00, glowIntensity);
      this.magnifierGlow.fillCircle(this.magnifierBtn.x, this.magnifierBtn.y, 55);

      // Second glow layer for extra effect
      this.magnifierGlow.fillStyle(0x00ff00, glowIntensity * 0.5);
      this.magnifierGlow.fillCircle(this.magnifierBtn.x, this.magnifierBtn.y, 70);
    } else {
      this.magnifierGlow.clear();
    }
  }

  /**
   * Updates an item entry's visual state.
   */
  public updateItemEntry(itemId: string, collected: boolean): void {
    const entry = this.itemEntries.get(itemId);
    if (!entry) return;

    if (collected) {
      entry.text.setColor('#00ff00');
      entry.text.setStyle({ fontStyle: 'bold' });
      entry.checkmark.setText('✓');
      entry.checkmark.setColor('#00ff00');
      (entry.container.first as Phaser.GameObjects.Rectangle)?.setStrokeStyle(2, 0x00ff00);
    } else {
      entry.text.setColor('#888888');
      entry.text.setStyle({ fontStyle: 'normal' });
      entry.checkmark.setText('');
      (entry.container.first as Phaser.GameObjects.Rectangle)?.setStrokeStyle(1, 0x555555);
    }
  }

  /**
   * Updates the timer display.
   */
  public updateTimer(seconds: number): void {
    if (!this.timerText) return;

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    this.timerText.setText(timeStr);

    // Warning color when under 30 seconds
    if (seconds < 30) {
      this.timerText.setColor('#ff4444');
    } else if (seconds < 60) {
      this.timerText.setColor('#ffaa00');
    } else {
      this.timerText.setColor('#ffffff');
    }
  }

  /**
   * Creates the description modal overlay.
   */
  private createModal(scene: Phaser.Scene): void {
    const screenWidth = scene.scale.width;
    const screenHeight = scene.scale.height;

    // Modal container (hidden by default)
    this.modalContainer = scene.add.container(0, 0);
    this.modalContainer.setSize(screenWidth, screenHeight);
    this.modalContainer.setDepth(2000);
    this.modalContainer.setScrollFactor(0);
    this.modalContainer.setVisible(false);

    // Semi-transparent background
    const bg = scene.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.7);
    bg.setOrigin(0);

    // Center panel
    const panelWidth = Math.min(screenWidth - 40, 500);
    const panelHeight = 250;
    const panelX = screenWidth / 2 - panelWidth / 2;
    const panelY = screenHeight / 2 - panelHeight / 2;

    const panel = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x2a2a3e);
    panel.setStrokeStyle(2, 0x6666aa);
    panel.setOrigin(0);

    // Item name
    this.modalName = scene.add.text(panelX + 20, panelY + 20, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // Description
    this.modalDescription = scene.add.text(panelX + 20, panelY + 60, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cccccc',
      wordWrap: { width: panelWidth - 40 },
      lineSpacing: 8,
    });

    // Close button
    const closeBtn = scene.add.text(panelX + panelWidth - 40, panelY + 10, '✕', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#888888',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this.hideModal(scene);
    });
    closeBtn.on('pointerover', () => {
      closeBtn.setColor('#ffffff');
    });
    closeBtn.on('pointerout', () => {
      closeBtn.setColor('#888888');
    });

    // Close on background click
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, screenWidth, screenHeight), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', (event: Phaser.Input.Pointer) => {
      // Only close if clicking outside panel
      if (event.x < panelX || event.x > panelX + panelWidth ||
          event.y < panelY || event.y > panelY + panelHeight) {
        this.hideModal(scene);
      }
    });

    this.modalContainer.add([bg, panel, this.modalName, this.modalDescription, closeBtn]);
    this.uiContainer.add(this.modalContainer);
  }

  /**
   * Shows the description modal with item info.
   */
  public showModal(scene: Phaser.Scene, item: ItemData): void {
    if (!this.modalContainer || !this.modalName || !this.modalDescription) return;

    this.modalName.setText(item.name);
    this.modalDescription.setText(item.description);
    this.modalContainer.setVisible(true);

    // Notify that modal is open (pause game)
    this.onModalStateChanged?.(true);

    // Fade in animation
    this.modalContainer.setAlpha(0);
    scene.tweens.add({
      targets: this.modalContainer,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });
  }

  /**
   * Hides the description modal.
   */
  public hideModal(scene: Phaser.Scene): void {
    if (!this.modalContainer) return;

    // Notify that modal is closed (resume game)
    this.onModalStateChanged?.(false);

    scene.tweens.add({
      targets: this.modalContainer,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        this.modalContainer?.setVisible(false);
      },
    });
  }

  /**
   * Shows a game over message.
   */
  public showGameOver(scene: Phaser.Scene, won: boolean, itemsFound: number, totalItems: number): void {
    const screenWidth = scene.scale.width;
    const screenHeight = scene.scale.height;

    // Overlay
    const overlay = scene.add.rectangle(0, 0, screenWidth, screenHeight, 0x000000, 0.8);
    overlay.setOrigin(0);
    overlay.setDepth(3000);
    overlay.setScrollFactor(0);

    // Message
    const message = won ? 'CASE SOLVED!' : "TIME'S UP!";
    const messageText = scene.add.text(screenWidth / 2, screenHeight / 2 - 40, message, {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: won ? '#00ff00' : '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    messageText.setOrigin(0.5);
    messageText.setDepth(3001);
    messageText.setScrollFactor(0);

    // Score
    const scoreText = scene.add.text(screenWidth / 2, screenHeight / 2 + 30, `Found ${itemsFound}/${totalItems} items`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(3001);
    scoreText.setScrollFactor(0);

    // Fade out and remove after 3 seconds
    scene.time.delayedCall(3000, () => {
      scene.tweens.add({
        targets: [overlay, messageText, scoreText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          messageText.destroy();
          scoreText.destroy();
        },
      });
    });
  }

  /**
   * Destroys the UI manager and cleans up resources.
   */
  public destroy(): void {
    this.uiContainer.destroy(true);
    this.itemEntries.clear();
  }
}
