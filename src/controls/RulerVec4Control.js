import { RulerBaseControl } from './RulerBaseControl.js';

/**
 * 4D pad control for vec4 values.
 * Double-tap or click mode label to toggle between XY and ZW modes.
 *
 * @typedef {{x: number, y: number, z: number, w: number}} Vec4
 */
export class RulerVec4Control extends RulerBaseControl {
  static DOUBLE_TAP_DELAY = 300;
  static TAP_MOVE_THRESHOLD = 10;

  /** @type {'xy'|'zw'} */
  _mode = 'xy';

  /** @type {{x: number, y: number, z: number, w: number}} */
  _min = { x: 0, y: 0, z: 0, w: 0 };

  /** @type {{x: number, y: number, z: number, w: number}} */
  _max = { x: 1, y: 1, z: 1, w: 1 };

  /** @type {HTMLElement|null} */
  _area = null;

  /** @type {HTMLElement|null} */
  _thumb = null;

  /** @type {HTMLElement|null} */
  _modeLabel = null;

  /** @type {boolean} */
  _isDragging = false;

  /** @type {boolean} */
  _hasMoved = false;

  /** @type {{x: number, y: number}} */
  _touchStartPos = { x: 0, y: 0 };

  /** @type {number} */
  _lastTapTime = 0;

  /** @type {Object} */
  _boundHandlers = {};

  /** @type {((mode: 'xy'|'zw') => void)|null} */
  onModeChange = null;

  /**
   * @param {{x: number, y: number, z: number, w: number}} [initialValue]
   */
  constructor(initialValue = { x: 0, y: 0, z: 0, w: 0 }) {
    super(initialValue);
  }

  /**
   * Get current mode.
   * @returns {'xy'|'zw'}
   */
  get mode() {
    return this._mode;
  }

  /**
   * Set mode.
   * @param {'xy'|'zw'} m
   */
  set mode(m) {
    this._setMode(m);
  }

  /**
   * @protected
   */
  _createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'ruler-pad ruler-pad--vec4';

    this.element.innerHTML = `
      <div class="ruler-pad__area">
        <div class="ruler-pad__thumb"></div>
        <span class="ruler-pad__mode-label">XY</span>
      </div>
    `;

