export class CommandStack {
  constructor() {
    this._undoStack = [];
    this._redoStack = [];
    this._listeners = [];
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  execute(cmd) {
    cmd.execute();
    this._undoStack.push(cmd);
    this._redoStack = [];
    this._notify();
  }

  undo() {
    if (!this.canUndo) return;
    const cmd = this._undoStack.pop();
    cmd.undo();
    this._redoStack.push(cmd);
    this._notify();
  }

  redo() {
    if (!this.canRedo) return;
    const cmd = this._redoStack.pop();
    cmd.execute();
    this._undoStack.push(cmd);
    this._notify();
  }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._notify();
  }

  onChange(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _notify() {
    for (const l of this._listeners) {
      l();
    }
  }
}
