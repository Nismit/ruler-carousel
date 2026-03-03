import { RulerBaseControl } from './RulerBaseControl.js';
import { hsvToRgb, rgbToHsv, rgbToOklch, oklchToRgb, rgbToHex, hueToColor } from '../utils.js';

/**
 * Color picker control with HSV and OKLCH modes.
 * Values are stored internally as HSV {h, s, v}.
 *
 * @typedef {{h: number, s: number, v: number}} HSV - h: 0-360, s: 0-1, v: 0-1
 */
export class RulerColorControl extends RulerBaseControl {
  static MODES = ['hsv', 'oklch'];

  /** @type {'hsv'|'oklch'} */
  _mode = 'hsv';

  // HSV elements
  /** @type {HTMLElement|null} */
  _hsvWrapper = null;
  /** @type {HTMLElement|null} */
  _svPad = null;
  /** @type {HTMLElement|null} */
  _svThumb = null;
  /** @type {HTMLElement|null} */
  _hueSlider = null;
  /** @type {HTMLElement|null} */
  _hueThumb = null;

  // OKLCH elements
  /** @type {HTMLElement|null} */
  _oklchWrapper = null;
  /** @type {Map<string, {track: HTMLElement, fill: HTMLElement, thumb: HTMLElement}>} */
  _oklchSliders = new Map();

  // Preview
  /** @type {HTMLElement|null} */
  _preview = null;

  // Dragging state
  /** @type {boolean} */
  _isDraggingSv = false;
  /** @type {boolean} */
  _isDraggingHue = false;
  /** @type {string|null} */
  _isDraggingOklch = null; // 'l', 'c', 'h', or null

  /** @type {Object} */
  _boundHandlers = {};

  /** @type {((mode: 'hsv'|'oklch') => void)|null} */
  onModeChange = null;

  /**
   * @param {{h: number, s: number, v: number}} [initialValue]
   */
  constructor(initialValue = { h: 0, s: 1, v: 1 }) {
    super(initialValue);
  }

  /**
   * Get current color mode.
   * @returns {'hsv'|'oklch'}
   */
  get mode() {
    return this._mode;
  }

  /**
   * Set color mode.
   * @param {'hsv'|'oklch'} m
   */
  set mode(m) {
    this._setMode(m);
  }

  /**
   * Get RGB values.
   * @returns {{r: number, g: number, b: number}}
   */
  getRgb() {
    return hsvToRgb(this._value.h, this._value.s, this._value.v);
  }

  /**
   * Get hex color string.
   * @returns {string}
   */
  getHex() {
    const rgb = this.getRgb();
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  /**
   * @protected
   */
  _createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'ruler-color';

    this.element.innerHTML = `
      <div class="ruler-color__preview"></div>
      <div class="ruler-color__hsv-wrapper">
        <div class="ruler-color__sv-pad">
          <div class="ruler-color__sv-thumb"></div>
        </div>
        <div class="ruler-color__hue-slider">
          <div class="ruler-color__hue-thumb"></div>
        </div>
      </div>
      <div class="ruler-color__oklch-wrapper hidden">
        <div class="ruler-color__oklch-track" data-channel="l">
          <span class="ruler-color__oklch-label">L</span>
          <div class="ruler-color__oklch-fill"></div>
          <div class="ruler-color__oklch-thumb"></div>
        </div>
        <div class="ruler-color__oklch-track" data-channel="c">
          <span class="ruler-color__oklch-label">C</span>
          <div class="ruler-color__oklch-fill"></div>
          <div class="ruler-color__oklch-thumb"></div>
        </div>
        <div class="ruler-color__oklch-track" data-channel="h">
          <span class="ruler-color__oklch-label">H</span>
          <div class="ruler-color__oklch-fill"></div>
          <div class="ruler-color__oklch-thumb"></div>
        </div>
      </div>
    `;

    this._preview = this.element.querySelector('.ruler-color__preview');
    this._hsvWrapper = this.element.querySelector('.ruler-color__hsv-wrapper');
    this._svPad = this.element.querySelector('.ruler-color__sv-pad');
    this._svThumb = this.element.querySelector('.ruler-color__sv-thumb');
    this._hueSlider = this.element.querySelector('.ruler-color__hue-slider');
    this._hueThumb = this.element.querySelector('.ruler-color__hue-thumb');
    this._oklchWrapper = this.element.querySelector('.ruler-color__oklch-wrapper');

    // Setup OKLCH sliders map
    ['l', 'c', 'h'].forEach(ch => {
      const track = this._oklchWrapper.querySelector(`.ruler-color__oklch-track[data-channel="${ch}"]`);
      this._oklchSliders.set(ch, {
        track,
        fill: track.querySelector('.ruler-color__oklch-fill'),
        thumb: track.querySelector('.ruler-color__oklch-thumb'),
      });
    });
  }

