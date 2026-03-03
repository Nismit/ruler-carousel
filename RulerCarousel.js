/**
 * RulerCarousel - A ruler-style vertical carousel with iOS picker-like infinite loop.
 *
 * @typedef {Object} ResponsiveConfig
 * @property {number} itemSpacing
 * @property {number} tickWidth
 * @property {number} tickWidthActive
 * @property {number} fontSize
 * @property {number} fontSizeActive
 *
 * @typedef {Object} RulerCarouselOptions
 * @property {HTMLElement} [eventTarget] - Element to attach events to
 * @property {Array<{name: string, type: string, label: string}>} [items] - Carousel items
 * @property {number} [initialIndex] - Initial selected index
 * @property {(index: number, item: any) => void} [onSelect] - Selection callback
 * @property {(index: number, item: any) => void} [onConfirm] - Confirm callback
 * @property {() => void} [onBackgroundTap] - Background tap callback
 * @property {{mobile: ResponsiveConfig, tablet: ResponsiveConfig, desktop: ResponsiveConfig}} [responsive] - Responsive values
 */
export class RulerCarousel {
  // Physics constants
  static DRAG_THRESHOLD = 2;

  // Inertia: friction-based deceleration
  static FRICTION = 0.95;
  static MIN_VELOCITY = 0.15;

  // Spring: damped harmonic oscillator for snap
  static SPRING_STIFFNESS = 0.12;
  static SPRING_DAMPING = 0.7;

  // Default responsive breakpoints
  static DEFAULT_RESPONSIVE = {
    mobile: { // <= 480px
      itemSpacing: 36,
      tickWidth: 20,
      tickWidthActive: 32,
      fontSize: 11,
      fontSizeActive: 13,
    },
    tablet: { // <= 768px
      itemSpacing: 42,
      tickWidth: 24,
      tickWidthActive: 40,
      fontSize: 12,
      fontSizeActive: 14,
    },
    desktop: { // > 768px
      itemSpacing: 48,
      tickWidth: 28,
      tickWidthActive: 48,
      fontSize: 13,
      fontSizeActive: 16,
    },
  };

  /**
   * @param {HTMLElement} container
   * @param {RulerCarouselOptions} options
   */
  constructor(container, options = {}) {
    this.container = container;
    this.eventTarget = options.eventTarget || container;
    this.items = options.items || [];
    this.selectedIndex = options.initialIndex || 0;
    this.responsive = { ...RulerCarousel.DEFAULT_RESPONSIVE, ...options.responsive };

    this.repeatCount = 5;
    this.totalItems = this.items.length * this.repeatCount;

    this._updateResponsiveValues();

    // Start from center section (index 2 of 5)
    this.scrollY = (this.items.length * 2 + this.selectedIndex) * this.itemSpacing;
    this.targetScrollY = this.scrollY;
    this.velocity = 0;
    this.springVelocity = 0;

    // Scroll phases: 'idle' | 'dragging' | 'inertia' | 'snapping'
    this.scrollPhase = 'idle';

    this.isDragging = false;
    this.startY = 0;
    this.lastY = 0;
    this.lastTime = 0;
    this.hasMoved = false;
    this.tapTarget = null;
    this.isDisabled = false;
    this.isPointerDown = false;

    this.onSelect = options.onSelect || (() => {});
    this.onConfirm = options.onConfirm || (() => {});
    this.onBackgroundTap = options.onBackgroundTap || (() => {});

    this.element = null;
    this.axisLine = null;
    this.itemsContainer = null;
    this.itemElements = [];

    this.animationId = null;
    this._boundHandlers = null;
    this._itemClickHandlers = [];

    this._init();
  }

  _init() {
    this._createBoundHandlers();
    this._createDOM();
    this._bindEvents();
    this._bindResize();
    this._startAnimation();
    this._updatePositions();
  }

  _createBoundHandlers() {
    this._boundHandlers = {
      onTouchStart: this._onTouchStart.bind(this),
      onTouchMove: this._onTouchMove.bind(this),
      onTouchEnd: this._onTouchEnd.bind(this),
      onMouseDown: this._onMouseDown.bind(this),
      onMouseMove: this._onMouseMove.bind(this),
      onMouseUp: this._onMouseUp.bind(this),
      onWheel: this._onWheel.bind(this),
      onResize: null,
    };
  }

