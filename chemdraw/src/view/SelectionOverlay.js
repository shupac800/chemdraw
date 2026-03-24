const HANDLE_OFFSET = 25;
const HANDLE_RADIUS = 6;

/**
 * Renders selection overlays: marquee rectangle and interaction previews.
 */
export class SelectionOverlay {
  constructor(doc, selection) {
    this.doc = doc;
    this.selection = selection;
    this.marquee = null;         // { x, y, width, height }
    this.previewBond = null;     // { x1, y1, x2, y2 }
    this.previewRing = null;     // [{ x, y }, ...]
    this.previewChain = null;    // [{ x, y }, ...]
    this.previewArrow = null;    // { x1, y1, x2, y2 }
    this.rotationHandle = null;  // { x, y, bbox } — set by SelectTool
    this.rotationAngle = null;   // current rotation angle during drag
    this.rotationCenter = null;  // center point during rotation drag
  }

  /**
   * Returns the rotation handle position based on the current selection bbox.
   * Returns null if no handle should be shown.
   */
  getRotationHandlePos() {
    if (!this.rotationHandle) return null;
    const { bbox } = this.rotationHandle;
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y - HANDLE_OFFSET,
    };
  }

  /**
   * Hit-test for the rotation handle.
   */
  isPointOnRotationHandle(point) {
    const pos = this.getRotationHandlePos();
    if (!pos) return false;
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS + 3;
  }

  render(ctx) {
    if (this.rotationHandle && !this.rotationAngle) {
      this._renderRotationHandle(ctx);
    }
    if (this.marquee) {
      this._renderMarquee(ctx);
    }
    if (this.previewBond) {
      this._renderPreviewBond(ctx);
    }
    if (this.previewRing) {
      this._renderPreviewRing(ctx);
    }
    if (this.previewChain) {
      this._renderPreviewChain(ctx);
    }
    if (this.previewArrow) {
      this._renderPreviewArrow(ctx);
    }
  }

  _renderMarquee(ctx) {
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
    ctx.fillRect(this.marquee.x, this.marquee.y, this.marquee.width, this.marquee.height);
    ctx.strokeRect(this.marquee.x, this.marquee.y, this.marquee.width, this.marquee.height);
    ctx.restore();
  }

  _renderPreviewBond(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.previewBond.x1, this.previewBond.y1);
    ctx.lineTo(this.previewBond.x2, this.previewBond.y2);
    ctx.stroke();

    // Draw dot at endpoint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(this.previewBond.x2, this.previewBond.y2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _renderPreviewRing(ctx) {
    if (this.previewRing.length < 3) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.previewRing[0].x, this.previewRing[0].y);
    for (let i = 1; i < this.previewRing.length; i++) {
      ctx.lineTo(this.previewRing[i].x, this.previewRing[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  _renderPreviewChain(ctx) {
    if (this.previewChain.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.previewChain[0].x, this.previewChain[0].y);
    for (let i = 1; i < this.previewChain.length; i++) {
      ctx.lineTo(this.previewChain[i].x, this.previewChain[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _renderPreviewArrow(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.previewArrow.x1, this.previewArrow.y1);
    ctx.lineTo(this.previewArrow.x2, this.previewArrow.y2);
    ctx.stroke();

    // Arrowhead preview
    const angle = Math.atan2(
      this.previewArrow.y2 - this.previewArrow.y1,
      this.previewArrow.x2 - this.previewArrow.x1
    );
    const len = 8;
    const spread = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(this.previewArrow.x2, this.previewArrow.y2);
    ctx.lineTo(
      this.previewArrow.x2 - len * Math.cos(angle - spread),
      this.previewArrow.y2 - len * Math.sin(angle - spread)
    );
    ctx.moveTo(this.previewArrow.x2, this.previewArrow.y2);
    ctx.lineTo(
      this.previewArrow.x2 - len * Math.cos(angle + spread),
      this.previewArrow.y2 - len * Math.sin(angle + spread)
    );
    ctx.stroke();
    ctx.restore();
  }

  _renderRotationHandle(ctx) {
    const pos = this.getRotationHandlePos();
    if (!pos) return;
    const { bbox } = this.rotationHandle;
    const topCenter = { x: bbox.x + bbox.width / 2, y: bbox.y };

    ctx.save();
    // Line from top-center of bbox to handle
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Handle circle
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotation icon (curved arrow) inside the handle
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, -Math.PI * 0.8, Math.PI * 0.4);
    ctx.stroke();
    // Small arrowhead
    const tipAngle = Math.PI * 0.4;
    const tx = pos.x + 3 * Math.cos(tipAngle);
    const ty = pos.y + 3 * Math.sin(tipAngle);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + 2, ty - 2);
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 1, ty - 2.5);
    ctx.stroke();

    ctx.restore();
  }
}
