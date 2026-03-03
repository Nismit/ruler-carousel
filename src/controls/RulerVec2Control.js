import { RulerBaseControl } from './RulerBaseControl.js';

/**
 * 2D pad control for vec2 values.
 * Supports scale adjustment via long-press + vertical swipe.
 *
 * @typedef {{x: number, y: number}} Vec2
 */
export class RulerVec2Control extends RulerBaseControl {
  /** @type {number} */
  _minX = 0;

  /** @type {number} */
  _maxX = 1;

  /** @type {number} */
  _minY = 0;

  /** @type {number} */
  _maxY = 1;

  /** @type {HTMLElement|null} */
  _area = null;

  /** @type {HTMLElement|null} */
  _thumb = null;

  /** @type {boolean} */
  _isDragging = false;

  /** @type {Object} */
  _boundHandlers = {};

  /**
   * @param {{x: number, y: number}} [initialValue]
   */
  constructor(initialValue = { x: 0.5, y: 0.5 }) {
    super(initialValue);
  }

  /**
   * @protected
   */
  _createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'ruler-pad';

    this.element.innerHTML = `
      <div class="ruler-pad__area">
        <div class="ruler-pad__thumb"></div>
      </div>
    `;

    this._area = this.element.querySelector('.ruler-pad__area');
    this._thumb = this.element.querySelector('.ruler-pad__thumb');
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

    this._area.addEventListener('mousedown', this._boundHandlers.onMouseDown);
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

    this._area?.removeEventListener('mousedown', h.onMouseDown);
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
    this._updateFromPosition(e.clientX, e.clientY);
  }

  /**
   * @private
   */
  _onMouseMove(e) {
    if (!this._isDragging) return;
    this._updateFromPosition(e.clientX, e.clientY);
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
      this._updateFromPosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  /**
   * @private
   */
  _onTouchMove(e) {
    if (e.touches.length === 1 && this._isDragging) {
      this._updateFromPosition(e.touches[0].clientX, e.touches[0].clientY);
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
   * @param {number} clientY
   */
  _updateFromPosition(clientX, clientY) {
    const rect = this._area.getBoundingClientRect();
    const percentX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const percentY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    this._value = {
      x: this._minX + percentX * (this._maxX - this._minX),
      y: this._minY + percentY * (this._maxY - this._minY),
    };
    this._updateUI();
    this._emitChange();
  }

  /**
   * @protected
   */
  _updateRange() {
    this._minX = -this._scale;
    this._maxX = this._scale;
    this._minY = -this._scale;
    this._maxY = this._scale;
  }

  /**
   * @protected
   */
  _updateUI() {
    const rangeX = this._maxX - this._minX;
    const rangeY = this._maxY - this._minY;

    const percentX = rangeX > 0
      ? Math.max(0, Math.min(1, (this._value.x - this._minX) / rangeX)) * 100
      : 50;
    const percentY = rangeY > 0
      ? Math.max(0, Math.min(1, (this._value.y - this._minY) / rangeY)) * 100
      : 50;

    this._thumb.style.left = `${percentX}%`;
    this._thumb.style.top = `${percentY}%`;
  }

  /**
   * Get formatted value string.
   * @returns {string}
   */
  getDisplayValue() {
    return `${this._value.x.toFixed(2)}, ${this._value.y.toFixed(2)}`;
  }

  /**
   * Get scale display string.
   * @returns {string}
   */
  getScaleDisplay() {
    return `x${this._scale}`;
  }
}
