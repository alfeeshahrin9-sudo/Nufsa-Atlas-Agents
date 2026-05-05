**PROJECT: Atlas Agents - Hidden Object Detective Game**

**Overview:**
Build a top-down JRPG-style hidden object game using Phaser 3 + TypeScript. The game runs locally on a tablet at a university fair. Players have 5 minutes to find 10 items in a single map location.

**Core Requirements:**

1. **Player Character:**
   - Top-down sprite with 4-directional movement (up/down/left/right)
   - Smooth movement with collision detection
   - Facing direction tracking (last movement direction)
   - Virtual joystick or tap-to-move controls for tablet touch input

2. **Detection System:**
   - Magnifying glass button (UI element, bottom-right corner)
   - When pressed, detect items in a 3x1 rectangle in front of player
   - If item is in range: collect it with animation, play SFX, update UI
   - Visual feedback: button glows when item is in detection range

3. **Item System:**
   - 10 items per map, positioned at specific coordinates
   - Items are hidden/scaled small on the map (not immediately obvious)
   - Each item has: id, name, description, position, sprite key
   - Items persist in scene until collected

4. **UI Components:**
   - **Timer:** Countdown from 5:00 at top-center
   - **Item List:** Bottom panel showing all 10 item names
     - Grayed out when not found
     - Green checkmark when collected
     - Click/tap to show description modal
   - **Description Modal:** Overlay showing item name, description text, close button
   - **Magnifier Button:** Bottom-right, thumb-friendly size (80x80px min)

5. **Game Flow:**
   - BootScene: Load JSON config, assets
   - GameScene: Main gameplay
   - ResultScene: Show win/lose based on items found, auto-reset after 10s
   - Idle reset: If no input for 30s on result screen, auto-restart

6. **Data-Driven Design:**
   - Load level data from `cases.json`:
   ```json
   {
     "location": "Kyoto, Japan",
     "timeLimitSeconds": 300,
     "requiredItems": 10,
     "items": [
       {
         "id": "yukata",
         "name": "Bloody Yukata",
         "description": "A white kimono with dark crimson stains",
         "position": {"x": 640, "y": 480},
         "spriteKey": "item_yukata"
       }
     ]
   }
   ```

7. **Technical Specs:**
   - Phaser 3.60+
   - TypeScript
   - Tiled map format (JSON)
   - Touch-optimized for tablets
   - Fullscreen kiosk mode
   - No external dependencies beyond Phaser

**Deliverables:**
1. Complete TypeScript project structure
2. All scene implementations (Boot, Game, Result)
3. Player controller with touch input
4. Item detection system with cone collision
5. Complete UI system (timer, item list, modal, magnifier)
6. Kiosk-ready index.html with proper meta tags
7. Example cases.json for Japan location

**Code Style:**
- Modular architecture with separate systems
- Type-safe interfaces for all data structures
- Commented code explaining complex logic
- Mobile-first touch input handling

---

## 🏗️ INFRASTRUCTURE PLAN

### **File Structure**
```
atlas-agents/
├── public/
│   ├── index.html              # Kiosk-ready entry point
│   └── assets/
│       ├── maps/
│       │   ├── japan-map.json  # Tiled export
│       │   └── japan-tiles.png
│       ├── items/
│       │   ├── yukata.png
│       │   ├── matcha.png
│       │   ├── katana.png
│       │   └── ... (10 items)
│       ├── character/
│       │   └── detective.png   # Your sprite sheet
│       ├── ui/
│       │   ├── magnifier-btn.png
│       │   └── panel-bg.png
│       └── audio/
│           ├── ambient-japan.mp3
│           ├── collect-sfx.mp3
│           └── detect-sfx.mp3
│
├── src/
│   ├── main.ts                 # Phaser config, scene registration
│   ├── types/
│   │   └── game.types.ts       # Interfaces for Item, Case, etc.
│   ├── scenes/
│   │   ├── BootScene.ts        # Asset loading, JSON parsing
│   │   ├── GameScene.ts        # Core gameplay
│   │   └── ResultScene.ts      # Win/lose, auto-reset
│   ├── systems/
│   │   ├── PlayerController.ts # Movement, input, facing
│   │   ├── ItemManager.ts      # Spawn, detect, collect logic
│   │   ├── UIManager.ts        # All UI components
│   │   └── AudioManager.ts     # SFX and music control
│   └── data/
│       └── cases.json          # All location configs
│
├── package.json
├── tsconfig.json
├── vite.config.ts              # Or webpack config
└── README.md
```

