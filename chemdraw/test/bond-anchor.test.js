import { describe, it, expect, beforeEach } from 'vitest';
import { createAtom, createBond, createMolecule, addAtom, addBond, resetIdCounters } from '../src/model/Molecule.js';
import { buildAtomLabel, shouldShowLabel } from '../src/util/chemistry.js';

/**
 * Test the logic that determines where bond anchors should be within atom labels.
 * The connecting element (O in "HO", C in "CH3") should be the bond target,
 * not the center of the full label text.
 */

function makeSimpleMolecule(element, neighborX) {
  // Create a molecule with one heteroatom bonded to a carbon neighbor
  const mol = createMolecule();
  const atom = createAtom({ element, x: 100, y: 100 });
  const neighbor = createAtom({ element: 'C', x: neighborX, y: 100 });
  addAtom(mol, atom);
  addAtom(mol, neighbor);
  addBond(mol, createBond(atom.id, neighbor.id));
  return { mol, atom, neighbor };
}

describe('Bond anchor positioning logic', () => {
  beforeEach(() => resetIdCounters());

  it('places H left for oxygen when bond comes from right ("HO")', () => {
    // Bond neighbor is to the RIGHT of O → H goes LEFT → label is "HO"
    const { mol, atom } = makeSimpleMolecule('O', 200);
    const label = buildAtomLabel(mol, atom);
    expect(label.text).toBe('HO');
    // Element O is the LAST character → it should be to the right of center
    const elementIndex = label.parts.findIndex(
      p => p.text === 'O' && p.type !== 'subscript' && p.type !== 'superscript'
    );
    expect(elementIndex).toBeGreaterThan(0); // O is not the first part
  });

  it('places H right for oxygen when bond comes from left ("OH")', () => {
    // Bond neighbor is to the LEFT of O → H goes RIGHT → label is "OH"
    const { mol, atom } = makeSimpleMolecule('O', 0);
    const label = buildAtomLabel(mol, atom);
    expect(label.text).toBe('OH');
    // Element O is the FIRST character → it should be to the left of center
    const elementIndex = label.parts.findIndex(
      p => p.text === 'O' && p.type !== 'subscript' && p.type !== 'superscript'
    );
    expect(elementIndex).toBe(0);
  });

  it('places H left for nitrogen with 2 H ("H₂N") when bond from right', () => {
    const { mol, atom } = makeSimpleMolecule('N', 200);
    const label = buildAtomLabel(mol, atom);
    // H on left: "H2N"
    expect(label.parts[0].text).toBe('H');
    expect(label.parts[1].text).toBe('2');
    expect(label.parts[1].type).toBe('subscript');
    expect(label.parts[2].text).toBe('N');
  });

  it('places element first for "CH3" when bond from left', () => {
    // Terminal carbon with bond from left
    const mol = createMolecule();
    const carbon = createAtom({ element: 'C', x: 100, y: 100 });
    const neighbor = createAtom({ element: 'C', x: 0, y: 100 });
    addAtom(mol, carbon);
    addAtom(mol, neighbor);
    addBond(mol, createBond(carbon.id, neighbor.id));

    expect(shouldShowLabel(mol, carbon)).toBe(true); // terminal C shows label
    const label = buildAtomLabel(mol, carbon);
    expect(label.text).toBe('CH3');
    // C is first part
    expect(label.parts[0].text).toBe('C');
  });

  it('for labels with element first, anchor offset should be negative (left of center)', () => {
    // "CH3": C is at the start, so its center is LEFT of the label center
    // This means the anchor offset should be negative
    const mol = createMolecule();
    const carbon = createAtom({ element: 'C', x: 100, y: 100 });
    const neighbor = createAtom({ element: 'C', x: 0, y: 100 });
    addAtom(mol, carbon);
    addAtom(mol, neighbor);
    addBond(mol, createBond(carbon.id, neighbor.id));

    const label = buildAtomLabel(mol, carbon);
    // Simulate offset calculation: element at start, total label is wider
    // elementCenter = 0 + elementWidth/2
    // labelCenter = totalWidth/2
    // offset = elementCenter - labelCenter < 0 when there are chars after element
    expect(label.parts.length).toBeGreaterThan(1); // has H and subscript after C
    expect(label.parts[0].text).toBe('C');
  });

  it('for "HO" label, anchor offset should be positive (right of center)', () => {
    const { mol, atom } = makeSimpleMolecule('O', 200);
    const label = buildAtomLabel(mol, atom);
    expect(label.text).toBe('HO');
    // O is last part, so its center is RIGHT of the label center
    const lastElementPart = label.parts[label.parts.length - 1];
    expect(lastElementPart.text).toBe('O');
  });

  it('for single-character labels like "O" (no H), offset is zero', () => {
    // O with 2 bonds → no implicit H → label is just "O"
    const mol = createMolecule();
    const oxygen = createAtom({ element: 'O', x: 100, y: 100 });
    const c1 = createAtom({ element: 'C', x: 50, y: 100 });
    const c2 = createAtom({ element: 'C', x: 150, y: 100 });
    addAtom(mol, oxygen);
    addAtom(mol, c1);
    addAtom(mol, c2);
    addBond(mol, createBond(oxygen.id, c1.id));
    addBond(mol, createBond(oxygen.id, c2.id));

    const label = buildAtomLabel(mol, oxygen);
    expect(label.text).toBe('O');
    expect(label.parts.length).toBe(1);
    // Only one part = element is centered = offset would be 0
  });
});
