import { SNAP_RADIUS } from '../../util/constants.js';
import { removeAtom, removeBond, isEmpty } from '../../model/Molecule.js';

export class EraserTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._erasing = false;
  }

  activate() { this.cursor?.setEraser(); }
  deactivate() { this._erasing = false; }

  onMouseDown(point) {
    this._erasing = true;
    this.selection.clear();
    this._eraseAt(point);
  }

  onMouseMove(point) {
    if (!this._erasing) return;
    this._eraseAt(point);
  }

  onMouseUp() {
    this._erasing = false;
  }

  _eraseAt(point) {
    // Check for atom first
    const atom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (atom) {
      const mol = this.doc.findMoleculeByAtomId(atom.id);
      if (mol) {
        removeAtom(mol, atom.id);
        // Remove molecule if empty
        if (isEmpty(mol)) {
          this.doc.removeObject(mol.id);
        }
        this.doc._notify('change');
        return;
      }
    }

    // Check for bond
    const bond = this.doc.findBondAtPoint(point, 5);
    if (bond) {
      const mol = this.doc.findMoleculeByBondId(bond.id);
      if (mol) {
        removeBond(mol, bond.id);
        this.doc._notify('change');
        return;
      }
    }

    // Check for arrows/text
    const obj = this.doc.findObjectAtPoint(point);
    if (obj) {
      this.doc.removeObject(obj.id);
      this.doc._notify('change');
    }
  }
}
