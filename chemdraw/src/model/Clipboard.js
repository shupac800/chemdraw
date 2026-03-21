import { cloneMolecule } from './Molecule.js';

export class Clipboard {
  constructor() {
    this._data = null;
  }

  get isEmpty() {
    return !this._data;
  }

  copy(molecules) {
    this._data = molecules.map(m => JSON.parse(JSON.stringify(m)));
  }

  paste() {
    if (!this._data) return [];
    return this._data.map(m => {
      if (m.type === 'molecule') return cloneMolecule(m);
      return JSON.parse(JSON.stringify(m));
    });
  }
}