    this._area = this.element.querySelector('.ruler-pad__area');
    this._thumb = this.element.querySelector('.ruler-pad__thumb');
    this._modeLabel = this.element.querySelector('.ruler-pad__mode-label');
  }

  /**
   * @protected
   */
  _bindEvents() {
    this._boundHandlers = {
      onMouseDown: this._onMouseDown.bind(this),
      onMouseMove: this._onMouseMove.bind(this),
      onMouseUp: this._onMouseUp.bind(this),
      onDblClick: this._onDblClick.bind(this),
      onModeLabelClick: this._onModeLabelClick.bind(this),
      onTouchStart: this._onTouchStart.bind(this),
      onTouchMove: this._onTouchMove.bind(this),
      onTouchEnd: this._onTouchEnd.bind(this),
    };

    this._area.addEventListener('mousedown', this._boundHandlers.onMouseDown);
    this._area.addEventListener('dblclick', this._boundHandlers.onDblClick);
    window.addEventListener('mousemove', this._boundHandlers.onMouseMove);
    window.addEventListener('mouseup', this._boundHandlers.onMouseUp);

    this._modeLabel.addEventListener('click', this._boundHandlers.onModeLabelClick);
    this._modeLabel.addEventListener('touchend', this._boundHandlers.onModeLabelClick);

    this._area.addEventListener('touchstart', this._boundHandlers.onTouchStart, { passive: true });
    this._area.addEventListener('touchmove', this._boundHandlers.onTouchMove, { passive: true });
    this._area.addEventListener('touchend', this._boundHandlers.onTouchEnd);
    this._area.addEventListener('touchcancel', this._boundHandlers.onMouseUp);
  }

  /**
   * @protected
   */
  _unbindEvents() {
    const h = this._boundHandlers;
    if (!h.onMouseDown) return;

    this._area?.removeEventListener('mousedown', h.onMouseDown);
    this._area?.removeEventListener('dblclick', h.onDblClick);
    window.removeEventListener('mousemove', h.onMouseMove);
    window.removeEventListener('mouseup', h.onMouseUp);

    this._modeLabel?.removeEventListener('click', h.onModeLabelClick);
    this._modeLabel?.removeEventListener('touchend', h.onModeLabelClick);

    this._area?.removeEventListener('touchstart', h.onTouchStart);
    this._area?.removeEventListener('touchmove', h.onTouchMove);
    this._area?.removeEventListener('touchend', h.onTouchEnd);
    this._area?.removeEventListener('touchcancel', h.onMouseUp);

    this._boundHandlers = {};
  }

  /**
   * @private
   */
  _setMode(mode) {
    this._mode = mode;
    if (mode === 'zw') {
      this._thumb.classList.add('zw-mode');
      this._modeLabel.classList.add('zw-mode');
      this._modeLabel.textContent = 'ZW';
    } else {
      this._thumb.classList.remove('zw-mode');
      this._modeLabel.classList.remove('zw-mode');
      this._modeLabel.textContent = 'XY';
    }
    this._updateUI();
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  /**
   * @private
   */
  _toggleMode() {
    this._setMode(this._mode === 'xy' ? 'zw' : 'xy');
  }

  /**
   * @private
   */
  _onMouseDown(e) {
    this._hasMoved = false;
    this._touchStartPos = { x: e.clientX, y: e.clientY };
    this._isDragging = true;
  }

  /**
   * @private
   */
  _onMouseMove(e) {
    if (!this._isDragging) return;

    const dx = e.clientX - this._touchStartPos.x;
    const dy = e.clientY - this._touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RulerVec4Control.TAP_MOVE_THRESHOLD) {
      this._hasMoved = true;
    }

    if (this._hasMoved) {
      if (this._mode === 'xy') {
        this._updateXYFromPosition(e.clientX, e.clientY);
      } else {
        this._updateZWFromPosition(e.clientX, e.clientY);
      }
    }
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
  _onDblClick(e) {
    e.preventDefault();
    this._toggleMode();
  }

  /**
   * @private
   */
  _onModeLabelClick(e) {
    e.stopPropagation();
    e.preventDefault();
    this._toggleMode();
  }

  /**
   * @private
   */
  _onTouchStart(e) {
    if (e.touches.length !== 1) return;

    this._hasMoved = false;
    this._touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    this._isDragging = true;
  }

  /**
   * @private
   */
  _onTouchMove(e) {
    if (e.touches.length !== 1 || !this._isDragging) return;

    const dx = e.touches[0].clientX - this._touchStartPos.x;
    const dy = e.touches[0].clientY - this._touchStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RulerVec4Control.TAP_MOVE_THRESHOLD) {
      this._hasMoved = true;
    }

    if (this._hasMoved) {
      if (this._mode === 'xy') {
        this._updateXYFromPosition(e.touches[0].clientX, e.touches[0].clientY);
      } else {
        this._updateZWFromPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
  }

  /**
   * @private
   */
  _onTouchEnd(e) {
    if (e.touches.length === 0) {
      // Check for tap (no significant movement) - double tap toggles mode
      if (!this._hasMoved) {
        const now = Date.now();
        if (now - this._lastTapTime < RulerVec4Control.DOUBLE_TAP_DELAY) {
          this._toggleMode();
          this._lastTapTime = 0;
        } else {
          this._lastTapTime = now;
        }
      }
      this._isDragging = false;
    }
  }

  /**
   * @private
   * @param {number} clientX
   * @param {number} clientY
   */
  _updateXYFromPosition(clientX, clientY) {
    const rect = this._area.getBoundingClientRect();
    const percentX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const percentY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    this._value = {
      ...this._value,
      x: this._min.x + percentX * (this._max.x - this._min.x),
      y: this._min.y + percentY * (this._max.y - this._min.y),
    };
    this._updateUI();
    this._emitChange();
  }

  /**
   * @private
   * @param {number} clientX
   * @param {number} clientY
   */
  _updateZWFromPosition(clientX, clientY) {
    const rect = this._area.getBoundingClientRect();
    const percentZ = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const percentW = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    this._value = {
      ...this._value,
      z: this._min.z + percentZ * (this._max.z - this._min.z),
      w: this._min.w + percentW * (this._max.w - this._min.w),
    };
    this._updateUI();
    this._emitChange();
  }

  /**
   * @protected
   */
  _updateRange() {
    this._min = { x: -this._scale, y: -this._scale, z: -this._scale, w: -this._scale };
    this._max = { x: this._scale, y: this._scale, z: this._scale, w: this._scale };
  }

  /**
   * @protected
   */
  _updateUI() {
    if (this._mode === 'zw') {
      // ZW mode: show Z horizontally, W vertically
      const rangeZ = this._max.z - this._min.z;
      const rangeW = this._max.w - this._min.w;
      const percentZ = rangeZ > 0
        ? Math.max(0, Math.min(1, (this._value.z - this._min.z) / rangeZ)) * 100
        : 50;
      const percentW = rangeW > 0
        ? Math.max(0, Math.min(1, (this._value.w - this._min.w) / rangeW)) * 100
        : 50;
      this._thumb.style.left = `${percentZ}%`;
      this._thumb.style.top = `${percentW}%`;
    } else {
      // XY mode: show X horizontally, Y vertically
      const rangeX = this._max.x - this._min.x;
      const rangeY = this._max.y - this._min.y;
      const percentX = rangeX > 0
        ? Math.max(0, Math.min(1, (this._value.x - this._min.x) / rangeX)) * 100
        : 50;
      const percentY = rangeY > 0
        ? Math.max(0, Math.min(1, (this._value.y - this._min.y) / rangeY)) * 100
        : 50;
      this._thumb.style.left = `${percentX}%`;
      this._thumb.style.top = `${percentY}%`;
    }
  }

  /**
   * Get formatted value string.
   * @returns {string}
   */
  getDisplayValue() {
    const { x, y, z, w } = this._value;
    return `${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}, ${w.toFixed(2)}`;
  }

  /**
   * Get scale display string.
   * @returns {string}
   */
  getScaleDisplay() {
    return `x${this._scale}`;
  }
}
