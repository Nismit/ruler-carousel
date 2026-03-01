import { RulerCarousel } from './RulerCarousel.js';

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
  { name: 'uFrequency', type: 'float', label: 'frequency' },
  { name: 'uAmplitude', type: 'float', label: 'amplitude' },
  { name: 'uPhase', type: 'float', label: 'phase' },
  { name: 'uNoise', type: 'float', label: 'noise' },
  { name: 'uBloom', type: 'float', label: 'bloom' },
];

const carouselContainer = document.getElementById('carousel-container');
const carouselOverlay = document.getElementById('carousel-overlay');
const openBtn = document.getElementById('open-btn');
const closeBtn = document.getElementById('close-btn');

const controlPanel = document.getElementById('control-panel');
const controlLabel = document.getElementById('control-label');
const controlValue = document.getElementById('control-value');

// UI elements
const sliderControl = document.getElementById('slider-control');
const sliderTrack = document.getElementById('slider-track');
const sliderFill = document.getElementById('slider-fill');
const sliderThumb = document.getElementById('slider-thumb');

const padControl = document.getElementById('pad-control');
const padArea = document.getElementById('pad-area');
const padThumb = document.getElementById('pad-thumb');

const vec3Control = document.getElementById('vec3-control');
const vec3Tracks = vec3Control.querySelectorAll('.vec3-slider-track');

const colorControl = document.getElementById('color-control');
const colorHsvWrapper = document.getElementById('color-hsv-wrapper');
const colorSvPad = document.getElementById('color-sv-pad');
const colorSvThumb = document.getElementById('color-sv-thumb');
const colorHueSlider = document.getElementById('color-hue-slider');
const colorHueThumb = document.getElementById('color-hue-thumb');
const colorOklchWrapper = document.getElementById('color-oklch-wrapper');
const oklchTracks = colorOklchWrapper.querySelectorAll('.oklch-slider-track');
const colorPreview = document.getElementById('color-preview');

// HSV to RGB conversion
const hsvToRgb = (h, s, v) => {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return { r: r + m, g: g + m, b: b + m };
};

