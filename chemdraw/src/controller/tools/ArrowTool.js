import { createArrow } from '../../model/Molecule.js';
import { ARROW_TYPES } from '../../util/constants.js';

export class ArrowTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._drawing = false;
    this._startPoint = null;
    this.arrowType = ARROW_TYPES.REACTION;
  }

  activate() { this.cursor?.setCrosshair(); }
  deactivate() {
    this._drawing = false;
    if (this.overlay) this.overlay.previewArrow = null;
  }

  cancel() {
    if (!this._drawing) return false;
    this._drawing = false;
    if (this.overlay) this.overlay.previewArrow = null;
    this.doc._notify('preview');
    return true;
  }

  onMouseDown(point) {
    this._drawing = true;
    this._startPoint = { ...point };
    this.selection.clear();
  }

  onMouseMove(point) {
    if (!this._drawing) return;

    if (this.overlay) {
      this.overlay.previewArrow = {
        x1: this._startPoint.x,
        y1: this._startPoint.y,
        x2: point.x,
        y2: point.y,
      };
    }
    this.doc._notify('preview');
  }

  onMouseUp(point) {
    if (!this._drawing) return;
    this._drawing = false;
    if (this.overlay) this.overlay.previewArrow = null;

    const dx = point.x - this._startPoint.x;
    const dy = point.y - this._startPoint.y;
    if (Math.sqrt(dx * dx + dy * dy) < 10) return;

    const arrow = createArrow({
      arrowType: this.arrowType,
      points: [{ ...this._startPoint }, { ...point }],
    });

    this.doc.addObject(arrow);
    this.doc._notify('change');
  }
}
