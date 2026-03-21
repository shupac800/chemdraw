import { ELEMENTS, getDefaultValence, getAtomicMass, ABBREVIATIONS } from '../model/elements.js';
import { BOND_TYPES } from './constants.js';

/**
 * Calculate the bond order for a bond type.
 */
export function bondOrder(type) {
  switch (type) {
    case BOND_TYPES.SINGLE: return 1;
    case BOND_TYPES.DOUBLE: return 2;
    case BOND_TYPES.TRIPLE: return 3;
    default: return 1;
  }
}

/**
 * Calculate the total bond order for an atom in a molecule.
 */
export function totalBondOrder(molecule, atomId) {
  let total = 0;
  for (const bond of molecule.bonds) {
    if (bond.atomA === atomId || bond.atomB === atomId) {
      total += bondOrder(bond.type);
    }
  }
  return total;
}

/**
 * Calculate the number of implicit hydrogens for an atom.
 */
export function calcImplicitH(molecule, atom) {
  if (atom.label) return 0; // abbreviated groups handle their own H
  const valence = getDefaultValence(atom.element);
  const bonded = totalBondOrder(molecule, atom.id);
  const charge = atom.charge || 0;

  // Adjust valence for charge
  let adjustedValence = valence;
  if (atom.element === 'C' || atom.element === 'Si') {
    adjustedValence = valence - Math.abs(charge);
  } else if (atom.element === 'N' || atom.element === 'P') {
    // N can be 3 or 5; with + charge, use 4
    if (charge === 1) adjustedValence = 4;
    else if (charge === -1) adjustedValence = 2;
    else adjustedValence = valence;
  } else if (atom.element === 'O' || atom.element === 'S') {
    if (charge === 1) adjustedValence = 3;
    else if (charge === -1) adjustedValence = 1;
    else adjustedValence = valence;
  } else {
    adjustedValence = valence - charge;
  }

  return Math.max(0, adjustedValence - bonded);
}

/**
 * Determine if an atom label should be visible.
 * In skeletal formulas:
 * - Carbon is invisible unless it's terminal with H, charged, or has a radical
 * - Heteroatoms always show labels
 */
export function shouldShowLabel(molecule, atom) {
  if (atom.label) return true;
  if (atom.element !== 'C') return true;
  if (atom.charge !== 0) return true;
  if (atom.radical > 0) return true;

  // Terminal carbon with implicit H
  const bondCount = molecule.bonds.filter(
    b => b.atomA === atom.id || b.atomB === atom.id
  ).length;
  if (bondCount === 0) return true;

  // Show CH3, CH2 etc. for terminal carbons
  const implicitH = calcImplicitH(molecule, atom);
  if (bondCount <= 1 && implicitH > 0) return true;

  return false;
}

/**
 * Build the display label for an atom (e.g., "NH2", "OH", "CH3").
 */
export function buildAtomLabel(molecule, atom) {
  if (atom.label) return { text: atom.label, parts: [{ text: atom.label }] };

  const implicitH = calcImplicitH(molecule, atom);
  const parts = [];

  // Determine if H should go on the left (e.g., HO-, H2N-)
  const hOnLeft = shouldPlaceHLeft(molecule, atom);

  if (hOnLeft && implicitH > 0) {
    parts.push({ text: 'H', type: 'element' });
    if (implicitH > 1) parts.push({ text: String(implicitH), type: 'subscript' });
    parts.push({ text: atom.element, type: 'element' });
  } else {
    parts.push({ text: atom.element, type: 'element' });
    if (implicitH > 0) {
      parts.push({ text: 'H', type: 'element' });
      if (implicitH > 1) parts.push({ text: String(implicitH), type: 'subscript' });
    }
  }

  // Charge
  if (atom.charge !== 0) {
    let chargeStr = '';
    const absCharge = Math.abs(atom.charge);
    if (absCharge > 1) chargeStr += absCharge;
    chargeStr += atom.charge > 0 ? '+' : '\u2212';
    parts.push({ text: chargeStr, type: 'superscript' });
  }

  const text = parts.map(p => p.text).join('');
  return { text, parts };
}

/**
 * Determine if H atoms should be placed to the left of the element symbol.
 * This happens when bonds come from the right side.
 */
function shouldPlaceHLeft(molecule, atom) {
  const bonds = molecule.bonds.filter(b => b.atomA === atom.id || b.atomB === atom.id);
  if (bonds.length === 0) return false;

  // Average angle of bonds from this atom
  let sumCos = 0;
  for (const bond of bonds) {
    const otherId = bond.atomA === atom.id ? bond.atomB : bond.atomA;
    const other = molecule.atoms.find(a => a.id === otherId);
    if (!other) continue;
    const dx = other.x - atom.x;
    sumCos += Math.sign(dx);
  }

  // If bonds predominantly go right, put H on the left
  return sumCos > 0;
}

/**
 * Calculate molecular formula in Hill system order.
 * C first, H second, then alphabetical.
 */
export function molecularFormula(molecule) {
  const counts = {};

  for (const atom of molecule.atoms) {
    if (atom.label && ABBREVIATIONS[atom.label]) {
      // Parse abbreviated group formula
      const abbr = ABBREVIATIONS[atom.label];
      const parsed = parseFormulaString(abbr.formula);
      for (const [el, cnt] of Object.entries(parsed)) {
        counts[el] = (counts[el] || 0) + cnt;
      }
      continue;
    }

    const el = atom.element;
    counts[el] = (counts[el] || 0) + 1;

    // Add implicit hydrogens
    const implicitH = calcImplicitH(molecule, atom);
    if (implicitH > 0) {
      counts['H'] = (counts['H'] || 0) + implicitH;
    }
  }

  // Hill system: C first, H second, rest alphabetical
  const parts = [];
  if (counts['C']) {
    parts.push('C' + (counts['C'] > 1 ? counts['C'] : ''));
    delete counts['C'];
  }
  if (counts['H']) {
    parts.push('H' + (counts['H'] > 1 ? counts['H'] : ''));
    delete counts['H'];
  }
  const remaining = Object.keys(counts).sort();
  for (const el of remaining) {
    parts.push(el + (counts[el] > 1 ? counts[el] : ''));
  }

  return parts.join('');
}

/**
 * Calculate molecular weight.
 */
export function molecularWeight(molecule) {
  let mw = 0;

  for (const atom of molecule.atoms) {
    if (atom.label && ABBREVIATIONS[atom.label]) {
      mw += ABBREVIATIONS[atom.label].mass;
      continue;
    }

    mw += getAtomicMass(atom.element);

    const implicitH = calcImplicitH(molecule, atom);
    mw += implicitH * getAtomicMass('H');
  }

  return Math.round(mw * 1000) / 1000;
}

/**
 * Parse a simple formula string like "C2H5" into { C: 2, H: 5 }.
 */
function parseFormulaString(formula) {
  const counts = {};
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    if (!match[1]) continue;
    const el = match[1];
    const cnt = match[2] ? parseInt(match[2]) : 1;
    counts[el] = (counts[el] || 0) + cnt;
  }
  return counts;
}
