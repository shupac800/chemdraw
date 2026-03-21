import { describe, it, expect, beforeEach } from 'vitest';
import {
  bondOrder, totalBondOrder, calcImplicitH,
  shouldShowLabel, buildAtomLabel,
  molecularFormula, molecularWeight,
} from '../src/util/chemistry.js';
import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, resetIdCounters,
} from '../src/model/Molecule.js';
import { BOND_TYPES } from '../src/util/constants.js';

describe('Chemistry', () => {
  beforeEach(() => {
    resetIdCounters();
  });

  describe('bondOrder', () => {
    it('returns correct order for each type', () => {
      expect(bondOrder(BOND_TYPES.SINGLE)).toBe(1);
      expect(bondOrder(BOND_TYPES.DOUBLE)).toBe(2);
      expect(bondOrder(BOND_TYPES.TRIPLE)).toBe(3);
    });
  });

  describe('calcImplicitH', () => {
    it('carbon with no bonds has 4 implicit H', () => {
      const mol = createMolecule();
      const atom = createAtom({ element: 'C' });
      addAtom(mol, atom);
      expect(calcImplicitH(mol, atom)).toBe(4);
    });

    it('carbon with one single bond has 3 implicit H', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C' });
      const a2 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id));
      expect(calcImplicitH(mol, a1)).toBe(3);
    });

    it('carbon with double bond has 2 implicit H', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C' });
      const a2 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id, { type: BOND_TYPES.DOUBLE }));
      expect(calcImplicitH(mol, a1)).toBe(2);
    });

    it('nitrogen with no bonds has 3 implicit H', () => {
      const mol = createMolecule();
      const atom = createAtom({ element: 'N' });
      addAtom(mol, atom);
      expect(calcImplicitH(mol, atom)).toBe(3);
    });

    it('oxygen with no bonds has 2 implicit H', () => {
      const mol = createMolecule();
      const atom = createAtom({ element: 'O' });
      addAtom(mol, atom);
      expect(calcImplicitH(mol, atom)).toBe(2);
    });

    it('chlorine with one bond has 0 implicit H', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'Cl' });
      const a2 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id));
      expect(calcImplicitH(mol, a1)).toBe(0);
    });
  });

  describe('shouldShowLabel', () => {
    it('always shows labels for heteroatoms', () => {
      const mol = createMolecule();
      const atom = createAtom({ element: 'N' });
      addAtom(mol, atom);
      expect(shouldShowLabel(mol, atom)).toBe(true);
    });

    it('hides label for internal carbon', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C' });
      const a2 = createAtom({ element: 'C' });
      const a3 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addAtom(mol, a3);
      addBond(mol, createBond(a1.id, a2.id));
      addBond(mol, createBond(a2.id, a3.id));
      expect(shouldShowLabel(mol, a2)).toBe(false); // internal C
    });

    it('shows label for terminal carbon with H', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C' });
      const a2 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id));
      expect(shouldShowLabel(mol, a1)).toBe(true); // terminal CH3
    });

    it('shows label for charged carbon', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C', charge: 1 });
      const a2 = createAtom({ element: 'C' });
      const a3 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addAtom(mol, a3);
      addBond(mol, createBond(a1.id, a2.id));
      addBond(mol, createBond(a1.id, a3.id));
      expect(shouldShowLabel(mol, a1)).toBe(true);
    });
  });

  describe('buildAtomLabel', () => {
    it('builds label for nitrogen with 2 H', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'N' });
      const a2 = createAtom({ element: 'C', x: -40 });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id));
      const label = buildAtomLabel(mol, a1);
      expect(label.text).toContain('N');
      expect(label.text).toContain('H');
    });

    it('builds label for abbreviation', () => {
      const mol = createMolecule();
      const atom = createAtom({ label: 'OMe' });
      addAtom(mol, atom);
      const label = buildAtomLabel(mol, atom);
      expect(label.text).toBe('OMe');
    });
  });

  describe('molecularFormula', () => {
    it('calculates formula for ethane (C2H6)', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C' });
      const a2 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id));
      expect(molecularFormula(mol)).toBe('C2H6');
    });

    it('calculates formula for ethene (C2H4)', () => {
      const mol = createMolecule();
      const a1 = createAtom({ element: 'C' });
      const a2 = createAtom({ element: 'C' });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id, { type: BOND_TYPES.DOUBLE }));
      expect(molecularFormula(mol)).toBe('C2H4');
    });

    it('calculates formula for methanol (CH4O)', () => {
      const mol = createMolecule();
      const c = createAtom({ element: 'C' });
      const o = createAtom({ element: 'O' });
      addAtom(mol, c);
      addAtom(mol, o);
      addBond(mol, createBond(c.id, o.id));
      expect(molecularFormula(mol)).toBe('CH4O');
    });

    it('follows Hill system (C first, H second, rest alphabetical)', () => {
      const mol = createMolecule();
      const c = createAtom({ element: 'C' });
      const n = createAtom({ element: 'N' });
      addAtom(mol, c);
      addAtom(mol, n);
      addBond(mol, createBond(c.id, n.id));
      const formula = molecularFormula(mol);
      // Should be CH5N (methylamine)
      expect(formula).toBe('CH5N');
    });
  });

  describe('molecularWeight', () => {
    it('calculates MW for methane', () => {
      const mol = createMolecule();
      addAtom(mol, createAtom({ element: 'C' }));
      const mw = molecularWeight(mol);
      // C=12.011, 4H=4.032 → 16.043
      expect(mw).toBeCloseTo(16.043, 2);
    });

    it('calculates MW for water', () => {
      const mol = createMolecule();
      addAtom(mol, createAtom({ element: 'O' }));
      const mw = molecularWeight(mol);
      // O=15.999, 2H=2.016 → 18.015
      expect(mw).toBeCloseTo(18.015, 2);
    });
  });
});
