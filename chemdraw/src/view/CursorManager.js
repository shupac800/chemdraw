export class CursorManager {
  constructor(canvas) {
    this.canvas = canvas;
  }

  setDefault() { this.canvas.style.cursor = 'default'; }
  setCrosshair() { this.canvas.style.cursor = 'crosshair'; }
  setMove() { this.canvas.style.cursor = 'move'; }
  setPointer() { this.canvas.style.cursor = 'pointer'; }
  setText() { this.canvas.style.cursor = 'text'; }
  setEraser() { this.canvas.style.cursor = 'pointer'; }
  setRotate() { this.canvas.style.cursor = 'grab'; }
}
