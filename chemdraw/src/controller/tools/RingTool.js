import {
  createAtom, createBond, createMolecule,
  addAtom, addBond, generateRingPositions,
  findAtomAtPoint, getAtomById,
} from '../../model/Molecule.js';
import {
  BOND_LENGTH, SNAP_RADIUS, BOND_TYPES, BOND_STEREO, RING_SIZES,
} from '../../util/constants.js';

export class RingTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this.ringSize = 6; // default cyclohexane
    this.aromatic = false; // benzene mode
  }

  activate() { this.cursor?.setCrosshair(); }
  deactivate() {
    if (this.overlay) this.overlay.previewRing = null;
  }

  setRingType(sizeOrType) {
    if (sizeOrType === RING_SIZES.BENZENE || sizeOrType === 'benzene') {
      this.ringSize = 6;
      this.aromatic = true;
    } else {
      this.ringSize = sizeOrType;
      this.aromatic = false;
    }
  }

  onMouseDown(point) {
    this.selection.clear();

    // Check if clicking on a bond (fuse ring onto it)
    const bond = this.doc.findBondAtPoint(point, 8);
    if (bond) {
      this._fuseRingOntoBond(bond);
      return;
    }

    // Check if clicking on an atom (attach ring at atom)
    const atom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (atom) {
      this._placeRingAtAtom(atom);
      return;
    }

    // Place ring at empty space
    this._placeRingAt(point.x, point.y);
  }

  onMouseMove(point) {
    // Show ring preview
    const positions = generateRingPositions(
      point.x, point.y, this.ringSize, BOND_LENGTH
    );
    if (this.overlay) {
      this.overlay.previewRing = positions;
    }
    this.doc._notify('preview');
  }

  onMouseUp() {
    if (this.overlay) this.overlay.previewRing = null;
  }

  _placeRingAt(cx, cy) {
    const positions = generateRingPositions(cx, cy, this.ringSize, BOND_LENGTH);
    const molecule = createMolecule();

    const atoms = positions.map(pos => {
      const atom = createAtom({ x: pos.x, y: pos.y });
      addAtom(molecule, atom);
      return atom;
    });

    // Create bonds around the ring
    for (let i = 0; i < atoms.length; i++) {
      const next = (i + 1) % atoms.length;
      const isDouble = this.aromatic && (i % 2 === 0);
      const bond = createBond(atoms[i].id, atoms[next].id, {
        type: isDouble ? BOND_TYPES.DOUBLE : BOND_TYPES.SINGLE,
      });
      addBond(molecule, bond);
    }

    this.doc.addObject(molecule);
    this.doc._notify('change');
  }

  _placeRingAtAtom(existingAtom) {
    const mol = this.doc.findMoleculeByAtomId(existingAtom.id);
    if (!mol) return;

    // Generate ring positions centered near the atom
    // Place the first atom of the ring at the existing atom position
    const angle = this._getBestAttachAngle(mol, existingAtom);
    const positions = generateRingPositions(
      existingAtom.x, existingAtom.y, this.ringSize, BOND_LENGTH,
      angle - Math.PI / 2
    );

    // First position aligns with existing atom
    const atoms = [existingAtom];

    for (let i = 1; i < positions.length; i++) {
      // Check if there's an existing atom near this position
      const nearby = findAtomAtPoint(mol, positions[i], SNAP_RADIUS);
      if (nearby) {
        atoms.push(nearby);
      } else {
        const atom = createAtom({ x: positions[i].x, y: positions[i].y });
        addAtom(mol, atom);
        atoms.push(atom);
      }
    }

    // Create bonds
    for (let i = 0; i < atoms.length; i++) {
      const next = (i + 1) % atoms.length;
      if (atoms[i].id === atoms[next].id) continue;
      const existing = mol.bonds.find(b =>
        (b.atomA === atoms[i].id && b.atomB === atoms[next].id) ||
        (b.atomA === atoms[next].id && b.atomB === atoms[i].id)
      );
      if (existing) continue;

      const isDouble = this.aromatic && (i % 2 === 0);
      const bond = createBond(atoms[i].id, atoms[next].id, {
        type: isDouble ? BOND_TYPES.DOUBLE : BOND_TYPES.SINGLE,
      });
      addBond(mol, bond);
    }

    this.doc._notify('change');
  }

  _fuseRingOntoBond(bond) {
    const mol = this.doc.findMoleculeByBondId(bond.id);
    if (!mol) return;

    const atomA = getAtomById(mol, bond.atomA);
    const atomB = getAtomById(mol, bond.atomB);
    if (!atomA || !atomB) return;

    // Bond midpoint and perpendicular
    const midX = (atomA.x + atomB.x) / 2;
    const midY = (atomA.y + atomB.y) / 2;
    const dx = atomB.x - atomA.x;
    const dy = atomB.y - atomA.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const px = -dy / len;
    const py = dx / len;

    // Determine which side to place the ring
    // Check if there are atoms on one side already
    const side = this._getFreeSide(mol, atomA, atomB, px, py);

    // Generate ring positions — the shared bond is one edge
    const ringAtoms = this.ringSize;
    const angleStep = (2 * Math.PI) / ringAtoms;
    const radius = BOND_LENGTH / (2 * Math.sin(Math.PI / ringAtoms));

    // Center of ring is perpendicular to the bond
    const centerDist = radius * Math.cos(Math.PI / ringAtoms);
    const cx = midX + px * centerDist * side;
    const cy = midY + py * centerDist * side;

    // Angle from center to atomA
    const startAngle = Math.atan2(atomA.y - cy, atomA.x - cx);

    const positions = [];
    for (let i = 0; i < ringAtoms; i++) {
      const angle = startAngle + i * angleStep * (-side);
      positions.push({
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    }

    // Build atoms — first two are the existing bond atoms
    const atoms = [atomA, atomB];
    for (let i = 2; i < positions.length; i++) {
      const nearby = findAtomAtPoint(mol, positions[i], SNAP_RADIUS);
      if (nearby) {
        atoms.push(nearby);
      } else {
        const atom = createAtom({ x: positions[i].x, y: positions[i].y });
        addAtom(mol, atom);
        atoms.push(atom);
      }
    }

    // Create bonds (skip the existing one between A and B)
    for (let i = 0; i < atoms.length; i++) {
      const next = (i + 1) % atoms.length;
      if (atoms[i].id === atoms[next].id) continue;

      const existing = mol.bonds.find(b =>
        (b.atomA === atoms[i].id && b.atomB === atoms[next].id) ||
        (b.atomA === atoms[next].id && b.atomB === atoms[i].id)
      );
      if (existing) continue;

      const isDouble = this.aromatic && (i % 2 === 1); // offset for fused
      const newBond = createBond(atoms[i].id, atoms[next].id, {
        type: isDouble ? BOND_TYPES.DOUBLE : BOND_TYPES.SINGLE,
      });
      addBond(mol, newBond);
    }

    this.doc._notify('change');
  }

  _getFreeSide(mol, atomA, atomB, px, py) {
    // Check which side has fewer atoms
    let countPos = 0;
    let countNeg = 0;
    const midX = (atomA.x + atomB.x) / 2;
    const midY = (atomA.y + atomB.y) / 2;

    for (const atom of mol.atoms) {
      if (atom.id === atomA.id || atom.id === atomB.id) continue;
      const dot = (atom.x - midX) * px + (atom.y - midY) * py;
      if (dot > 0) countPos++;
      else countNeg++;
    }

    return countPos <= countNeg ? 1 : -1;
  }

  _getBestAttachAngle(mol, atom) {
    const bonds = mol.bonds.filter(b => b.atomA === atom.id || b.atomB === atom.id);
    if (bonds.length === 0) return -Math.PI / 2;

    // Get average angle away from existing bonds
    let sumX = 0, sumY = 0;
    for (const bond of bonds) {
      const otherId = bond.atomA === atom.id ? bond.atomB : bond.atomA;
      const other = mol.atoms.find(a => a.id === otherId);
      if (!other) continue;
      sumX += other.x - atom.x;
      sumY += other.y - atom.y;
    }

    // Opposite direction
    return Math.atan2(-sumY, -sumX);
  }
}
