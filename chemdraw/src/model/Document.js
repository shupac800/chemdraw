import { DEFAULT_PAGE } from '../util/constants.js';
import { findAtomAtPoint, findBondAtPoint } from './Molecule.js';

export class Document {
  constructor(options = {}) {
    this.pageWidth = options.pageWidth || DEFAULT_PAGE.width;
    this.pageHeight = options.pageHeight || DEFAULT_PAGE.height;
    this.objects = []; // Molecule[], Arrow[], TextLabel[]
    this.groups = []; // Array of { id, atomIds: string[], objectIds: string[] }
    this._nextGroupId = 1;
    this._listeners = [];
  }

  addObject(obj) {
    this.objects.push(obj);
    this._notify('add', obj);
  }

  removeObject(id) {
    const index = this.objects.findIndex(o => o.id === id);
    if (index !== -1) {
      const [removed] = this.objects.splice(index, 1);
      this._notify('remove', removed);
      return removed;
    }
    return null;
  }

  getObjectById(id) {
    return this.objects.find(o => o.id === id) || null;
  }

  /**
   * Find the molecule containing an atom or bond with the given ID.
   */
  findMoleculeByAtomId(atomId) {
    for (const obj of this.objects) {
      if (obj.type !== 'molecule') continue;
      if (obj.atoms.some(a => a.id === atomId)) return obj;
    }
    return null;
  }

  findMoleculeByBondId(bondId) {
    for (const obj of this.objects) {
      if (obj.type !== 'molecule') continue;
      if (obj.bonds.some(b => b.id === bondId)) return obj;
    }
    return null;
  }

  /**
   * Find the nearest atom across all molecules to a point.
   */
  findAtomAtPoint(point, radius) {
    let closest = null;
    let closestDist = radius;
    for (const obj of this.objects) {
      if (obj.type !== 'molecule') continue;
      const atom = findAtomAtPoint(obj, point, closestDist);
      if (atom) {
        const dx = atom.x - point.x;
        const dy = atom.y - point.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          closest = atom;
        }
      }
    }
    return closest;
  }

  /**
   * Find the nearest bond across all molecules to a point.
   */
  findBondAtPoint(point, threshold = 5) {
    for (const obj of this.objects) {
      if (obj.type !== 'molecule') continue;
      const bond = findBondAtPoint(obj, point, threshold);
      if (bond) return bond;
    }
    return null;
  }

  /**
   * Find a text label or arrow at point.
   */
  findObjectAtPoint(point) {
    // Check text labels
    for (const obj of this.objects) {
      if (obj.type === 'text') {
        const dx = point.x - obj.x;
        const dy = point.y - obj.y;
        // Simple bounding box check
        if (dx >= -5 && dx <= 200 && dy >= -obj.fontSize && dy <= 5) {
          return obj;
        }
      }
      if (obj.type === 'arrow' && obj.points.length >= 2) {
        const p1 = obj.points[0];
        const p2 = obj.points[obj.points.length - 1];
        if (distToSeg(point, p1, p2) < 8) {
          return obj;
        }
      }
    }
    return null;
  }

  /**
   * Get all molecules.
   */
  getMolecules() {
    return this.objects.filter(o => o.type === 'molecule');
  }

  /**
   * Create a group from sets of atom IDs and object IDs.
   */
  createGroup(atomIds, objectIds = []) {
    if (atomIds.length === 0 && objectIds.length === 0) return null;
    // Remove these IDs from any existing groups
    this.ungroupItems(atomIds, objectIds);
    const group = {
      id: `group_${this._nextGroupId++}`,
      atomIds: [...atomIds],
      objectIds: [...objectIds],
    };
    this.groups.push(group);
    this._notify('change');
    return group;
  }

  /**
   * Remove items from any groups they belong to. Deletes empty groups.
   * Used internally when creating a new group (to avoid duplicate membership).
   */
  ungroupItems(atomIds, objectIds = []) {
    const atomSet = new Set(atomIds);
    const objSet = new Set(objectIds);
    for (const group of this.groups) {
      group.atomIds = group.atomIds.filter(id => !atomSet.has(id));
      group.objectIds = group.objectIds.filter(id => !objSet.has(id));
    }
    this.groups = this.groups.filter(g => g.atomIds.length > 0 || g.objectIds.length > 0);
    this._notify('change');
  }

  /**
   * Dissolve any groups that contain the given atom or object IDs.
   * Removes the entire group, not just the specified items.
   */
  dissolveGroups(atomIds, objectIds = []) {
    const atomSet = new Set(atomIds);
    const objSet = new Set(objectIds);
    this.groups = this.groups.filter(g => {
      const hasAtom = g.atomIds.some(id => atomSet.has(id));
      const hasObj = g.objectIds.some(id => objSet.has(id));
      return !hasAtom && !hasObj;
    });
    this._notify('change');
  }

  /**
   * Find the group containing an atom ID.
   */
  findGroupByAtomId(atomId) {
    return this.groups.find(g => g.atomIds.includes(atomId)) || null;
  }

  /**
   * Find the group containing an object ID.
   */
  findGroupByObjectId(objectId) {
    return this.groups.find(g => g.objectIds.includes(objectId)) || null;
  }

  clear() {
    this.objects = [];
    this.groups = [];
    this._notify('clear');
  }

  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify(type, data) {
    for (const listener of this._listeners) {
      listener(type, data);
    }
  }

  toJSON() {
    return {
      pageWidth: this.pageWidth,
      pageHeight: this.pageHeight,
      objects: JSON.parse(JSON.stringify(this.objects)),
      groups: JSON.parse(JSON.stringify(this.groups)),
    };
  }

  static fromJSON(data) {
    const doc = new Document({
      pageWidth: data.pageWidth,
      pageHeight: data.pageHeight,
    });
    doc.objects = data.objects || [];
    doc.groups = data.groups || [];
    return doc;
  }
}

function distToSeg(point, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);
  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((point.x - (p1.x + t * dx)) ** 2 + (point.y - (p1.y + t * dy)) ** 2);
}
