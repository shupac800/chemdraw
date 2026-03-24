/**
 * Snapshot-based undo/redo system.
 * Captures document state after each 'change' event and allows
 * stepping backward/forward through history.
 */
export class CommandStack {
  constructor() {
    this._history = [];   // array of JSON snapshots
    this._position = -1;  // current position in history
    this._listeners = [];
    this._restoring = false;
    this._doc = null;
    this._selection = null;
    this._maxHistory = 100;
  }

  /**
   * Bind to a document and selection. Saves the initial state and
   * listens for 'change' events to auto-snapshot.
   */
  bind(doc, selection) {
    this._doc = doc;
    this._selection = selection;
    this._saveSnapshot(); // save initial state

    doc.onChange((type) => {
      if (type === 'change') {
        this._saveSnapshot();
      }
    });
  }

  get canUndo() { return this._position > 0; }
  get canRedo() { return this._position < this._history.length - 1; }

  /**
   * Capture current document state as a new history entry.
   * Discards any redo history beyond the current position.
   */
  _saveSnapshot() {
    if (this._restoring) return; // don't save during undo/redo restore

    // Discard redo future
    this._history.length = this._position + 1;

    // Push new snapshot (objects + groups)
    this._history.push({
      objects: JSON.parse(JSON.stringify(this._doc.objects)),
      groups: JSON.parse(JSON.stringify(this._doc.groups || [])),
    });
    this._position = this._history.length - 1;

    // Limit history size
    if (this._history.length > this._maxHistory) {
      this._history.shift();
      this._position--;
    }
    this._notify();
  }

  undo() {
    if (!this.canUndo) return;
    this._position--;
    this._restore();
  }

  redo() {
    if (!this.canRedo) return;
    this._position++;
    this._restore();
  }

  _restore() {
    this._restoring = true;
    const snapshot = this._history[this._position];
    // Support both old format (plain array) and new format ({objects, groups})
    if (Array.isArray(snapshot)) {
      this._doc.objects = JSON.parse(JSON.stringify(snapshot));
      this._doc.groups = [];
    } else {
      this._doc.objects = JSON.parse(JSON.stringify(snapshot.objects));
      this._doc.groups = JSON.parse(JSON.stringify(snapshot.groups || []));
    }
    if (this._selection) this._selection.clear();
    this._doc._notify('change');
    this._restoring = false;
    this._notify();
  }

  clear() {
    this._history = [];
    this._position = -1;
    if (this._doc) {
      this._saveSnapshot(); // save current state as new baseline
    }
    this._notify();
  }

  // Keep the old execute() API as a no-op for backwards compat
  execute(cmd) {
    if (cmd && typeof cmd.execute === 'function') cmd.execute();
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
