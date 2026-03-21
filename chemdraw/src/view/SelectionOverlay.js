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
  }

  render(ctx) {
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
}
