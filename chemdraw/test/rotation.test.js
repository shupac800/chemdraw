import { describe, it, expect, beforeEach } from 'vitest';
import { Document } from '../src/model/Document.js';
import { Selection } from '../src/model/Selection.js';
import { SelectTool } from '../src/controller/tools/SelectTool.js';
import { SelectionOverlay } from '../src/view/SelectionOverlay.js';
import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, resetIdCounters,
  generateRingPositions,
} from '../src/model/Molecule.js';
import { rotatePoint } from '../src/util/geometry.js';
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

function setupTool(doc, selection) {
  const overlay = new SelectionOverlay(doc, selection);
  const tool = new SelectTool();
  tool.doc = doc;
  tool.selection = selection;
  tool.commandStack = null;
  tool.overlay = overlay;
  tool.cursor = null;
  tool.activate();
  return { tool, overlay };
}

describe('Rotation', () => {
  let doc, selection;

  beforeEach(() => {
    resetIdCounters();
    doc = new Document();
    selection = new Selection();
  });

  it('rotatePoint rotates 90 degrees correctly', () => {
    const center = { x: 0, y: 0 };
    const point = { x: 10, y: 0 };
    const rotated = rotatePoint(point, center, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(10, 5);
  });

  it('rotatePoint rotates 180 degrees correctly', () => {
    const center = { x: 5, y: 5 };
    const point = { x: 15, y: 5 };
    const rotated = rotatePoint(point, center, Math.PI);
    expect(rotated.x).toBeCloseTo(-5, 5);
    expect(rotated.y).toBeCloseTo(5, 5);
  });

  it('getSelectionBoundingBox returns null for fewer than 2 points', () => {
    const mol = makeHexagon(doc, 200, 200);
    selection.selectAtom(mol.atoms[0].id);
    expect(selection.getSelectionBoundingBox(doc)).toBeNull();
  });

  it('getSelectionBoundingBox returns correct bbox', () => {
    const mol = makeHexagon(doc, 200, 200);
    selection.selectMolecule(mol);
    const bbox = selection.getSelectionBoundingBox(doc);
    expect(bbox).not.toBeNull();
    expect(bbox.width).toBeGreaterThan(0);
    expect(bbox.height).toBeGreaterThan(0);
  });

  it('rotation handle appears when 2+ atoms selected', () => {
    const mol = makeHexagon(doc, 200, 200);
    const { tool, overlay } = setupTool(doc, selection);
    selection.selectMolecule(mol);
    // Selection change listener updates handle
    expect(overlay.rotationHandle).not.toBeNull();
    expect(overlay.rotationHandle.bbox).toBeDefined();
  });

  it('rotation handle disappears when selection cleared', () => {
    const mol = makeHexagon(doc, 200, 200);
    const { tool, overlay } = setupTool(doc, selection);
    selection.selectMolecule(mol);
    expect(overlay.rotationHandle).not.toBeNull();

    selection.clear();
    expect(overlay.rotationHandle).toBeNull();
  });

  it('hit test detects click on rotation handle', () => {
    const mol = makeHexagon(doc, 200, 200);
    const { tool, overlay } = setupTool(doc, selection);
    selection.selectMolecule(mol);

    const handlePos = overlay.getRotationHandlePos();
    expect(handlePos).not.toBeNull();
    expect(overlay.isPointOnRotationHandle(handlePos)).toBe(true);
    expect(overlay.isPointOnRotationHandle({ x: 0, y: 0 })).toBe(false);
  });

  it('dragging rotation handle rotates selected atoms', () => {
    const mol = createMolecule();
    const a1 = createAtom({ x: 100, y: 100 });
    const a2 = createAtom({ x: 200, y: 100 });
    addAtom(mol, a1);
    addAtom(mol, a2);
    addBond(mol, createBond(a1.id, a2.id));
    doc.addObject(mol);

    const { tool, overlay } = setupTool(doc, selection);
    selection.addAtom(a1.id);
    selection.addAtom(a2.id);

    const handlePos = overlay.getRotationHandlePos();
    expect(handlePos).not.toBeNull();

    const center = { x: 150, y: 100 }; // center of two atoms

    // Simulate mousedown on handle
    tool.onMouseDown(handlePos, {});
    expect(tool._mode).toBe('rotate');

    // Rotate ~90 degrees: drag to a point roughly 90 degrees from start
    // The handle is above center, so dragging right rotates clockwise
    const dragPoint = {
      x: center.x + 100,
      y: center.y,
    };
    tool.onMouseMove(dragPoint, {});

    // Atoms should have rotated
    const moved1 = mol.atoms.find(a => a.id === a1.id);
    const moved2 = mol.atoms.find(a => a.id === a2.id);
    // They shouldn't still be at their original positions
    const unchanged = (
      Math.abs(moved1.x - 100) < 1 && Math.abs(moved1.y - 100) < 1 &&
      Math.abs(moved2.x - 200) < 1 && Math.abs(moved2.y - 100) < 1
    );
    expect(unchanged).toBe(false);

    tool.onMouseUp(dragPoint, {});
  });

  it('cancel restores original positions during rotation', () => {
    const mol = createMolecule();
    const a1 = createAtom({ x: 100, y: 100 });
    const a2 = createAtom({ x: 200, y: 100 });
    addAtom(mol, a1);
    addAtom(mol, a2);
    addBond(mol, createBond(a1.id, a2.id));
    doc.addObject(mol);

    const { tool, overlay } = setupTool(doc, selection);
    selection.addAtom(a1.id);
    selection.addAtom(a2.id);

    const handlePos = overlay.getRotationHandlePos();
    tool.onMouseDown(handlePos, {});

    // Rotate
    tool.onMouseMove({ x: 300, y: 200 }, {});

    // Cancel
    const cancelled = tool.cancel();
    expect(cancelled).toBe(true);

    // Positions should be restored
    expect(a1.x).toBeCloseTo(100, 0);
    expect(a1.y).toBeCloseTo(100, 0);
    expect(a2.x).toBeCloseTo(200, 0);
    expect(a2.y).toBeCloseTo(100, 0);
  });

  it('shift-drag snaps to 15-degree increments', () => {
    const mol = createMolecule();
    const a1 = createAtom({ x: 100, y: 200 });
    const a2 = createAtom({ x: 200, y: 200 });
    addAtom(mol, a1);
    addAtom(mol, a2);
    addBond(mol, createBond(a1.id, a2.id));
    doc.addObject(mol);

    const { tool, overlay } = setupTool(doc, selection);
    selection.addAtom(a1.id);
    selection.addAtom(a2.id);

    const center = { x: 150, y: 200 };
    const handlePos = overlay.getRotationHandlePos();
    tool.onMouseDown(handlePos, {});

    // Drag to roughly 90 degrees with shift held
    tool.onMouseMove({ x: center.x + 80, y: center.y + 5 }, { shiftKey: true });

    // The snapped angle should produce positions aligned to 15-degree grid
    // With shift, the actual rotation should be a multiple of 15 degrees
    // The exact angle depends on the handle position, but positions should be clean
    tool.onMouseUp({ x: center.x + 80, y: center.y + 5 }, { shiftKey: true });

    // Verify the rotation happened (atoms moved from original horizontal line)
    const finalA1 = mol.atoms.find(a => a.id === a1.id);
    const finalA2 = mol.atoms.find(a => a.id === a2.id);

    // Calculate the actual angle of the rotated line
    const dx = finalA2.x - finalA1.x;
    const dy = finalA2.y - finalA1.y;
    const angle = Math.atan2(dy, dx);
    // Should be a multiple of 15 degrees (π/12)
    const snap = Math.PI / 12;
    const remainder = Math.abs(angle % snap);
    expect(remainder < 0.01 || Math.abs(remainder - snap) < 0.01).toBe(true);
  });
});
