import { describe, it, expect, beforeEach } from 'vitest';
import { Document } from '../src/model/Document.js';
import { Selection } from '../src/model/Selection.js';
import { SelectTool } from '../src/controller/tools/SelectTool.js';
import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, resetIdCounters,
  generateRingPositions,
} from '../src/model/Molecule.js';
import { BOND_LENGTH, SNAP_RADIUS } from '../src/util/constants.js';

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

describe('Grouping', () => {
  let doc, selection, tool;

  beforeEach(() => {
    resetIdCounters();
    doc = new Document();
    selection = new Selection();
    tool = new SelectTool();
    tool.doc = doc;
    tool.selection = selection;
    tool.commandStack = null;
    tool.overlay = null;
    tool.cursor = null;
  });

  it('creates a group from selected atoms', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);

    const group = doc.createGroup(allAtomIds);
    expect(group).not.toBeNull();
    expect(group.atomIds).toEqual(allAtomIds);
    expect(doc.groups.length).toBe(1);
  });

  it('finds group by atom ID', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);
    doc.createGroup(allAtomIds);

    const found = doc.findGroupByAtomId(allAtomIds[0]);
    expect(found).not.toBeNull();
    expect(found.atomIds).toEqual(allAtomIds);
  });

  it('returns null for ungrouped atom', () => {
    const mol = makeHexagon(doc, 200, 200);
    expect(doc.findGroupByAtomId(mol.atoms[0].id)).toBeNull();
  });

  it('ungroups atoms', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);
    doc.createGroup(allAtomIds);
    expect(doc.groups.length).toBe(1);

    doc.ungroupItems(allAtomIds);
    expect(doc.groups.length).toBe(0);
  });

  it('clicking a grouped atom selects the entire group', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);
    doc.createGroup(allAtomIds);

    // Click on the first atom
    const clickPoint = { x: mol.atoms[0].x, y: mol.atoms[0].y };
    tool.onMouseDown(clickPoint, {});
    tool.onMouseUp(clickPoint, {});

    // All atoms in the group should be selected
    for (const id of allAtomIds) {
      expect(selection.hasAtom(id)).toBe(true);
    }
  });

  it('clicking a grouped atom selects bonds between group members', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);
    doc.createGroup(allAtomIds);

    const clickPoint = { x: mol.atoms[0].x, y: mol.atoms[0].y };
    tool.onMouseDown(clickPoint, {});

    // All bonds should be selected too
    for (const bond of mol.bonds) {
      expect(selection.hasBond(bond.id)).toBe(true);
    }
  });

  it('dragging a grouped atom moves all group members', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);
    doc.createGroup(allAtomIds);

    const startPositions = mol.atoms.map(a => ({ id: a.id, x: a.x, y: a.y }));

    // Click and drag atom[0]
    const clickPoint = { x: mol.atoms[0].x, y: mol.atoms[0].y };
    tool.onMouseDown(clickPoint, {});
    tool.onMouseMove({ x: clickPoint.x + 50, y: clickPoint.y + 30 });
    tool.onMouseUp({ x: clickPoint.x + 50, y: clickPoint.y + 30 }, {});

    // All atoms should have moved by (50, 30)
    for (const start of startPositions) {
      const atom = mol.atoms.find(a => a.id === start.id);
      expect(atom.x).toBeCloseTo(start.x + 50, 0);
      expect(atom.y).toBeCloseTo(start.y + 30, 0);
    }
  });

  it('groups span multiple molecules', () => {
    const mol1 = makeHexagon(doc, 200, 200);
    const mol2 = makeHexagon(doc, 400, 200);
    const allAtomIds = [...mol1.atoms.map(a => a.id), ...mol2.atoms.map(a => a.id)];
    doc.createGroup(allAtomIds);

    // Click atom in mol1
    const clickPoint = { x: mol1.atoms[0].x, y: mol1.atoms[0].y };
    tool.onMouseDown(clickPoint, {});

    // Atoms from both molecules should be selected
    for (const id of allAtomIds) {
      expect(selection.hasAtom(id)).toBe(true);
    }
  });

  it('creating a new group removes atoms from old groups', () => {
    const mol = makeHexagon(doc, 200, 200);
    const allAtomIds = mol.atoms.map(a => a.id);

    // Group all atoms
    doc.createGroup(allAtomIds);
    expect(doc.groups.length).toBe(1);

    // Create new group with just first 3 atoms — should remove them from old group
    const subGroup = allAtomIds.slice(0, 3);
    doc.createGroup(subGroup);

    expect(doc.groups.length).toBe(2);
    // Old group should only have last 3 atoms
    const oldGroup = doc.groups[0];
    expect(oldGroup.atomIds.length).toBe(3);
  });

  it('groups persist in serialization', () => {
    const mol = makeHexagon(doc, 200, 200);
    doc.createGroup(mol.atoms.map(a => a.id));

    const json = doc.toJSON();
    expect(json.groups.length).toBe(1);

    const restored = Document.fromJSON(json);
    expect(restored.groups.length).toBe(1);
    expect(restored.groups[0].atomIds.length).toBe(6);
  });
});
