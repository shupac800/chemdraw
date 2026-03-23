import { SNAP_RADIUS } from '../../util/constants.js';
import { normalizeRect } from '../../util/geometry.js';
import { getBondsForAtom } from '../../model/Molecule.js';

export class SelectTool {
  constructor() {
    this.manager = null;
    this.doc = null;
    this.selection = null;
    this.commandStack = null;
    this.overlay = null;
    this.cursor = null;

    this._dragging = false;
    this._mode = null; // 'move', 'marquee'
    this._startPoint = null;
    this._lastPoint = null;
    this._moveStartPositions = null;
  }

  activate() { this.cursor?.setDefault(); }
  deactivate() {
    this._dragging = false;
    this._mode = null;
    if (this.overlay) this.overlay.marquee = null;
  }

  cancel() {
    if (!this._dragging) return false;
    // Restore atoms to their start positions if we were moving
    if (this._mode === 'move' && this._moveStartPositions) {
      for (const [atomId, pos] of Object.entries(this._moveStartPositions)) {
        for (const mol of this.doc.getMolecules()) {
          const atom = mol.atoms.find(a => a.id === atomId);
          if (atom) {
            atom.x = pos.x;
            atom.y = pos.y;
          }
        }
      }
      this.doc._notify('move');
    }
    this._dragging = false;
    this._mode = null;
    this._moveStartPositions = null;
    if (this.overlay) this.overlay.marquee = null;
    this.cursor?.setDefault();
    return true;
  }

  onMouseDown(point, modifiers) {
    this._startPoint = { ...point };
    this._lastPoint = { ...point };

    // Check if clicking on an atom
    const atom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (atom) {
      if (modifiers.shiftKey) {
        this.selection.toggleAtom(atom.id);
      } else if (!this.selection.hasAtom(atom.id)) {
        this.selection.selectAtom(atom.id);
      }

      this._dragging = true;
      this._mode = 'move';
      this._saveStartPositions();
      this.cursor?.setMove();
      return;
    }

    // Check if clicking on a bond
    const bond = this.doc.findBondAtPoint(point, 5);
    if (bond) {
      if (modifiers.shiftKey) {
        this.selection.toggleBond(bond.id);
      } else {
        // Select both atoms of the bond
        this.selection.selectBond(bond.id);
        this.selection.addAtom(bond.atomA);
        this.selection.addAtom(bond.atomB);
      }

      this._dragging = true;
      this._mode = 'move';
      this._saveStartPositions();
      this.cursor?.setMove();
      return;
    }

    // Check arrows/text
    const obj = this.doc.findObjectAtPoint(point);
    if (obj) {
      this.selection.selectObject(obj.id);
      this._dragging = true;
      this._mode = 'move';
      this._objDragStart = { x: obj.x || obj.points?.[0]?.x || 0, y: obj.y || obj.points?.[0]?.y || 0 };
      this.cursor?.setMove();
      return;
    }

    // Start marquee
    if (!modifiers.shiftKey) {
      this.selection.clear();
    }
    this._dragging = true;
    this._mode = 'marquee';
  }

  onMouseMove(point) {
    if (!this._dragging) {
      this._updateHoverCursor(point);
      return;
    }

    const dx = point.x - this._lastPoint.x;
    const dy = point.y - this._lastPoint.y;

    switch (this._mode) {
      case 'move':
        this._handleMove(dx, dy);
        break;
      case 'marquee':
        this._handleMarquee(point);
        break;
    }

    this._lastPoint = { ...point };
  }

  onMouseUp(point, modifiers) {
    if (!this._dragging) return;

    if (this._mode === 'marquee') {
      this._finishMarquee(point, modifiers);
    }

    if (this._mode === 'move') {
      this._mergeOverlappingAtoms();
    }

    this._dragging = false;
    this._mode = null;
    this._moveStartPositions = null;
    if (this.overlay) this.overlay.marquee = null;
    this.cursor?.setDefault();
    this.doc._notify('change');
  }

  onDoubleClick(point) {
    const atom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (atom) {
      // Switch to atom label tool for editing
      this.selection.selectAtom(atom.id);
      this.manager.setActiveTool('atomLabel');
      const atomLabelTool = this.manager._tools['atomLabel'];
      if (atomLabelTool) {
        atomLabelTool.startEditing(atom);
      }
    }
  }

  _saveStartPositions() {
    this._moveStartPositions = {};
    for (const atomId of this.selection.atomIds) {
      for (const mol of this.doc.getMolecules()) {
        const atom = mol.atoms.find(a => a.id === atomId);
        if (atom) {
          this._moveStartPositions[atomId] = { x: atom.x, y: atom.y };
        }
      }
    }
  }

