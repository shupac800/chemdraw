import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAtom, createBond, createMolecule, resetIdCounters,
  generateRingPositions, addAtom, addBond,
} from '../src/model/Molecule.js';
import { Document } from '../src/model/Document.js';
import { Selection } from '../src/model/Selection.js';
import { SelectTool } from '../src/controller/tools/SelectTool.js';
import { BOND_LENGTH, SNAP_RADIUS } from '../src/util/constants.js';

/**
 * Helper: create a cyclohexane molecule centered at (cx, cy).
 */
function makeHexagon(cx, cy) {
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
  return mol;
}

/**
 * Simulate a drag of selected atoms by (dx, dy) using the SelectTool,
 * triggering merge logic on mouse-up.
 */
function simulateDrag(tool, startAtomPoint, dx, dy) {
  tool.onMouseDown(startAtomPoint, {});
  const endPoint = { x: startAtomPoint.x + dx, y: startAtomPoint.y + dy };
  tool.onMouseMove(endPoint);
  tool.onMouseUp(endPoint, {});
}

describe('Atom merge on drag', () => {
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

  it('merges overlapping atoms when two hexagons are dragged together', () => {
    // Create two hexagons side by side
    const hex1 = makeHexagon(200, 200);
    const hex2 = makeHexagon(300, 200);
    doc.addObject(hex1);
    doc.addObject(hex2);

    expect(doc.getMolecules().length).toBe(2);
    const totalAtomsBefore = hex1.atoms.length + hex2.atoms.length;
    expect(totalAtomsBefore).toBe(12);

    // Select all atoms of hex2
    selection.selectMolecule(hex2);

    // Calculate how far to drag hex2 so its left edge overlaps hex1's right edge.
    // hex1 rightmost atoms are at roughly cx + radius for a hexagon.
    // We need 2 atoms of hex2 to land within SNAP_RADIUS of 2 atoms of hex1.
    // For a regular hexagon with BOND_LENGTH=40, radius ≈ 40.
    // hex1 right side atoms: ~(200+40, 200±~20) -> (240, 180) and (240, 220)
    // hex2 left side atoms:  ~(300-40, 200±~20) -> (260, 180) and (260, 220)
    // We need to move hex2 left by ~20 to overlap (260-20=240).
    // Let's compute precisely.
    const hex1RightTop = hex1.atoms[1]; // 2nd atom (top-right)
    const hex2LeftTop = hex2.atoms[5];  // 6th atom (top-left)

    // Move hex2 so that hex2LeftTop lands on hex1RightTop
    const dx = hex1RightTop.x - hex2LeftTop.x;
    const dy = hex1RightTop.y - hex2LeftTop.y;

    // Simulate: click on first atom of hex2, drag by (dx, dy)
    const clickPoint = { x: hex2.atoms[0].x, y: hex2.atoms[0].y };
    simulateDrag(tool, clickPoint, dx, dy);

    // After merge: should have 1 molecule with 10 atoms (shared edge = 2 merged atoms)
    const mols = doc.getMolecules();
    expect(mols.length).toBe(1);
    expect(mols[0].atoms.length).toBe(10);
    // Should have 11 bonds (6 + 6 - 1 shared edge bond)
    expect(mols[0].bonds.length).toBe(11);
  });

  it('does not merge atoms that are far apart', () => {
    const hex1 = makeHexagon(200, 200);
    const hex2 = makeHexagon(400, 200); // far away
    doc.addObject(hex1);
    doc.addObject(hex2);

    selection.selectMolecule(hex2);

    // Drag hex2 by a small amount that doesn't bring it close to hex1
    const clickPoint = { x: hex2.atoms[0].x, y: hex2.atoms[0].y };
    simulateDrag(tool, clickPoint, 5, 0);

    expect(doc.getMolecules().length).toBe(2);
    expect(hex1.atoms.length).toBe(6);
    // hex2 is now in the other molecule, check it still has 6 atoms
    const mol2 = doc.findMoleculeByAtomId(hex2.atoms[0].id);
    expect(mol2.atoms.length).toBe(6);
  });

  it('merges a single overlapping atom (spiro junction)', () => {
    const hex1 = makeHexagon(200, 200);
    const hex2 = makeHexagon(300, 200);
    doc.addObject(hex1);
    doc.addObject(hex2);

    selection.selectMolecule(hex2);

    // Move hex2 so only ONE atom overlaps with hex1 (a spiro center)
    // Find the rightmost atom of hex1 and leftmost of hex2
    const hex1Right = hex1.atoms.reduce((a, b) => a.x > b.x ? a : b);
    const hex2Left = hex2.atoms.reduce((a, b) => a.x < b.x ? a : b);

    const dx = hex1Right.x - hex2Left.x;
    const dy = hex1Right.y - hex2Left.y;

    const clickPoint = { x: hex2.atoms[0].x, y: hex2.atoms[0].y };
    simulateDrag(tool, clickPoint, dx, dy);

    const mols = doc.getMolecules();
    expect(mols.length).toBe(1);
    // Spiro = 12 - 1 shared atom = 11 atoms
    expect(mols[0].atoms.length).toBe(11);
    // 12 bonds total, no shared bond in spiro
    expect(mols[0].bonds.length).toBe(12);
  });

  it('preserves bond integrity after merge', () => {
    const hex1 = makeHexagon(200, 200);
    const hex2 = makeHexagon(300, 200);
    doc.addObject(hex1);
    doc.addObject(hex2);

    selection.selectMolecule(hex2);

    // Overlap two atoms (fused ring)
    const hex1RightTop = hex1.atoms[1];
    const hex2LeftTop = hex2.atoms[5];
    const dx = hex1RightTop.x - hex2LeftTop.x;
    const dy = hex1RightTop.y - hex2LeftTop.y;

    const clickPoint = { x: hex2.atoms[0].x, y: hex2.atoms[0].y };
    simulateDrag(tool, clickPoint, dx, dy);

    const mol = doc.getMolecules()[0];

    // Every bond should reference atoms that exist in the molecule
    const atomIds = new Set(mol.atoms.map(a => a.id));
    for (const bond of mol.bonds) {
      expect(atomIds.has(bond.atomA)).toBe(true);
      expect(atomIds.has(bond.atomB)).toBe(true);
    }

    // No self-loops
    for (const bond of mol.bonds) {
      expect(bond.atomA).not.toBe(bond.atomB);
    }
  });
});
