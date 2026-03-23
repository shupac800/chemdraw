import {
  createAtom, createBond, createMolecule,
  findAtomAtPoint, addAtom, addBond,
} from '../../model/Molecule.js';
import {
  BOND_LENGTH, SNAP_RADIUS, ANGLE_SNAP, CHAIN_ANGLE,
  BOND_TYPES, BOND_STEREO, TOOLS,
} from '../../util/constants.js';

export class BondTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._drawing = false;
    this._startAtom = null;
    this._startMol = null;
    this._startPoint = null;

    // Sub-type
    this.bondType = BOND_TYPES.SINGLE;
    this.bondStereo = BOND_STEREO.NONE;
  }

  activate() { this.cursor?.setCrosshair(); }
  deactivate() {
    this._drawing = false;
    if (this.overlay) this.overlay.previewBond = null;
  }

  cancel() {
    if (!this._drawing) return false;
    this._drawing = false;
    if (this.overlay) this.overlay.previewBond = null;
    this.doc._notify('preview');
    return true;
  }

  onMouseDown(point) {
    this._drawing = true;
    this.selection.clear();

    // Check if clicking on an existing atom
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

    const endPoint = this._snapEndPoint(this._startPoint, point);

    if (this.overlay) {
      this.overlay.previewBond = {
        x1: this._startPoint.x,
        y1: this._startPoint.y,
        x2: endPoint.x,
        y2: endPoint.y,
      };
    }
    this.doc._notify('preview');
  }

  onMouseUp(point) {
    if (!this._drawing) return;
    this._drawing = false;
    if (this.overlay) this.overlay.previewBond = null;

    const endPoint = this._snapEndPoint(this._startPoint, point);

    // Check minimum distance
    const dx = endPoint.x - this._startPoint.x;
    const dy = endPoint.y - this._startPoint.y;
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      // Click without drag — create a bond at default angle
      this._createDefaultBond(this._startPoint);
      return;
    }

    this._createBondTo(endPoint);
  }

  _snapEndPoint(start, raw) {
    // Check if near existing atom
    const nearAtom = this.doc.findAtomAtPoint(raw, SNAP_RADIUS);
    if (nearAtom && nearAtom !== this._startAtom) {
      return { x: nearAtom.x, y: nearAtom.y };
    }

    // Snap to angle increments
    const dx = raw.x - start.x;
    const dy = raw.y - start.y;
    const angle = Math.atan2(dy, dx);
    const snappedAngle = Math.round(angle / ANGLE_SNAP) * ANGLE_SNAP;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Snap length to bond length if close
    const snappedLen = Math.abs(len - BOND_LENGTH) < 15 ? BOND_LENGTH : len;

    return {
      x: start.x + snappedLen * Math.cos(snappedAngle),
      y: start.y + snappedLen * Math.sin(snappedAngle),
    };
  }

  _createDefaultBond(startPoint) {
    // Determine best angle for new bond
    let angle = -Math.PI / 6; // default: 30° up-right (for zigzag)

    if (this._startAtom && this._startMol) {
      angle = this._getBestAngle(this._startMol, this._startAtom);
    }

    const endPoint = {
      x: startPoint.x + BOND_LENGTH * Math.cos(angle),
      y: startPoint.y + BOND_LENGTH * Math.sin(angle),
    };

    this._createBondTo(endPoint);
  }

  _createBondTo(endPoint) {
    // Check if endpoint is near an existing atom
    const endAtom = this.doc.findAtomAtPoint(endPoint, SNAP_RADIUS);

    let molecule = this._startMol;
    let atomA = this._startAtom;

    // If no start molecule, create one
    if (!molecule) {
      molecule = createMolecule();
      this.doc.addObject(molecule);
    }

    // If no start atom, create one
    if (!atomA) {
      atomA = createAtom({ x: this._startPoint.x, y: this._startPoint.y });
      addAtom(molecule, atomA);
    }

    let atomB;
    if (endAtom) {
      // Check if the end atom is in the same molecule
      const endMol = this.doc.findMoleculeByAtomId(endAtom.id);
      if (endMol && endMol.id === molecule.id) {
        atomB = endAtom;
      } else if (endMol) {
        // Merge molecules: move all atoms/bonds from endMol into molecule
        for (const a of endMol.atoms) {
          molecule.atoms.push(a);
        }
        for (const b of endMol.bonds) {
          molecule.bonds.push(b);
        }
        this.doc.removeObject(endMol.id);
        atomB = endAtom;
      } else {
        atomB = endAtom;
      }
    } else {
      atomB = createAtom({ x: endPoint.x, y: endPoint.y });
      addAtom(molecule, atomB);
    }

    // Don't create bond to self
    if (atomA.id === atomB.id) return;

    const bond = createBond(atomA.id, atomB.id, {
      type: this.bondType,
      stereo: this.bondStereo,
    });
    addBond(molecule, bond);

    this.doc._notify('change');
  }

  /**
   * Find the best angle for a new bond from an atom,
   * considering existing bonds to avoid overlap.
   */
  _getBestAngle(molecule, atom) {
    const bonds = molecule.bonds.filter(b => b.atomA === atom.id || b.atomB === atom.id);

    if (bonds.length === 0) {
      return -Math.PI / 6; // 30° up-right
    }

    // Get existing bond angles
    const angles = bonds.map(b => {
      const otherId = b.atomA === atom.id ? b.atomB : b.atomA;
      const other = molecule.atoms.find(a => a.id === otherId);
      if (!other) return 0;
      return Math.atan2(other.y - atom.y, other.x - atom.x);
    });

    // Find the largest gap between existing angles
    const sorted = [...angles].sort((a, b) => a - b);

    if (sorted.length === 1) {
      // One existing bond — place new bond at 120° from it
      const existing = sorted[0];
      // Try both +120° and -120°, prefer the one that goes more "downward" in zigzag
      const opt1 = existing + CHAIN_ANGLE;
      const opt2 = existing - CHAIN_ANGLE;
      // Prefer the one that continues the zigzag (alternating up/down)
      return Math.abs(opt1) < Math.abs(opt2) ? opt1 : opt2;
    }

    // Multiple bonds — find largest angular gap
    let maxGap = 0;
    let bestAngle = 0;
    for (let i = 0; i < sorted.length; i++) {
      const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
      const gap = next - sorted[i];
      if (gap > maxGap) {
        maxGap = gap;
        bestAngle = sorted[i] + gap / 2;
      }
    }

    return bestAngle;
  }
}
