import { describe, it, expect, beforeEach } from 'vitest';
import { Document } from '../src/model/Document.js';
import { Selection } from '../src/model/Selection.js';
import { Clipboard } from '../src/model/Clipboard.js';
import { SelectTool } from '../src/controller/tools/SelectTool.js';
import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, resetIdCounters,
  generateRingPositions,
} from '../src/model/Molecule.js';
import { BOND_LENGTH } from '../src/util/constants.js';

function makeHexagon(doc, cx, cy) {
  const mol = createMolecule();
  const positions = generateRingPositions(cx, cy, 6, BOND_LENGTH);
  const atoms = positions.map(p => {
    const a = createAtom({ x: p.x, y: p.y });
    addAtom(mol, a);
    return a;
  });
  for (let i = 0; i < 6; i++) {
    addBond(mol, createBond(atoms[i].id, atoms[(i + 1) % 6].id));
  }
  doc.addObject(mol);
  return mol;
}

// Minimal app-like object for KeyboardShortcuts._paste logic
function simulatePaste(doc, selection, clipboard) {
  const pasted = clipboard.paste();
  if (pasted.length === 0) return [];

  selection.clear();
  for (const obj of pasted) {
    if (obj.type === 'molecule') {
      for (const atom of obj.atoms) {
        atom.x += 20;
        atom.y += 20;
      }
    }
    doc.addObject(obj);
    if (obj.type === 'molecule') {
      selection.selectMolecule(obj);
    } else {
      selection._selectedObjects.add(obj.id);
    }
  }
  doc._notify('change');
  return pasted;
}

describe('Paste selection', () => {
  let doc, selection, clipboard, tool;

  beforeEach(() => {
    resetIdCounters();
    doc = new Document();
    selection = new Selection();
    clipboard = new Clipboard();
    tool = new SelectTool();
    tool.doc = doc;
    tool.selection = selection;
    tool.commandStack = null;
    tool.overlay = null;
    tool.cursor = null;
  });

  it('pasted molecule is fully selected', () => {
    const mol = makeHexagon(doc, 200, 200);
    selection.selectMolecule(mol);

    // Copy
    clipboard.copy([mol]);

    // Paste
    const pasted = simulatePaste(doc, selection, clipboard);
    expect(pasted.length).toBe(1);

    const pastedMol = pasted[0];
    // All pasted atoms should be selected
    for (const atom of pastedMol.atoms) {
      expect(selection.hasAtom(atom.id)).toBe(true);
    }
    // All pasted bonds should be selected
    for (const bond of pastedMol.bonds) {
      expect(selection.hasBond(bond.id)).toBe(true);
    }
    // Original atoms should NOT be selected
    for (const atom of mol.atoms) {
      expect(selection.hasAtom(atom.id)).toBe(false);
    }
  });

  it('clicking a bond in pasted molecule moves entire pasted molecule', () => {
    const mol = makeHexagon(doc, 200, 200);
    selection.selectMolecule(mol);
    clipboard.copy([mol]);

    const pasted = simulatePaste(doc, selection, clipboard);
    const pastedMol = pasted[0];

    const startPositions = pastedMol.atoms.map(a => ({ id: a.id, x: a.x, y: a.y }));

    // Click on one of the pasted bonds (via its first atom)
    const clickAtom = pastedMol.atoms[0];
    const clickPoint = { x: clickAtom.x, y: clickAtom.y };
    tool.onMouseDown(clickPoint, {});
    // Drag
    tool.onMouseMove({ x: clickPoint.x + 50, y: clickPoint.y + 30 }, {});
    tool.onMouseUp({ x: clickPoint.x + 50, y: clickPoint.y + 30 }, {});

    // All pasted atoms should have moved by (50, 30)
    for (const start of startPositions) {
      const atom = pastedMol.atoms.find(a => a.id === start.id);
      expect(atom.x).toBeCloseTo(start.x + 50, 0);
      expect(atom.y).toBeCloseTo(start.y + 30, 0);
    }
  });
});
