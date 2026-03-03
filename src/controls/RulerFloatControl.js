import { RulerBaseControl } from './RulerBaseControl.js';

/**
 * Float slider control for single numeric values.
 * Supports scale adjustment via long-press + vertical swipe.
 */
export class RulerFloatControl extends RulerBaseControl {
  /** @type {number} */
  _min = 0;

  /** @type {number} */
  _max = 1;

  /** @type {HTMLElement|null} */
  _track = null;

  /** @type {HTMLElement|null} */
  _fill = null;

  /** @type {HTMLElement|null} */
  _thumb = null;

  /** @type {HTMLElement|null} */
  _minLabel = null;

  /** @type {HTMLElement|null} */
  _maxLabel = null;

  /** @type {boolean} */
  _isDragging = false;

  /** @type {Object} */
  _boundHandlers = {};

  /**
   * @param {number} [initialValue=0.5]
   */
  constructor(initialValue = 0.5) {
    super(initialValue);
  }

  /**
   * @protected
   */
  _createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'ruler-slider';

    this.element.innerHTML = `
      <div class="ruler-slider__range">
        <span class="ruler-slider__min">0.00</span>
        <span class="ruler-slider__max">1.00</span>
      </div>
      <div class="ruler-slider__track">
        <div class="ruler-slider__fill"></div>
        <div class="ruler-slider__thumb"></div>
      </div>
    `;

    this._track = this.element.querySelector('.ruler-slider__track');
    this._fill = this.element.querySelector('.ruler-slider__fill');
    this._thumb = this.element.querySelector('.ruler-slider__thumb');
    this._minLabel = this.element.querySelector('.ruler-slider__min');
    this._maxLabel = this.element.querySelector('.ruler-slider__max');
  }

  /**
   * @protected
   */
  _bindEvents() {
    this._boundHandlers = {
      onMouseDown: this._onMouseDown.bind(this),
      onMouseMove: this._onMouseMove.bind(this),
      onMouseUp: this._onMouseUp.bind(this),
      onTouchStart: this._onTouchStart.bind(this),
      onTouchMove: this._onTouchMove.bind(this),
      onTouchEnd: this._onTouchEnd.bind(this),
    };

    this._track.addEventListener('mousedown', this._boundHandlers.onMouseDown);
    this._thumb.addEventListener('mousedown', this._boundHandlers.onMouseDown);
    window.addEventListener('mousemove', this._boundHandlers.onMouseMove);
    window.addEventListener('mouseup', this._boundHandlers.onMouseUp);

    this.element.addEventListener('touchstart', this._boundHandlers.onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this._boundHandlers.onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this._boundHandlers.onTouchEnd);
    this.element.addEventListener('touchcancel', this._boundHandlers.onTouchEnd);
  }

  /**
   * @protected
   */
  _unbindEvents() {
    const h = this._boundHandlers;
    if (!h.onMouseDown) return;

    this._track?.removeEventListener('mousedown', h.onMouseDown);
    this._thumb?.removeEventListener('mousedown', h.onMouseDown);
    window.removeEventListener('mousemove', h.onMouseMove);
    window.removeEventListener('mouseup', h.onMouseUp);

    this.element?.removeEventListener('touchstart', h.onTouchStart);
    this.element?.removeEventListener('touchmove', h.onTouchMove);
    this.element?.removeEventListener('touchend', h.onTouchEnd);
    this.element?.removeEventListener('touchcancel', h.onTouchEnd);

    this._boundHandlers = {};
  }

  /**
   * @private
   */
  _onMouseDown(e) {
    this._isDragging = true;
    this._updateFromPosition(e.clientX);
  }

  /**
   * @private
   */
  _onMouseMove(e) {
    if (!this._isDragging) return;
    this._updateFromPosition(e.clientX);
  }

  /**
   * @private
   */
  _onMouseUp() {
    this._isDragging = false;
  }

  /**
   * @private
   */
  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this._isDragging = true;
      this._updateFromPosition(e.touches[0].clientX);
    }
  }

  /**
   * @private
   */
  _onTouchMove(e) {
    if (e.touches.length === 1 && this._isDragging) {
      this._updateFromPosition(e.touches[0].clientX);
    }
  }

  /**
   * @private
   */
  _onTouchEnd(e) {
    if (e.touches.length === 0) {
      this._isDragging = false;
    }
  }

  /**
   * @private
   * @param {number} clientX
   */
  _updateFromPosition(clientX) {
    const rect = this._track.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    this._value = this._min + percent * (this._max - this._min);
    this._updateUI();
    this._emitChange();
  }

  /**
   * @protected
   */
  _updateRange() {
    this._min = -this._scale;
    this._max = this._scale;
    this._minLabel.textContent = this._min.toFixed(2);
    this._maxLabel.textContent = this._max.toFixed(2);
  }

  /**
   * @protected
   */
  _updateUI() {
    const range = this._max - this._min;
    const percent = range > 0
      ? Math.max(0, Math.min(1, (this._value - this._min) / range)) * 100
      : 50;

    this._fill.style.width = `${percent}%`;
    this._thumb.style.left = `${percent}%`;
  }

  /**
   * Get formatted value string.
   * @returns {string}
   */
  getDisplayValue() {
    return this._value.toFixed(2);
  }

  /**
   * Get scale display string.
   * @returns {string}
   */
  getScaleDisplay() {
    return `x${this._scale}`;
  }
}
