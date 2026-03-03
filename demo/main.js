import { RulerCarousel } from '../src/RulerCarousel.js';
import { RulerFloatControl } from '../src/controls/RulerFloatControl.js';
import { RulerVec2Control } from '../src/controls/RulerVec2Control.js';
import { RulerVec3Control } from '../src/controls/RulerVec3Control.js';
import { RulerVec4Control } from '../src/controls/RulerVec4Control.js';
import { RulerColorControl } from '../src/controls/RulerColorControl.js';

// Demo items
const items = [
  { name: 'uIntensity', type: 'float', label: 'intensity' },
  { name: 'uSpeed', type: 'float', label: 'speed' },
  { name: 'uScale', type: 'float', label: 'scale' },
  { name: 'uOffset', type: 'vec2', label: 'offset' },
  { name: 'uCenter', type: 'vec2', label: 'center' },
  { name: 'uDirection', type: 'vec3', label: 'direction' },
  { name: 'uRotation', type: 'vec3', label: 'rotation' },
  { name: 'uColor', type: 'vec3', label: 'color', isColor: true },
  { name: 'uAmbient', type: 'vec3', label: 'ambient', isColor: true },
  { name: 'uTransform', type: 'vec4', label: 'transform' },
  { name: 'uBounds', type: 'vec4', label: 'bounds' },
];

// DOM elements
const carouselContainer = document.getElementById('carousel-container');
const carouselOverlay = document.getElementById('carousel-overlay');
const openBtn = document.getElementById('open-btn');
const closeBtn = document.getElementById('close-btn');

const controlPanel = document.getElementById('control-panel');
const controlLabel = document.getElementById('control-label');
const controlValue = document.getElementById('control-value');
const controlContainer = document.getElementById('control-container');

// State
const uniformValues = {};
let currentItem = items[0];
let currentControl = null;
let isEditing = false;

// Initialize values
items.forEach(item => {
  if (item.type === 'float') {
    uniformValues[item.name] = 0.5;
  } else if (item.type === 'vec2') {
    uniformValues[item.name] = { x: 0.5, y: 0.5 };
  } else if (item.type === 'vec3') {
    if (item.isColor) {
      uniformValues[item.name] = { h: 0, s: 1, v: 1 };
    } else {
      uniformValues[item.name] = { x: 0, y: 0, z: 0 };
    }
  } else if (item.type === 'vec4') {
    uniformValues[item.name] = { x: 0, y: 0, z: 0, w: 0 };
  }
});

// Create controls
const controls = new Map();

items.forEach(item => {
  let control;

  if (item.type === 'float') {
    control = new RulerFloatControl(uniformValues[item.name]);
  } else if (item.type === 'vec2') {
    control = new RulerVec2Control(uniformValues[item.name]);
  } else if (item.type === 'vec3') {
    if (item.isColor) {
      control = new RulerColorControl(uniformValues[item.name]);
    } else {
      control = new RulerVec3Control(uniformValues[item.name]);
    }
  } else if (item.type === 'vec4') {
    control = new RulerVec4Control(uniformValues[item.name]);
  }

  if (control) {
    control.onChange = (value) => {
      uniformValues[item.name] = value;
      updateDisplay();
    };
    controls.set(item.name, control);
  }
});

// Mount and show control for item
function mountControl(item) {
  // Unmount current control
  if (currentControl) {
    currentControl.unmount();
  }

  const control = controls.get(item.name);

  if (control) {
    currentControl = control;
    control.value = uniformValues[item.name];
    control.mount(controlContainer);
    updateDisplay();
  }
}

// Update label display
function updateDisplay() {
  if (!currentControl || !currentItem) return;

  controlLabel.textContent = currentControl.getDisplayValue();

  if (typeof currentControl.getScaleDisplay === 'function') {
    controlValue.textContent = currentControl.getScaleDisplay();
  } else if (typeof currentControl.getModeDisplay === 'function') {
    controlValue.textContent = currentControl.getModeDisplay();
  } else {
    controlValue.textContent = '';
  }
}

// Enter edit mode - show control panel, disable carousel
function enterEditMode(item) {
  if (isEditing) return;
  isEditing = true;
  currentItem = item;
  mountControl(item);
  controlPanel.classList.add('visible');
  carousel.disable();
}

// Exit edit mode - hide control panel, enable carousel
function exitEditMode() {
  if (!isEditing) return;
  isEditing = false;
  controlPanel.classList.remove('visible');
  carousel.enable();
}

// Create carousel
const carousel = new RulerCarousel(carouselContainer, {
  items,
  initialIndex: 0,
  eventTarget: carouselContainer,
  onSelect: (index, item) => {
    // Just remember the selected item, don't mount control yet
    currentItem = item;
  },
  onConfirm: (index, item) => {
    // User tapped/clicked to confirm - enter edit mode
    enterEditMode(item);
  },
  onBackgroundTap: () => {
    if (isEditing) {
      exitEditMode();
    } else {
      enterEditMode(currentItem);
    }
  },
});

const SLIDE_DURATION = 350;

// Open carousel
function openCarousel() {
  carouselOverlay.classList.remove('hidden');
  carouselOverlay.classList.add('visible');
  openBtn.style.display = 'none';

  carouselContainer.classList.remove('hidden');
  carouselContainer.classList.add('visible');

  setTimeout(() => {
    closeBtn.classList.add('visible');
    // Control panel is hidden until user taps an item
  }, SLIDE_DURATION);
}

// Close carousel
function closeCarousel() {
  // Exit edit mode if active
  if (isEditing) {
    exitEditMode();
  }

  closeBtn.classList.remove('visible');

  carouselContainer.classList.remove('hidden');
  carouselContainer.classList.add('visible');

  carouselContainer.classList.remove('visible');
  carouselContainer.classList.add('hidden');

  setTimeout(() => {
    carouselOverlay.classList.remove('visible');
    carouselOverlay.classList.add('hidden');
    openBtn.style.display = 'block';
  }, SLIDE_DURATION);
}

// Event listeners
openBtn.addEventListener('click', openCarousel);
closeBtn.addEventListener('click', closeCarousel);

// Initialize - panel hidden, no control mounted yet
controlPanel.classList.remove('visible');
