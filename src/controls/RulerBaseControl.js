/**
 * Base class for all Ruler controls.
 * Provides common interface for value management, scaling, and lifecycle.
 *
 * @template T - The value type (number, {x,y}, {x,y,z}, etc.)
 */
export class RulerBaseControl {
  /** @type {HTMLElement|null} */
  element = null;

  /** @type {T} */
  _value;

  /** @type {number} */
  _scale = 1;

  /** @type {boolean} */
  _isMounted = false;

  /** @type {((value: T) => void)|null} */
  onChange = null;

  /**
   * @param {T} initialValue
   */
  constructor(initialValue) {
    this._value = initialValue;
  }

  /**
   * Get the current value.
   * @returns {T}
   */
  get value() {
    return this._value;
  }

  /**
   * Set the value and update UI.
   * @param {T} v
   */
  set value(v) {
    this._value = v;
    if (this._isMounted) {
      this._updateUI();
    }
  }

  /**
   * Get the current scale.
   * @returns {number}
   */
  get scale() {
    return this._scale;
  }

  /**
   * Set the scale and update range/UI.
   * @param {number} s
   */
  set scale(s) {
    this._scale = s;
    if (this._isMounted) {
      this._updateRange();
      this._updateUI();
    }
  }

  /**
   * Mount the control to a container element.
   * @param {HTMLElement} container
   */
  mount(container) {
    if (this._isMounted) {
      this.unmount();
    }
    this._createDOM();
    container.appendChild(this.element);
    this._bindEvents();
    this._isMounted = true;
    this._updateRange();
    this._updateUI();
  }

  /**
   * Unmount the control and clean up.
   */
  unmount() {
    this._unbindEvents();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this._isMounted = false;
  }

  /**
   * Emit value change to callback.
   * @protected
   */
  _emitChange() {
    if (this.onChange) {
      this.onChange(this._value);
    }
  }

  /**
   * Create DOM elements. Override in subclass.
   * @protected
   */
  _createDOM() {
    // Override in subclass
  }

  /**
   * Bind event listeners. Override in subclass.
   * @protected
   */
  _bindEvents() {
    // Override in subclass
  }

  /**
   * Unbind event listeners. Override in subclass.
   * @protected
   */
  _unbindEvents() {
    // Override in subclass
  }

  /**
   * Update UI to reflect current value. Override in subclass.
   * @protected
   */
  _updateUI() {
    // Override in subclass
  }

  /**
   * Update range display based on scale. Override in subclass.
   * @protected
   */
  _updateRange() {
    // Override in subclass
  }
}
