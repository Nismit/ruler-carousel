import { RulerCarousel } from './RulerCarousel.js';
import { RulerFloatControl } from './controls/RulerFloatControl.js';
import { RulerVec2Control } from './controls/RulerVec2Control.js';
import { RulerVec3Control } from './controls/RulerVec3Control.js';
import { RulerVec4Control } from './controls/RulerVec4Control.js';
import { RulerColorControl } from './controls/RulerColorControl.js';

/**
 * @typedef {Object} UniformItem
 * @property {string} name - Unique identifier
 * @property {'float'|'vec2'|'vec3'|'vec4'} type - Value type
 * @property {string} label - Display label
 * @property {boolean} [isColor] - If true, use color picker for vec3
 */

/**
 * @typedef {Object} RulerEditorOptions
 * @property {HTMLElement} container - Container element for the editor
 * @property {UniformItem[]} items - List of editable items
 * @property {Object.<string, any>} [initialValues] - Initial values by name
 * @property {HTMLElement} [eventTarget] - Event target for carousel (default: container)
 * @property {boolean} [closeOnBackgroundTap=true] - Close editor when tapping background
 */

/**
 * RulerEditor - Unified facade for carousel + controls.
 * Manages item selection, control switching, and value updates.
 */
export class RulerEditor {
  /** @type {HTMLElement} */
  _container;

  /** @type {UniformItem[]} */
  _items;

  /** @type {RulerCarousel|null} */
  _carousel = null;

  /** @type {HTMLElement|null} */
  _controlPanel = null;

  /** @type {HTMLElement|null} */
  _controlContainer = null;

  /** @type {HTMLElement|null} */
  _labelEl = null;

  /** @type {HTMLElement|null} */
  _scaleEl = null;

  /** @type {Map<string, any>} */
  _values = new Map();

  /** @type {Map<string, RulerBaseControl>} */
  _controls = new Map();

  /** @type {UniformItem|null} */
  _currentItem = null;

  /** @type {RulerBaseControl|null} */
  _currentControl = null;

  /** @type {boolean} */
  _isOpen = false;

  /** @type {((name: string, item: UniformItem) => void)|null} */
  onSelect = null;

  /** @type {((name: string, value: any) => void)|null} */
  onChange = null;

  /**
   * @param {RulerEditorOptions} options
   */
  constructor(options) {
    this._container = options.container;
    this._items = options.items;
    this._eventTarget = options.eventTarget || options.container;
    this._closeOnBackgroundTap = options.closeOnBackgroundTap !== false;

    this._initValues(options.initialValues);
    this._createDOM();
    this._createCarousel();
    this._createControls();
  }

  /**
   * @private
   */
  _initValues(initialValues = {}) {
    this._items.forEach(item => {
      if (initialValues[item.name] !== undefined) {
        this._values.set(item.name, initialValues[item.name]);
      } else {
        // Default values
        switch (item.type) {
          case 'float':
            this._values.set(item.name, 0.5);
            break;
          case 'vec2':
            this._values.set(item.name, { x: 0.5, y: 0.5 });
            break;
          case 'vec3':
            if (item.isColor) {
              this._values.set(item.name, { h: 0, s: 1, v: 1 });
            } else {
              this._values.set(item.name, { x: 0, y: 0, z: 0 });
            }
            break;
          case 'vec4':
            this._values.set(item.name, { x: 0, y: 0, z: 0, w: 0 });
            break;
        }
      }
    });
  }

  /**
   * @private
   */
  _createDOM() {
    // Control panel
    this._controlPanel = document.createElement('div');
    this._controlPanel.className = 'ruler-editor__panel';

    // Header
    const header = document.createElement('div');
    header.className = 'ruler-editor__header';

    this._labelEl = document.createElement('span');
    this._labelEl.className = 'ruler-editor__label';

    this._scaleEl = document.createElement('span');
    this._scaleEl.className = 'ruler-editor__scale';

    header.appendChild(this._labelEl);
    header.appendChild(this._scaleEl);
    this._controlPanel.appendChild(header);

    // Control container
    this._controlContainer = document.createElement('div');
    this._controlContainer.className = 'ruler-editor__control';
    this._controlPanel.appendChild(this._controlContainer);

    this._container.appendChild(this._controlPanel);
  }