  /**
   * @protected
   */
  _bindEvents() {
    this._boundHandlers = {
      onSvMouseDown: this._onSvMouseDown.bind(this),
      onHueMouseDown: this._onHueMouseDown.bind(this),
      onMouseMove: this._onMouseMove.bind(this),
      onMouseUp: this._onMouseUp.bind(this),
      onOklchMouseDown: this._onOklchMouseDown.bind(this),
      onTouchStart: this._onTouchStart.bind(this),
      onTouchMove: this._onTouchMove.bind(this),
      onTouchEnd: this._onTouchEnd.bind(this),
    };

    // HSV mouse events
    this._svPad.addEventListener('mousedown', this._boundHandlers.onSvMouseDown);
    this._svThumb.addEventListener('mousedown', this._boundHandlers.onSvMouseDown);
    this._hueSlider.addEventListener('mousedown', this._boundHandlers.onHueMouseDown);
    this._hueThumb.addEventListener('mousedown', this._boundHandlers.onHueMouseDown);

    // OKLCH mouse events
    this._oklchSliders.forEach(({ track, thumb }) => {
      track.addEventListener('mousedown', this._boundHandlers.onOklchMouseDown);
      thumb.addEventListener('mousedown', this._boundHandlers.onOklchMouseDown);
    });

    window.addEventListener('mousemove', this._boundHandlers.onMouseMove);
    window.addEventListener('mouseup', this._boundHandlers.onMouseUp);

    // Touch events
    this.element.addEventListener('touchstart', this._boundHandlers.onTouchStart, { passive: true });
    this.element.addEventListener('touchmove', this._boundHandlers.onTouchMove, { passive: true });
    this.element.addEventListener('touchend', this._boundHandlers.onTouchEnd);
  }

  /**
   * @protected
   */
  _unbindEvents() {
    const h = this._boundHandlers;
    if (!h.onSvMouseDown) return;

    this._svPad?.removeEventListener('mousedown', h.onSvMouseDown);
    this._svThumb?.removeEventListener('mousedown', h.onSvMouseDown);
    this._hueSlider?.removeEventListener('mousedown', h.onHueMouseDown);
    this._hueThumb?.removeEventListener('mousedown', h.onHueMouseDown);

    this._oklchSliders.forEach(({ track, thumb }) => {
      track?.removeEventListener('mousedown', h.onOklchMouseDown);
      thumb?.removeEventListener('mousedown', h.onOklchMouseDown);
    });

    window.removeEventListener('mousemove', h.onMouseMove);
    window.removeEventListener('mouseup', h.onMouseUp);

    this.element?.removeEventListener('touchstart', h.onTouchStart);
    this.element?.removeEventListener('touchmove', h.onTouchMove);
    this.element?.removeEventListener('touchend', h.onTouchEnd);

    this._boundHandlers = {};
  }

  /**
   * @private
   */
  _setMode(mode) {
    this._mode = mode;
    if (mode === 'hsv') {
      this._hsvWrapper.classList.remove('hidden');
      this._oklchWrapper.classList.add('hidden');
      this._preview.classList.remove('visible');
    } else {
      this._hsvWrapper.classList.add('hidden');
      this._oklchWrapper.classList.remove('visible');
      this._preview.classList.add('visible');
    }
    this._updateUI();
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  /**
   * Toggle color mode.
   */
  toggleMode() {
    const idx = RulerColorControl.MODES.indexOf(this._mode);
    const nextIdx = (idx + 1) % RulerColorControl.MODES.length;
    this._setMode(RulerColorControl.MODES[nextIdx]);
  }

  // --- HSV Event Handlers ---

  /**
   * @private
   */
  _onSvMouseDown(e) {
    this._isDraggingSv = true;
    this._updateSvFromPosition(e.clientX, e.clientY);
  }

  /**
   * @private
   */
  _onHueMouseDown(e) {
    this._isDraggingHue = true;
    this._updateHueFromPosition(e.clientX);
  }

  /**
   * @private
   */
  _updateSvFromPosition(clientX, clientY) {
    const rect = this._svPad.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    this._value = { ...this._value, s, v };
    this._updateUI();
    this._emitChange();
  }

  /**
   * @private
   */
  _updateHueFromPosition(clientX) {
    const rect = this._hueSlider.getBoundingClientRect();
    const h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 360;
    this._value = { ...this._value, h };
    this._updateUI();
    this._emitChange();
  }

  // --- OKLCH Event Handlers ---

  /**
   * @private
   */
  _onOklchMouseDown(e) {
    const track = e.target.closest('.ruler-color__oklch-track');
    if (track) {
      this._isDraggingOklch = track.dataset.channel;
      this._updateOklchFromPosition(this._isDraggingOklch, e.clientX);
    }
  }

  /**
   * @private
   */
  _updateOklchFromPosition(channel, clientX) {
    const slider = this._oklchSliders.get(channel);
    if (!slider) return;

    const rect = slider.track.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    const maxValues = { l: 1, c: 0.4, h: 360 };
    const value = percent * maxValues[channel];

    // Convert current HSV to OKLCH, update channel, convert back
    const rgb = hsvToRgb(this._value.h, this._value.s, this._value.v);
    const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
    oklch[channel] = value;

    const newRgb = oklchToRgb(oklch.l, oklch.c, oklch.h);
    const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);

    this._value = newHsv;
    this._updateUI();
    this._emitChange();
  }

