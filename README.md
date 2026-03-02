# Ruler Carousel

A vertical infinite-loop carousel UI inspired by iOS picker, with physics-based scrolling and spring-snap animation.

## File Structure

```
root/
├── index.html        # Main HTML
├── RulerCarousel.js  # Carousel component
├── main.js           # Application entry point
├── style.css         # Style definitions
└── README.md         # This file
```

## RulerCarousel.js

### Class Overview

A ruler-style vertical carousel with infinite loop, inertia scrolling, and spring-snap animation.

### Physics Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DRAG_THRESHOLD` | 2 | Drag detection threshold (px) |
| `FRICTION` | 0.95 | Friction coefficient for inertia |
| `MIN_VELOCITY` | 0.15 | Minimum velocity before snap begins |
| `SPRING_STIFFNESS` | 0.12 | Spring stiffness for snap |
| `SPRING_DAMPING` | 0.7 | Spring damping for snap |

### Scroll Phases

```
idle → dragging → inertia → snapping → idle
         ↓           ↓
         └─────→ snapping (skips inertia when velocity is low)
```

| Phase | Description |
|-------|-------------|
| `idle` | Resting state |
| `dragging` | User is actively dragging |
| `inertia` | Scrolling with friction-based deceleration |
| `snapping` | Snapping to nearest item using spring physics |

### Infinite Loop Mechanism

- Items are repeated 5 times (`repeatCount: 5`)
- Starts from center section (index 2)
- `_checkLoop()`: Instantly jumps back when more than 1.5 sections away from center

### Responsive Breakpoints

| Viewport Width | itemSpacing | tickWidth | tickWidthActive | fontSize | fontSizeActive |
|----------------|-------------|-----------|-----------------|----------|----------------|
| ≤480px | 36 | 20 | 32 | 11 | 13 |
| ≤768px | 42 | 24 | 40 | 12 | 14 |
| >768px | 48 | 28 | 48 | 13 | 16 |

### Constructor Options

```javascript
new RulerCarousel(container, {
  items: [],           // Array of items
  initialIndex: 0,     // Initial selected index
  eventTarget: null,   // Event listener target (default: container)
  onSelect: (index, item) => {},      // Selection change callback
  onConfirm: (index, item) => {},     // Confirm callback (tap on selected item)
  onBackgroundTap: () => {},          // Background tap callback
});
```

### Public Methods

| Method | Description |
|--------|-------------|
| `selectIndex(index)` | Snap to specified index |
| `disable()` | Disable carousel scrolling (background tap detection remains active) |
| `enable()` | Enable carousel scrolling |
| `dispose()` | Remove event listeners and DOM elements |

## main.js

### Interaction Flow

```
[Browse Mode]                         [Edit Mode]
Carousel scroll enabled               Carousel disabled
Control panel hidden                  Control panel visible

    ┌─────────────────────────────────────────┐
    │                                         │
    ▼                                         │
 Carousel visible                             │
    │                                         │
    ├─ Item tap → Select                      │
    │                                         │
    ├─ Tap selected item ─────────→ Edit mode │
    │                                         │
    └─ Background tap ────────────→ Edit mode │
                                              │
                              Background tap ←┘
                              (Exit edit mode)
```

### Item Definition

List of shader uniform variables. Each item has:

```javascript
{
  name: 'uIntensity',  // Uniform name
  type: 'float',       // Type: float | vec2 | vec3 | vec4
  label: 'intensity',  // Display label
  isColor: false,      // For vec3: use color picker instead of gesture pad
}
```

### Control UI by Type

| Type | isColor | Control |
|------|---------|---------|
| `float` | - | Horizontal slider |
| `vec2` | - | 2D pad |
| `vec3` | `false` | Gesture-based 2D pad with XY/Z mode toggle |
| `vec3` | `true` | HSV color picker (SV pad + Hue slider) or OKLCH sliders |
| `vec4` | - | Gesture-based 2D pad with XY/ZW mode toggle |

### Vec3/Vec4 Gesture-Based Controls

Both vec3 (non-color) and vec4 use a gesture-based 2D pad interface:

| Mode | Axes | Description |
|------|------|-------------|
| XY (default) | X, Y | Drag horizontally for X, vertically for Y |
| Z (vec3) | Z | Drag horizontally for Z |
| ZW (vec4) | Z, W | Drag horizontally for Z, vertically for W |

**Mode Toggle:**
- Double-tap on the pad
- Tap the mode label (XY/Z/ZW)

**Visual Feedback:**
- XY mode: Default color (orange for vec3, purple for vec4)
- Z/ZW mode: Orange color (#ffa94d)

### Edit Mode

| State | `isEditing` | Carousel | Control Panel |
|-------|-------------|----------|---------------|
| Browse | `false` | Enabled | Hidden |
| Edit | `true` | Disabled | Visible |

### Scale Adjustment (Hold + Swipe)

Hold for 300ms then swipe vertically to adjust scale:

| Scale Levels | Range |
|--------------|-------|
| x0.25 | Fine control |
| x0.5 | |
| x1 | Default |
| x2 | |
| x4 | Coarse control |

For color controls, hold + swipe switches between HSV and OKLCH modes.

### Value Storage

`uniformValues` object stores current values for each uniform:

```javascript
{
  uIntensity: 0.5,                              // float (0 to 1)
  uOffset: { x: 0.5, y: 0.5 },                  // vec2 (0 to 1)
  uDirection: { x: 0, y: 0, z: 0 },             // vec3 (-1 to 1)
  uColor: { h: 0, s: 1, v: 1 },                 // vec3 (color) - HSV format
  uTransform: { x: 0, y: 0, z: 0, w: 0 },       // vec4 (-1 to 1)
}
```

### Color Space Conversions

The application includes conversions between:
- HSV ↔ RGB
- RGB ↔ OKLCH (via OKLab)

## style.css

### CSS Variables

```css
:root {
  --accent-color: #00d4ff;
  --bg-color: #1a1a2e;
  --item-bg: rgba(20, 20, 30, 0.9);
  --item-border: rgba(255, 255, 255, 0.1);
  --text-color: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.5);
}
```

### Type-Based Accent Colors

| Type | Color |
|------|-------|
| `float` | `#00d4ff` (Cyan) |
| `vec2` | `#69db7c` (Green) |
| `vec3` | `#ffa94d` (Orange) |
| `vec4` | `#da77f2` (Purple) |

### Carousel Layout

- Fixed position on right side (`right: 0`)
- Width: 160px (mobile: 120px)
- Vertical axis line: 2px from right edge

## Usage

```bash
# Start with local server
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000` (or the appropriate port) in your browser.