### **System Architecture**

```
┌─────────────────────────────────────────────────────┐
│                     GameScene                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Player     │  │   Item       │  │   UI      │ │
│  │ Controller   │◄─┤   Manager    │◄─┤  Manager  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│         │                  │                │        │
│         │                  │                │        │
│  ┌──────▼────────┐  ┌─────▼──────┐  ┌─────▼──────┐ │
│  │ Input Handler │  │ Detection  │  │ Timer &    │ │
│  │ (Touch/Keys)  │  │ Cone Logic │  │ Modal      │ │
│  └───────────────┘  └────────────┘  └──────────── │
└─────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   cases.json        │
              │   (Data Source)     │
              └─────────────────────┘
```

### **Key Interfaces (types/game.types.ts)**
```typescript
interface ItemData {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  spriteKey: string;
  collected: boolean;
}

interface CaseData {
  location: string;
  timeLimitSeconds: number;
  requiredItems: number;
  items: ItemData[];
  mapKey: string;
  ambientAudioKey?: string;
}

interface PlayerState {
  isMoving: boolean;
  facingDirection: 'up' | 'down' | 'left' | 'right';
  speed: number;
}
```

---

## 📝 STEP-BY-STEP DEVELOPMENT PLAN

### **PHASE 1: Foundation (Days 1-2)**

**Day 1: Setup & Map Creation**
- [ ] Initialize project: `npm create vite@latest atlas-agents -- --template vanilla-ts`
- [ ] Install Phaser: `npm install phaser`
- [ ] Configure `vite.config.ts` for local serving
- [ ] Create kiosk-ready `index.html`:
  - Fullscreen meta tags
  - Disable zoom/scroll
  - Touch-action: none
- [ ] **Map Work (Tiled):**
  - Download/find tileset (search: "RPG tileset top-down" on OpenGameArt/itch.io)
  - Create 800x600 or 1024x768 map in Tiled
  - Add collision layer (walls, furniture)
  - Export as JSON to `public/assets/maps/`

**Day 2: Asset Preparation**
- [ ] **Character Sprite:**
  - Find or create top-down detective sprite
  - Ensure 4-direction frames (or single image with flip)
  - Size: ~32x32 or 48x48px
- [ ] **Item Images (Your Pixelation Workflow):**
  1. Take/find real photos of 10 Japan-themed items
  2. Edit in Photoshop/GIMP:
     - Remove background (transparent PNG)
     - Resize to ~24x24 or 32x32px
     - Apply pixelate filter (8x8 or 16x16 blocks)
     - Reduce colors (posterize to 8-16 colors)
     - Add slight outline for visibility
  3. Export as PNG with transparency
  4. Name consistently: `item_yukata.png`, `item_katana.png`, etc.
- [ ] **UI Assets:**
  - Magnifier button (simple circle with glass icon)
  - Panel background for item list
- [ ] **Audio (Optional but Recommended):**
  - Download ambient track (Japan-themed from OpenGameArt)
  - Get 2-3 SFX: collect, detect, win/lose

---

### **PHASE 2: Core Systems (Days 3-5)**

**Day 3: Player Movement & Input**
- [ ] Create `BootScene.ts`:
  - Load all assets (images, audio, map JSON, cases.json)
  - Start GameScene when complete
- [ ] Create `PlayerController.ts`:
  - Sprite creation at spawn point
  - Keyboard input (WASD/arrows) for testing
  - Touch input: virtual joystick OR tap-to-move
  - Facing direction tracking
  - Collision with Tiled collision layer
- [ ] Test: Character moves smoothly, respects walls

