import { BOND_TYPES, BOND_STEREO } from '../util/constants.js';
import { ELEMENTS } from '../model/elements.js';

export class PropertyPanel {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this._build();

    app.selection.onChange(() => this._update());
    app.doc.onChange(() => this._update());
  }

  _build() {
    this.container.innerHTML = '';
    this.container.className = 'property-panel';

    // Atom section
    this._atomSection = this._createSection('Atom');
    this._atomSection.style.display = 'none';

    this._elementSelect = this._createSelect('Element',
      Object.keys(ELEMENTS).map(sym => ({ value: sym, label: `${sym} - ${ELEMENTS[sym].name}` })),
      (val) => this._setAtomElement(val)
    );
    this._atomSection.appendChild(this._elementSelect.wrapper);

    this._chargeInput = this._createNumberInput('Charge', 0, -3, 3, 1, (val) => {
      this._setAtomProperty('charge', val);
    });
    this._atomSection.appendChild(this._chargeInput.wrapper);

    this.container.appendChild(this._atomSection);

    // Bond section
    this._bondSection = this._createSection('Bond');
    this._bondSection.style.display = 'none';

    this._bondTypeSelect = this._createSelect('Type', [
      { value: BOND_TYPES.SINGLE, label: 'Single' },
      { value: BOND_TYPES.DOUBLE, label: 'Double' },
      { value: BOND_TYPES.TRIPLE, label: 'Triple' },
    ], (val) => this._setBondProperty('type', val));
    this._bondSection.appendChild(this._bondTypeSelect.wrapper);

    this._stereoSelect = this._createSelect('Stereo', [
      { value: BOND_STEREO.NONE, label: 'None' },
      { value: BOND_STEREO.WEDGE, label: 'Wedge' },
      { value: BOND_STEREO.DASH, label: 'Dash' },
      { value: BOND_STEREO.WAVY, label: 'Wavy' },
      { value: BOND_STEREO.BOLD, label: 'Bold' },
    ], (val) => this._setBondProperty('stereo', val));
    this._bondSection.appendChild(this._stereoSelect.wrapper);

    this.container.appendChild(this._bondSection);

    // Help section (always visible)
    const helpSection = this._createSection('Shortcuts');
    const shortcuts = [
      'V - Select', 'B - Bond', 'R - Ring',
      'C - Chain', 'A - Atom Label', 'E - Eraser',
      'W - Arrow', 'T - Text', '',
      'Hover atom + N/O/S/F/I/P',
      'Hover bond + 1/2/3',
      'Right-click tool for options',
    ];
    const shortcutList = document.createElement('div');
    shortcutList.className = 'shortcut-list';
    for (const s of shortcuts) {
      const div = document.createElement('div');
      div.className = 'shortcut-item';
      div.textContent = s;
      shortcutList.appendChild(div);
    }
    helpSection.appendChild(shortcutList);
    this.container.appendChild(helpSection);
  }

  _update() {
    const { selection, doc } = this.app;

    // Check for selected atoms
    const selectedAtomIds = selection.atomIds;
    const selectedBondIds = selection.bondIds;

    if (selectedAtomIds.length > 0) {
      this._atomSection.style.display = '';
      const mol = doc.findMoleculeByAtomId(selectedAtomIds[0]);
      if (mol) {
        const atom = mol.atoms.find(a => a.id === selectedAtomIds[0]);
        if (atom) {
          this._elementSelect.input.value = atom.element;
          this._chargeInput.input.value = atom.charge;
        }
      }
    } else {
      this._atomSection.style.display = 'none';
    }

    if (selectedBondIds.length > 0) {
      this._bondSection.style.display = '';
      const mol = doc.findMoleculeByBondId(selectedBondIds[0]);
      if (mol) {
        const bond = mol.bonds.find(b => b.id === selectedBondIds[0]);
        if (bond) {
          this._bondTypeSelect.input.value = bond.type;
          this._stereoSelect.input.value = bond.stereo;
        }
      }
    } else {
      this._bondSection.style.display = 'none';
    }
  }

  _setAtomElement(element) {
    for (const atomId of this.app.selection.atomIds) {
      const mol = this.app.doc.findMoleculeByAtomId(atomId);
      if (!mol) continue;
      const atom = mol.atoms.find(a => a.id === atomId);
      if (atom) {
        atom.element = element;
        atom.label = null;
      }
    }
    this.app.doc._notify('change');
  }

  _setAtomProperty(prop, value) {
    for (const atomId of this.app.selection.atomIds) {
      const mol = this.app.doc.findMoleculeByAtomId(atomId);
      if (!mol) continue;
      const atom = mol.atoms.find(a => a.id === atomId);
      if (atom) atom[prop] = value;
    }
    this.app.doc._notify('change');
  }

  _setBondProperty(prop, value) {
    for (const bondId of this.app.selection.bondIds) {
      const mol = this.app.doc.findMoleculeByBondId(bondId);
      if (!mol) continue;
      const bond = mol.bonds.find(b => b.id === bondId);
      if (bond) bond[prop] = value;
    }
    this.app.doc._notify('change');
  }

  _createSection(title) {
    const section = document.createElement('div');
    section.className = 'prop-section';
    const h = document.createElement('h3');
    h.textContent = title;
    section.appendChild(h);
    return section;
  }

  _createNumberInput(label, defaultVal, min, max, step, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'prop-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = defaultVal;
    input.min = min;
    input.max = max;
    input.step = step;
    input.addEventListener('change', () => onChange(Number(input.value)));
    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return { wrapper, input };
  }

  _createSelect(label, options, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'prop-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      input.appendChild(o);
    }
    input.addEventListener('change', () => onChange(input.value));
    wrapper.appendChild(lbl);
    wrapper.appendChild(input);
    return { wrapper, input };
  }
}
