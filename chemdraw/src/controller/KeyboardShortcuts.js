import { TOOLS, SNAP_RADIUS, BOND_TYPES, BOND_STEREO } from '../util/constants.js';
import { ATOM_HOTKEYS } from '../model/elements.js';
import { removeAtom, removeBond, isEmpty, cycleBondType } from '../model/Molecule.js';

export class KeyboardShortcuts {
  constructor(app) {
    this.app = app;
    this._mousePos = { x: 0, y: 0 };

    // Track mouse position for atom hotkeys
    const canvas = document.getElementById('drawing-canvas');
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this._mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    });

    window.addEventListener('keydown', (e) => this._handleKeyDown(e));
  }

  _handleKeyDown(e) {
    // Don't handle if focus is on an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl shortcuts
    if (ctrl) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          this.app.commandStack.undo();
          break;
        case 'y':
          e.preventDefault();
          this.app.commandStack.redo();
          break;
        case 'Z':
          e.preventDefault();
          this.app.commandStack.redo();
          break;
        case 'a':
          e.preventDefault();
          this._selectAll();
          break;
        case 'c':
          e.preventDefault();
          this._copy();
          break;
        case 'x':
          e.preventDefault();
          this._cut();
          break;
        case 'v':
          e.preventDefault();
          this._paste();
          break;
        case 'g':
          e.preventDefault();
          this._group();
          break;
        case 'G':
          e.preventDefault();
          this._ungroup();
          break;
      }
      return;
    }

    // Tool shortcuts
    switch (e.key.toLowerCase()) {
      case 'v':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.SELECT);
        return;
      case 'b':
        // Check if hovering over a bond for Br hotkey
        if (this._tryAtomHotkey('b')) return;
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.BOND);
        return;
      case 'r':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.RING);
        return;
      case 'c':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.CHAIN);
        return;
      case 'a':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.ATOM_LABEL);
        return;
      case 'e':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.ERASER);
        return;
      case 'w':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.ARROW);
        return;
      case 't':
        e.preventDefault();
        this.app.toolManager.setActiveTool(TOOLS.TEXT);
        return;
    }

    // Atom hotkeys (hover over atom and press key)
    if (ATOM_HOTKEYS[e.key.toLowerCase()]) {
      if (this._tryAtomHotkey(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
    }

    // Bond order hotkeys (hover over bond and press 1/2/3)
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      if (this._tryBondOrderHotkey(e.key)) {
        e.preventDefault();
        return;
      }
    }

    // Bond stereo hotkeys
    if (e.key.toLowerCase() === 'd') {
      if (this._tryBondStereoHotkey(BOND_STEREO.DASH)) {
        e.preventDefault();
        return;
      }
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this._deleteSelected();
      return;
    }

    // Escape: cancel in-progress operation, or switch to select tool
    if (e.key === 'Escape') {
      const cancelled = this.app.toolManager.cancelActiveTool();
      if (!cancelled) {
        this.app.selection.clear();
        this.app.toolManager.setActiveTool(TOOLS.SELECT);
      }
      return;
    }

    // Arrow key nudge
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const amount = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -amount;
      if (e.key === 'ArrowRight') dx = amount;
      if (e.key === 'ArrowUp') dy = -amount;
      if (e.key === 'ArrowDown') dy = amount;
      this._nudgeSelected(dx, dy);
    }
  }

  _tryAtomHotkey(key) {
    const element = ATOM_HOTKEYS[key];
    if (!element) return false;

    const atom = this.app.doc.findAtomAtPoint(this._mousePos, SNAP_RADIUS);
    if (!atom) return false;

    atom.element = element;
    atom.label = null;
    this.app.doc._notify('change');
    return true;
  }

  _tryBondOrderHotkey(key) {
    const bond = this.app.doc.findBondAtPoint(this._mousePos, 8);
    if (!bond) return false;

    const types = { '1': BOND_TYPES.SINGLE, '2': BOND_TYPES.DOUBLE, '3': BOND_TYPES.TRIPLE };
    bond.type = types[key];
    bond.stereo = BOND_STEREO.NONE;
    this.app.doc._notify('change');
    return true;
  }

  _tryBondStereoHotkey(stereo) {
    const bond = this.app.doc.findBondAtPoint(this._mousePos, 8);
    if (!bond) return false;

    bond.stereo = bond.stereo === stereo ? BOND_STEREO.NONE : stereo;
    bond.type = BOND_TYPES.SINGLE;
    this.app.doc._notify('change');
    return true;
  }

  _deleteSelected() {
    const { selection, doc } = this.app;

    // Delete selected atoms
    for (const atomId of selection.atomIds) {
      const mol = doc.findMoleculeByAtomId(atomId);
      if (mol) {
        removeAtom(mol, atomId);
        if (isEmpty(mol)) doc.removeObject(mol.id);
      }
    }

    // Delete selected bonds
    for (const bondId of selection.bondIds) {
      const mol = doc.findMoleculeByBondId(bondId);
      if (mol) removeBond(mol, bondId);
    }

    // Delete selected objects
    for (const objId of selection.objectIds) {
      doc.removeObject(objId);
    }

    selection.clear();
    doc._notify('change');
  }

  _nudgeSelected(dx, dy) {
    for (const atomId of this.app.selection.atomIds) {
      for (const mol of this.app.doc.getMolecules()) {
        const atom = mol.atoms.find(a => a.id === atomId);
        if (atom) {
          atom.x += dx;
          atom.y += dy;
        }
      }
    }
    this.app.doc._notify('change');
  }

  _selectAll() {
    const { selection, doc } = this.app;
    selection.clear();
    for (const mol of doc.getMolecules()) {
      selection.selectMolecule(mol);
    }
    for (const obj of doc.objects) {
      if (obj.type === 'arrow' || obj.type === 'text') {
        selection.addAtom(obj.id); // reuse for simplicity
      }
    }
  }

  _copy() {
    const mols = this._getSelectedMolecules();
    this.app.clipboard.copy(mols);
  }

  _cut() {
    this._copy();
    this._deleteSelected();
  }

  _paste() {
    const pasted = this.app.clipboard.paste();
    if (pasted.length === 0) return;

    this.app.selection.clear();
    for (const obj of pasted) {
      // Offset pasted objects
      if (obj.type === 'molecule') {
        for (const atom of obj.atoms) {
          atom.x += 20;
          atom.y += 20;
        }
      }
      this.app.doc.addObject(obj);
      // Select all pasted objects so they can be moved as a unit
      if (obj.type === 'molecule') {
        this.app.selection.selectMolecule(obj);
      } else {
        this.app.selection._selectedObjects.add(obj.id);
      }
    }
    this.app.doc._notify('change');
  }

  _group() {
    const { selection, doc } = this.app;
    const atomIds = selection.atomIds;
    const objectIds = selection.objectIds;
    if (atomIds.length + objectIds.length < 2) return;
    doc.createGroup(atomIds, objectIds);
  }

  _ungroup() {
    const { selection, doc } = this.app;
    const atomIds = selection.atomIds;
    const objectIds = selection.objectIds;
    if (atomIds.length === 0 && objectIds.length === 0) return;
    doc.dissolveGroups(atomIds, objectIds);
  }

  _getSelectedMolecules() {
    const { selection, doc } = this.app;
    const molIds = new Set();
    for (const atomId of selection.atomIds) {
      const mol = doc.findMoleculeByAtomId(atomId);
      if (mol) molIds.add(mol.id);
    }
    return [...molIds].map(id => doc.getObjectById(id)).filter(Boolean);
  }
}
