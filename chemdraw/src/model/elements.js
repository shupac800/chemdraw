// Periodic table data for common organic chemistry elements
// { symbol, name, atomicNumber, mass, valence (common), color }

export const ELEMENTS = {
  H:  { symbol: 'H',  name: 'Hydrogen',   atomicNumber: 1,  mass: 1.008,    valence: [1],       color: '#000000' },
  He: { symbol: 'He', name: 'Helium',     atomicNumber: 2,  mass: 4.003,    valence: [0],       color: '#D9FFFF' },
  Li: { symbol: 'Li', name: 'Lithium',    atomicNumber: 3,  mass: 6.941,    valence: [1],       color: '#CC80FF' },
  Be: { symbol: 'Be', name: 'Beryllium',  atomicNumber: 4,  mass: 9.012,    valence: [2],       color: '#C2FF00' },
  B:  { symbol: 'B',  name: 'Boron',      atomicNumber: 5,  mass: 10.81,    valence: [3],       color: '#FFB5B5' },
  C:  { symbol: 'C',  name: 'Carbon',     atomicNumber: 6,  mass: 12.011,   valence: [4],       color: '#000000' },
  N:  { symbol: 'N',  name: 'Nitrogen',   atomicNumber: 7,  mass: 14.007,   valence: [3, 5],    color: '#3050F8' },
  O:  { symbol: 'O',  name: 'Oxygen',     atomicNumber: 8,  mass: 15.999,   valence: [2],       color: '#FF0D0D' },
  F:  { symbol: 'F',  name: 'Fluorine',   atomicNumber: 9,  mass: 18.998,   valence: [1],       color: '#90E050' },
  Ne: { symbol: 'Ne', name: 'Neon',       atomicNumber: 10, mass: 20.180,   valence: [0],       color: '#B3E3F5' },
  Na: { symbol: 'Na', name: 'Sodium',     atomicNumber: 11, mass: 22.990,   valence: [1],       color: '#AB5CF2' },
  Mg: { symbol: 'Mg', name: 'Magnesium',  atomicNumber: 12, mass: 24.305,   valence: [2],       color: '#8AFF00' },
  Al: { symbol: 'Al', name: 'Aluminum',   atomicNumber: 13, mass: 26.982,   valence: [3],       color: '#BFA6A6' },
  Si: { symbol: 'Si', name: 'Silicon',    atomicNumber: 14, mass: 28.086,   valence: [4],       color: '#F0C8A0' },
  P:  { symbol: 'P',  name: 'Phosphorus', atomicNumber: 15, mass: 30.974,   valence: [3, 5],    color: '#FF8000' },
  S:  { symbol: 'S',  name: 'Sulfur',     atomicNumber: 16, mass: 32.06,    valence: [2, 4, 6], color: '#FFFF30' },
  Cl: { symbol: 'Cl', name: 'Chlorine',   atomicNumber: 17, mass: 35.45,    valence: [1],       color: '#1FF01F' },
  Ar: { symbol: 'Ar', name: 'Argon',      atomicNumber: 18, mass: 39.948,   valence: [0],       color: '#80D1E3' },
  K:  { symbol: 'K',  name: 'Potassium',  atomicNumber: 19, mass: 39.098,   valence: [1],       color: '#8F40D4' },
  Ca: { symbol: 'Ca', name: 'Calcium',    atomicNumber: 20, mass: 40.078,   valence: [2],       color: '#3DFF00' },
  Ti: { symbol: 'Ti', name: 'Titanium',   atomicNumber: 22, mass: 47.867,   valence: [4],       color: '#BFC2C7' },
  Mn: { symbol: 'Mn', name: 'Manganese',  atomicNumber: 25, mass: 54.938,   valence: [2, 4, 7], color: '#9C7AC7' },
  Fe: { symbol: 'Fe', name: 'Iron',       atomicNumber: 26, mass: 55.845,   valence: [2, 3],    color: '#E06633' },
  Co: { symbol: 'Co', name: 'Cobalt',     atomicNumber: 27, mass: 58.933,   valence: [2, 3],    color: '#F090A0' },
  Ni: { symbol: 'Ni', name: 'Nickel',     atomicNumber: 28, mass: 58.693,   valence: [2],       color: '#50D050' },
  Cu: { symbol: 'Cu', name: 'Copper',     atomicNumber: 29, mass: 63.546,   valence: [1, 2],    color: '#C88033' },
  Zn: { symbol: 'Zn', name: 'Zinc',       atomicNumber: 30, mass: 65.38,    valence: [2],       color: '#7D80B0' },
  Br: { symbol: 'Br', name: 'Bromine',    atomicNumber: 35, mass: 79.904,   valence: [1],       color: '#A62929' },
  I:  { symbol: 'I',  name: 'Iodine',     atomicNumber: 53, mass: 126.904,  valence: [1],       color: '#940094' },
  Pd: { symbol: 'Pd', name: 'Palladium',  atomicNumber: 46, mass: 106.42,   valence: [2, 4],    color: '#006985' },
  Pt: { symbol: 'Pt', name: 'Platinum',   atomicNumber: 78, mass: 195.084,  valence: [2, 4],    color: '#D0D0E0' },
};

// Common abbreviations
export const ABBREVIATIONS = {
  Me:   { formula: 'CH3',    mass: 15.035 },
  Et:   { formula: 'C2H5',   mass: 29.062 },
  Pr:   { formula: 'C3H7',   mass: 43.089 },
  iPr:  { formula: 'C3H7',   mass: 43.089 },
  Bu:   { formula: 'C4H9',   mass: 57.116 },
  tBu:  { formula: 'C4H9',   mass: 57.116 },
  Ph:   { formula: 'C6H5',   mass: 77.104 },
  Bn:   { formula: 'C7H7',   mass: 91.131 },
  Ac:   { formula: 'COCH3',  mass: 43.045 },
  OMe:  { formula: 'OCH3',   mass: 31.034 },
  OEt:  { formula: 'OC2H5',  mass: 45.061 },
  OH:   { formula: 'OH',     mass: 17.008 },
  NH2:  { formula: 'NH2',    mass: 16.023 },
  NO2:  { formula: 'NO2',    mass: 46.006 },
  CN:   { formula: 'CN',     mass: 26.018 },
  COOH: { formula: 'COOH',   mass: 45.018 },
  CHO:  { formula: 'CHO',    mass: 29.018 },
  Ts:   { formula: 'C7H7SO2', mass: 155.194 },
  TMS:  { formula: 'Si(CH3)3', mass: 73.172 },
};

// Atom hotkey mapping
export const ATOM_HOTKEYS = {
  'n': 'N',
  'o': 'O',
  's': 'S',
  'f': 'F',
  'l': 'Cl',
  'b': 'Br',
  'i': 'I',
  'p': 'P',
};

export function getElement(symbol) {
  return ELEMENTS[symbol] || null;
}

export function getDefaultValence(symbol) {
  const el = ELEMENTS[symbol];
  return el ? el.valence[0] : 4; // default to 4 (carbon)
}

export function getAtomicMass(symbol) {
  const el = ELEMENTS[symbol];
  return el ? el.mass : 0;
}

export function getElementColor(symbol) {
  const el = ELEMENTS[symbol];
  // Use black for display if the element color is too light
  if (!el) return '#000000';
  return el.color;
}

export function isValidElement(symbol) {
  return symbol in ELEMENTS;
}
