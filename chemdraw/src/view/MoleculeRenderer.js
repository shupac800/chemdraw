import {
  BOND_WIDTH, BOLD_BOND_WIDTH, DOUBLE_BOND_GAP, TRIPLE_BOND_GAP,
  HASH_COUNT, WAVY_AMPLITUDE, WAVY_SEGMENTS,
  ATOM_FONT_SIZE, ATOM_FONT, ATOM_LABEL_MARGIN,
  BOND_TYPES, BOND_STEREO,
} from '../util/constants.js';
import { shouldShowLabel, buildAtomLabel } from '../util/chemistry.js';
import { getAtomById } from '../model/Molecule.js';

/**
 * Render a molecule on a canvas context.
 */
export function renderMolecule(ctx, molecule, selection) {
  // Render bonds first (behind atom labels)
  for (const bond of molecule.bonds) {
    const atomA = getAtomById(molecule, bond.atomA);
    const atomB = getAtomById(molecule, bond.atomB);
    if (!atomA || !atomB) continue;

    const selected = selection && (selection.hasBond(bond.id) ||
      (selection.hasAtom(bond.atomA) && selection.hasAtom(bond.atomB)));

    renderBond(ctx, bond, atomA, atomB, molecule, selected);
  }

  // Render atom labels
  for (const atom of molecule.atoms) {
    const selected = selection && selection.hasAtom(atom.id);
    renderAtom(ctx, molecule, atom, selected);
  }
}

function renderBond(ctx, bond, atomA, atomB, molecule, selected) {
  ctx.save();
  ctx.strokeStyle = selected ? '#2563eb' : bond.color;
  ctx.fillStyle = selected ? '#2563eb' : bond.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Calculate endpoints, adjusting for connecting element position within labels
  let x1 = atomA.x;
  let y1 = atomA.y;
  let x2 = atomB.x;
  let y2 = atomB.y;

  // Shift endpoints to target the connecting element character, not label center
  const showA = shouldShowLabel(molecule, atomA);
  const showB = shouldShowLabel(molecule, atomB);
  if (showB) x2 += getElementAnchorOffset(ctx, molecule, atomB);
  if (showA) x1 += getElementAnchorOffset(ctx, molecule, atomA);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) { ctx.restore(); return; }

  const ux = dx / len;
  const uy = dy / len;

  // Trim bond endpoints at the element character edge
  const trimA = showA ? getElementTrim(ctx, molecule, atomA) : 0;
  const trimB = showB ? getElementTrim(ctx, molecule, atomB) : 0;

  x1 += ux * trimA;
  y1 += uy * trimA;
  x2 -= ux * trimB;
  y2 -= uy * trimB;

  // Perpendicular vector
  const px = -uy;
  const py = ux;

  switch (bond.stereo) {
    case BOND_STEREO.WEDGE:
      renderWedgeBond(ctx, x1, y1, x2, y2, px, py);
      break;
    case BOND_STEREO.DASH:
      renderDashBond(ctx, x1, y1, x2, y2, px, py);
      break;
    case BOND_STEREO.WAVY:
      renderWavyBond(ctx, x1, y1, x2, y2, px, py);
      break;
    case BOND_STEREO.BOLD:
      ctx.lineWidth = BOLD_BOND_WIDTH;
      renderSingleLine(ctx, x1, y1, x2, y2);
      break;
    default:
      // Normal bond — render by type
      switch (bond.type) {
        case BOND_TYPES.DOUBLE:
          renderDoubleBond(ctx, x1, y1, x2, y2, px, py, molecule, bond);
          break;
        case BOND_TYPES.TRIPLE:
          renderTripleBond(ctx, x1, y1, x2, y2, px, py);
          break;
        default:
          ctx.lineWidth = BOND_WIDTH;
          renderSingleLine(ctx, x1, y1, x2, y2);
          break;
      }
  }

  ctx.restore();
}

function renderSingleLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function renderDoubleBond(ctx, x1, y1, x2, y2, px, py, molecule, bond) {
  const gap = DOUBLE_BOND_GAP / 2;
  ctx.lineWidth = BOND_WIDTH;

  // Check if bond is in a ring — if so, offset the second line inward
  const inRing = isBondInRing(molecule, bond);

  if (inRing) {
    // One line at full position, second line offset toward ring center
    renderSingleLine(ctx, x1, y1, x2, y2);

    // Determine which side is the ring interior
    const side = getRingInteriorSide(molecule, bond);
    const offset = gap * 2 * side;
    const shortenFrac = 0.15; // shorten the inner line
    const sx1 = x1 + px * offset + (x2 - x1) * shortenFrac;
    const sy1 = y1 + py * offset + (y2 - y1) * shortenFrac;
    const sx2 = x2 + px * offset - (x2 - x1) * shortenFrac;
    const sy2 = y2 + py * offset - (y2 - y1) * shortenFrac;
    renderSingleLine(ctx, sx1, sy1, sx2, sy2);
  } else {
    // Symmetric double bond
    renderSingleLine(ctx, x1 + px * gap, y1 + py * gap, x2 + px * gap, y2 + py * gap);
    renderSingleLine(ctx, x1 - px * gap, y1 - py * gap, x2 - px * gap, y2 - py * gap);
  }
}

function renderTripleBond(ctx, x1, y1, x2, y2, px, py) {
  const gap = TRIPLE_BOND_GAP;
  ctx.lineWidth = BOND_WIDTH;

  renderSingleLine(ctx, x1, y1, x2, y2);
  renderSingleLine(ctx, x1 + px * gap, y1 + py * gap, x2 + px * gap, y2 + py * gap);
  renderSingleLine(ctx, x1 - px * gap, y1 - py * gap, x2 - px * gap, y2 - py * gap);
}

function renderWedgeBond(ctx, x1, y1, x2, y2, px, py) {
  const halfWidth = BOLD_BOND_WIDTH;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 + px * halfWidth, y2 + py * halfWidth);
  ctx.lineTo(x2 - px * halfWidth, y2 - py * halfWidth);
  ctx.closePath();
  ctx.fill();
}

function renderDashBond(ctx, x1, y1, x2, y2, px, py) {
  ctx.lineWidth = BOND_WIDTH;
  const count = HASH_COUNT;

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const cx = x1 + (x2 - x1) * t;
    const cy = y1 + (y2 - y1) * t;
    const halfW = BOLD_BOND_WIDTH * t; // widens from narrow to wide

    ctx.beginPath();
    ctx.moveTo(cx - px * halfW, cy - py * halfW);
    ctx.lineTo(cx + px * halfW, cy + py * halfW);
    ctx.stroke();
  }
}

function renderWavyBond(ctx, x1, y1, x2, y2, px, py) {
  ctx.lineWidth = BOND_WIDTH;
  ctx.beginPath();
  ctx.moveTo(x1, y1);

  const segments = WAVY_SEGMENTS;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const mx = x1 + (x2 - x1) * t;
    const my = y1 + (y2 - y1) * t;
    const sign = i % 2 === 0 ? 1 : -1;
    const amp = WAVY_AMPLITUDE * sign;

    // Control point at midpoint between this segment and last
    const tMid = (i - 0.5) / segments;
    const cpx = x1 + (x2 - x1) * tMid + px * amp;
    const cpy = y1 + (y2 - y1) * tMid + py * amp;

    ctx.quadraticCurveTo(cpx, cpy, mx, my);
  }
  ctx.stroke();
}

/**
 * Simplified ring detection — checks if a bond's two atoms share another neighbor.
 */
function isBondInRing(molecule, bond) {
  const neighborsA = new Set();
  const neighborsB = new Set();
  for (const b of molecule.bonds) {
    if (b.id === bond.id) continue;
    if (b.atomA === bond.atomA || b.atomB === bond.atomA) {
      neighborsA.add(b.atomA === bond.atomA ? b.atomB : b.atomA);
    }
    if (b.atomA === bond.atomB || b.atomB === bond.atomB) {
      neighborsB.add(b.atomA === bond.atomB ? b.atomB : b.atomA);
    }
  }
  // If neighbors of A and B overlap, bond is in a ring
  for (const n of neighborsA) {
    if (neighborsB.has(n)) return true;
  }
  return false;
}

/**
 * Determine which side of a bond faces the ring interior.
 * Returns +1 or -1.
 */
