/**
 * Ruler Carousel - A portable ruler-style carousel library
 *
 * @example
 * import { RulerEditor } from './lib/ruler-carousel/src/index.js';
 *
 * const editor = new RulerEditor({
 *   container: document.getElementById('editor'),
 *   items: [
 *     { name: 'uIntensity', type: 'float', label: 'Intensity' },
 *     { name: 'uOffset', type: 'vec2', label: 'Offset' },
 *     { name: 'uColor', type: 'vec3', label: 'Color', isColor: true },
 *   ],
 * });
 *
 * editor.onChange = (name, value) => {
 *   console.log(name, value);
 * };
 */

// Facade
export { RulerEditor } from './RulerEditor.js';

// Core
export { RulerCarousel } from './RulerCarousel.js';

// Controls
export { RulerBaseControl } from './controls/RulerBaseControl.js';
export { RulerFloatControl } from './controls/RulerFloatControl.js';
export { RulerVec2Control } from './controls/RulerVec2Control.js';
export { RulerVec3Control } from './controls/RulerVec3Control.js';
export { RulerVec4Control } from './controls/RulerVec4Control.js';
export { RulerColorControl } from './controls/RulerColorControl.js';

// Utils
export * from './utils.js';
