/**
 * RulerCarousel - A ruler-style vertical carousel with iOS picker-like infinite loop.
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

  constructor(container, options = {}) {
    this.container = container;
    this.eventTarget = options.eventTarget || container;
    this.items = options.items || [];
    this.selectedIndex = options.initialIndex || 0;

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
    this.itemElements = [];

    this.animationId = null;
    this._boundHandlers = null;

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

    if (vw <= 480) {
      this.itemSpacing = 36;
      this.tickWidth = 20;
      this.tickWidthActive = 32;
      this.fontSize = 11;
      this.fontSizeActive = 13;
    } else if (vw <= 768) {
      this.itemSpacing = 42;
      this.tickWidth = 24;
      this.tickWidthActive = 40;
      this.fontSize = 12;
      this.fontSizeActive = 14;
    } else {
      this.itemSpacing = 48;
      this.tickWidth = 28;
      this.tickWidthActive = 48;
      this.fontSize = 13;
      this.fontSizeActive = 16;
    }
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

    this.itemElements.forEach((el, i) => {
      el.addEventListener('click', () => {
        if (this.isDisabled) return;
        const index = parseInt(el.dataset.index, 10);

        if (index === this.selectedIndex) {
          // Already selected - confirm
          this.onConfirm(this.selectedIndex, this.items[this.selectedIndex]);
        } else {
          // Select new item
          this.targetScrollY = i * this.itemSpacing;
          this.scrollPhase = 'snapping';
          this.springVelocity = 0;
          this.selectedIndex = index;
          this.onSelect(this.selectedIndex, this.items[this.selectedIndex]);
        }
      });
    });

    target.addEventListener('wheel', h.onWheel, { passive: false });
  }

  _onTouchStart(e) {
    if (e.touches.length !== 1) return;

    this.isPointerDown = true;
    this.hasMoved = false;
    this.startY = e.touches[0].clientY;
    this.tapTarget = e.target.closest('.ruler-carousel__item');

    // Skip drag handling when disabled, but still track for background tap
    if (this.isDisabled) {
      e.preventDefault();
      return;
    }

    this.isDragging = true;
    this.scrollPhase = 'dragging';
    this.lastY = this.startY;
    this.lastTime = performance.now();
    this.velocity = 0;
    this.springVelocity = 0;

    e.preventDefault();
  }

  _onTouchMove(e) {
    if (e.touches.length !== 1) return;

    const currentY = e.touches[0].clientY;

    // Always track movement for tap detection
    if (Math.abs(currentY - this.startY) > RulerCarousel.DRAG_THRESHOLD) {
      this.hasMoved = true;
    }

    if (!this.isDragging) return;

    const currentTime = performance.now();
    const deltaY = currentY - this.lastY;
    const deltaTime = currentTime - this.lastTime;

    this.scrollY -= deltaY;
    this.targetScrollY = this.scrollY;

    if (deltaTime > 0) {
      // Smooth velocity with exponential moving average
      const instantVelocity = -deltaY / deltaTime;
      this.velocity = this.velocity * 0.4 + instantVelocity * 0.6;
    }

    this.lastY = currentY;
    this.lastTime = currentTime;

    e.preventDefault();
  }

  _onTouchEnd(e) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    // Background tap detection (works even when disabled)
    if (!this.hasMoved && !this.tapTarget) {
      this.onBackgroundTap();
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;

    if (!this.hasMoved && this.tapTarget) {
      this._handleTap(this.tapTarget);
    } else {
      this._startInertia();
    }

    this.tapTarget = null;
  }

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

  _onMouseDown(e) {
    this.isPointerDown = true;
    this.hasMoved = false;
    this.startY = e.clientY;
    this.tapTarget = e.target.closest('.ruler-carousel__item');

    if (this.isDisabled) return;

    this.isDragging = true;
    this.scrollPhase = 'dragging';
    this.lastY = this.startY;
    this.lastTime = performance.now();
    this.velocity = 0;
    this.springVelocity = 0;
    e.preventDefault();
  }

  _onMouseMove(e) {
    const currentY = e.clientY;

    // Always track movement for tap detection
    if (this.isPointerDown && Math.abs(currentY - this.startY) > RulerCarousel.DRAG_THRESHOLD) {
      this.hasMoved = true;
    }

    if (!this.isDragging) return;

    const currentTime = performance.now();
    const deltaY = currentY - this.lastY;
    const deltaTime = currentTime - this.lastTime;

    this.scrollY -= deltaY;
    this.targetScrollY = this.scrollY;

    if (deltaTime > 0) {
      // Smooth velocity calculation with averaging
      const instantVelocity = -deltaY / deltaTime;
      this.velocity = this.velocity * 0.4 + instantVelocity * 0.6;
    }

    this.lastY = currentY;
    this.lastTime = currentTime;
  }

  _onMouseUp() {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    // Background tap detection (works even when disabled)
    if (!this.hasMoved && !this.tapTarget) {
      this.onBackgroundTap();
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    this._startInertia();
  }

  _onWheel(e) {
    if (this.isDisabled) return;
    e.preventDefault();

    // Accumulate velocity from wheel events
    const wheelVelocity = e.deltaY * 0.03;
    this.velocity = this.velocity * 0.5 + wheelVelocity;
    this.scrollY += e.deltaY * 0.5;
    this.scrollPhase = 'inertia';
  }

  _startInertia() {
    if (Math.abs(this.velocity) < RulerCarousel.MIN_VELOCITY) {
      // Low velocity - go directly to snap
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

    // Jump back to center when too far (happens off-screen)
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
        // Position updated directly in touch/mouse handlers
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
    // Apply friction
    this.velocity *= RulerCarousel.FRICTION;
    this.scrollY += this.velocity * 16; // ~16ms per frame

    // Transition to snap when velocity is low enough
    if (Math.abs(this.velocity) < RulerCarousel.MIN_VELOCITY) {
      this._startSnap();
    }
  }

  _updateSnap() {
    const displacement = this.targetScrollY - this.scrollY;

    // Spring physics: F = -kx - cv (stiffness and damping)
    const springForce = displacement * RulerCarousel.SPRING_STIFFNESS;
    const dampingForce = -this.springVelocity * RulerCarousel.SPRING_DAMPING;

    this.springVelocity += springForce + dampingForce;
    this.scrollY += this.springVelocity;

    // Settle when close enough and slow enough
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

      // Edge fade zones (top/bottom 20%)
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

  disable() {
    this.isDisabled = true;
    if (this.isDragging) {
      this.isDragging = false;
      this._startSnap();
    }
  }

  enable() {
    this.isDisabled = false;
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    const h = this._boundHandlers;
    if (h) {
      window.removeEventListener('mousemove', h.onMouseMove);
      window.removeEventListener('mouseup', h.onMouseUp);
      if (h.onResize) {
        window.removeEventListener('resize', h.onResize);
      }
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