  _handleMove(dx, dy) {
    // Move selected atoms
    for (const atomId of this.selection.atomIds) {
      for (const mol of this.doc.getMolecules()) {
        const atom = mol.atoms.find(a => a.id === atomId);
        if (atom) {
          atom.x += dx;
          atom.y += dy;
        }
      }
    }

    // Move selected objects (arrows, text)
    for (const objId of this.selection.objectIds) {
      const obj = this.doc.getObjectById(objId);
      if (!obj) continue;
      if (obj.type === 'text') {
        obj.x += dx;
        obj.y += dy;
      } else if (obj.type === 'arrow' && obj.points) {
        for (const p of obj.points) {
          p.x += dx;
          p.y += dy;
        }
      }
    }

    this.doc._notify('move');
  }

  _handleMarquee(point) {
    const rect = normalizeRect(
      this._startPoint.x, this._startPoint.y,
      point.x - this._startPoint.x, point.y - this._startPoint.y
    );
    if (this.overlay) {
      this.overlay.marquee = rect;
    }
    this.doc._notify('marquee');
  }

  _finishMarquee(point, modifiers) {
    const rect = normalizeRect(
      this._startPoint.x, this._startPoint.y,
      point.x - this._startPoint.x, point.y - this._startPoint.y
    );
    if (rect.width < 2 && rect.height < 2) return;

    this.selection.selectAtomsInRect(this.doc.getMolecules(), rect);
  }

  /**
   * After a move, merge any selected atoms that overlap with non-selected
   * atoms from other molecules (within SNAP_RADIUS). This enables fused-ring
   * structures by dragging one ring onto another.
   */
  _mergeOverlappingAtoms() {
    const selectedAtomIds = new Set(this.selection.atomIds);
    if (selectedAtomIds.size === 0) return;

    // Build a list of merge pairs: [selectedAtom, targetAtom]
    const mergePairs = [];

    for (const atomId of selectedAtomIds) {
      const srcMol = this.doc.findMoleculeByAtomId(atomId);
      if (!srcMol) continue;
      const srcAtom = srcMol.atoms.find(a => a.id === atomId);
      if (!srcAtom) continue;

      // Find closest non-selected atom from a different molecule
      for (const mol of this.doc.getMolecules()) {
        if (mol.id === srcMol.id) continue;
        for (const targetAtom of mol.atoms) {
          if (selectedAtomIds.has(targetAtom.id)) continue;
          const dx = srcAtom.x - targetAtom.x;
          const dy = srcAtom.y - targetAtom.y;
          if (Math.sqrt(dx * dx + dy * dy) < SNAP_RADIUS) {
            mergePairs.push({ srcAtomId: srcAtom.id, targetAtom, srcMolId: srcMol.id, targetMolId: mol.id });
            break;
          }
        }
      }
    }

    if (mergePairs.length === 0) return;

    // Phase 1: Absorb source molecules into target molecules
    const absorbed = new Set(); // src mol IDs already absorbed
    // Track where each src mol ended up (srcMolId -> targetMolId)
    const absorbedInto = {};

    for (const { srcMolId, targetMolId } of mergePairs) {
      if (absorbed.has(srcMolId)) continue;
      absorbed.add(srcMolId);

      const srcMol = this.doc.getObjectById(srcMolId);
      const targetMol = this.doc.getObjectById(targetMolId);
      if (!srcMol || !targetMol) continue;

      for (const a of srcMol.atoms) targetMol.atoms.push(a);
      for (const b of srcMol.bonds) targetMol.bonds.push(b);
      this.doc.removeObject(srcMolId);
      absorbedInto[srcMolId] = targetMolId;
    }

    // Phase 2: Rewire bonds and remove duplicate atoms
    for (const { srcAtomId, targetAtom, srcMolId, targetMolId } of mergePairs) {
      const mol = this.doc.getObjectById(absorbedInto[srcMolId] || targetMolId);
      if (!mol) continue;

      // Rewire all bond references from srcAtom to targetAtom
      const bondsToRewire = getBondsForAtom(mol, srcAtomId);
      for (const bond of bondsToRewire) {
        if (bond.atomA === srcAtomId) bond.atomA = targetAtom.id;
        if (bond.atomB === srcAtomId) bond.atomB = targetAtom.id;
      }

      // Remove the duplicate (source) atom
      const idx = mol.atoms.findIndex(a => a.id === srcAtomId);
      if (idx !== -1) mol.atoms.splice(idx, 1);

      // Update selection: replace source atom with target atom
      this.selection.removeAtom(srcAtomId);
      this.selection.addAtom(targetAtom.id);
    }

    // Phase 3: Remove duplicate bonds (same pair of atoms)
    const affectedMolIds = new Set(Object.values(absorbedInto));
    for (const molId of affectedMolIds) {
      const mol = this.doc.getObjectById(molId);
      if (!mol) continue;
      const seen = new Set();
      mol.bonds = mol.bonds.filter(b => {
        const key = [b.atomA, b.atomB].sort().join('-');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }

  _updateHoverCursor(point) {
    const atom = this.doc.findAtomAtPoint(point, SNAP_RADIUS);
    if (atom) {
      this.cursor?.setPointer();
      return;
    }
    const bond = this.doc.findBondAtPoint(point, 5);
    if (bond) {
      this.cursor?.setPointer();
      return;
    }
    this.cursor?.setDefault();
  }
}
