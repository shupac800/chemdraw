import { removeAtom, removeBond, isEmpty } from '../model/Molecule.js';

export class MenuBar {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this._openMenu = null;
    this._build();

    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._closeAll();
      }
    });
  }

  _build() {
    this.container.innerHTML = '';
    this.container.className = 'menubar';

    // App title
    const title = document.createElement('span');
    title.className = 'app-title';
    title.textContent = 'ChemDraw';
    this.container.appendChild(title);

    const menus = this._getMenuDefs();
    for (const menu of menus) {
      const menuEl = this._createMenu(menu);
      this.container.appendChild(menuEl);
    }
  }

  _getMenuDefs() {
    return [
      {
        label: 'File', items: [
          { label: 'New', action: () => this._fileNew(), shortcut: 'Ctrl+N' },
          { type: 'separator' },
          { label: 'Save JSON...', action: () => this._fileSave(), shortcut: 'Ctrl+S' },
          { label: 'Open JSON...', action: () => this._fileOpen(), shortcut: 'Ctrl+O' },
          { type: 'separator' },
          { label: 'Export PNG...', action: () => this._exportPNG() },
        ]
      },
      {
        label: 'Edit', items: [
          { label: 'Undo', action: () => this.app.commandStack.undo(), shortcut: 'Ctrl+Z',
            enabled: () => this.app.commandStack.canUndo },
          { label: 'Redo', action: () => this.app.commandStack.redo(), shortcut: 'Ctrl+Y',
            enabled: () => this.app.commandStack.canRedo },
          { type: 'separator' },
          { label: 'Delete', action: () => this._delete(), shortcut: 'Del',
            enabled: () => !this.app.selection.isEmpty },
          { label: 'Select All', action: () => this._selectAll(), shortcut: 'Ctrl+A' },
          { type: 'separator' },
          { label: 'Group', action: () => this._group(), shortcut: 'Ctrl+G',
            enabled: () => this.app.selection.atomIds.length + this.app.selection.objectIds.length >= 2 },
          { label: 'Ungroup', action: () => this._ungroup(), shortcut: 'Ctrl+Shift+G',
            enabled: () => this._hasGroupedSelection() },
        ]
      },
      {
        label: 'Structure', items: [
          { label: 'Clean Up Structure', action: () => this._cleanUp() },
        ]
      },
    ];
  }

  _createMenu(menu) {
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-wrapper';

    const trigger = document.createElement('button');
    trigger.className = 'menu-trigger';
    trigger.textContent = menu.label;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleMenu(wrapper, menu);
    });

    wrapper.appendChild(trigger);
    return wrapper;
  }

  _toggleMenu(wrapper, menu) {
    if (this._openMenu === wrapper) {
      this._closeAll();
      return;
    }
    this._closeAll();
    this._openMenu = wrapper;
    wrapper.classList.add('open');

    const dropdown = document.createElement('div');
    dropdown.className = 'menu-dropdown';

    for (const item of menu.items) {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'menu-separator';
        dropdown.appendChild(sep);
        continue;
      }

      const el = document.createElement('button');
      el.className = 'menu-item';
      const enabled = item.enabled ? item.enabled() : true;
      el.disabled = !enabled;

      const label = document.createElement('span');
      label.textContent = item.label;
      el.appendChild(label);

      if (item.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'menu-shortcut';
        shortcut.textContent = item.shortcut;
        el.appendChild(shortcut);
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._closeAll();
        item.action();
      });

      dropdown.appendChild(el);
    }

    wrapper.appendChild(dropdown);
  }

  _closeAll() {
    if (this._openMenu) {
      this._openMenu.classList.remove('open');
      const dropdown = this._openMenu.querySelector('.menu-dropdown');
      if (dropdown) dropdown.remove();
      this._openMenu = null;
    }
  }

  _fileNew() {
    if (confirm('Create a new document? Unsaved changes will be lost.')) {
      this.app.doc.clear();
      this.app.selection.clear();
      this.app.commandStack.clear();
      localStorage.removeItem('chemdraw_document');
    }
  }

  _fileSave() {
    const json = JSON.stringify(this.app.doc.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'structure.cdj';
    a.click();
    URL.revokeObjectURL(url);
  }

  _fileOpen() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cdj,.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const { Document } = require('../model/Document.js');
          const doc = Document.fromJSON(data);
          this.app.loadDocument(doc);
        } catch (err) {
          alert('Failed to open file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  _exportPNG() {
    const canvas = this.app.canvas;
    const link = document.createElement('a');
    link.download = 'structure.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  _delete() {
    const { selection, doc } = this.app;
    for (const atomId of selection.atomIds) {
      const mol = doc.findMoleculeByAtomId(atomId);
      if (mol) {
        removeAtom(mol, atomId);
        if (isEmpty(mol)) doc.removeObject(mol.id);
      }
    }
    for (const bondId of selection.bondIds) {
      const mol = doc.findMoleculeByBondId(bondId);
      if (mol) removeBond(mol, bondId);
    }
    for (const objId of selection.objectIds) {
      doc.removeObject(objId);
    }
    selection.clear();
    doc._notify('change');
  }

  _selectAll() {
    for (const mol of this.app.doc.getMolecules()) {
      this.app.selection.selectMolecule(mol);
    }
  }

  _group() {
    const { selection, doc } = this.app;
    const atomIds = selection.atomIds;
    const objectIds = selection.objectIds;
    if (atomIds.length + objectIds.length < 2) return;
    doc.createGroup(atomIds, objectIds);
  }

  _ungroup() {
    const { selection, doc } = this.app;
    const atomIds = selection.atomIds;
    const objectIds = selection.objectIds;
    if (atomIds.length === 0 && objectIds.length === 0) return;
    doc.dissolveGroups(atomIds, objectIds);
  }

  _hasGroupedSelection() {
    const { selection, doc } = this.app;
    for (const id of selection.atomIds) {
      if (doc.findGroupByAtomId(id)) return true;
    }
    for (const id of selection.objectIds) {
      if (doc.findGroupByObjectId(id)) return true;
    }
    return false;
  }

  _cleanUp() {
    // Basic structure cleanup — normalize bond lengths
    // This is a simplified version
    for (const mol of this.app.doc.getMolecules()) {
      // Could implement force-directed layout here
      // For now, just notify
    }
    this.app.doc._notify('change');
  }
}
