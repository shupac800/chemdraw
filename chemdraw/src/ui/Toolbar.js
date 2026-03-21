import { TOOLS, BOND_TYPES, BOND_STEREO, RING_SIZES, ARROW_TYPES } from '../util/constants.js';

const TOOL_DEFS = [
  { id: TOOLS.SELECT, label: 'Select', shortcut: 'V', icon: 'select' },
  {
    id: TOOLS.BOND, label: 'Bond', shortcut: 'B', icon: 'bond',
    submenu: [
      { label: 'Single Bond', bondType: BOND_TYPES.SINGLE, stereo: BOND_STEREO.NONE },
      { label: 'Double Bond', bondType: BOND_TYPES.DOUBLE, stereo: BOND_STEREO.NONE },
      { label: 'Triple Bond', bondType: BOND_TYPES.TRIPLE, stereo: BOND_STEREO.NONE },
      { type: 'separator' },
      { label: 'Wedge Bond', bondType: BOND_TYPES.SINGLE, stereo: BOND_STEREO.WEDGE },
      { label: 'Dash Bond', bondType: BOND_TYPES.SINGLE, stereo: BOND_STEREO.DASH },
      { label: 'Wavy Bond', bondType: BOND_TYPES.SINGLE, stereo: BOND_STEREO.WAVY },
      { label: 'Bold Bond', bondType: BOND_TYPES.SINGLE, stereo: BOND_STEREO.BOLD },
    ]
  },
  {
    id: TOOLS.RING, label: 'Ring', shortcut: 'R', icon: 'ring',
    submenu: [
      { label: 'Cyclopropane', size: 3 },
      { label: 'Cyclobutane', size: 4 },
      { label: 'Cyclopentane', size: 5 },
      { label: 'Cyclohexane', size: 6 },
      { label: 'Cycloheptane', size: 7 },
      { type: 'separator' },
      { label: 'Benzene', size: 'benzene' },
    ]
  },
  { id: TOOLS.CHAIN, label: 'Chain', shortcut: 'C', icon: 'chain' },
  { id: TOOLS.ATOM_LABEL, label: 'Atom Label', shortcut: 'A', icon: 'atom' },
  { id: TOOLS.ERASER, label: 'Eraser', shortcut: 'E', icon: 'eraser' },
  {
    id: TOOLS.ARROW, label: 'Arrow', shortcut: 'W', icon: 'arrow',
    submenu: [
      { label: 'Reaction Arrow', arrowType: ARROW_TYPES.REACTION },
      { label: 'Retrosynthetic Arrow', arrowType: ARROW_TYPES.RETRO },
      { label: 'Equilibrium Arrow', arrowType: ARROW_TYPES.EQUILIBRIUM },
      { label: 'Resonance Arrow', arrowType: ARROW_TYPES.RESONANCE },
    ]
  },
  { id: TOOLS.TEXT, label: 'Text', shortcut: 'T', icon: 'text' },
];

const ICONS = {
  select: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 10-6 1-3 6z"/></svg>`,
  bond: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="20" x2="20" y2="4"/></svg>`,
  ring: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,3 21,10 18,21 6,21 3,10"/></svg>`,
  chain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,18 8,6 13,18 18,6 21,12"/></svg>`,
  atom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="currentColor" stroke="none">C</text></svg>`,
  eraser: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H7l-4-4 10-10 7 7-4 4"/><line x1="18" y1="13" x2="11" y2="20"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="20" y2="12"/><polyline points="16,8 20,12 16,16"/></svg>`,
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h12M12 4v16M8 20h8"/></svg>`,
};

export class Toolbar {
  constructor(container, toolManager, app) {
    this.container = container;
    this.toolManager = toolManager;
    this.app = app;
    this._buttons = {};
    this._openSubmenu = null;
    this._build();

    toolManager.onChange((toolName) => this._updateActive(toolName));

    // Close submenu on outside click
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._closeSubmenu();
      }
    });
  }

  _build() {
    this.container.innerHTML = '';
    this.container.className = 'toolbar';

    for (const tool of TOOL_DEFS) {
      const wrapper = document.createElement('div');
      wrapper.className = 'toolbar-btn-wrapper';

      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.title = `${tool.label} (${tool.shortcut})`;
      btn.innerHTML = ICONS[tool.icon] || tool.label[0];
      btn.dataset.tool = tool.id;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toolManager.setActiveTool(tool.id);
        this._closeSubmenu();
      });

      // Add submenu indicator
      if (tool.submenu) {
        const indicator = document.createElement('span');
        indicator.className = 'submenu-indicator';
        indicator.textContent = '\u25BC';
        btn.appendChild(indicator);

        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._toggleSubmenu(wrapper, tool);
        });

        // Long press for submenu
        let pressTimer;
        btn.addEventListener('mousedown', () => {
          pressTimer = setTimeout(() => {
            this._toggleSubmenu(wrapper, tool);
          }, 500);
        });
        btn.addEventListener('mouseup', () => clearTimeout(pressTimer));
        btn.addEventListener('mouseleave', () => clearTimeout(pressTimer));
      }

      wrapper.appendChild(btn);
      this._buttons[tool.id] = btn;
      this.container.appendChild(wrapper);
    }
  }

  _toggleSubmenu(wrapper, tool) {
    if (this._openSubmenu === wrapper) {
      this._closeSubmenu();
      return;
    }
    this._closeSubmenu();
    this._openSubmenu = wrapper;

    const dropdown = document.createElement('div');
    dropdown.className = 'toolbar-submenu';

    for (const item of tool.submenu) {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'menu-separator';
        dropdown.appendChild(sep);
        continue;
      }

      const btn = document.createElement('button');
      btn.className = 'submenu-item';
      btn.textContent = item.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._applySubmenuItem(tool.id, item);
        this._closeSubmenu();
      });
      dropdown.appendChild(btn);
    }

    wrapper.appendChild(dropdown);
  }

  _applySubmenuItem(toolId, item) {
    this.toolManager.setActiveTool(toolId);
    const toolInstance = this.toolManager.getToolInstance(toolId);

    if (toolId === TOOLS.BOND && toolInstance) {
      toolInstance.bondType = item.bondType;
      toolInstance.bondStereo = item.stereo;
    } else if (toolId === TOOLS.RING && toolInstance) {
      toolInstance.setRingType(item.size);
    } else if (toolId === TOOLS.ARROW && toolInstance) {
      toolInstance.arrowType = item.arrowType;
    }
  }

  _closeSubmenu() {
    if (this._openSubmenu) {
      const dropdown = this._openSubmenu.querySelector('.toolbar-submenu');
      if (dropdown) dropdown.remove();
      this._openSubmenu = null;
    }
  }

  _updateActive(toolName) {
    for (const [id, btn] of Object.entries(this._buttons)) {
      btn.classList.toggle('active', id === toolName);
    }
  }
}