  /**
   * @private
   */
  _createCarousel() {
    this._carousel = new RulerCarousel(this._container, {
      eventTarget: this._eventTarget,
      items: this._items,
      onSelect: (index, item) => {
        this._selectItem(item);
        if (this.onSelect) {
          this.onSelect(item.name, item);
        }
      },
      onConfirm: (index, item) => {
        // Could be used for edit mode toggle
      },
      onBackgroundTap: () => {
        if (this._closeOnBackgroundTap) {
          this.close();
        }
      },
    });
  }

  /**
   * @private
   */
  _createControls() {
    this._items.forEach(item => {
      let control;

      if (item.type === 'float') {
        control = new RulerFloatControl(this._values.get(item.name));
      } else if (item.type === 'vec2') {
        control = new RulerVec2Control(this._values.get(item.name));
      } else if (item.type === 'vec3') {
        if (item.isColor) {
          control = new RulerColorControl(this._values.get(item.name));
        } else {
          control = new RulerVec3Control(this._values.get(item.name));
        }
      } else if (item.type === 'vec4') {
        control = new RulerVec4Control(this._values.get(item.name));
      }

      if (control) {
        control.onChange = (value) => {
          this._values.set(item.name, value);
          this._updateDisplay();
          if (this.onChange) {
            this.onChange(item.name, value);
          }
        };
        this._controls.set(item.name, control);
      }
    });
  }

  /**
   * @private
   */
  _selectItem(item) {
    // Unmount current control
    if (this._currentControl) {
      this._currentControl.unmount();
    }

    this._currentItem = item;
    const control = this._controls.get(item.name);

    if (control) {
      this._currentControl = control;
      control.value = this._values.get(item.name);
      control.mount(this._controlContainer);
      this._updateDisplay();
    }
  }

  /**
   * @private
   */
  _updateDisplay() {
    if (!this._currentControl || !this._currentItem) return;

    this._labelEl.textContent = this._currentControl.getDisplayValue();

    if (typeof this._currentControl.getScaleDisplay === 'function') {
      this._scaleEl.textContent = this._currentControl.getScaleDisplay();
    } else if (typeof this._currentControl.getModeDisplay === 'function') {
      this._scaleEl.textContent = this._currentControl.getModeDisplay();
    } else {
      this._scaleEl.textContent = '';
    }
  }

  /**
   * Get value by name.
   * @param {string} name
   * @returns {any}
   */
  getValue(name) {
    return this._values.get(name);
  }

  /**
   * Set value by name.
   * @param {string} name
   * @param {any} value
   */
  setValue(name, value) {
    this._values.set(name, value);
    const control = this._controls.get(name);
    if (control && this._currentItem?.name === name) {
      control.value = value;
      this._updateDisplay();
    }
  }

  /**
   * Get all values as object.
   * @returns {Object.<string, any>}
   */
  getAll() {
    const result = {};
    this._values.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Open the editor.
   */
  open() {
    if (this._isOpen) return;
    this._isOpen = true;

    this._container.classList.add('visible');
    this._controlPanel.classList.add('visible');
    this._carousel.enable();

    // Select first item if none selected
    if (!this._currentItem && this._items.length > 0) {
      this._selectItem(this._items[0]);
    }
  }

  /**
   * Close the editor.
   */
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;

    this._container.classList.remove('visible');
    this._controlPanel.classList.remove('visible');
    this._carousel.disable();
  }

  /**
   * Toggle open/close state.
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Check if editor is open.
   * @returns {boolean}
   */
  get isOpen() {
    return this._isOpen;
  }

  /**
   * Get currently selected item.
   * @returns {UniformItem|null}
   */
  get currentItem() {
    return this._currentItem;
  }

  /**
   * Select item by index.
   * @param {number} index
   */
  selectIndex(index) {
    if (index >= 0 && index < this._items.length) {
      this._carousel.selectIndex(index);
    }
  }

  /**
   * Clean up all resources.
   */
  dispose() {
    // Unmount current control
    if (this._currentControl) {
      this._currentControl.unmount();
      this._currentControl = null;
    }

    // Dispose carousel
    if (this._carousel) {
      this._carousel.dispose();
      this._carousel = null;
    }

    // Clear controls
    this._controls.clear();

    // Remove DOM
    if (this._controlPanel && this._controlPanel.parentNode) {
      this._controlPanel.parentNode.removeChild(this._controlPanel);
    }

    this._controlPanel = null;
    this._controlContainer = null;
    this._labelEl = null;
    this._scaleEl = null;
  }
}