function getRingInteriorSide(molecule, bond) {
  const atomA = getAtomById(molecule, bond.atomA);
  const atomB = getAtomById(molecule, bond.atomB);
  if (!atomA || !atomB) return 1;

  // Find shared neighbor
  const neighborsA = new Set();
  for (const b of molecule.bonds) {
    if (b.id === bond.id) continue;
    if (b.atomA === bond.atomA) neighborsA.add(b.atomB);
    if (b.atomB === bond.atomA) neighborsA.add(b.atomA);
  }

  for (const b of molecule.bonds) {
    if (b.id === bond.id) continue;
    const otherId = b.atomA === bond.atomB ? b.atomB : (b.atomB === bond.atomB ? b.atomA : null);
    if (otherId && neighborsA.has(otherId)) {
      const shared = getAtomById(molecule, otherId);
      if (!shared) continue;

      // Determine which side the shared neighbor is on
      const dx = atomB.x - atomA.x;
      const dy = atomB.y - atomA.y;
      const cross = (shared.x - atomA.x) * dy - (shared.y - atomA.y) * dx;
      return cross > 0 ? -1 : 1;
    }
  }
  return 1;
}

/**
 * Return the x-offset from atom center to the connecting element character
 * center within the label. For "HO", O is to the right of center (positive).
 * For "CH3", C is to the left of center (negative).
 */
