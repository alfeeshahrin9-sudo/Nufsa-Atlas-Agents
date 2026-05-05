import { Scene } from 'phaser';
import { SceneKeys } from '../types/game.types';
import { getAudioManager } from '../system/AudioManager';

/**
 * ResultScene displays the game result (win/lose) and auto-resets.
 * Shows items found, time remaining, and restarts after delay.
 */
export class ResultScene extends Scene {
  /** Whether the player won */
  private won: boolean = false;

  /** Number of items found */
  private itemsFound: number = 0;

  /** Total items available */
  private totalItems: number = 0;

  /** Time remaining when game ended */
  private timeRemaining: number = 0;

  /** Audio manager */
  private audio = getAudioManager();

  /** Last input time for idle detection */
  private lastInputTime: number = 0;

  /** Auto-reset timer */
  private resetTimer: Phaser.Time.TimerEvent | null = null;

  /** Result container for fade effects */
  private resultContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: SceneKeys.Result });
  }

  create(data: { won: boolean; itemsFound: number; totalItems: number; timeRemaining: number }): void {
    // Store result data
    this.won = data.won;
    this.itemsFound = data.itemsFound;
    this.totalItems = data.totalItems;
    this.timeRemaining = data.timeRemaining;

    // Initialize audio
    this.audio.init(this);

    // Reset input timer
    this.lastInputTime = Date.now();

    // Create result display
    this.createResultDisplay();

    // Setup input tracking
    this.input.on('pointerdown', () => {
      this.lastInputTime = Date.now();
    });
    this.input.keyboard?.on('keydown', () => {
      this.lastInputTime = Date.now();
    });

    // Auto-reset after 10 seconds
    this.resetTimer = this.time.delayedCall(10000, () => {
      this.restartGame();
    });
  }

  /**
   * Creates the result display UI.
   */
  private createResultDisplay(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // Main container
    this.resultContainer = this.add.container(0, 0);
    this.resultContainer.setDepth(100);

    // Background overlay
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.85);
    bg.setOrigin(0);

    // Result panel
    const panelWidth = Math.min(width - 40, 400);
    const panelHeight = 300;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panel = this.add.rectangle(
      panelX + panelWidth / 2,
      panelY + panelHeight / 2,
      panelWidth,
      panelHeight,
      0x1a1a2e
    );
    panel.setStrokeStyle(3, this.won ? 0x00ff00 : 0xff4444);

    // Result icon
    const iconSize = 80;
    const iconY = panelY + 50;
    const icon = this.add.text(width / 2, iconY, this.won ? '✓' : '✕', {
      fontFamily: 'Arial',
      fontSize: `${iconSize}px`,
      color: this.won ? '#00ff00' : '#ff4444',
    });
    icon.setOrigin(0.5);

    // Result title
    const titleY = panelY + 140;
    const title = this.add.text(width / 2, titleY, this.won ? 'CASE SOLVED!' : "TIME'S UP!", {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);

    // Score display
    const scoreY = panelY + 190;
    const score = this.add.text(width / 2, scoreY, `${this.itemsFound} / ${this.totalItems}`, {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: this.won ? '#00ff00' : '#ff8888',
      fontStyle: 'bold',
    });
    score.setOrigin(0.5);

    // Score label
    const scoreLabelY = panelY + 240;
    const scoreLabel = this.add.text(width / 2, scoreLabelY, 'ITEMS FOUND', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
      fontStyle: 'bold',
    });
    scoreLabel.setOrigin(0.5);

    // Time remaining (if won)
    if (this.won && this.timeRemaining > 0) {
      const mins = Math.floor(this.timeRemaining / 60);
      const secs = this.timeRemaining % 60;
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      const timeText = this.add.text(width / 2, panelY + 270, `Time: ${timeStr}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#aaaaff',
      });
      timeText.setOrigin(0.5);
    }

    // Restart countdown
    const countdownY = height - 40;
    const countdown = this.add.text(width / 2, countdownY, 'Restarting in 10...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#666666',
      fontStyle: 'italic',
    });
    countdown.setOrigin(0.5);

    // Animate countdown text
    this.tweens.add({
      targets: countdown,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Add all to container
    this.resultContainer.add([bg, panel, icon, title, score, scoreLabel, countdown]);

    // Fade in animation
    this.resultContainer.setAlpha(0);
    this.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    });

    // Animate the check/X icon
    this.tweens.add({
      targets: icon,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 3,
    });
  }

  update(): void {
    // Check for idle timeout (30 seconds)
    const idleTime = Date.now() - this.lastInputTime;
    if (idleTime > 30000) {
      this.restartGame();
    }
  }

  /**
   * Restarts the game by going back to BootScene.
   */
  private restartGame(): void {
    // Prevent multiple restarts
    if (this.resetTimer) {
      this.resetTimer.destroy();
      this.resetTimer = null;
    }

    // Fade out
    if (this.resultContainer) {
      this.tweens.add({
        targets: this.resultContainer,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.scene.start(SceneKeys.Boot);
        },
      });
    } else {
      this.scene.start(SceneKeys.Boot);
    }
  }

  /**
   * Cleans up when scene shuts down.
   */
  shutdown(): void {
    this.resetTimer?.destroy();
    this.resultContainer?.destroy(true);
  }
}
