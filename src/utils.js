/**
 * Color conversion utilities for Ruler Carousel.
 * Supports HSV, RGB, OKLCH color spaces.
 */

/**
 * Convert HSV to RGB.
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} v - Value (0-1)
 * @returns {{r: number, g: number, b: number}} RGB values (0-1)
 */
export const hsvToRgb = (h, s, v) => {
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

/**
 * Convert RGB to HSV.
 * @param {number} r - Red (0-1)
 * @param {number} g - Green (0-1)
 * @param {number} b - Blue (0-1)
 * @returns {{h: number, s: number, v: number}} HSV values
 */
export const rgbToHsv = (r, g, b) => {
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

/**
 * Convert RGB to OKLCH (via OKLab).
 * @param {number} r - Red (0-1)
 * @param {number} g - Green (0-1)
 * @param {number} b - Blue (0-1)
 * @returns {{l: number, c: number, h: number}} OKLCH values
 */
export const rgbToOklch = (r, g, b) => {
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

/**
 * Convert OKLCH to RGB (via OKLab).
 * @param {number} L - Lightness (0-1)
 * @param {number} C - Chroma (0-0.4 typical)
 * @param {number} H - Hue (0-360)
 * @returns {{r: number, g: number, b: number}} RGB values (0-1, clamped)
 */
export const oklchToRgb = (L, C, H) => {
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

/**
 * Convert RGB to hex string.
 * @param {number} r - Red (0-1)
 * @param {number} g - Green (0-1)
 * @param {number} b - Blue (0-1)
 * @returns {string} Hex color string (e.g., "#FF0000")
 */
export const rgbToHex = (r, g, b) => {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Convert hue value to CSS color string.
 * @param {number} h - Hue (0-360)
 * @returns {string} CSS rgb() color string
 */
export const hueToColor = (h) => {
  const rgb = hsvToRgb(h, 1, 1);
  return `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
};