  // --- Mouse Move/Up ---

  /**
   * @private
   */
  _onMouseMove(e) {
    if (this._isDraggingSv) {
      this._updateSvFromPosition(e.clientX, e.clientY);
    } else if (this._isDraggingHue) {
      this._updateHueFromPosition(e.clientX);
    } else if (this._isDraggingOklch) {
      this._updateOklchFromPosition(this._isDraggingOklch, e.clientX);
    }
  }

  /**
   * @private
   */
  _onMouseUp() {
    this._isDraggingSv = false;
    this._isDraggingHue = false;
    this._isDraggingOklch = null;
  }

  // --- Touch Events ---

  /**
   * @private
   */
  _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (target === this._svPad || target === this._svThumb || this._svPad.contains(target)) {
      this._isDraggingSv = true;
      this._updateSvFromPosition(touch.clientX, touch.clientY);
    } else if (target === this._hueSlider || target === this._hueThumb || this._hueSlider.contains(target)) {
      this._isDraggingHue = true;
      this._updateHueFromPosition(touch.clientX);
    } else {
      const track = target.closest('.ruler-color__oklch-track');
      if (track) {
        this._isDraggingOklch = track.dataset.channel;
        this._updateOklchFromPosition(this._isDraggingOklch, touch.clientX);
      }
    }
  }

  /**
   * @private
   */
  _onTouchMove(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (this._isDraggingSv) {
      this._updateSvFromPosition(touch.clientX, touch.clientY);
    } else if (this._isDraggingHue) {
      this._updateHueFromPosition(touch.clientX);
    } else if (this._isDraggingOklch) {
      this._updateOklchFromPosition(this._isDraggingOklch, touch.clientX);
    }
  }

  /**
   * @private
   */
  _onTouchEnd() {
    this._isDraggingSv = false;
    this._isDraggingHue = false;
    this._isDraggingOklch = null;
  }

  // --- UI Update ---

  /**
   * @protected
   */
  _updateUI() {
    const { h, s, v } = this._value;
    const rgb = hsvToRgb(h, s, v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    // Update preview
    this._preview.style.backgroundColor = hex;

    if (this._mode === 'hsv') {
      // Update HSV controls
      const percentS = Math.max(0, Math.min(1, s)) * 100;
      const percentV = (1 - Math.max(0, Math.min(1, v))) * 100;
      const percentH = (h / 360) * 100;

      this._svThumb.style.left = `${percentS}%`;
      this._svThumb.style.top = `${percentV}%`;
      this._hueThumb.style.left = `${percentH}%`;
      this._svPad.style.backgroundColor = hueToColor(h);
    } else {
      // Update OKLCH controls
      const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      const maxValues = { l: 1, c: 0.4, h: 360 };

      ['l', 'c', 'h'].forEach(ch => {
        const slider = this._oklchSliders.get(ch);
        const percent = Math.max(0, Math.min(1, oklch[ch] / maxValues[ch])) * 100;
        slider.fill.style.width = `${percent}%`;
        slider.thumb.style.left = `${percent}%`;
      });
    }
  }

  /**
   * @protected
   */
  _updateRange() {
    // Color control doesn't use scale-based range
  }

  /**
   * Get formatted value string (RGB + Hex).
   * @returns {string}
   */
  getDisplayValue() {
    const rgb = this.getRgb();
    const hex = this.getHex();
    return `${rgb.r.toFixed(2)}, ${rgb.g.toFixed(2)}, ${rgb.b.toFixed(2)} | ${hex}`;
  }

  /**
   * Get mode display string.
   * @returns {string}
   */
  getModeDisplay() {
    return this._mode.toUpperCase();
  }
}
