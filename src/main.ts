import { Game, Types } from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

/**
 * Phaser game configuration for the Hidden Object Detective game.
 * Optimized for tablet kiosk display.
 */
const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#1a1a2e',
  parent: 'app',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // Top-down, no gravity
      debug: false, // Set to true for collision debugging
    },
  },
  scene: [
    BootScene,
    GameScene,
    ResultScene,
  ],
  // Disable multi-touch gestures that could interfere with kiosk mode
  input: {
    activePointers: 3, // Allow multiple touches for joystick + button
  },
  // Performance optimizations
  render: {
    pixelArt: false, // Smooth scaling for our art style
    antialias: true,
    clearBeforeRender: true,
  },
};

// Create and start the game
const game = new Game(config);

// Prevent context menu on right-click (kiosk mode)
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Prevent default touch gestures (zoom, scroll)
document.addEventListener('touchmove', (event) => {
  event.preventDefault();
}, { passive: false });

// Handle fullscreen on double-tap (optional kiosk feature)
let lastTap = 0;
document.addEventListener('touchend', (event) => {
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  if (tapLength < 500 && tapLength > 0) {
    // Double tap detected - toggle fullscreen
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen may fail if not triggered by user gesture
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
    event.preventDefault();
  }
  lastTap = currentTime;
});

// Log game start
console.log('Hidden Object Detective Game started');
console.log('Find all 10 items before time runs out!');
console.log('Use the magnifier button to search in front of you.');

// Export game for debugging
(window as any).game = game;
