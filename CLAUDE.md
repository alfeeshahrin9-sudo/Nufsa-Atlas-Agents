# Hidden Object Detective Game

## Project Overview
A top-down JRPG-style hidden object game built with Phaser 3 + TypeScript for a university fair kiosk display. Players have 5 minutes to find 10 items in a Kyoto, Japan location.

## Quick Commands
```bash
npm run dev    # Start dev server (port 3000)
npm run build  # Build for production
npm run preview # Preview production build
```

## Project Structure
```
atlas-agents/
├── src/
│   ├── main.ts                 # Phaser config, scene registration
│   ├── types/game.types.ts     # TypeScript interfaces
│   ├── scenes/
│   │   ├── BootScene.ts        # Asset loading, texture generation
│   │   ├── GameScene.ts        # Main gameplay
│   │   └── ResultScene.ts      # Win/lose display, auto-reset
│   ├── system/
│   │   ├── PlayerController.ts # Movement, touch joystick, facing
│   │   ├── ItemManager.ts      # Item spawning, detection cone, collection
│   │   ├── UIManager.ts        # Timer, item list, modal, magnifier
│   │   └── AudioManager.ts     # SFX and music
│   └── data/cases.json         # Level configuration
├── public/assets/
│   ├── tiles/                  # Map tileset
│   ├── items/                  # Item sprites (generated placeholders)
│   ├── character/              # Player sprite
│   ├── ui/                     # UI elements (generated placeholders)
│   └── audio/                  # Sound effects and music
└── index.html                  # Kiosk-ready entry point
```

## Core Systems

### PlayerController
- WASD/arrow keys + touch joystick (left side of screen)
- 4-directional facing with sprite flipping
- Collision detection with furniture

### ItemManager
- 10 items positioned around the map
- Detection cone: 45° arc, 128px range in front of player
- Collection with scale-up/fade animation

### UIManager
- **Timer:** Top-center, countdown from 5:00, turns orange/red when low
- **Item List:** Bottom panel, gray→green+checkmark when collected
- **Magnifier Button:** Bottom-right, 80x80px, glows green when item in range
- **Description Modal:** Click any item to view name/description

### Game Flow
1. BootScene → loads/generates assets
2. GameScene → main gameplay
3. ResultScene → shows result (2s), auto-restarts (10s)
4. Idle timeout: 30s on result screen triggers restart

## Data-Driven Design
Edit `src/data/cases.json` to modify:
- Item positions, names, descriptions
- Time limit
- Required items count
- Add new locations (duplicate "japan" entry)

## Kiosk Mode Features
- Fullscreen meta tags
- Touch-action: none (prevents zoom/scroll)
- Right-click disabled
- Double-tap toggles fullscreen

## Current Status
- ✅ All TypeScript compiles cleanly
- ✅ Production build succeeds
- ✅ Placeholder textures generated automatically
- ✅ All 10 Japan items configured
- ⏳ Audio files are optional (game runs without them)
- ⏳ Custom art assets can replace placeholders

## Adding Custom Assets
1. Place PNGs in `public/assets/items/` named by item ID (e.g., `yukata.png`)
2. Place tileset in `public/assets/tiles/japan-tiles.png`
3. Place audio in `public/assets/audio/`
4. BootScene will use real assets if found, fallback to generated placeholders

## Known Limitations
- Map is procedurally generated (not Tiled format) for simplicity
- Furniture is hardcoded in GameScene.createFurniture()
- No particle effects or screen shake (can be added)
