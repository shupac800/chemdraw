import { describe, it, expect, beforeEach } from 'vitest';
import { Document } from '../src/model/Document.js';
import { Selection } from '../src/model/Selection.js';
import { CommandStack } from '../src/commands/CommandStack.js';
import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, resetIdCounters,
} from '../src/model/Molecule.js';

function makeMol(x, y) {
  const mol = createMolecule();
  const a = createAtom({ x, y });
  addAtom(mol, a);
  return mol;
}

describe('Undo/Redo (snapshot-based)', () => {
  let doc, selection, stack;

  beforeEach(() => {
    resetIdCounters();
    doc = new Document();
    selection = new Selection();
    stack = new CommandStack();
    stack.bind(doc, selection);
  });

  it('starts with initial snapshot and cannot undo', () => {
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it('captures snapshot on change event', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    expect(stack.canUndo).toBe(true);
    expect(doc.getMolecules().length).toBe(1);
  });

  it('undoes an add operation', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    expect(doc.getMolecules().length).toBe(1);

    stack.undo();
    expect(doc.getMolecules().length).toBe(0);
    expect(stack.canUndo).toBe(false);
  });

  it('redoes after undo', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    stack.undo();
    expect(doc.getMolecules().length).toBe(0);

    stack.redo();
    expect(doc.getMolecules().length).toBe(1);
  });

  it('handles multiple undo steps', () => {
    // Step 1: add molecule
    const mol1 = makeMol(100, 100);
    doc.addObject(mol1);
    doc._notify('change');

    // Step 2: add another molecule
    const mol2 = makeMol(200, 200);
    doc.addObject(mol2);
    doc._notify('change');

    // Step 3: add a third
    const mol3 = makeMol(300, 300);
    doc.addObject(mol3);
    doc._notify('change');

    expect(doc.getMolecules().length).toBe(3);

    stack.undo(); // back to 2 molecules
    expect(doc.getMolecules().length).toBe(2);

    stack.undo(); // back to 1 molecule
    expect(doc.getMolecules().length).toBe(1);

    stack.undo(); // back to empty
    expect(doc.getMolecules().length).toBe(0);

    expect(stack.canUndo).toBe(false);
  });

  it('discards redo history when new change occurs after undo', () => {
    const mol1 = makeMol(100, 100);
    doc.addObject(mol1);
    doc._notify('change');

    const mol2 = makeMol(200, 200);
    doc.addObject(mol2);
    doc._notify('change');

    stack.undo(); // back to 1 molecule
    expect(doc.getMolecules().length).toBe(1);
    expect(stack.canRedo).toBe(true);

    // New change should discard redo
    const mol3 = makeMol(300, 300);
    doc.addObject(mol3);
    doc._notify('change');

    expect(stack.canRedo).toBe(false);
    expect(doc.getMolecules().length).toBe(2);
  });

  it('clears selection on undo', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    selection.addAtom(mol.atoms[0].id);
    expect(selection.isEmpty).toBe(false);

    stack.undo();
    expect(selection.isEmpty).toBe(true);
  });

  it('does not save duplicate snapshots during restore', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    // Undo triggers _notify('change') internally, but _restoring flag
    // prevents a new snapshot from being saved
    stack.undo();
    expect(doc.getMolecules().length).toBe(0);

    // If duplicate snapshots were saved, this redo would fail
    stack.redo();
    expect(doc.getMolecules().length).toBe(1);
  });

  it('does not snapshot on move or preview events', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    // Simulate many move events (like dragging)
    doc._notify('move');
    doc._notify('move');
    doc._notify('move');
    doc._notify('preview');

    // Should only have 2 snapshots: initial + add
    stack.undo();
    expect(doc.getMolecules().length).toBe(0);
    expect(stack.canUndo).toBe(false);
  });

  it('undoes atom modifications (element change)', () => {
    const mol = createMolecule();
    const atom = createAtom({ element: 'C', x: 100, y: 100 });
    addAtom(mol, atom);
    doc.addObject(mol);
    doc._notify('change');

    // Change element
    doc.getMolecules()[0].atoms[0].element = 'O';
    doc._notify('change');

    expect(doc.getMolecules()[0].atoms[0].element).toBe('O');

    stack.undo();
    expect(doc.getMolecules()[0].atoms[0].element).toBe('C');
  });

  it('undoes bond additions within a molecule', () => {
    const mol = createMolecule();
    const a1 = createAtom({ x: 100, y: 100 });
    const a2 = createAtom({ x: 140, y: 100 });
    addAtom(mol, a1);
    addAtom(mol, a2);
    doc.addObject(mol);
    doc._notify('change');

    // Add bond
    addBond(mol, createBond(a1.id, a2.id));
    doc._notify('change');

    expect(doc.getMolecules()[0].bonds.length).toBe(1);

    stack.undo();
    expect(doc.getMolecules()[0].bonds.length).toBe(0);
  });

  it('clear() resets history to current state', () => {
    const mol = makeMol(100, 100);
    doc.addObject(mol);
    doc._notify('change');

    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(doc.getMolecules().length).toBe(1); // document unchanged
  });
});
