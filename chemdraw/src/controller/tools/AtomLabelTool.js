import { SNAP_RADIUS } from '../../util/constants.js';
import { isValidElement, ABBREVIATIONS } from '../../model/elements.js';

export class AtomLabelTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._editingAtom = null;
    this._inputEl = null;
  }

  activate() { this.cursor?.setText(); }
  deactivate() {
    this._finishEditing();
  }

  onMouseDown(point) {
    const atom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (atom) {
      this.selection.selectAtom(atom.id);
      this.startEditing(atom);
    } else {
      this._finishEditing();
    }
  }

  onMouseMove() {}
  onMouseUp() {}

  startEditing(atom) {
    this._finishEditing();
    this._editingAtom = atom;

    // Create inline input
    const canvas = document.getElementById('drawing-canvas');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = atom.label || (atom.element === 'C' ? '' : atom.element);
    input.style.cssText = `
      position: fixed;
      left: ${rect.left + atom.x - 20}px;
      top: ${rect.top + atom.y - 12}px;
      width: 50px;
      height: 24px;
      font: 14px Arial, Helvetica, sans-serif;
      text-align: center;
      border: 2px solid #2563eb;
      border-radius: 3px;
      outline: none;
      background: white;
      z-index: 10000;
      padding: 0 4px;
    `;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._applyLabel(input.value);
        this._finishEditing();
      } else if (e.key === 'Escape') {
        this._finishEditing();
      }
      e.stopPropagation(); // prevent tool shortcuts
    });

    input.addEventListener('blur', () => {
      this._applyLabel(input.value);
      this._finishEditing();
    });

    document.body.appendChild(input);
    this._inputEl = input;

    // Focus and select
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  _applyLabel(value) {
    if (!this._editingAtom) return;

    const trimmed = value.trim();
    if (!trimmed) {
      // Reset to carbon
      this._editingAtom.element = 'C';
      this._editingAtom.label = null;
    } else if (isValidElement(trimmed)) {
      this._editingAtom.element = trimmed;
      this._editingAtom.label = null;
    } else if (ABBREVIATIONS[trimmed]) {
      this._editingAtom.label = trimmed;
    } else {
      // Try capitalizing first letter
      const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      if (isValidElement(capitalized)) {
        this._editingAtom.element = capitalized;
        this._editingAtom.label = null;
      } else {
        // Set as custom label
        this._editingAtom.label = trimmed;
      }
    }

    this.doc._notify('change');
  }

  _finishEditing() {
    if (this._inputEl) {
      this._inputEl.remove();
      this._inputEl = null;
    }
    this._editingAtom = null;
  }
}
