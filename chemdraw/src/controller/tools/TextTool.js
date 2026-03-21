import { createTextLabel } from '../../model/Molecule.js';

export class TextTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._inputEl = null;
    this._insertPoint = null;
  }

  activate() { this.cursor?.setText(); }
  deactivate() {
    this._finishEditing();
  }

  onMouseDown(point) {
    this._finishEditing();
    this.selection.clear();

    // Check if clicking on existing text
    const obj = this.doc.findObjectAtPoint(point);
    if (obj && obj.type === 'text') {
      this._editExisting(obj);
      return;
    }

    this._insertPoint = { ...point };
    this._createInput(point);
  }

  onMouseMove() {}
  onMouseUp() {}

  _createInput(point) {
    const canvas = document.getElementById('drawing-canvas');
    const rect = canvas.getBoundingClientRect();

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type text...';
    input.style.cssText = `
      position: fixed;
      left: ${rect.left + point.x}px;
      top: ${rect.top + point.y - 10}px;
      min-width: 100px;
      height: 24px;
      font: 14px Arial, Helvetica, sans-serif;
      border: 2px solid #2563eb;
      border-radius: 3px;
      outline: none;
      background: white;
      z-index: 10000;
      padding: 0 6px;
    `;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._commitText(input.value);
      } else if (e.key === 'Escape') {
        this._finishEditing();
      }
      e.stopPropagation();
    });

    document.body.appendChild(input);
    this._inputEl = input;

    requestAnimationFrame(() => input.focus());
  }

  _editExisting(textObj) {
    this._insertPoint = { x: textObj.x, y: textObj.y };
    this._editingObj = textObj;

    const canvas = document.getElementById('drawing-canvas');
    const rect = canvas.getBoundingClientRect();

    const input = document.createElement('input');
    input.type = 'text';
    input.value = textObj.text;
    input.style.cssText = `
      position: fixed;
      left: ${rect.left + textObj.x}px;
      top: ${rect.top + textObj.y - 10}px;
      min-width: 100px;
      height: 24px;
      font: ${textObj.fontSize}px ${textObj.fontFamily};
      border: 2px solid #2563eb;
      border-radius: 3px;
      outline: none;
      background: white;
      z-index: 10000;
      padding: 0 6px;
    `;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this._editingObj) {
          this._editingObj.text = input.value;
          this.doc._notify('change');
        }
        this._finishEditing();
      } else if (e.key === 'Escape') {
        this._finishEditing();
      }
      e.stopPropagation();
    });

    document.body.appendChild(input);
    this._inputEl = input;

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  _commitText(value) {
    if (!value.trim() || !this._insertPoint) {
      this._finishEditing();
      return;
    }

    const textLabel = createTextLabel({
      x: this._insertPoint.x,
      y: this._insertPoint.y,
      text: value.trim(),
    });

    this.doc.addObject(textLabel);
    this.doc._notify('change');
    this._finishEditing();
  }

  _finishEditing() {
    if (this._inputEl) {
      this._inputEl.remove();
      this._inputEl = null;
    }
    this._insertPoint = null;
    this._editingObj = null;
  }
}
