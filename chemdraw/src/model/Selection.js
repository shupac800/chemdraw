/**
 * Selection state for atoms, bonds, and objects.
 * Stores IDs that can refer to atoms, bonds, arrows, or text labels.
 */
export class Selection {
  constructor() {
    this._selectedAtoms = new Set();
    this._selectedBonds = new Set();
    this._selectedObjects = new Set(); // arrows, text labels
    this._listeners = [];
  }

  get atomIds() { return [...this._selectedAtoms]; }
  get bondIds() { return [...this._selectedBonds]; }
  get objectIds() { return [...this._selectedObjects]; }

  get count() {
    return this._selectedAtoms.size + this._selectedBonds.size + this._selectedObjects.size;
  }

  get isEmpty() { return this.count === 0; }

  hasAtom(id) { return this._selectedAtoms.has(id); }
  hasBond(id) { return this._selectedBonds.has(id); }
  hasObject(id) { return this._selectedObjects.has(id); }

  selectAtom(id) {
    this._selectedAtoms.clear();
    this._selectedBonds.clear();
    this._selectedObjects.clear();
    this._selectedAtoms.add(id);
    this._notify();
  }

  selectBond(id) {
    this._selectedAtoms.clear();
    this._selectedBonds.clear();
    this._selectedObjects.clear();
    this._selectedBonds.add(id);
    this._notify();
  }

  selectObject(id) {
    this._selectedAtoms.clear();
    this._selectedBonds.clear();
    this._selectedObjects.clear();
    this._selectedObjects.add(id);
    this._notify();
  }

  addAtom(id) {
    this._selectedAtoms.add(id);
    this._notify();
  }

  removeAtom(id) {
    this._selectedAtoms.delete(id);
    this._notify();
  }

  addBond(id) {
    this._selectedBonds.add(id);
    this._notify();
  }

  toggleAtom(id) {
    if (this._selectedAtoms.has(id)) {
      this._selectedAtoms.delete(id);
    } else {
      this._selectedAtoms.add(id);
    }
    this._notify();
  }

  toggleBond(id) {
    if (this._selectedBonds.has(id)) {
      this._selectedBonds.delete(id);
    } else {
      this._selectedBonds.add(id);
    }
    this._notify();
  }

  /**
   * Select all atoms and bonds in a molecule.
   */
  selectMolecule(molecule) {
    for (const atom of molecule.atoms) {
      this._selectedAtoms.add(atom.id);
    }
    for (const bond of molecule.bonds) {
      this._selectedBonds.add(bond.id);
    }
    this._notify();
  }

  /**
   * Select atoms within a rectangle.
   */
  selectAtomsInRect(molecules, rect) {
    this._selectedAtoms.clear();
    this._selectedBonds.clear();
    this._selectedObjects.clear();
    for (const mol of molecules) {
      for (const atom of mol.atoms) {
        if (atom.x >= rect.x && atom.x <= rect.x + rect.width &&
            atom.y >= rect.y && atom.y <= rect.y + rect.height) {
          this._selectedAtoms.add(atom.id);
        }
      }
      // Select bonds where both atoms are selected
      for (const bond of mol.bonds) {
        if (this._selectedAtoms.has(bond.atomA) && this._selectedAtoms.has(bond.atomB)) {
          this._selectedBonds.add(bond.id);
        }
      }
    }
    this._notify();
  }

  clear() {
    if (this.count > 0) {
      this._selectedAtoms.clear();
      this._selectedBonds.clear();
      this._selectedObjects.clear();
      this._notify();
    }
  }

  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    for (const listener of this._listeners) {
      listener();
    }
  }
}