**Day 4: Item System**
- [ ] Create `cases.json` with Japan location:
  - Define all 10 items with positions
  - Write descriptions
  - Match sprite keys to your PNG files
- [ ] Create `ItemManager.ts`:
  - Read items from cases.json
  - Spawn items at positions (small scale: 0.5-0.8)
  - Store reference to uncollected items
  - Collection method: remove from scene, mark as collected
- [ ] Add items to map in GameScene
- [ ] Test: All 10 items appear, can be collected (temporarily on touch)

**Day 5: Detection System**
- [ ] Implement detection cone logic:
  - Calculate angle based on `facingDirection`
  - Create arc/cone shape (use Phaser.Graphics for debug)
  - Check distance + angle to each uncollected item
  - Return closest item in range
- [ ] Create magnifier button UI:
  - Fixed position bottom-right
  - Touch/click handler
  - Visual feedback (scale animation on press)
- [ ] Wire detection to button:
  - On press: run detection logic
  - If item found: trigger collection
  - Play SFX, show particle effect
- [ ] Add proximity hint:
  - Button glows/pulses when item is in range
  - Optional: subtle screen vignette
- [ ] Test: Walk up to item, face it, press button → collect

---

### **PHASE 3: UI & Polish (Days 6-8)**

**Day 6: Item List & Timer**
- [ ] Create `UIManager.ts`:
  - Timer display (top-center, MM:SS format)
  - Countdown logic using Phaser.Time
  - Pause/win/lose states
- [ ] Build item list panel (bottom):
  - Horizontal scroll or 2-row grid
  - Item name buttons (text or small icons)
  - Visual state: gray (uncollected) → green + checkmark (collected)
- [ ] Test: Timer counts down, items update when collected

**Day 7: Description Modal**
- [ ] Create modal overlay:
  - Semi-transparent background
  - Centered panel with item name, description
  - Close button (X or tap outside)
- [ ] Wire item list clicks:
  - On click: show modal with that item's description
  - Can view collected or uncollected items
- [ ] Add animations:
  - Modal fade in/out
  - Item collect animation (scale up + fade)
  - Button press feedback
- [ ] Test: Click any item → see description → close

**Day 8: Result Scene & Game Flow**
- [ ] Create `ResultScene.ts`:
  - Win condition: 10/10 items before timer ends
  - Lose condition: timer reaches 0
  - Display: "Case Solved!" or "Time's Up!"
  - Show score: X/10 items found
  - Auto-reset after 10 seconds
- [ ] Add idle detection:
  - Track last input time
  - If 30s idle on result screen → auto-restart
- [ ] Implement scene transitions:
  - Boot → Game (on load complete)
  - Game → Result (on win/lose)
  - Result → Boot (auto-reset)
- [ ] Test full loop: Play → Win/Lose → Auto-restart

---

### **PHASE 4: Testing & Deployment (Days 9-10)**

**Day 9: Tablet Testing & Optimization**
- [ ] Build for production: `npm run build`
- [ ] Serve locally: `npx serve dist` or `python -m http.server`
- [ ] **Test on actual tablet:**
  - Touch responsiveness
  - Button sizes (thumb-friendly?)
  - Text readability
  - Performance (60fps?)
- [ ] Fix issues:
  - Adjust hit areas if too small
  - Increase font sizes if needed
  - Optimize images if slow loading
- [ ] Add kiosk mode features:
  - Disable context menu (right-click)
  - Prevent zoom gestures
  - Lock orientation (landscape)
  - Fullscreen API or browser F11

**Day 10: Polish & Booth Prep**
- [ ] Add final touches:
  - Ambient audio loop
  - Screen shake on collect (subtle)
  - Particle effects (sparkles on find)
  - Transition animations between scenes
- [ ] Create booth instructions:
  - Simple sign: "Tap magnifier to search!"
  - No tutorial needed (self-explanatory)
- [ ] Prepare deployment:
  - Copy `dist/` folder to USB
  - Test on booth laptop/tablet
  - Have backup browser ready
- [ ] **Optional:** Create 2nd location (Paris, Egypt) for variety
  - Duplicate cases.json entry
  - Swap map and items
  - Test location switching

---
