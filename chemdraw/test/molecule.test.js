import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, removeAtom, removeBond,
  getAtomById, getBondById, getBondsForAtom,
  getNeighborAtoms, findAtomAtPoint, findBondAtPoint,
  generateRingPositions, cloneMolecule, isEmpty,
  cycleBondType, resetIdCounters,
} from '../src/model/Molecule.js';
import { BOND_TYPES } from '../src/util/constants.js';

describe('Molecule', () => {
  beforeEach(() => {
    resetIdCounters();
  });

  describe('createAtom', () => {
    it('creates a carbon atom by default', () => {
      const atom = createAtom();
      expect(atom.element).toBe('C');
      expect(atom.charge).toBe(0);
      expect(atom.id).toMatch(/^atom_/);
    });

    it('creates an atom with custom properties', () => {
      const atom = createAtom({ element: 'N', x: 100, y: 200, charge: -1 });
      expect(atom.element).toBe('N');
      expect(atom.x).toBe(100);
      expect(atom.y).toBe(200);
      expect(atom.charge).toBe(-1);
    });
  });

  describe('createBond', () => {
    it('creates a single bond by default', () => {
      const bond = createBond('atom_1', 'atom_2');
      expect(bond.type).toBe(BOND_TYPES.SINGLE);
      expect(bond.atomA).toBe('atom_1');
      expect(bond.atomB).toBe('atom_2');
    });

    it('creates a double bond', () => {
      const bond = createBond('atom_1', 'atom_2', { type: BOND_TYPES.DOUBLE });
      expect(bond.type).toBe(BOND_TYPES.DOUBLE);
    });
  });

  describe('addAtom / removeAtom', () => {
    it('adds and removes atoms', () => {
      const mol = createMolecule();
      const atom = createAtom({ x: 10, y: 20 });
      addAtom(mol, atom);
      expect(mol.atoms.length).toBe(1);
      expect(getAtomById(mol, atom.id)).toBe(atom);

      removeAtom(mol, atom.id);
      expect(mol.atoms.length).toBe(0);
    });

    it('removes connected bonds when removing an atom', () => {
      const mol = createMolecule();
      const a1 = createAtom({ x: 0, y: 0 });
      const a2 = createAtom({ x: 40, y: 0 });
      addAtom(mol, a1);
      addAtom(mol, a2);
      const bond = createBond(a1.id, a2.id);
      addBond(mol, bond);
      expect(mol.bonds.length).toBe(1);

      removeAtom(mol, a1.id);
      expect(mol.bonds.length).toBe(0);
      expect(mol.atoms.length).toBe(1);
    });
  });

  describe('addBond', () => {
    it('cycles bond type when duplicate bond is added', () => {
      const mol = createMolecule();
      const a1 = createAtom();
      const a2 = createAtom();
      addAtom(mol, a1);
      addAtom(mol, a2);

      const bond = createBond(a1.id, a2.id);
      addBond(mol, bond);
      expect(bond.type).toBe(BOND_TYPES.SINGLE);
      expect(mol.bonds.length).toBe(1);

      // Adding another bond between same atoms cycles
      const bond2 = createBond(a1.id, a2.id);
      addBond(mol, bond2);
      expect(bond.type).toBe(BOND_TYPES.DOUBLE);
      expect(mol.bonds.length).toBe(1); // still just one bond
    });
  });

  describe('getBondsForAtom', () => {
    it('returns all bonds connected to an atom', () => {
      const mol = createMolecule();
      const a1 = createAtom();
      const a2 = createAtom();
      const a3 = createAtom();
      addAtom(mol, a1);
      addAtom(mol, a2);
      addAtom(mol, a3);
      addBond(mol, createBond(a1.id, a2.id));
      addBond(mol, createBond(a1.id, a3.id));

      const bonds = getBondsForAtom(mol, a1.id);
      expect(bonds.length).toBe(2);
    });
  });

  describe('getNeighborAtoms', () => {
    it('returns neighboring atoms', () => {
      const mol = createMolecule();
      const a1 = createAtom();
      const a2 = createAtom();
      const a3 = createAtom();
      addAtom(mol, a1);
      addAtom(mol, a2);
      addAtom(mol, a3);
      addBond(mol, createBond(a1.id, a2.id));
      addBond(mol, createBond(a1.id, a3.id));

      const neighbors = getNeighborAtoms(mol, a1.id);
      expect(neighbors.length).toBe(2);
      expect(neighbors.map(n => n.id)).toContain(a2.id);
      expect(neighbors.map(n => n.id)).toContain(a3.id);
    });
  });

  describe('findAtomAtPoint', () => {
    it('finds the nearest atom within radius', () => {
      const mol = createMolecule();
      const a1 = createAtom({ x: 100, y: 100 });
      addAtom(mol, a1);

      expect(findAtomAtPoint(mol, { x: 103, y: 103 }, 8)).toBe(a1);
      expect(findAtomAtPoint(mol, { x: 200, y: 200 }, 8)).toBeNull();
    });
  });

  describe('findBondAtPoint', () => {
    it('finds a bond near a point', () => {
      const mol = createMolecule();
      const a1 = createAtom({ x: 0, y: 0 });
      const a2 = createAtom({ x: 40, y: 0 });
      addAtom(mol, a1);
      addAtom(mol, a2);
      const bond = createBond(a1.id, a2.id);
      addBond(mol, bond);

      expect(findBondAtPoint(mol, { x: 20, y: 2 }, 5)).toBe(bond);
      expect(findBondAtPoint(mol, { x: 20, y: 20 }, 5)).toBeNull();
    });
  });

  describe('generateRingPositions', () => {
    it('generates correct number of positions', () => {
      const positions = generateRingPositions(100, 100, 6, 40);
      expect(positions.length).toBe(6);
    });

    it('positions are roughly equidistant', () => {
      const positions = generateRingPositions(100, 100, 6, 40);
      for (let i = 0; i < positions.length; i++) {
        const next = positions[(i + 1) % positions.length];
        const dist = Math.sqrt(
          (next.x - positions[i].x) ** 2 + (next.y - positions[i].y) ** 2
        );
        expect(dist).toBeCloseTo(40, 0);
      }
    });
  });

  describe('cloneMolecule', () => {
    it('creates a deep copy with new IDs', () => {
      const mol = createMolecule();
      const a1 = createAtom({ x: 10, y: 20, element: 'N' });
      const a2 = createAtom({ x: 50, y: 20 });
      addAtom(mol, a1);
      addAtom(mol, a2);
      addBond(mol, createBond(a1.id, a2.id));

      const clone = cloneMolecule(mol);
      expect(clone.atoms.length).toBe(2);
      expect(clone.bonds.length).toBe(1);
      expect(clone.atoms[0].id).not.toBe(a1.id);
      expect(clone.atoms[0].element).toBe('N');
    });
  });

  describe('cycleBondType', () => {
    it('cycles single → double → triple → single', () => {
      const bond = createBond('a', 'b');
      expect(bond.type).toBe(BOND_TYPES.SINGLE);
      cycleBondType(bond);
      expect(bond.type).toBe(BOND_TYPES.DOUBLE);
      cycleBondType(bond);
      expect(bond.type).toBe(BOND_TYPES.TRIPLE);
      cycleBondType(bond);
      expect(bond.type).toBe(BOND_TYPES.SINGLE);
    });
  });

  describe('isEmpty', () => {
    it('returns true for empty molecule', () => {
      const mol = createMolecule();
      expect(isEmpty(mol)).toBe(true);
    });

    it('returns false for non-empty molecule', () => {
      const mol = createMolecule();
      addAtom(mol, createAtom());
      expect(isEmpty(mol)).toBe(false);
    });
  });
});