const hueToColor = (h) => {
  const rgb = hsvToRgb(h, 1, 1);
  return `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
};

const rgbToHex = (r, g, b) => {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// RGB to OKLCH conversion (via OKLab)
const rgbToOklch = (r, g, b) => {
  // Linear RGB
  const toLinear = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // RGB to OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bVal = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bVal * bVal);
  let H = Math.atan2(bVal, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
};

// OKLCH to RGB conversion (via OKLab)
const oklchToRgb = (L, C, H) => {
  // OKLCH to OKLab
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab to linear RGB
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  let lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Linear to sRGB
  const toSrgb = (c) => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  return {
    r: Math.max(0, Math.min(1, toSrgb(lr))),
    g: Math.max(0, Math.min(1, toSrgb(lg))),
    b: Math.max(0, Math.min(1, toSrgb(lb)))
  };
};

// Color modes
const COLOR_MODES = ['hsv', 'oklch'];
let colorMode = 'hsv';

// Store values for each uniform
const uniformValues = {};
items.forEach(item => {
  if (item.type === 'float') {
    uniformValues[item.name] = 0.5;
  } else if (item.type === 'vec2') {
    uniformValues[item.name] = { x: 0.5, y: 0.5 };
  } else if (item.type === 'vec3') {
    if (item.isColor) {
      // Store as HSV: h (0-360), s (0-1), v (0-1)
      uniformValues[item.name] = { h: 0, s: 1, v: 1 };
    } else {
      uniformValues[item.name] = { x: 0.5, y: 0.5, z: 0.5 };
    }
  }
});

let currentItem = items[0];
let isEditing = false;
let isDraggingSlider = false;
let isDraggingPad = false;
let isDraggingVec3 = null; // 'x', 'y', 'z', or null
let isDraggingColorSv = false;
let isDraggingColorHue = false;

// Scale levels and state
const SCALE_LEVELS = [0.25, 0.5, 1, 2, 4];
let sliderScale = 1;
let padScale = 1;
let vec3Scale = 1;

// Slider range (dynamic based on scale)
let sliderMin = 0;
let sliderMax = 1;

// Pad range (dynamic based on scale)
let padMinX = 0;
let padMaxX = 1;
let padMinY = 0;
let padMaxY = 1;

// Vec3 range (dynamic based on scale)
let vec3Min = { x: 0, y: 0, z: 0 };
let vec3Max = { x: 1, y: 1, z: 1 };

// Hold + swipe state for scale adjustment
let isHolding = false;
let holdTimer = null;
let holdStartY = 0;
let holdStartScale = 1;
let holdScaleType = null; // 'float', 'vec2', 'vec3'
const HOLD_DURATION = 300; // ms to trigger hold
const SWIPE_THRESHOLD = 30; // px per scale step

// Get DOM elements for min/max and hold label
const sliderMinEl = document.getElementById('slider-min');
const sliderMaxEl = document.getElementById('slider-max');
const holdLabelEl = document.getElementById('hold-label');

// === Scale Helpers ===
const getScaleIndex = (scale) => {
  return SCALE_LEVELS.indexOf(scale);
};

const getScaleByIndex = (index) => {
  const clamped = Math.max(0, Math.min(SCALE_LEVELS.length - 1, index));
  return SCALE_LEVELS[clamped];
};

const calculateSliderRange = (currentValue, scale) => {
  const range = 1 / scale;
  let min = currentValue - range / 2;
  let max = currentValue + range / 2;

  // Clamp to 0-1 boundaries
  if (min < 0) {
    max = Math.min(1, max - min);
    min = 0;
  }
  if (max > 1) {
    min = Math.max(0, min - (max - 1));
    max = 1;
  }

  return { min, max };
};

const updateSliderRange = (scale) => {
  const currentValue = uniformValues[currentItem.name];
  const { min, max } = calculateSliderRange(currentValue, scale);
  sliderMin = min;
  sliderMax = max;
  sliderMinEl.textContent = min.toFixed(2);
  sliderMaxEl.textContent = max.toFixed(2);
};

const updatePadRange = (scale) => {
  const currentValue = uniformValues[currentItem.name];
  const rangeX = calculateSliderRange(currentValue.x, scale);
  const rangeY = calculateSliderRange(currentValue.y, scale);
  padMinX = rangeX.min;
  padMaxX = rangeX.max;
  padMinY = rangeY.min;
  padMaxY = rangeY.max;
};

const updateVec3Range = (scale) => {
  const currentValue = uniformValues[currentItem.name];
  const axes = ['x', 'y', 'z'];
  axes.forEach(axis => {
    const range = calculateSliderRange(currentValue[axis], scale);
    vec3Min[axis] = range.min;
    vec3Max[axis] = range.max;
  });
};

// === Float Slider ===
const updateSlider = (value) => {
  // Calculate position within current range
  const range = sliderMax - sliderMin;
  const percent = range > 0 ? Math.max(0, Math.min(1, (value - sliderMin) / range)) * 100 : 50;
  sliderFill.style.width = `${percent}%`;
  sliderThumb.style.left = `${percent}%`;
  controlLabel.textContent = value.toFixed(2);
  controlValue.textContent = `x${sliderScale}`;
};

const updateSliderFromPosition = (clientX) => {
  const rect = sliderTrack.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  // Map percent to value within current range
  const value = sliderMin + percent * (sliderMax - sliderMin);
  uniformValues[currentItem.name] = value;
  updateSlider(value);
};

const onSliderStart = (e) => {
  // Mouse event
  if (!e.touches) {
    isDraggingSlider = true;
    updateSliderFromPosition(e.clientX);
    return;
  }
  // Touch event - wait briefly to detect pinch
  if (e.touches.length === 1 && !isPinching) {
    isDraggingSlider = true;
    updateSliderFromPosition(e.touches[0].clientX);
  }
};

const onSliderMove = (e) => {
  if (isHolding) return;
  if (!isDraggingSlider) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  updateSliderFromPosition(clientX);
};

const onSliderEnd = () => {
  isDraggingSlider = false;
};

sliderTrack.addEventListener('mousedown', onSliderStart);
sliderThumb.addEventListener('mousedown', onSliderStart);

// === Float Slider Touch ===
const onSliderTouchStart = (e) => {
  if (e.touches.length === 1 && !isHolding) {
    isDraggingSlider = true;
    updateSliderFromPosition(e.touches[0].clientX);
  }
};

const onSliderTouchMove = (e) => {
  if (e.touches.length === 1 && isDraggingSlider && !isHolding) {
    updateSliderFromPosition(e.touches[0].clientX);
  }
};

const onSliderTouchEnd = (e) => {
  if (e.touches.length === 0) {
    isDraggingSlider = false;
  }
};

sliderControl.addEventListener('touchstart', onSliderTouchStart, { passive: false });
sliderControl.addEventListener('touchmove', onSliderTouchMove, { passive: false });
sliderControl.addEventListener('touchend', onSliderTouchEnd);
sliderControl.addEventListener('touchcancel', onSliderTouchEnd);

// Global hold + swipe handler for scale adjustment / color mode switch
let holdColorModeIndex = 0;

const startHoldTimer = (e) => {
  if (!isEditing) return;

  const touch = e.touches ? e.touches[0] : e;
  holdStartY = touch.clientY;

  // Store current scale/mode based on type
  if (currentItem.type === 'float') {
    holdStartScale = sliderScale;
    holdScaleType = 'float';
  } else if (currentItem.type === 'vec2') {
    holdStartScale = padScale;
    holdScaleType = 'vec2';
  } else if (currentItem.type === 'vec3' && !currentItem.isColor) {
    holdStartScale = vec3Scale;
    holdScaleType = 'vec3';
  } else if (currentItem.isColor) {
    holdColorModeIndex = COLOR_MODES.indexOf(colorMode);
    holdScaleType = 'color';
  }

  holdTimer = setTimeout(() => {
    isHolding = true;
    // Visual feedback
    document.body.style.cursor = 'ns-resize';
    holdLabelEl.classList.add('active');
    controlValue.classList.add('active');
  }, HOLD_DURATION);
};

const cancelHoldTimer = () => {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
};

const handleHoldMove = (e) => {
  if (!isHolding) {
    // Check if moved too much before hold triggered - cancel
    if (holdTimer) {
      const touch = e.touches ? e.touches[0] : e;
      const deltaY = Math.abs(touch.clientY - holdStartY);
      if (deltaY > 10) {
        cancelHoldTimer();
      }
    }
    return;
  }

  e.preventDefault();

  const touch = e.touches ? e.touches[0] : e;
  const deltaY = holdStartY - touch.clientY; // Up is positive
  const steps = Math.floor(deltaY / SWIPE_THRESHOLD);

  if (holdScaleType === 'color') {
    // Color mode switching
    const newIndex = ((holdColorModeIndex + steps) % COLOR_MODES.length + COLOR_MODES.length) % COLOR_MODES.length;
    const newMode = COLOR_MODES[newIndex];
    if (newMode !== colorMode) {
      setColorMode(newMode);
    }
  } else {
    // Scale adjustment
    const startIndex = getScaleIndex(holdStartScale);
    const newIndex = startIndex + steps;
    const newScale = getScaleByIndex(newIndex);

    if (holdScaleType === 'float' && newScale !== sliderScale) {
      sliderScale = newScale;
      updateSliderRange(sliderScale);
      updateSlider(uniformValues[currentItem.name]);
    } else if (holdScaleType === 'vec2' && newScale !== padScale) {
      padScale = newScale;
      updatePadRange(padScale);
      updatePad(uniformValues[currentItem.name]);
    } else if (holdScaleType === 'vec3' && newScale !== vec3Scale) {
      vec3Scale = newScale;
      updateVec3Range(vec3Scale);
      updateVec3(uniformValues[currentItem.name]);
    }
  }
};

const handleHoldEnd = () => {
  cancelHoldTimer();
  isHolding = false;
  holdScaleType = null;
  document.body.style.cursor = '';
  holdLabelEl.classList.remove('active');
  controlValue.classList.remove('active');
};

carouselContainer.addEventListener('touchstart', startHoldTimer, { passive: true });
carouselContainer.addEventListener('touchmove', handleHoldMove, { passive: false });
carouselContainer.addEventListener('touchend', handleHoldEnd);
carouselContainer.addEventListener('touchcancel', handleHoldEnd);

// Also support mouse for testing
carouselContainer.addEventListener('mousedown', startHoldTimer);
window.addEventListener('mousemove', handleHoldMove);
window.addEventListener('mouseup', handleHoldEnd);

// === Vec2 Pad ===
const updatePad = (value) => {
  // Calculate position within current range
  const rangeX = padMaxX - padMinX;
  const rangeY = padMaxY - padMinY;
  const percentX = rangeX > 0 ? Math.max(0, Math.min(1, (value.x - padMinX) / rangeX)) * 100 : 50;
  const percentY = rangeY > 0 ? Math.max(0, Math.min(1, (value.y - padMinY) / rangeY)) * 100 : 50;
  padThumb.style.left = `${percentX}%`;
  padThumb.style.top = `${percentY}%`;
  controlLabel.textContent = `${value.x.toFixed(2)}, ${value.y.toFixed(2)}`;
  controlValue.textContent = `x${padScale}`;
};

const updatePadFromPosition = (clientX, clientY) => {
  const rect = padArea.getBoundingClientRect();
  const percentX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const percentY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  // Map percent to value within current range
  const x = padMinX + percentX * (padMaxX - padMinX);
  const y = padMinY + percentY * (padMaxY - padMinY);
  uniformValues[currentItem.name] = { x, y };
  updatePad({ x, y });
};

const onPadStart = (e) => {
  // Mouse event only
  if (!e.touches) {
    isDraggingPad = true;
    updatePadFromPosition(e.clientX, e.clientY);
  }
};

const onPadMove = (e) => {
  if (isHolding) return;
  if (!isDraggingPad) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  updatePadFromPosition(clientX, clientY);
};

const onPadEnd = () => {
  isDraggingPad = false;
};

padArea.addEventListener('mousedown', onPadStart);
padThumb.addEventListener('mousedown', onPadStart);

// === Vec2 Pad Touch ===
const onPadTouchStart = (e) => {
  if (e.touches.length === 1 && !isHolding) {
    isDraggingPad = true;
    updatePadFromPosition(e.touches[0].clientX, e.touches[0].clientY);
  }
};

const onPadTouchMove = (e) => {
  if (e.touches.length === 1 && isDraggingPad && !isHolding) {
    updatePadFromPosition(e.touches[0].clientX, e.touches[0].clientY);
  }
};

const onPadTouchEnd = (e) => {
  if (e.touches.length === 0) {
    isDraggingPad = false;
  }
};

padControl.addEventListener('touchstart', onPadTouchStart, { passive: false });
padControl.addEventListener('touchmove', onPadTouchMove, { passive: false });
padControl.addEventListener('touchend', onPadTouchEnd);
padControl.addEventListener('touchcancel', onPadTouchEnd);

// === Vec3 Three Sliders ===
const updateVec3 = (value) => {
  const axes = ['x', 'y', 'z'];
  axes.forEach(axis => {
    const track = vec3Control.querySelector(`.vec3-slider-track[data-axis="${axis}"]`);
    const fill = track.querySelector('.vec3-slider-fill');
    const thumb = track.querySelector('.vec3-slider-thumb');
    // Calculate position within current range
    const range = vec3Max[axis] - vec3Min[axis];
    const percent = range > 0 ? Math.max(0, Math.min(1, (value[axis] - vec3Min[axis]) / range)) * 100 : 50;
    fill.style.width = `${percent}%`;
    thumb.style.left = `${percent}%`;
  });
  controlLabel.textContent = `${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)}`;
  controlValue.textContent = `x${vec3Scale}`;
};

const updateVec3FromPosition = (axis, clientX) => {
  const track = vec3Control.querySelector(`.vec3-slider-track[data-axis="${axis}"]`);
  const rect = track.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  // Map percent to value within current range
  const val = vec3Min[axis] + percent * (vec3Max[axis] - vec3Min[axis]);
  const current = uniformValues[currentItem.name];
  uniformValues[currentItem.name] = { ...current, [axis]: val };
  updateVec3(uniformValues[currentItem.name]);
};

const onVec3Start = (e) => {
  // Mouse event only
  if (!e.touches) {
    const track = e.target.closest('.vec3-slider-track');
    if (!track) return;
    isDraggingVec3 = track.dataset.axis;
    updateVec3FromPosition(isDraggingVec3, e.clientX);
  }
};

const onVec3Move = (e) => {
  if (isHolding) return;
  if (!isDraggingVec3) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  updateVec3FromPosition(isDraggingVec3, clientX);
};

const onVec3End = () => {
  isDraggingVec3 = null;
};

vec3Tracks.forEach(track => {
  track.addEventListener('mousedown', onVec3Start);
});

// === Vec3 Touch ===
const onVec3TouchStart = (e) => {
  if (e.touches.length === 1 && !isHolding) {
    const track = e.target.closest('.vec3-slider-track');
    if (!track) return;
    isDraggingVec3 = track.dataset.axis;
    updateVec3FromPosition(isDraggingVec3, e.touches[0].clientX);
  }
};

const onVec3TouchMove = (e) => {
  if (e.touches.length === 1 && isDraggingVec3 && !isHolding) {
    updateVec3FromPosition(isDraggingVec3, e.touches[0].clientX);
  }
};

const onVec3TouchEnd = (e) => {
  if (e.touches.length === 0) {
    isDraggingVec3 = null;
  }
};

vec3Control.addEventListener('touchstart', onVec3TouchStart, { passive: false });
vec3Control.addEventListener('touchmove', onVec3TouchMove, { passive: false });
vec3Control.addEventListener('touchend', onVec3TouchEnd);
vec3Control.addEventListener('touchcancel', onVec3TouchEnd);

// === Color Picker (HSV) ===
const updateColor = (value) => {
  const percentS = Math.max(0, Math.min(1, value.s)) * 100;
  const percentV = (1 - Math.max(0, Math.min(1, value.v))) * 100;
  const percentH = (value.h / 360) * 100;

  colorSvThumb.style.left = `${percentS}%`;
  colorSvThumb.style.top = `${percentV}%`;
  colorHueThumb.style.left = `${percentH}%`;
  colorSvPad.style.backgroundColor = hueToColor(value.h);

  const rgb = hsvToRgb(value.h, value.s, value.v);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  controlLabel.textContent = `${rgb.r.toFixed(2)}, ${rgb.g.toFixed(2)}, ${rgb.b.toFixed(2)} | ${hex}`;
  controlValue.textContent = 'HSV';
};

const updateColorSvFromPosition = (clientX, clientY) => {
  const rect = colorSvPad.getBoundingClientRect();
  const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const v = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  const current = uniformValues[currentItem.name];
  uniformValues[currentItem.name] = { h: current.h, s, v };
  updateColor(uniformValues[currentItem.name]);
};

const updateColorHueFromPosition = (clientX) => {
  const rect = colorHueSlider.getBoundingClientRect();
  const h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 360;
  const current = uniformValues[currentItem.name];
  uniformValues[currentItem.name] = { h, s: current.s, v: current.v };
  updateColor(uniformValues[currentItem.name]);
};

const onColorSvStart = (e) => {
  isDraggingColorSv = true;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  updateColorSvFromPosition(clientX, clientY);
};

const onColorHueStart = (e) => {
  isDraggingColorHue = true;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  updateColorHueFromPosition(clientX);
};

const onColorMove = (e) => {
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  if (isDraggingColorSv) updateColorSvFromPosition(clientX, clientY);
  if (isDraggingColorHue) updateColorHueFromPosition(clientX);
};

const onColorEnd = () => {
  isDraggingColorSv = false;
  isDraggingColorHue = false;
};

colorSvPad.addEventListener('mousedown', onColorSvStart);
colorSvThumb.addEventListener('mousedown', onColorSvStart);
colorHueSlider.addEventListener('mousedown', onColorHueStart);
colorHueThumb.addEventListener('mousedown', onColorHueStart);
colorSvPad.addEventListener('touchstart', onColorSvStart, { passive: true });
colorSvThumb.addEventListener('touchstart', onColorSvStart, { passive: true });
colorHueSlider.addEventListener('touchstart', onColorHueStart, { passive: true });
colorHueThumb.addEventListener('touchstart', onColorHueStart, { passive: true });

// === OKLCH Sliders ===
let isDraggingOklch = null; // 'l', 'c', 'h', or null

const updateOklch = (oklchValue) => {
  const channels = ['l', 'c', 'h'];
  const maxValues = { l: 1, c: 0.4, h: 360 }; // OKLCH ranges

  channels.forEach(ch => {
    const track = colorOklchWrapper.querySelector(`.oklch-slider-track[data-channel="${ch}"]`);
    const fill = track.querySelector('.oklch-slider-fill');
    const thumb = track.querySelector('.oklch-slider-thumb');
    const percent = Math.max(0, Math.min(1, oklchValue[ch] / maxValues[ch])) * 100;
    fill.style.width = `${percent}%`;
    thumb.style.left = `${percent}%`;
  });

  // Update color preview
  const rgb = oklchToRgb(oklchValue.l, oklchValue.c, oklchValue.h);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  colorPreview.style.backgroundColor = hex;

  // Update display
  controlLabel.textContent = `L:${oklchValue.l.toFixed(2)} C:${oklchValue.c.toFixed(2)} H:${oklchValue.h.toFixed(0)}°`;
  controlValue.textContent = 'OKLCH';
};

const updateOklchFromPosition = (channel, clientX) => {
  const track = colorOklchWrapper.querySelector(`.oklch-slider-track[data-channel="${channel}"]`);
  const rect = track.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

  const maxValues = { l: 1, c: 0.4, h: 360 };
  const value = percent * maxValues[channel];

  // Get current OKLCH from HSV
  const hsv = uniformValues[currentItem.name];
  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);

  // Update the channel
  oklch[channel] = value;

  // Convert back to HSV and store
  const newRgb = oklchToRgb(oklch.l, oklch.c, oklch.h);
  const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
  uniformValues[currentItem.name] = newHsv;

  updateOklch(oklch);
};

const onOklchStart = (e) => {
  const track = e.target.closest('.oklch-slider-track');
  if (!track) return;
  isDraggingOklch = track.dataset.channel;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  updateOklchFromPosition(isDraggingOklch, clientX);
};

const onOklchMove = (e) => {
  if (!isDraggingOklch) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  updateOklchFromPosition(isDraggingOklch, clientX);
};

const onOklchEnd = () => {
  isDraggingOklch = null;
};

oklchTracks.forEach(track => {
  track.addEventListener('mousedown', onOklchStart);
  track.addEventListener('touchstart', onOklchStart, { passive: true });
});

// RGB to HSV conversion
const rgbToHsv = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  return { h, s, v };
};

// Switch color mode UI
const setColorMode = (mode) => {
  colorMode = mode;
  if (mode === 'hsv') {
    colorHsvWrapper.classList.remove('hidden');
    colorOklchWrapper.classList.add('hidden');
    colorPreview.classList.remove('visible');
    updateColor(uniformValues[currentItem.name]);
  } else if (mode === 'oklch') {
    colorHsvWrapper.classList.add('hidden');
    colorOklchWrapper.classList.remove('hidden');
    colorPreview.classList.add('visible');
    // Convert HSV to OKLCH for display
    const hsv = uniformValues[currentItem.name];
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
    updateOklch(oklch);
  }
};

// Global move/end handlers
window.addEventListener('mousemove', (e) => {
  onSliderMove(e);
  onPadMove(e);
  onVec3Move(e);
  onColorMove(e);
  onOklchMove(e);
});
window.addEventListener('mouseup', () => {
  onSliderEnd();
  onPadEnd();
  onVec3End();
  onColorEnd();
  onOklchEnd();
});
window.addEventListener('touchmove', (e) => {
  onSliderMove(e);
  onPadMove(e);
  onVec3Move(e);
  onColorMove(e);
  onOklchMove(e);
}, { passive: true });
window.addEventListener('touchend', () => {
  onSliderEnd();
  onPadEnd();
  onVec3End();
  onColorEnd();
  onOklchEnd();
});

// === UI Switching ===
const showControlForType = (item) => {
  sliderControl.classList.add('hidden');
  padControl.classList.add('hidden');
  vec3Control.classList.add('hidden');
  colorControl.classList.add('hidden');

  if (item.type === 'float') {
    sliderControl.classList.remove('hidden');
    sliderScale = 1;
    updateSliderRange(sliderScale);
    updateSlider(uniformValues[item.name]);
    holdLabelEl.style.display = '';
  } else if (item.type === 'vec2') {
    padControl.classList.remove('hidden');
    padScale = 1;
    updatePadRange(padScale);
    updatePad(uniformValues[item.name]);
    holdLabelEl.style.display = '';
  } else if (item.type === 'vec3') {
    if (item.isColor) {
      colorControl.classList.remove('hidden');
      colorMode = 'hsv';
      setColorMode(colorMode);
      holdLabelEl.style.display = '';
    } else {
      vec3Control.classList.remove('hidden');
      vec3Scale = 1;
      updateVec3Range(vec3Scale);
      updateVec3(uniformValues[item.name]);
      holdLabelEl.style.display = '';
    }
  }
};

// === Edit Mode ===
const enterEditMode = (item) => {
  if (isEditing) return;
  isEditing = true;
  currentItem = item;
  showControlForType(item);
  controlPanel.classList.add('visible');
  carousel.disable();
};

const exitEditMode = () => {
  if (!isEditing) return;
  isEditing = false;
  controlPanel.classList.remove('visible');
  // Delay re-enabling carousel to prevent synthetic click from re-entering edit mode
  setTimeout(() => {
    carousel.enable();
  }, 50);
};

const carousel = new RulerCarousel(carouselContainer, {
  items,
  initialIndex: 0,
  eventTarget: carouselContainer,
  onSelect: (index, item) => {
    currentItem = item;
    // Update control UI but don't show panel yet
    showControlForType(item);
  },
  onConfirm: (index, item) => {
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

const openCarousel = () => {
  carouselOverlay.classList.remove('hidden');
  carouselOverlay.classList.add('visible');
  openBtn.style.display = 'none';

  carouselContainer.classList.remove('hidden');
  carouselContainer.classList.add('visible');

  setTimeout(() => {
    closeBtn.classList.add('visible');
    // Control panel is hidden until user taps an item
  }, SLIDE_DURATION);
};

const closeCarousel = () => {
  // Exit edit mode if active
  if (isEditing) {
    exitEditMode();
  }

  closeBtn.classList.remove('visible');

  carouselContainer.classList.remove('visible');
  carouselContainer.classList.add('hidden');

  setTimeout(() => {
    carouselOverlay.classList.remove('visible');
    carouselOverlay.classList.add('hidden');
    openBtn.style.display = 'block';
  }, SLIDE_DURATION);
};

openBtn.addEventListener('click', openCarousel);
closeBtn.addEventListener('click', closeCarousel);


// Initialize with first item (panel hidden)
showControlForType(currentItem);
controlPanel.classList.remove('visible');
