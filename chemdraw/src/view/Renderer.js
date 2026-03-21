import { renderMolecule, renderArrow, renderTextLabel } from './MoleculeRenderer.js';

export class Renderer {
  constructor(canvas, doc, selection) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.doc = doc;
    this.selection = selection;
    this.selectionOverlay = null;
    this._animFrame = null;
    this._dirty = true;

    this.doc.onChange(() => this.requestRender());
    this.selection.onChange(() => this.requestRender());
  }

  setSelectionOverlay(overlay) {
    this.selectionOverlay = overlay;
  }

  requestRender() {
    this._dirty = true;
  }

  startRenderLoop() {
    const loop = () => {
      if (this._dirty) {
        this.render();
        this._dirty = false;
      }
      this._animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  stopRenderLoop() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  render() {
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw page background
    this._renderPage(ctx);

    // Draw all objects
    for (const obj of this.doc.objects) {
      switch (obj.type) {
        case 'molecule':
          renderMolecule(ctx, obj, this.selection);
          break;
        case 'arrow':
          renderArrow(ctx, obj, this.selection.hasObject(obj.id));
          break;
        case 'text':
          renderTextLabel(ctx, obj, this.selection.hasObject(obj.id));
          break;
      }
    }

    // Draw selection overlay (marquee, preview)
    if (this.selectionOverlay) {
      this.selectionOverlay.render(ctx);
    }

    ctx.restore();
  }

  _renderPage(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.doc.pageWidth, this.doc.pageHeight);

    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.doc.pageWidth - 1, this.doc.pageHeight - 1);
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.requestRender();
  }
}
