import { BOND_TYPES, BOND_STEREO } from '../util/constants.js';

let nextAtomId = 1;
let nextBondId = 1;
let nextMolId = 1;

export function resetIdCounters(atomStart = 1, bondStart = 1, molStart = 1) {
  nextAtomId = atomStart;
  nextBondId = bondStart;
  nextMolId = molStart;
}

export function createAtom(props = {}) {
  return {
    id: `atom_${nextAtomId++}`,
    element: props.element || 'C',
    x: props.x || 0,
    y: props.y || 0,
    charge: props.charge || 0,
    isotope: props.isotope || null,
    radical: props.radical || 0,
    label: props.label || null,
    color: props.color || '#000000',
  };
}

export function createBond(atomA, atomB, props = {}) {
  return {
    id: `bond_${nextBondId++}`,
    atomA,
    atomB,
    type: props.type || BOND_TYPES.SINGLE,
    stereo: props.stereo || BOND_STEREO.NONE,
    color: props.color || '#000000',
  };
}

export function createMolecule(props = {}) {
  return {
    id: props.id || `mol_${nextMolId++}`,
    type: 'molecule',
    atoms: props.atoms || [],
    bonds: props.bonds || [],
  };
}

export function createArrow(props = {}) {
  return {
    id: props.id || `arrow_${nextMolId++}`,
    type: 'arrow',
    arrowType: props.arrowType || 'reaction',
    points: props.points || [],
    color: props.color || '#000000',
  };
}

export function createTextLabel(props = {}) {
  return {
    id: props.id || `text_${nextMolId++}`,
    type: 'text',
    x: props.x || 0,
    y: props.y || 0,
    text: props.text || '',
    fontSize: props.fontSize || 14,
    fontFamily: props.fontFamily || 'Arial, Helvetica, sans-serif',
    color: props.color || '#000000',
  };
}

// ─── Molecule operations ──────────────────────────────────────────

export function addAtom(molecule, atom) {
  molecule.atoms.push(atom);
  return atom;
}

export function addBond(molecule, bond) {
  // Check if bond already exists between these atoms
  const existing = molecule.bonds.find(
    b => (b.atomA === bond.atomA && b.atomB === bond.atomB) ||
         (b.atomA === bond.atomB && b.atomB === bond.atomA)
  );
  if (existing) {
    // Cycle bond type instead
    return cycleBondType(existing);
  }
  molecule.bonds.push(bond);
  return bond;
}

export function removeAtom(molecule, atomId) {
  // Remove all bonds connected to this atom
  molecule.bonds = molecule.bonds.filter(
    b => b.atomA !== atomId && b.atomB !== atomId
  );
  // Remove the atom
  const idx = molecule.atoms.findIndex(a => a.id === atomId);
  if (idx !== -1) {
    return molecule.atoms.splice(idx, 1)[0];
  }
  return null;
}

export function removeBond(molecule, bondId) {
  const idx = molecule.bonds.findIndex(b => b.id === bondId);
  if (idx !== -1) {
    return molecule.bonds.splice(idx, 1)[0];
  }
  return null;
}

export function getAtomById(molecule, atomId) {
  return molecule.atoms.find(a => a.id === atomId) || null;
}

export function getBondById(molecule, bondId) {
  return molecule.bonds.find(b => b.id === bondId) || null;
}

export function getBondsForAtom(molecule, atomId) {
  return molecule.bonds.filter(b => b.atomA === atomId || b.atomB === atomId);
}

export function getNeighborAtoms(molecule, atomId) {
  const neighbors = [];
  for (const bond of molecule.bonds) {
    if (bond.atomA === atomId) {
      const atom = getAtomById(molecule, bond.atomB);
      if (atom) neighbors.push(atom);
    } else if (bond.atomB === atomId) {
      const atom = getAtomById(molecule, bond.atomA);
      if (atom) neighbors.push(atom);
    }
  }
  return neighbors;
}

export function cycleBondType(bond) {
  switch (bond.type) {
    case BOND_TYPES.SINGLE:
      bond.type = BOND_TYPES.DOUBLE;
      bond.stereo = BOND_STEREO.NONE;
      break;
    case BOND_TYPES.DOUBLE:
      bond.type = BOND_TYPES.TRIPLE;
      break;
    case BOND_TYPES.TRIPLE:
      bond.type = BOND_TYPES.SINGLE;
      break;
  }
  return bond;
}

/**
 * Find the nearest atom to a point within a radius.
 */
export function findAtomAtPoint(molecule, point, radius) {
  let closest = null;
  let minDist = radius;
  for (const atom of molecule.atoms) {
    const dx = atom.x - point.x;
    const dy = atom.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = atom;
    }
  }
  return closest;
}

/**
 * Find the nearest bond to a point within a threshold.
 */
export function findBondAtPoint(molecule, point, threshold = 5) {
  let closest = null;
  let minDist = threshold;
  for (const bond of molecule.bonds) {
    const atomA = getAtomById(molecule, bond.atomA);
    const atomB = getAtomById(molecule, bond.atomB);
    if (!atomA || !atomB) continue;

    const dist = distanceToSegment(point, atomA, atomB);
    if (dist < minDist) {
      minDist = dist;
      closest = bond;
    }
  }
  return closest;
}

function distanceToSegment(point, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);

  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const px = p1.x + t * dx;
  const py = p1.y + t * dy;
  return Math.sqrt((point.x - px) ** 2 + (point.y - py) ** 2);
}

/**
 * Generate ring atom positions centered at (cx, cy).
 */
export function generateRingPositions(cx, cy, size, bondLength, startAngle = -Math.PI / 2) {
  const positions = [];
  const angleStep = (2 * Math.PI) / size;
  // Radius of circumscribed circle
  const radius = bondLength / (2 * Math.sin(Math.PI / size));

  for (let i = 0; i < size; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return positions;
}

/**
 * Clone a molecule (deep copy with new IDs).
 */
export function cloneMolecule(molecule) {
  const atomIdMap = {};
  const newAtoms = molecule.atoms.map(a => {
    const newAtom = createAtom({ ...a });
    atomIdMap[a.id] = newAtom.id;
    return newAtom;
  });

  const newBonds = molecule.bonds.map(b => {
    return createBond(atomIdMap[b.atomA], atomIdMap[b.atomB], {
      type: b.type,
      stereo: b.stereo,
      color: b.color,
    });
  });

  return createMolecule({ atoms: newAtoms, bonds: newBonds });
}

/**
 * Check if the molecule is empty (no atoms).
 */
export function isEmpty(molecule) {
  return molecule.atoms.length === 0;
}

/**
 * Get bounding box of a molecule.
 */
export function getMoleculeBounds(molecule) {
  if (molecule.atoms.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const atom of molecule.atoms) {
    if (atom.x < minX) minX = atom.x;
    if (atom.y < minY) minY = atom.y;
    if (atom.x > maxX) maxX = atom.x;
    if (atom.y > maxY) maxY = atom.y;
  }
  const padding = 20;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