  _updateResponsiveValues() {
    const vw = window.innerWidth;
    const config = vw <= 480 ? this.responsive.mobile
      : vw <= 768 ? this.responsive.tablet
      : this.responsive.desktop;

    this.itemSpacing = config.itemSpacing;
    this.tickWidth = config.tickWidth;
    this.tickWidthActive = config.tickWidthActive;
    this.fontSize = config.fontSize;
    this.fontSizeActive = config.fontSizeActive;
  }

  _createDOM() {
    this.element = document.createElement('div');
    this.element.className = 'ruler-carousel';

    this.axisLine = document.createElement('div');
    this.axisLine.className = 'ruler-carousel__axis';
    this.element.appendChild(this.axisLine);

    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'ruler-carousel__items';

    for (let repeat = 0; repeat < this.repeatCount; repeat++) {
      this.items.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'ruler-carousel__item';
        el.dataset.index = index;
        el.dataset.type = item.type;

        el.innerHTML = `
          <span class="ruler-carousel__label">${item.label}</span>
          <span class="ruler-carousel__tick"></span>
        `;

        this.itemsContainer.appendChild(el);
        this.itemElements.push(el);
      });
    }

    this.element.appendChild(this.itemsContainer);
    this.container.appendChild(this.element);
  }

  _bindEvents() {
    const h = this._boundHandlers;
    const target = this.eventTarget;

    target.addEventListener('touchstart', h.onTouchStart, { passive: false });
    target.addEventListener('touchmove', h.onTouchMove, { passive: false });
    target.addEventListener('touchend', h.onTouchEnd);
    target.addEventListener('touchcancel', h.onTouchEnd);

    target.addEventListener('mousedown', h.onMouseDown);
    window.addEventListener('mousemove', h.onMouseMove);
    window.addEventListener('mouseup', h.onMouseUp);

    // Store click handlers for cleanup
    this.itemElements.forEach((el, i) => {
      const handler = () => {
        if (this.isDisabled) return;
        const index = parseInt(el.dataset.index, 10);

        if (index === this.selectedIndex) {
          this.onConfirm(this.selectedIndex, this.items[this.selectedIndex]);
        } else {
          this.targetScrollY = i * this.itemSpacing;
          this.scrollPhase = 'snapping';
          this.springVelocity = 0;
          this.selectedIndex = index;
          this.onSelect(this.selectedIndex, this.items[this.selectedIndex]);
        }
      };
      this._itemClickHandlers.push(handler);
      el.addEventListener('click', handler);
    });

    target.addEventListener('wheel', h.onWheel, { passive: false });
  }

  // === Unified Pointer Handling ===

  /**
   * Common pointer start logic
   * @private
   */
  _onPointerStart(clientY, target) {
    this.isPointerDown = true;
    this.hasMoved = false;
    this.startY = clientY;
    this.tapTarget = target.closest('.ruler-carousel__item');

    if (this.isDisabled) return false;

    this.isDragging = true;
    this.scrollPhase = 'dragging';
    this.lastY = this.startY;
    this.lastTime = performance.now();
    this.velocity = 0;
    this.springVelocity = 0;
    return true;
  }

  /**
   * Common pointer move logic
   * @private
   */
  _onPointerMove(clientY) {
    if (this.isPointerDown && Math.abs(clientY - this.startY) > RulerCarousel.DRAG_THRESHOLD) {
      this.hasMoved = true;
    }

    if (!this.isDragging) return;

    const currentTime = performance.now();
    const deltaY = clientY - this.lastY;
    const deltaTime = currentTime - this.lastTime;

    this.scrollY -= deltaY;
    this.targetScrollY = this.scrollY;

    if (deltaTime > 0) {
      const instantVelocity = -deltaY / deltaTime;
      this.velocity = this.velocity * 0.4 + instantVelocity * 0.6;
    }

    this.lastY = clientY;
    this.lastTime = currentTime;
  }

  /**
   * Common pointer end logic
   * @private
   */
  _onPointerEnd() {
    if (!this.isPointerDown) return false;
    this.isPointerDown = false;

    // Background tap detection
    if (!this.hasMoved && !this.tapTarget) {
      this.onBackgroundTap();
      return true;
    }

    if (!this.isDragging) return true;
    this.isDragging = false;

    if (!this.hasMoved && this.tapTarget) {
      this._handleTap(this.tapTarget);
    } else {
      this._startInertia();
    }

    this.tapTarget = null;
    return true;
  }

  // === Touch Events ===

  _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const handled = this._onPointerStart(e.touches[0].clientY, e.target);
    e.preventDefault();
  }

  _onTouchMove(e) {
    if (e.touches.length !== 1) return;
    this._onPointerMove(e.touches[0].clientY);
    if (this.isDragging) e.preventDefault();
  }

  _onTouchEnd(e) {
    this._onPointerEnd();
  }

  // === Mouse Events ===

  _onMouseDown(e) {
    const handled = this._onPointerStart(e.clientY, e.target);
    if (handled) e.preventDefault();
  }

  _onMouseMove(e) {
    this._onPointerMove(e.clientY);
  }

  _onMouseUp() {
    this._onPointerEnd();
  }

  // === Other Events ===

  _handleTap(targetEl) {
    const index = parseInt(targetEl.dataset.index, 10);

    if (index === this.selectedIndex) {
      this.onConfirm(this.selectedIndex, this.items[this.selectedIndex]);
    } else {
      const elementIndex = Array.from(this.itemElements).indexOf(targetEl);
      this.targetScrollY = elementIndex * this.itemSpacing;
      this.scrollPhase = 'snapping';
      this.springVelocity = 0;
      this.selectedIndex = index;
      this.onSelect(this.selectedIndex, this.items[this.selectedIndex]);
    }
  }

  _onWheel(e) {
    if (this.isDisabled) return;
    e.preventDefault();

    const wheelVelocity = e.deltaY * 0.03;
    this.velocity = this.velocity * 0.5 + wheelVelocity;
    this.scrollY += e.deltaY * 0.5;
    this.scrollPhase = 'inertia';
  }

  _startInertia() {
    if (Math.abs(this.velocity) < RulerCarousel.MIN_VELOCITY) {
      this._startSnap();
    } else {
      this.scrollPhase = 'inertia';
    }
  }

  _startSnap() {
    const index = Math.round(this.scrollY / this.itemSpacing);
    this.targetScrollY = index * this.itemSpacing;
    this.scrollPhase = 'snapping';
    this.springVelocity = 0;

    const realIndex = ((index % this.items.length) + this.items.length) % this.items.length;

    if (realIndex !== this.selectedIndex) {
      this.selectedIndex = realIndex;
      this.onSelect(this.selectedIndex, this.items[this.selectedIndex]);
    }
  }

  _checkLoop() {
    const sectionSize = this.items.length * this.itemSpacing;
    const centerSection = 2;
    const centerScrollY = sectionSize * centerSection;
    const distanceFromCenter = this.scrollY - centerScrollY;

    if (Math.abs(distanceFromCenter) > sectionSize * 1.5) {
      const offset = ((this.scrollY % sectionSize) + sectionSize) % sectionSize;
      const newScrollY = centerScrollY + offset;
      const adjustment = newScrollY - this.scrollY;
      this.scrollY = newScrollY;
      this.targetScrollY += adjustment;
    }
  }

  _bindResize() {
    let resizeTimeout;
    this._boundHandlers.onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this._updateResponsiveValues();
        this._updatePositions();
      }, 100);
    };
    window.addEventListener('resize', this._boundHandlers.onResize);
  }

  _startAnimation() {
    const animate = () => {
      this._update();
      this._updatePositions();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  _update() {
    switch (this.scrollPhase) {
      case 'dragging':
        break;
      case 'inertia':
        this._updateInertia();
        break;
      case 'snapping':
        this._updateSnap();
        break;
      case 'idle':
      default:
        break;
    }
    this._checkLoop();
  }

  _updateInertia() {
    this.velocity *= RulerCarousel.FRICTION;
    this.scrollY += this.velocity * 16;

    if (Math.abs(this.velocity) < RulerCarousel.MIN_VELOCITY) {
      this._startSnap();
    }
  }

  _updateSnap() {
    const displacement = this.targetScrollY - this.scrollY;

    const springForce = displacement * RulerCarousel.SPRING_STIFFNESS;
    const dampingForce = -this.springVelocity * RulerCarousel.SPRING_DAMPING;

    this.springVelocity += springForce + dampingForce;
    this.scrollY += this.springVelocity;

    if (Math.abs(displacement) < 0.5 && Math.abs(this.springVelocity) < 0.1) {
      this.scrollY = this.targetScrollY;
      this.springVelocity = 0;
      this.scrollPhase = 'idle';
    }
  }

  _updatePositions() {
    const centerY = this.element.offsetHeight / 2;
    const viewportHeight = this.element.offsetHeight;
    const fadeZone = viewportHeight * 0.2;
    const visibleTop = fadeZone;
    const visibleBottom = viewportHeight - fadeZone;

    this.itemElements.forEach((el, index) => {
      const itemY = index * this.itemSpacing - this.scrollY;
      const offsetFromCenter = itemY;
      const distance = Math.abs(offsetFromCenter);
      const screenY = centerY + offsetFromCenter;

      if (screenY < 0 || screenY > viewportHeight) {
        el.style.opacity = 0;
        el.style.pointerEvents = 'none';
        return;
      }

      const maxDistance = this.itemSpacing * 3;
      const normalizedDistance = Math.min(1, distance / maxDistance);
      const isActive = distance < this.itemSpacing * 0.5;

      let opacity = Math.max(0.15, 1 - normalizedDistance * 0.85);

      if (screenY < visibleTop) {
        opacity *= screenY / fadeZone;
      } else if (screenY > visibleBottom) {
        opacity *= (viewportHeight - screenY) / fadeZone;
      }

      const tickWidth = isActive ? this.tickWidthActive : this.tickWidth * (1 - normalizedDistance * 0.3);
      const fontSize = isActive ? this.fontSizeActive : this.fontSize * (1 - normalizedDistance * 0.15);

      el.style.transform = `translateY(${screenY}px)`;
      el.style.opacity = Math.max(0, opacity);
      el.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
      el.classList.toggle('is-active', isActive);

      const tick = el.querySelector('.ruler-carousel__tick');
      tick.style.width = `${tickWidth}px`;

      const label = el.querySelector('.ruler-carousel__label');
      label.style.fontSize = `${fontSize}px`;
    });
  }

  /**
   * Programmatically select an item by index.
   * @param {number} index
   */
  selectIndex(index) {
    if (index < 0 || index >= this.items.length) return;

    const currentIndex = Math.round(this.scrollY / this.itemSpacing);
    const sectionStart = Math.floor(currentIndex / this.items.length) * this.items.length;
    const targetIndex = sectionStart + index;

    this.targetScrollY = targetIndex * this.itemSpacing;
    this.scrollPhase = 'snapping';
    this.springVelocity = 0;
    this.selectedIndex = index;
    this.onSelect(this.selectedIndex, this.items[this.selectedIndex]);
  }

  /**
   * Disable carousel interaction.
   */
  disable() {
    this.isDisabled = true;
    if (this.isDragging) {
      this.isDragging = false;
      this._startSnap();
    }
  }

  /**
   * Enable carousel interaction.
   */
  enable() {
    this.isDisabled = false;
  }

  /**
   * Clean up all event listeners and DOM elements.
   */
  dispose() {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const h = this._boundHandlers;
    const target = this.eventTarget;

    if (h) {
      // Remove eventTarget listeners
      target.removeEventListener('touchstart', h.onTouchStart);
      target.removeEventListener('touchmove', h.onTouchMove);
      target.removeEventListener('touchend', h.onTouchEnd);
      target.removeEventListener('touchcancel', h.onTouchEnd);
      target.removeEventListener('mousedown', h.onMouseDown);
      target.removeEventListener('wheel', h.onWheel);

      // Remove window listeners
      window.removeEventListener('mousemove', h.onMouseMove);
      window.removeEventListener('mouseup', h.onMouseUp);

      if (h.onResize) {
        window.removeEventListener('resize', h.onResize);
      }
    }

    // Remove item click handlers
    this.itemElements.forEach((el, i) => {
      if (this._itemClickHandlers[i]) {
        el.removeEventListener('click', this._itemClickHandlers[i]);
      }
    });
    this._itemClickHandlers = [];

    // Remove DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // Clear references
    this.element = null;
    this.axisLine = null;
    this.itemsContainer = null;
    this.itemElements = [];
    this._boundHandlers = null;
  }
}
