import { molecularFormula, molecularWeight } from '../util/chemistry.js';

export class StatusBar {
  constructor(container, doc) {
    this.container = container;
    this.doc = doc;
    this._build();

    doc.onChange(() => this._update());
  }

  _build() {
    this.container.innerHTML = '';
    this.container.className = 'status-bar';

    this._formulaEl = document.createElement('span');
    this._formulaEl.className = 'status-formula';
    this._formulaEl.textContent = 'Formula: —';

    this._mwEl = document.createElement('span');
    this._mwEl.className = 'status-mw';
    this._mwEl.textContent = 'MW: —';

    this._atomCountEl = document.createElement('span');
    this._atomCountEl.className = 'status-count';
    this._atomCountEl.textContent = '';

    this.container.appendChild(this._formulaEl);
    this.container.appendChild(this._mwEl);
    this.container.appendChild(this._atomCountEl);
  }

  _update() {
    const molecules = this.doc.getMolecules();
    if (molecules.length === 0) {
      this._formulaEl.textContent = 'Formula: —';
      this._mwEl.textContent = 'MW: —';
      this._atomCountEl.textContent = '';
      return;
    }

    // Show formula for all molecules combined
    // Merge all atoms into a single virtual molecule for formula calculation
    const combined = {
      atoms: [],
      bonds: [],
    };
    for (const mol of molecules) {
      combined.atoms.push(...mol.atoms);
      combined.bonds.push(...mol.bonds);
    }

    const formula = molecularFormula(combined);
    const mw = molecularWeight(combined);

    // Format formula with subscripts using HTML
    this._formulaEl.innerHTML = 'Formula: ' + formatFormulaHTML(formula);
    this._mwEl.textContent = `MW: ${mw.toFixed(3)}`;

    const totalAtoms = combined.atoms.length;
    const totalBonds = combined.bonds.length;
    this._atomCountEl.textContent = `${totalAtoms} atoms, ${totalBonds} bonds`;
  }
}

function formatFormulaHTML(formula) {
  // Convert "C6H12O6" to "C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>"
  return formula.replace(/([A-Z][a-z]?)(\d+)/g, (match, el, num) => {
    return `${el}<sub>${num}</sub>`;
  });
}
