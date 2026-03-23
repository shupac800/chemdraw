import { describe, it, expect, beforeEach } from 'vitest';
import { resetIdCounters, generateRingPositions } from '../src/model/Molecule.js';
import { Document } from '../src/model/Document.js';
import { Selection } from '../src/model/Selection.js';
import { RingTool } from '../src/controller/tools/RingTool.js';
import { BOND_LENGTH } from '../src/util/constants.js';

describe('Ring rotation (R key)', () => {
  let doc, selection, tool;

  beforeEach(() => {
    resetIdCounters();
    doc = new Document();
    selection = new Selection();
    tool = new RingTool();
    tool.doc = doc;
    tool.selection = selection;
    tool.commandStack = null;
    tool.overlay = { previewRing: null };
    tool.cursor = null;
  });

  it('starts with default rotation (vertex at top)', () => {
    expect(tool._rotationStep).toBe(0);
    expect(tool._getStartAngle()).toBeCloseTo(-Math.PI / 2);
  });

  it('rotates by π/ringSize per step', () => {
    tool.ringSize = 6;
    // Simulate pressing R
    tool._rotationStep = 1;
    // For hexagon: step = π/6 = 30°
    expect(tool._getStartAngle()).toBeCloseTo(-Math.PI / 2 + Math.PI / 6);
  });

  it('cycles through 2*ringSize orientations for hexagon', () => {
    tool.ringSize = 6;
    const orientations = 2 * tool.ringSize; // 12
    const startAngle = tool._getStartAngle();

    // After 12 rotations, should be back to original
    tool._rotationStep = orientations;
    expect(tool._getStartAngle()).toBeCloseTo(startAngle + 2 * Math.PI);

    // The ring positions should be the same (mod 2π)
    const pos0 = generateRingPositions(100, 100, 6, BOND_LENGTH, startAngle);
    const pos12 = generateRingPositions(100, 100, 6, BOND_LENGTH, tool._getStartAngle());
    for (let i = 0; i < 6; i++) {
      expect(pos12[i].x).toBeCloseTo(pos0[i].x, 5);
      expect(pos12[i].y).toBeCloseTo(pos0[i].y, 5);
    }
  });

  it('produces edge-up orientation for hexagon after 1 step', () => {
    tool.ringSize = 6;
    tool._rotationStep = 1;

    // Default hexagon has a vertex at top (min y). After 1 step (30°),
    // two vertices should share the topmost y (flat edge on top).
    const positions = generateRingPositions(100, 100, 6, BOND_LENGTH, tool._getStartAngle());
    const ys = positions.map(p => p.y).sort((a, b) => a - b);
    // The two topmost points should have the same y
    expect(ys[0]).toBeCloseTo(ys[1], 5);
  });

  it('produces edge-up orientation for pentagon after 1 step', () => {
    tool.ringSize = 5;
    tool._rotationStep = 1;

    const positions = generateRingPositions(100, 100, 5, BOND_LENGTH, tool._getStartAngle());
    const ys = positions.map(p => p.y).sort((a, b) => a - b);
    // After 1 step (36°), the two topmost points should share the same y
    expect(ys[0]).toBeCloseTo(ys[1], 5);
  });

  it('updates preview ring when R is pressed', () => {
    tool.activate();
    // Simulate mouse position
    tool._lastMousePos = { x: 200, y: 200 };

    // Press R
    const event = { key: 'r', preventDefault: () => {}, stopImmediatePropagation: () => {} };
    tool.onKeyDown(event);

    expect(tool._rotationStep).toBe(1);
    expect(tool.overlay.previewRing).not.toBeNull();
    expect(tool.overlay.previewRing.length).toBe(6);
  });

  it('places ring with current rotation', () => {
    tool._rotationStep = 1;
    tool.onMouseDown({ x: 200, y: 200 });

    const mols = doc.getMolecules();
    expect(mols.length).toBe(1);
    expect(mols[0].atoms.length).toBe(6);

    // Verify the ring is rotated: with step=1, top edge should be flat
    const ys = mols[0].atoms.map(a => a.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(ys[1], 5);
  });

  it('resets rotation on activate', () => {
    tool._rotationStep = 3;
    tool.activate();
    expect(tool._rotationStep).toBe(0);
  });

  it('fuses rings by overlapping placement (no bond click needed)', () => {
    // Place a hexagon at (200, 200)
    tool.ringSize = 6;
    tool.onMouseDown({ x: 200, y: 200 });

    const mol1 = doc.getMolecules()[0];
    expect(mol1.atoms.length).toBe(6);

    // Find the rightmost two atoms (the right edge of the hexagon)
    const sorted = [...mol1.atoms].sort((a, b) => b.x - a.x);
    const rightTop = sorted[0]; // top-right vertex
    const rightBot = sorted[1]; // bottom-right vertex

    // Place a second hexagon centered so its left edge overlaps with the right edge
    // of the first hexagon. The second ring's center should be at
    // roughly rightTop.x + radius*cos(π/6) horizontally from the first.
    const radius = BOND_LENGTH / (2 * Math.sin(Math.PI / 6)); // = BOND_LENGTH
    const edgeMidX = (rightTop.x + rightBot.x) / 2;
    const edgeMidY = (rightTop.y + rightBot.y) / 2;
    // New center is one "apothem" distance to the right of the edge midpoint
    const apothem = radius * Math.cos(Math.PI / 6);
    const newCx = edgeMidX + apothem;
    const newCy = edgeMidY;

    tool.onMouseDown({ x: newCx, y: newCy });

    // Should have fused into 1 molecule with 10 atoms (shared 2) and 11 bonds (shared 1)
    const mols = doc.getMolecules();
    expect(mols.length).toBe(1);
    expect(mols[0].atoms.length).toBe(10);
    expect(mols[0].bonds.length).toBe(11);

    // All bonds reference valid atoms
    const atomIds = new Set(mols[0].atoms.map(a => a.id));
    for (const b of mols[0].bonds) {
      expect(atomIds.has(b.atomA)).toBe(true);
      expect(atomIds.has(b.atomB)).toBe(true);
    }
  });

  it('fuses rotated pentagons by overlapping placement', () => {
    // Place pentagon 1 (default: vertex at top)
    tool.ringSize = 5;
    tool._rotationStep = 0;
    tool.onMouseDown({ x: 200, y: 200 });

    const mol1 = doc.getMolecules()[0];
    expect(mol1.atoms.length).toBe(5);

    // Find bottom edge atoms
    const sorted = [...mol1.atoms].sort((a, b) => b.y - a.y);
    const botLeft = sorted.find(a => a.x < 200);
    const botRight = sorted.find(a => a.x > 200);

    // Rotate the second pentagon so it has a flat edge on top (1 step)
    tool._rotationStep = 1;

    // Place it centered below the bottom edge of pentagon 1
    const edgeMidX = (botLeft.x + botRight.x) / 2;
    const edgeMidY = (botLeft.y + botRight.y) / 2;
    const radius = BOND_LENGTH / (2 * Math.sin(Math.PI / 5));
    const apothem = radius * Math.cos(Math.PI / 5);
    const newCy = edgeMidY + apothem;

    tool.onMouseDown({ x: edgeMidX, y: newCy });

    // Should be 1 molecule (fused)
    const mols = doc.getMolecules();
    expect(mols.length).toBe(1);
    // 5 + 5 - 2 shared = 8 atoms
    expect(mols[0].atoms.length).toBe(8);
  });

  it('fusing onto bond produces a valid fused ring', () => {
    // Place first pentagon
    tool.ringSize = 5;
    tool.onMouseDown({ x: 200, y: 200 });

    const mol = doc.getMolecules()[0];
    expect(mol.atoms.length).toBe(5);
    expect(mol.bonds.length).toBe(5);

    // Fuse a second pentagon onto the first bond
    const bond = mol.bonds[0];
    tool._fuseRingOntoBond(bond);

    // Should have gained new atoms and bonds (exact count depends on SNAP_RADIUS overlaps)
    expect(mol.atoms.length).toBeGreaterThanOrEqual(7);
    expect(mol.atoms.length).toBeLessThanOrEqual(8);
    expect(mol.bonds.length).toBeGreaterThanOrEqual(8);

    // All bonds should reference valid atoms
    const atomIds = new Set(mol.atoms.map(a => a.id));
    for (const b of mol.bonds) {
      expect(atomIds.has(b.atomA)).toBe(true);
      expect(atomIds.has(b.atomB)).toBe(true);
    }
  });
});
