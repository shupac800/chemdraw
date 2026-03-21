// Chemistry drawing constants (ACS 1996 Standard inspired)

export const BOND_LENGTH = 40;          // pixels
export const BOND_WIDTH = 1.5;          // line width for single bonds
export const BOLD_BOND_WIDTH = 4;       // bold/wedge bonds
export const DOUBLE_BOND_GAP = 7;       // offset for double bond lines
export const TRIPLE_BOND_GAP = 5;       // offset for triple bond lines
export const HASH_SPACING = 3;          // spacing for hashed wedge bonds
export const HASH_COUNT = 7;            // number of hash lines
export const WAVY_AMPLITUDE = 3;        // wave height for wavy bonds
export const WAVY_SEGMENTS = 8;         // number of wave segments

export const CHAIN_ANGLE = (2 * Math.PI) / 3;  // 120 degrees
export const ANGLE_SNAP = Math.PI / 6;          // 30 degree snap increments

export const ATOM_FONT_SIZE = 14;
export const ATOM_FONT = `${ATOM_FONT_SIZE}px Arial, Helvetica, sans-serif`;
export const ATOM_LABEL_MARGIN = 3;     // gap between bond end and label
export const SNAP_RADIUS = 8;           // atom merging distance

export const HANDLE_SIZE = 8;
export const NUDGE_AMOUNT = 1;
export const NUDGE_LARGE_AMOUNT = 10;

// Page sizes in points (72 points/inch)
export const PAGE_SIZES = {
  LETTER: { width: 800, height: 600, label: 'Default' },
};

export const DEFAULT_PAGE = PAGE_SIZES.LETTER;

// Tools
export const TOOLS = {
  SELECT: 'select',
  BOND: 'bond',
  RING: 'ring',
  CHAIN: 'chain',
  ATOM_LABEL: 'atomLabel',
  ERASER: 'eraser',
  ARROW: 'arrow',
  TEXT: 'text',
};

// Bond types
export const BOND_TYPES = {
  SINGLE: 'single',
  DOUBLE: 'double',
  TRIPLE: 'triple',
};

// Bond stereo
export const BOND_STEREO = {
  NONE: 'none',
  WEDGE: 'wedge',
  DASH: 'dash',
  WAVY: 'wavy',
  BOLD: 'bold',
};

// Ring sizes
export const RING_SIZES = {
  CYCLOPROPANE: 3,
  CYCLOBUTANE: 4,
  CYCLOPENTANE: 5,
  CYCLOHEXANE: 6,
  CYCLOHEPTANE: 7,
  BENZENE: 'benzene',
};

// Arrow types
export const ARROW_TYPES = {
  REACTION: 'reaction',
  RETRO: 'retro',
  EQUILIBRIUM: 'equilibrium',
  RESONANCE: 'resonance',
};