function getElementAnchorOffset(ctx, molecule, atom) {
  if (atom.label) return 0; // abbreviations: unknown anchor
  const label = buildAtomLabel(molecule, atom);
  const parts = label.parts;

  ctx.save();
  let totalWidth = 0;
  let elementStart = 0;
  let elementWidth = 0;
  let foundElement = false;

  for (const part of parts) {
    const fontSize = part.type === 'subscript' || part.type === 'superscript'
      ? ATOM_FONT_SIZE * 0.7 : ATOM_FONT_SIZE;
    ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`;
    const w = ctx.measureText(part.text).width;

    if (!foundElement && part.text === atom.element &&
        part.type !== 'subscript' && part.type !== 'superscript') {
      elementStart = totalWidth;
      elementWidth = w;
      foundElement = true;
    }
    totalWidth += w;
  }
  ctx.restore();

  if (!foundElement) return 0;
  return (elementStart + elementWidth / 2) - totalWidth / 2;
}

/**
 * Return the trim distance from the element character center to its edge,
 * so the bond stops at the element character boundary.
 */
function getElementTrim(ctx, molecule, atom) {
  if (atom.label) {
    // Abbreviation: trim by full label width
    ctx.save();
    ctx.font = ATOM_FONT;
    const w = ctx.measureText(atom.label).width;
    ctx.restore();
    return w / 2 + ATOM_LABEL_MARGIN;
  }

  const label = buildAtomLabel(molecule, atom);
  ctx.save();
  let elementWidth = 0;

  for (const part of label.parts) {
    if (part.text === atom.element &&
        part.type !== 'subscript' && part.type !== 'superscript') {
      ctx.font = `${ATOM_FONT_SIZE}px Arial, Helvetica, sans-serif`;
      elementWidth = ctx.measureText(part.text).width;
      break;
    }
  }
  ctx.restore();

  if (elementWidth === 0) {
    // Fallback
    ctx.save();
    ctx.font = ATOM_FONT;
    elementWidth = ctx.measureText(label.text).width;
    ctx.restore();
  }

  return elementWidth / 2 + ATOM_LABEL_MARGIN;
}

function renderAtom(ctx, molecule, atom, selected) {
  if (!shouldShowLabel(molecule, atom)) {
    // Draw selection indicator for invisible carbons
    if (selected) {
      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.3)';
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  const label = buildAtomLabel(molecule, atom);
  const parts = label.parts;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Measure total width for centering
  let totalWidth = 0;
  for (const part of parts) {
    const fontSize = part.type === 'subscript' || part.type === 'superscript'
      ? ATOM_FONT_SIZE * 0.7 : ATOM_FONT_SIZE;
    ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`;
    totalWidth += ctx.measureText(part.text).width;
  }

  // Draw white background to clear bond lines
  const bgPadding = 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(
    atom.x - totalWidth / 2 - bgPadding,
    atom.y - ATOM_FONT_SIZE / 2 - bgPadding,
    totalWidth + bgPadding * 2,
    ATOM_FONT_SIZE + bgPadding * 2
  );

  // Draw each part
  let xPos = atom.x - totalWidth / 2;
  for (const part of parts) {
    const fontSize = part.type === 'subscript' || part.type === 'superscript'
      ? ATOM_FONT_SIZE * 0.7 : ATOM_FONT_SIZE;
    ctx.font = `${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = selected ? '#2563eb' : atom.color;

    let yOffset = 0;
    if (part.type === 'subscript') yOffset = ATOM_FONT_SIZE * 0.25;
    if (part.type === 'superscript') yOffset = -ATOM_FONT_SIZE * 0.3;

    ctx.fillText(part.text, xPos, atom.y + yOffset);
    xPos += ctx.measureText(part.text).width;
  }

  // Selection highlight
  if (selected) {
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(
      atom.x - totalWidth / 2 - bgPadding - 1,
      atom.y - ATOM_FONT_SIZE / 2 - bgPadding - 1,
      totalWidth + bgPadding * 2 + 2,
      ATOM_FONT_SIZE + bgPadding * 2 + 2
    );
  }

  ctx.restore();
}

/**
 * Render an arrow on the canvas.
 */
export function renderArrow(ctx, arrow, selected) {
  if (arrow.points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = selected ? '#2563eb' : arrow.color;
  ctx.fillStyle = selected ? '#2563eb' : arrow.color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  const p1 = arrow.points[0];
  const p2 = arrow.points[arrow.points.length - 1];

  switch (arrow.arrowType) {
    case 'reaction':
      renderReactionArrow(ctx, p1, p2);
      break;
    case 'retro':
      renderRetroArrow(ctx, p1, p2);
      break;
    case 'equilibrium':
      renderEquilibriumArrow(ctx, p1, p2);
      break;
    case 'resonance':
      renderResonanceArrow(ctx, p1, p2);
      break;
    default:
      renderReactionArrow(ctx, p1, p2);
  }

  ctx.restore();
}

function renderReactionArrow(ctx, p1, p2) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  drawArrowhead(ctx, p1, p2, true);
}

function renderRetroArrow(ctx, p1, p2) {
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  drawArrowhead(ctx, p1, p2, false); // open arrowhead
}

function renderEquilibriumArrow(ctx, p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const px = -dy / len * 3;
  const py = dx / len * 3;

  // Top arrow (forward)
  ctx.beginPath();
  ctx.moveTo(p1.x + px, p1.y + py);
  ctx.lineTo(p2.x + px, p2.y + py);
  ctx.stroke();
  drawHalfArrowhead(ctx, { x: p1.x + px, y: p1.y + py }, { x: p2.x + px, y: p2.y + py }, 1);

  // Bottom arrow (reverse)
  ctx.beginPath();
  ctx.moveTo(p2.x - px, p2.y - py);
  ctx.lineTo(p1.x - px, p1.y - py);
  ctx.stroke();
  drawHalfArrowhead(ctx, { x: p2.x - px, y: p2.y - py }, { x: p1.x - px, y: p1.y - py }, -1);
}

function renderResonanceArrow(ctx, p1, p2) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  drawArrowhead(ctx, p1, p2, true);
  drawArrowhead(ctx, p2, p1, true);
}

function drawArrowhead(ctx, from, to, filled) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const len = 10;
  const spread = Math.PI / 7;

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - len * Math.cos(angle - spread), to.y - len * Math.sin(angle - spread));
  ctx.lineTo(to.x - len * Math.cos(angle + spread), to.y - len * Math.sin(angle + spread));
  ctx.closePath();
  if (filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

function drawHalfArrowhead(ctx, from, to, side) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const len = 8;
  const spread = Math.PI / 6 * side;

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - len * Math.cos(angle - spread), to.y - len * Math.sin(angle - spread));
  ctx.stroke();
}

/**
 * Render a text label.
 */
export function renderTextLabel(ctx, textObj, selected) {
  ctx.save();
  ctx.font = `${textObj.fontSize}px ${textObj.fontFamily}`;
  ctx.fillStyle = selected ? '#2563eb' : textObj.color;
  ctx.textBaseline = 'top';
  ctx.fillText(textObj.text, textObj.x, textObj.y);

  if (selected) {
    const metrics = ctx.measureText(textObj.text);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(textObj.x - 2, textObj.y - 2, metrics.width + 4, textObj.fontSize + 4);
  }

  ctx.restore();
}
