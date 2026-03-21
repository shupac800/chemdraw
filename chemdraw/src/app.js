import { Document } from './model/Document.js';
import { Selection } from './model/Selection.js';
import { Clipboard } from './model/Clipboard.js';
import { CommandStack } from './commands/CommandStack.js';
import { Renderer } from './view/Renderer.js';
import { SelectionOverlay } from './view/SelectionOverlay.js';
import { CursorManager } from './view/CursorManager.js';
import { ToolManager } from './controller/ToolManager.js';
import { InputHandler } from './controller/InputHandler.js';
import { KeyboardShortcuts } from './controller/KeyboardShortcuts.js';
import { SelectTool } from './controller/tools/SelectTool.js';
import { BondTool } from './controller/tools/BondTool.js';
import { RingTool } from './controller/tools/RingTool.js';
import { ChainTool } from './controller/tools/ChainTool.js';
import { AtomLabelTool } from './controller/tools/AtomLabelTool.js';
import { EraserTool } from './controller/tools/EraserTool.js';
import { ArrowTool } from './controller/tools/ArrowTool.js';
import { TextTool } from './controller/tools/TextTool.js';
import { Toolbar } from './ui/Toolbar.js';
import { MenuBar } from './ui/MenuBar.js';
import { PropertyPanel } from './ui/PropertyPanel.js';
import { StatusBar } from './ui/StatusBar.js';
import { TOOLS } from './util/constants.js';
import { loadFromLocalStorage, saveToLocalStorage } from './util/serialize.js';

class ChemDraw {
  constructor() {
    // Try to load saved document
    const saved = loadFromLocalStorage();
    this.doc = saved || new Document();
    this.selection = new Selection();
    this.clipboard = new Clipboard();
    this.commandStack = new CommandStack();

    // Canvas
    this.canvas = document.getElementById('drawing-canvas');
    this.cursorManager = new CursorManager(this.canvas);
    this.selectionOverlay = new SelectionOverlay(this.doc, this.selection);

    // Renderer
    this.renderer = new Renderer(this.canvas, this.doc, this.selection);
    this.renderer.setSelectionOverlay(this.selectionOverlay);

    // Tools
    this.toolManager = new ToolManager(
      this.doc, this.selection, this.commandStack,
      this.selectionOverlay, this.cursorManager
    );

    this._registerTools();

    // Input
    this.inputHandler = new InputHandler(this.canvas, this.toolManager);
    this.shortcuts = new KeyboardShortcuts(this);

    // UI
    this.toolbar = new Toolbar(document.getElementById('toolbar'), this.toolManager, this);
    this.menuBar = new MenuBar(document.getElementById('menubar'), this);
    this.propertyPanel = new PropertyPanel(document.getElementById('property-panel'), this);
    this.statusBar = new StatusBar(document.getElementById('status-bar'), this.doc);

    // Set default tool
    this.toolManager.setActiveTool(TOOLS.SELECT);

    // Auto-save
    this.doc.onChange(() => {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => saveToLocalStorage(this.doc), 2000);
    });

    // Start
    this._handleResize();
    window.addEventListener('resize', () => this._handleResize());
    this.renderer.startRenderLoop();
  }

  _registerTools() {
    this.toolManager.registerTool(TOOLS.SELECT, new SelectTool());
    this.toolManager.registerTool(TOOLS.BOND, new BondTool());
    this.toolManager.registerTool(TOOLS.RING, new RingTool());
    this.toolManager.registerTool(TOOLS.CHAIN, new ChainTool());
    this.toolManager.registerTool(TOOLS.ATOM_LABEL, new AtomLabelTool());
    this.toolManager.registerTool(TOOLS.ERASER, new EraserTool());
    this.toolManager.registerTool(TOOLS.ARROW, new ArrowTool());
    this.toolManager.registerTool(TOOLS.TEXT, new TextTool());
  }

  _handleResize() {
    this.renderer.resizeCanvas();
  }

  loadDocument(doc) {
    this.doc.clear();
    this.doc.pageWidth = doc.pageWidth;
    this.doc.pageHeight = doc.pageHeight;
    this.doc.objects = doc.objects;
    this.selection.clear();
    this.commandStack.clear();
    this.doc._notify('load');
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ChemDraw();
});
