import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, findAtomAtPoint,
} from '../../model/Molecule.js';
import { BOND_LENGTH, SNAP_RADIUS, CHAIN_ANGLE, BOND_TYPES } from '../../util/constants.js';

export class ChainTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._drawing = false;
    this._startPoint = null;
    this._startAtom = null;
    this._startMol = null;
  }

  activate() { this.cursor?.setCrosshair(); }
  deactivate() {
    this._drawing = false;
    if (this.overlay) this.overlay.previewChain = null;
  }

  onMouseDown(point) {
    this._drawing = true;
    this.selection.clear();

    const existingAtom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (existingAtom) {
      this._startAtom = existingAtom;
      this._startMol = this.doc.findMoleculeByAtomId(existingAtom.id);
      this._startPoint = { x: existingAtom.x, y: existingAtom.y };
    } else {
      this._startAtom = null;
      this._startMol = null;
      this._startPoint = { ...point };
    }
  }

  onMouseMove(point) {
    if (!this._drawing) return;

    const chain = this._generateChain(this._startPoint, point);
    if (this.overlay) {
      this.overlay.previewChain = chain;
    }
    this.doc._notify('preview');
  }

  onMouseUp(point) {
    if (!this._drawing) return;
    this._drawing = false;
    if (this.overlay) this.overlay.previewChain = null;

    const chain = this._generateChain(this._startPoint, point);
    if (chain.length < 2) return;

    this._createChain(chain);
  }

  /**
   * Generate a zigzag chain from start toward the mouse position.
   * Number of segments determined by distance.
   */
  _generateChain(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const totalDist = Math.sqrt(dx * dx + dy * dy);

    if (totalDist < 10) return [start];

    const numSegments = Math.max(1, Math.round(totalDist / BOND_LENGTH));
    const baseAngle = Math.atan2(dy, dx);

    const points = [{ ...start }];

    for (let i = 0; i < numSegments; i++) {
      const prev = points[points.length - 1];
      // Zigzag: alternate between +30° and -30° from the base direction
      const zigzag = (i % 2 === 0) ? -Math.PI / 6 : Math.PI / 6;
      const angle = baseAngle + zigzag;

      points.push({
        x: prev.x + BOND_LENGTH * Math.cos(angle),
        y: prev.y + BOND_LENGTH * Math.sin(angle),
      });
    }

    return points;
  }

  _createChain(chain) {
    let molecule = this._startMol;
    if (!molecule) {
      molecule = createMolecule();
      this.doc.addObject(molecule);
    }

    let prevAtom = this._startAtom;

    for (let i = 0; i < chain.length; i++) {
      let atom;
      if (i === 0 && prevAtom) {
        atom = prevAtom;
      } else {
        // Check if near existing atom
        const existing = this.doc.findAtomAtPoint(chain[i], SNAP_RADIUS);
        if (existing && existing !== prevAtom) {
          // Merge molecules if needed
          const existingMol = this.doc.findMoleculeByAtomId(existing.id);
          if (existingMol && existingMol.id !== molecule.id) {
            for (const a of existingMol.atoms) molecule.atoms.push(a);
            for (const b of existingMol.bonds) molecule.bonds.push(b);
            this.doc.removeObject(existingMol.id);
          }
          atom = existing;
        } else {
          atom = createAtom({ x: chain[i].x, y: chain[i].y });
          addAtom(molecule, atom);
        }
      }

      if (prevAtom && prevAtom.id !== atom.id) {
        const bond = createBond(prevAtom.id, atom.id, { type: BOND_TYPES.SINGLE });
        addBond(molecule, bond);
      }

      prevAtom = atom;
    }

    this.doc._notify('change');
  }
}
