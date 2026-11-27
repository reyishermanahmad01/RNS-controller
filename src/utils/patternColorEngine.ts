import {
  AnimationPattern,
  AutoBelangConfig,
  ControllerState,
  LedMatrixConfig,
  ManualSideColorConfig,
  RgbMode,
} from '../types/controller';
import { getLiveAudioFrame } from './audioReactive';

export interface PatternCoord {
  side: 'left' | 'right';
  normX: number;
  normY: number;
  col: number;
  row: number;
}

export interface MatrixCell extends PatternCoord {
  hwIndex: number; // 0..186 ordered physically from Baris 8 (bawah) to Baris 1 (atas)
}

export const MATRIX_COLS = 32;
export const MATRIX_ROWS = 8;

// Exact 8-row LED matrix geometry per side (187 LEDs per panel x 2 = 374 LEDs total)
export const MATRIX_ROW_SPANS: [number, number][] = [
  [2, 28],  // Baris 1: 27 LEDs
  [0, 31],  // Baris 2: 32 LEDs
  [0, 31],  // Baris 3: 32 LEDs
  [2, 29],  // Baris 4: 28 LEDs
  [4, 27],  // Baris 5: 24 LEDs
  [6, 25],  // Baris 6: 20 LEDs
  [8, 23],  // Baris 7: 16 LEDs
  [12, 19], // Baris 8:  8 LEDs
];

function buildMatrixCells(): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const side of ['left', 'right'] as const) {
    let hwIndex = 0;
    for (let row = MATRIX_ROWS - 1; row >= 0; row--) {
      const [minC, maxC] = MATRIX_ROW_SPANS[row];
      const rowWidth = Math.max(1, maxC - minC);
      for (let c = minC; c <= maxC; c++) {
        const col = side === 'left' ? MATRIX_COLS - 1 - c : c;
        cells.push({
          col,
          row,
          hwIndex,
          side,
          normX: (c - minC) / rowWidth, // 0 at center, 1 at outer wing
          normY: row / (MATRIX_ROWS - 1),
        });
        hwIndex += 1;
      }
    }
  }
  return cells;
}

export const MATRIX_CELLS: MatrixCell[] = buildMatrixCells();

export function hexToRgb(hex: string): [number, number, number] {
  const clean = (hex || '#22D3EE').replace('#', '').trim();
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [34, 211, 238];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
  ];
}

// Compact 5x7 pixel font for LED Matrix Scrolling Text ("Tulisan Berjalan")
const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e],
  B: [0x7f, 0x49, 0x49, 0x49, 0x36],
  C: [0x3e, 0x41, 0x41, 0x41, 0x22],
  D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41],
  F: [0x7f, 0x09, 0x09, 0x09, 0x01],
  G: [0x3e, 0x41, 0x49, 0x49, 0x7a],
  H: [0x7f, 0x08, 0x08, 0x08, 0x7f],
  I: [0x00, 0x41, 0x7f, 0x41, 0x00],
  J: [0x20, 0x40, 0x41, 0x3f, 0x01],
  K: [0x7f, 0x08, 0x14, 0x22, 0x41],
  L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  N: [0x7f, 0x04, 0x08, 0x10, 0x7f],
  O: [0x3e, 0x41, 0x41, 0x41, 0x3e],
  P: [0x7f, 0x09, 0x09, 0x09, 0x06],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e],
  R: [0x7f, 0x09, 0x19, 0x29, 0x46],
  S: [0x46, 0x49, 0x49, 0x49, 0x31],
  T: [0x01, 0x01, 0x7f, 0x01, 0x01],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f],
  V: [0x1f, 0x20, 0x40, 0x20, 0x1f],
  W: [0x3f, 0x40, 0x38, 0x40, 0x3f],
  X: [0x63, 0x14, 0x08, 0x14, 0x63],
  Y: [0x07, 0x08, 0x70, 0x08, 0x07],
  Z: [0x61, 0x51, 0x49, 0x45, 0x43],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  '!': [0x00, 0x00, 0x5f, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
};

function sampleScrollingTextPixel(
  text: string,
  col: number,
  row: number,
  phase: number,
  direction: 'left' | 'right' | 'up' | 'down' = 'left'
): boolean {
  const clean = (text || 'RNS RGB').toUpperCase().slice(0, 24) + '   ';
  const glyphWidth = 6; // 5 cols + 1 space
  const totalCols = Math.max(1, clean.length * glyphWidth);
  const shift = Math.floor(phase * 10);
  const effectiveRow =
    direction === 'up'
      ? (row + shift) % 8
      : direction === 'down'
        ? (row - (shift % 8) + 8) % 8
        : row;
  if (effectiveRow < 0 || effectiveRow > 6) return false;

  const colOffset =
    direction === 'right'
      ? (col - (shift % totalCols) + totalCols) % totalCols
      : (col + shift) % totalCols;
  const charIdx = Math.floor(colOffset / glyphWidth) % clean.length;
  const innerCol = colOffset % glyphWidth;
  if (innerCol >= 5) return false;
  const ch = clean[charIdx];
  const glyph = FONT_5X7[ch] || FONT_5X7[' '];
  const bits = glyph[innerCol] || 0;
  return ((bits >> effectiveRow) & 1) === 1;
}

export function computeMatrixPattern(
  pattern: AnimationPattern,
  primary: [number, number, number],
  secondary: [number, number, number],
  cell: PatternCoord,
  timeSec: number,
  speedFactor: number,
  rowsCount = MATRIX_ROWS
): [number, number, number] {
  const spd = 0.5 + speedFactor * 2.8;
  const phase = timeSec * spd;
  const t = cell.normX;
  const y = cell.normY;
  const signedT = cell.side === 'left' ? -t : t;

  switch (pattern) {
    case 'aurora-dual': {
      const wave = 0.5 + 0.5 * Math.sin(t * 4.5 + y * 2.2 - phase * 1.5);
      return cell.side === 'left'
        ? lerpRgb(primary, secondary, wave * 0.7)
        : lerpRgb(secondary, primary, wave * 0.55);
    }
    case 'rainbow-flow': {
      const hue = (t * 170 + y * 50 + phase * 85 + (cell.side === 'left' ? 0 : 40)) % 360;
      return hslToRgb(hue, 0.92, 0.52);
    }
    case 'cyber-scan': {
      const pos = 0.5 + 0.5 * Math.sin(phase * 2.2);
      const dist = Math.abs(t - pos);
      const intensity = Math.max(0.12, 1 - dist * 4.5);
      return [
        Math.round(primary[0] * intensity),
        Math.round(primary[1] * intensity),
        Math.round(primary[2] * intensity),
      ];
    }
    case 'plasma-wave': {
      const mix = 0.5 + 0.5 * Math.sin(signedT * 5 + y * 3 + phase * 2);
      return lerpRgb(primary, secondary, mix);
    }
    case 'neon-breathe': {
      const b = 0.16 + 0.84 * (0.5 + 0.5 * Math.sin(phase * 1.6));
      return [Math.round(primary[0] * b), Math.round(primary[1] * b), Math.round(primary[2] * b)];
    }
    case 'meteor-rain': {
      const head = ((phase * 1.1 + t * 0.6) % 1.3) - 0.15;
      const diff = head - y;
      const tail = diff >= 0 && diff < 0.48 ? 1 - diff / 0.48 : 0.08;
      return lerpRgb([22, 28, 38], primary, tail);
    }
    case 'crimson-pulse': {
      const pulse = 0.22 + 0.78 * Math.pow(0.5 + 0.5 * Math.sin(phase * 2.4 - t * 2.4), 1.5);
      return [Math.round(primary[0] * pulse), Math.round(primary[1] * pulse), Math.round(primary[2] * pulse)];
    }
    case 'dual-comet': {
      const p1 = (phase * 0.85) % 1;
      const p2 = 1 - ((phase * 0.85) % 1);
      const d1 = Math.max(0, 1 - Math.abs(t - p1) * 5);
      const d2 = Math.max(0, 1 - Math.abs(t - p2) * 5);
      const c1 = lerpRgb([22, 26, 36], primary, d1);
      const c2 = lerpRgb([22, 26, 36], secondary, d2);
      return [Math.min(255, c1[0] + c2[0]), Math.min(255, c1[1] + c2[1]), Math.min(255, c1[2] + c2[2])];
    }
    case 'ocean-drift': {
      const mix = 0.5 + 0.5 * Math.sin(t * 3.5 - y * 2 + phase * 1.3);
      return lerpRgb(primary, secondary, mix);
    }
    case 'matrix-drop': {
      const colShift = (cell.col * 0.37) % 1;
      const seg = (y + phase * 0.9 + colShift) % 1;
      const glow = seg < 0.35 ? 1 - seg / 0.35 : 0.08;
      return lerpRgb([16, 24, 30], primary, glow);
    }
    case 'sparkle-ice': {
      const hash = Math.abs(Math.sin((cell.col * 31 + cell.row * 17) * 12.9898 + Math.floor(phase * 8)));
      return hash > 0.78 ? primary : lerpRgb([20, 28, 42], secondary, 0.35);
    }
    case 'fire-ember': {
      const flicker = 0.5 + 0.5 * Math.sin(t * 6 + y * 5 - phase * 3.5);
      return lerpRgb(primary, secondary, flicker * 0.85);
    }
    case 'strobe-duo': {
      const alt = Math.floor(phase * 3.5) % 2 === 0;
      const on = (cell.side === 'left' && alt) || (cell.side === 'right' && !alt);
      const col = cell.side === 'left' ? primary : secondary;
      return on ? col : [24, 28, 38];
    }
    case 'prism-shift': {
      const hue = (signedT * 130 + y * 60 + phase * 110) % 360;
      return hslToRgb(hue, 0.95, 0.54);
    }
    case 'heartbeat': {
      const cyc = (phase * 0.8) % 1;
      const beat1 = Math.exp(-Math.pow((cyc - 0.18) * 14, 2));
      const beat2 = 0.8 * Math.exp(-Math.pow((cyc - 0.36) * 14, 2));
      const amp = Math.min(1, 0.16 + beat1 + beat2);
      return [Math.round(primary[0] * amp), Math.round(primary[1] * amp), Math.round(primary[2] * amp)];
    }
    case 'vapor-fade': {
      const mix = 0.5 + 0.5 * Math.cos(t * 3 + phase * 1.2);
      return lerpRgb(primary, secondary, mix);
    }
    case 'knight-sweep': {
      const pos = 0.5 + 0.5 * Math.sin(phase * 2.5);
      const hit = Math.max(0.12, 1 - Math.abs(t - pos) * 4.5);
      return lerpRgb([26, 16, 18], primary, hit);
    }
    case 'solid-cyan':
    case 'solid-red':
    case 'solid-ice':
    case 'solid-amber':
    case 'solid-violet':
      return primary;
    case 'solid-dual':
      return y < 0.45 ? primary : secondary;
    case 'wave-bounce': {
      const wave = 0.5 + 0.5 * Math.sin(Math.abs(t - 0.5) * 9 - phase * 2.3);
      return lerpRgb(secondary, primary, wave);
    }
    case 'horizon-split': {
      const flip = 0.5 + 0.5 * Math.sin(phase * 1.1);
      return cell.side === 'left' ? lerpRgb(primary, secondary, flip) : lerpRgb(secondary, primary, flip);
    }
    case 'laser-cross': {
      const scanA = (phase * 0.65) % 1;
      const scanB = 1 - scanA;
      const dA = Math.abs(t * 0.7 + y * 0.3 - scanA);
      const dB = Math.abs(t * 0.7 + (1 - y) * 0.3 - scanB);
      const hitA = Math.max(0, 1 - dA * 8);
      const hitB = Math.max(0, 1 - dB * 8);
      const cA = lerpRgb([18, 22, 32], primary, hitA);
      const cB = lerpRgb([18, 22, 32], secondary, hitB);
      return [
        Math.min(255, cA[0] + cB[0]),
        Math.min(255, cA[1] + cB[1]),
        Math.min(255, cA[2] + cB[2]),
      ];
    }
    case 'dna-helix': {
      const s1 = 0.5 + 0.36 * Math.sin(t * 6.2 - phase * 2.2);
      const s2 = 0.5 - 0.36 * Math.sin(t * 6.2 - phase * 2.2);
      const w1 = Math.max(0, 1 - Math.abs(y - s1) * 4.5);
      const w2 = Math.max(0, 1 - Math.abs(y - s2) * 4.5);
      if (w1 >= w2) return lerpRgb([18, 22, 32], primary, w1);
      return lerpRgb([18, 22, 32], secondary, w2);
    }
    case 'vortex-spin': {
      const dx = t - 0.5;
      const dy = y - 0.5;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      const wave = 0.5 + 0.5 * Math.sin(angle * 3 + dist * 10 - phase * 3.2);
      return lerpRgb(secondary, primary, wave);
    }
    case 'stealth-dim': {
      const edge = y < 0.25 || y > 0.72 ? 0.65 : 0.16;
      const breathe = 0.7 + 0.3 * Math.sin(phase);
      return [
        Math.round(secondary[0] * edge * breathe),
        Math.round(secondary[1] * edge * breathe),
        Math.round(secondary[2] * edge * breathe),
      ];
    }
    // White Strobo (6)
    case 'white-strobe-flash': {
      const on = Math.floor(phase * 5.2) % 2 === 0;
      return on ? [255, 255, 255] : [18, 22, 30];
    }
    case 'white-strobe-alt': {
      const step = Math.floor(phase * 5.5) % 2 === 0;
      const on = (cell.side === 'left' && step) || (cell.side === 'right' && !step);
      return on ? [255, 255, 255] : [18, 22, 30];
    }
    case 'white-strobe-burst': {
      const cyc = (phase * 1.45) % 1;
      const hit =
        (cyc > 0.0 && cyc < 0.09) ||
        (cyc > 0.15 && cyc < 0.24) ||
        (cyc > 0.3 && cyc < 0.39);
      return hit ? [255, 255, 255] : [18, 22, 30];
    }
    case 'white-strobe-pulse': {
      const cyc = (phase * 1.8) % 1;
      const decay = cyc < 0.16 ? 1 : Math.max(0.08, 1 - (cyc - 0.16) * 2.1);
      return lerpRgb([18, 22, 30], [255, 255, 255], decay);
    }
    case 'white-strobe-quad': {
      const zone = Math.floor(t * 2) + (cell.side === 'right' ? 2 : 0);
      const slot = Math.floor(phase * 6.5) % 4;
      const subFlash = Math.floor(phase * 26) % 2 === 0;
      return zone === slot && subFlash ? [255, 255, 255] : [16, 20, 30];
    }
    case 'white-strobe-wave': {
      const cyc = (phase * 2.1) % 1;
      const dist = Math.abs(t - cyc);
      const hit = dist < 0.16 && Math.floor(phase * 18) % 2 === 0;
      return hit ? [255, 255, 255] : [18, 22, 30];
    }
    // White Running (6)
    case 'white-run-out': {
      const head = ((phase * 1.15) % 1.25) - 0.1;
      const d = head - t;
      const trail = d >= 0 && d < 0.32 ? 1 - d / 0.32 : 0.06;
      return lerpRgb([18, 22, 30], [255, 255, 255], trail);
    }
    case 'white-run-in': {
      const head = 1.1 - ((phase * 1.15) % 1.25);
      const d = t - head;
      const trail = d >= 0 && d < 0.32 ? 1 - d / 0.32 : 0.06;
      return lerpRgb([18, 22, 30], [255, 255, 255], trail);
    }
    case 'white-run-bounce': {
      const pos = 0.5 + 0.5 * Math.sin(phase * 2.6);
      const hit = Math.max(0.06, 1 - Math.abs(t - pos) * 5.2);
      return lerpRgb([18, 22, 30], [255, 255, 255], hit);
    }
    case 'white-run-rows': {
      const activeRow = Math.floor((phase * 2.8) % rowsCount);
      const diff = Math.abs(cell.row - activeRow);
      const glow = diff === 0 ? 1 : diff === 1 ? 0.35 : 0.06;
      return lerpRgb([18, 22, 30], [255, 255, 255], glow);
    }
    case 'white-run-dual': {
      const p1 = (phase * 1.1) % 1;
      const p2 = 1 - p1;
      const g = Math.max(0.06, 1 - Math.min(Math.abs(t - p1), Math.abs(t - p2)) * 5.5);
      return lerpRgb([18, 22, 30], [255, 255, 255], g);
    }
    case 'white-run-comet': {
      const head = ((phase * 1.35) % 1.4) - 0.1;
      const d = head - t;
      const tail = d >= 0 && d < 0.5 ? Math.pow(1 - d / 0.5, 1.8) : 0.05;
      return lerpRgb([16, 20, 28], [255, 255, 255], tail);
    }
    // White Matrix (7+)
    case 'white-matrix-snake': {
      const cyc = (phase * 1.45) % rowsCount;
      const activeRow = Math.floor(cyc);
      const frac = cyc - activeRow;
      const headX = activeRow % 2 === 0 ? frac : 1 - frac;
      const sameRow = cell.row === activeRow;
      const distX = Math.abs(t - headX);
      const trail =
        sameRow && distX < 0.34
          ? 1 - distX / 0.34
          : cell.row === activeRow - 1
            ? 0.25
            : 0.06;
      return lerpRgb([18, 22, 30], [255, 255, 255], trail);
    }
    case 'white-matrix-checker': {
      const shift = Math.floor(phase * 3.4) % 2;
      const bx = Math.floor(t * 6);
      const on = (bx + cell.row + shift) % 2 === 0;
      return on ? [255, 255, 255] : [20, 24, 34];
    }
    case 'white-matrix-rain': {
      const colSeed = (cell.col * 0.6180339) % 1;
      const head = (phase * 1.15 + colSeed) % 1.25;
      const d = head - y;
      const glow = d >= 0 && d < 0.42 ? 1 - d / 0.42 : 0.07;
      return lerpRgb([16, 20, 30], [255, 255, 255], glow);
    }
    case 'white-matrix-scan': {
      const sx = 0.5 + 0.48 * Math.sin(phase * 2.1);
      const sy = 0.5 + 0.48 * Math.cos(phase * 1.7);
      const gx = Math.max(0, 1 - Math.abs(t - sx) * 7);
      const gy = Math.max(0, 1 - Math.abs(y - sy) * 5);
      return lerpRgb([16, 20, 30], [255, 255, 255], Math.min(1, Math.max(gx, gy)));
    }
    case 'white-matrix-sparkle': {
      const hash = Math.abs(Math.sin((cell.col * 41 + cell.row * 19) * 17.31 + Math.floor(phase * 9)));
      return hash > 0.72 ? [255, 255, 255] : [22, 26, 36];
    }
    case 'white-matrix-cross': {
      const shift = (phase * 0.75) % 1;
      const dA = Math.abs(((t + y) * 0.5 - shift + 1) % 1 - 0.5);
      const dB = Math.abs(((t + (1 - y)) * 0.5 - shift + 1) % 1 - 0.5);
      const glow = Math.max(0.06, 1 - Math.min(dA, dB) * 9);
      return lerpRgb([16, 20, 30], [255, 255, 255], glow);
    }
    case 'white-matrix-bars': {
      const barIdx = Math.floor(t * 10);
      const barH = 0.22 + 0.75 * (0.5 + 0.5 * Math.sin(phase * 3.9 + barIdx * 1.37));
      return 1 - y <= barH ? [255, 255, 255] : [18, 22, 30];
    }
    // Rich 2D Matrix & New Patterns
    case 'matrix-rain': {
      const colSeed = (cell.col * 0.6180339) % 1;
      const head = (phase * 1.1 + colSeed) % 1.25;
      const d = head - y;
      const intensity = d >= 0 && d < 0.42 ? 1 - d / 0.42 : 0.08;
      if (d >= 0 && d < 0.1) return lerpRgb(primary, [255, 255, 255], 0.55);
      return lerpRgb([14, 18, 28], primary, intensity);
    }
    case 'checker-wave': {
      const shift = Math.floor(phase * 2.2);
      const bx = Math.floor(t * 5 + shift * 0.5);
      const isA = (bx + cell.row + shift) % 2 === 0;
      return isA ? primary : secondary;
    }
    case 'radar-sweep': {
      const dx = t - 0.5;
      const dy = y - 0.5;
      const angle = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
      const beam = (phase * 0.55) % 1;
      const diff = (beam - angle + 1) % 1;
      const glow = diff < 0.32 ? 1 - diff / 0.32 : 0.1;
      return lerpRgb([14, 18, 28], lerpRgb(secondary, primary, glow), glow);
    }
    case 'zigzag-snake': {
      const totalPos = (phase * 1.8) % rowsCount;
      const activeRow = Math.floor(totalPos);
      const frac = totalPos - activeRow;
      const headX = activeRow % 2 === 0 ? frac : 1 - frac;
      const rowDist = Math.abs(cell.row - activeRow);
      const xDist = Math.abs(t - headX);
      if (rowDist === 0 && xDist < 0.32) {
        return lerpRgb(secondary, primary, 1 - xDist / 0.32);
      }
      if (rowDist === 1 && xDist < 0.18) {
        return lerpRgb([14, 18, 28], secondary, 0.45);
      }
      return [14, 18, 28];
    }
    case 'cyber-eyes': {
      const cx = 0.5 + 0.14 * Math.sin(phase * 1.4);
      const cy = 0.42;
      const d = Math.hypot((t - cx) * 1.1, (y - cy) * 1.5);
      if (d < 0.14) return [248, 250, 252];
      if (d < 0.28) return cell.side === 'left' ? primary : secondary;
      return [14, 18, 28];
    }
    case 'police-strobe': {
      const cyc = (phase * 2.2) % 1;
      const leftDouble = cyc < 0.12 || (cyc > 0.18 && cyc < 0.3);
      const rightDouble = (cyc > 0.5 && cyc < 0.62) || (cyc > 0.68 && cyc < 0.8);
      if (cell.side === 'left' && leftDouble) return primary;
      if (cell.side === 'right' && rightDouble) return secondary;
      return [14, 18, 28];
    }
    case 'cyber-wing': {
      const wing = (phase * 1.35) % 1.3;
      const diag = t * 0.72 + Math.abs(y - 0.5) * 0.56;
      const dist = Math.abs(diag - wing);
      if (dist < 0.16) return lerpRgb(primary, [255, 255, 255], 0.35);
      if (dist < 0.32) return lerpRgb(secondary, primary, 1 - dist / 0.32);
      return [14, 18, 28];
    }
    case 'twister-wave': {
      const bandY = 0.5 + 0.38 * Math.sin(t * 5.2 - phase * 2.4);
      const dist = Math.abs(y - bandY);
      const intensity = Math.max(0, 1 - dist * 3.4);
      const mix = 0.5 + 0.5 * Math.cos(t * 4 + phase * 1.6);
      return lerpRgb([14, 18, 28], lerpRgb(primary, secondary, mix), intensity);
    }
    case 'shockwave-ring': {
      const r = Math.hypot((t - 0.5) * 1.2, y - 0.5);
      const ring = (phase * 0.9) % 0.95;
      const diff = Math.abs(r - ring);
      if (diff < 0.14) return lerpRgb(primary, secondary, diff / 0.14);
      return [12, 16, 26];
    }
    case 'spectrum-bars': {
      const barIdx = Math.floor(t * 10);
      const barH = 0.25 + 0.72 * (0.5 + 0.5 * Math.sin(phase * 3.8 + barIdx * 1.37));
      const invY = 1 - y;
      if (invY <= barH) {
        return invY > barH - 0.14 ? secondary : primary;
      }
      return [14, 18, 28];
    }
    case 'warp-speed': {
      const lane = Math.floor(y * rowsCount);
      const laneSeed = (lane * 0.37) % 1;
      const pos = (phase * 1.55 + laneSeed) % 1.2;
      const d = pos - t;
      if (d >= 0 && d < 0.28) {
        return lerpRgb(secondary, primary, 1 - d / 0.28);
      }
      return [12, 16, 26];
    }
    case 'fireworks-burst': {
      const burstIdx = Math.floor(phase * 0.85);
      const frac = (phase * 0.85) % 1;
      const cx = 0.2 + 0.6 * ((Math.sin(burstIdx * 19.7) + 1) * 0.5);
      const cy = 0.2 + 0.6 * ((Math.cos(burstIdx * 31.3) + 1) * 0.5);
      const dist = Math.hypot((t - cx) * 1.1, y - cy);
      const radius = frac * 0.75;
      const diff = Math.abs(dist - radius);
      const fade = Math.max(0, 1 - frac * 0.95);
      if (diff < 0.12) {
        const sparkCol = burstIdx % 2 === 0 ? primary : secondary;
        return lerpRgb([14, 18, 28], sparkCol, (1 - diff / 0.12) * fade);
      }
      return [14, 18, 28];
    }
    case 'galaxy-spiral': {
      const dx = t - 0.5;
      const dy = y - 0.5;
      const ang = Math.atan2(dy, dx);
      const rad = Math.hypot(dx, dy);
      const spiral = 0.5 + 0.5 * Math.sin(ang * 2 + rad * 12 - phase * 2.6);
      return lerpRgb([14, 18, 28], lerpRgb(secondary, primary, spiral), Math.max(0.15, spiral));
    }
    case 'infinity-loop': {
      const px = 0.5 + 0.38 * Math.sin(phase * 1.8);
      const py = 0.5 + 0.32 * Math.sin(phase * 3.6);
      const d1 = Math.hypot((t - px) * 1.1, y - py);
      const px2 = 0.5 - 0.38 * Math.sin(phase * 1.8);
      const py2 = 0.5 - 0.32 * Math.sin(phase * 3.6);
      const d2 = Math.hypot((t - px2) * 1.1, y - py2);
      if (d1 < 0.24) return lerpRgb([14, 18, 28], primary, 1 - d1 / 0.24);
      if (d2 < 0.24) return lerpRgb([14, 18, 28], secondary, 1 - d2 / 0.24);
      return [14, 18, 28];
    }
    case 'matrix-equalizer': {
      const barIdx = Math.floor(t * 16);
      const barH = 0.2 + 0.78 * (0.5 + 0.5 * Math.sin(phase * 4.2 + barIdx * 1.7));
      const invY = 1 - y;
      if (invY <= barH) {
        const hue = (barIdx * 24 + invY * 90 + phase * 40) % 360;
        return hslToRgb(hue, 0.95, invY > barH - 0.12 ? 0.65 : 0.5);
      }
      return [12, 16, 26];
    }
    case 'matrix-moving-pixel': {
      let bestGlow = 0;
      let useSecond = false;
      for (let i = 0; i < 6; i++) {
        const px = 0.5 + 0.44 * Math.sin(phase * (1.2 + i * 0.25) + i * 2.1);
        const py = 0.5 + 0.42 * Math.cos(phase * (1.5 + i * 0.2) + i * 1.4);
        const d = Math.hypot((t - px) * 1.2, y - py);
        if (d < 0.16) {
          const g = 1 - d / 0.16;
          if (g > bestGlow) {
            bestGlow = g;
            useSecond = i % 2 === 1;
          }
        }
      }
      return bestGlow > 0
        ? lerpRgb([14, 18, 28], useSecond ? secondary : primary, bestGlow)
        : [14, 18, 28];
    }
    case 'matrix-scrolling-text': {
      const on = sampleScrollingTextPixel('RNS RGB', cell.col, cell.row, phase * 0.7, 'left');
      return on ? primary : [14, 18, 28];
    }
    case 'matrix-digital-wave': {
      const waveY = 0.5 + 0.35 * Math.sin(t * 8 - phase * 2.8);
      const d = Math.abs(y - waveY);
      const glow = Math.max(0, 1 - d * 4.5);
      return glow > 0 ? lerpRgb(secondary, primary, glow) : [14, 18, 28];
    }
    case 'matrix-running-lines': {
      const posA = (phase * 0.85) % 1;
      const posB = (phase * 0.85 + 0.5) % 1;
      const hitA = Math.abs(y - posA) < 0.16;
      const hitB = Math.abs(y - posB) < 0.16;
      if (hitA) return primary;
      if (hitB) return secondary;
      return [14, 18, 28];
    }
    case 'matrix-moving-dots': {
      let glow = 0;
      for (let i = 0; i < 4; i++) {
        const ang = phase * 2.1 + (i * Math.PI) / 2;
        const dx = 0.5 + 0.36 * Math.cos(ang);
        const dy = 0.5 + 0.32 * Math.sin(ang);
        const d = Math.hypot((t - dx) * 1.2, y - dy);
        if (d < 0.18) glow = Math.max(glow, 1 - d / 0.18);
      }
      return glow > 0 ? lerpRgb(secondary, primary, glow) : [14, 18, 28];
    }
  }
}

export function computeDedicatedMatrixRgb(
  cfg: LedMatrixConfig,
  cell: PatternCoord,
  timeSec: number
): [number, number, number] {
  const spd = 0.45 + (cfg.speed / 100) * 2.6;
  const phase = timeSec * spd;
  const primary = hexToRgb(cfg.primaryColor || '#22D3EE');
  const secondary = hexToRgb(cfg.secondaryColor || '#EC4899');
  const scale = 0.65 + (Math.max(1, Math.min(5, cfg.size || 3)) - 1) * 0.18;

  if (cfg.category === 'eyes') {
    let expr = cfg.eyeExpression || 'angry';
    if (expr === 'auto-cycle') {
      const cycleList: ('angry' | 'squint' | 'blink' | 'look-lr')[] = [
        'angry',
        'look-lr',
        'squint',
        'blink',
      ];
      expr = cycleList[Math.floor(timeSec / 3.2) % cycleList.length];
    }

    let cx = 0.5;
    let cy = 0.48;
    let lidOpen = 1;
    let slant = 0;

    if (expr === 'angry') {
      cx = 0.45 + 0.08 * Math.sin(phase * 1.2);
      slant = cell.side === 'left' ? -0.35 : 0.35;
      lidOpen = 0.82;
    } else if (expr === 'squint') {
      cx = 0.5 + 0.06 * Math.sin(phase);
      lidOpen = 0.45;
      slant = cell.side === 'left' ? -0.18 : 0.18;
    } else if (expr === 'blink') {
      const blinkCyc = (timeSec * (0.6 + cfg.speed / 160)) % 2.4;
      lidOpen = blinkCyc > 2.05 ? Math.abs(Math.cos(((blinkCyc - 2.05) / 0.35) * Math.PI)) : 1;
    } else if (expr === 'look-lr') {
      cx = 0.5 + 0.24 * Math.sin(phase * 1.8);
      cy = 0.46 + 0.08 * Math.cos(phase * 2.4);
    }

    // Apply direction nudging
    if (cfg.direction === 'up') cy -= 0.08;
    else if (cfg.direction === 'down') cy += 0.08;

    const dx = (cell.normX - cx) / scale;
    const adjustedY = cell.normY + slant * (cell.normX - 0.5);
    const dy = (adjustedY - cy) / (scale * Math.max(0.15, lidOpen));

    let dist = Math.hypot(dx * 1.2, dy * 1.5);
    if (cfg.eyeShape === 'cyber-slit') {
      dist = Math.max(Math.abs(dx * 1.05), Math.abs(dy * 1.85));
    } else if (cfg.eyeShape === 'hex') {
      dist = Math.max(Math.abs(dx * 1.15), Math.abs(dx * 0.55) + Math.abs(dy * 1.2));
    } else if (cfg.eyeShape === 'anime') {
      dist = Math.hypot(dx * 1.35, dy * 1.15);
    }

    if (dist < 0.15) return [248, 250, 252];
    if (dist < 0.33) return lerpRgb(primary, secondary, dist / 0.33);
    if (dist < 0.42) return [18, 24, 38];
    return [10, 14, 22];
  }

  // Matrix Lainnya
  const dir = cfg.direction || 'left';
  const dirSign = dir === 'right' || dir === 'down' ? -1 : 1;
  const t = dirSign === 1 ? cell.normX : 1 - cell.normX;
  const y = dirSign === 1 ? cell.normY : 1 - cell.normY;

  switch (cfg.matrixEffect) {
    case 'equalizer-rgb': {
      const bars = Math.max(6, Math.round(14 / scale));
      const barIdx = Math.floor(t * bars);
      const barH = 0.18 + 0.8 * (0.5 + 0.5 * Math.sin(phase * 3.8 + barIdx * 1.37));
      const invY = 1 - cell.normY;
      if (invY <= barH) {
        const hue = (barIdx * (360 / bars) + invY * 70 + phase * 40) % 360;
        return hslToRgb(hue, 0.94, invY > barH - 0.12 ? 0.68 : 0.52);
      }
      return [12, 16, 26];
    }
    case 'moving-pixel': {
      let bestGlow = 0;
      let alt = false;
      const radius = 0.14 * scale;
      for (let i = 0; i < 8; i++) {
        const px = (phase * (0.45 + i * 0.08) + i * 0.19) % 1;
        const py = 0.5 + 0.4 * Math.sin(phase * (1.2 + i * 0.25) + i * 1.7);
        const d = Math.hypot((t - px) * 1.15, y - py);
        if (d < radius) {
          const g = 1 - d / radius;
          if (g > bestGlow) {
            bestGlow = g;
            alt = i % 2 === 1;
          }
        }
      }
      return bestGlow > 0
        ? lerpRgb([14, 18, 28], alt ? secondary : primary, bestGlow)
        : [12, 16, 26];
    }
    case 'scrolling-text': {
      const globalCol =
        cell.side === 'left' ? cell.col : MATRIX_COLS + 2 + cell.col;
      const hit = sampleScrollingTextPixel(
        cfg.scrollingText || 'RNS RGB',
        globalCol,
        cell.row,
        phase * 0.75,
        dir
      );
      if (hit) {
        return lerpRgb(primary, secondary, cell.normY);
      }
      return [12, 16, 26];
    }
    case 'digital-wave': {
      const waveY = 0.5 + 0.36 * Math.sin(t * (6 / scale) - phase * 2.5);
      const dist = Math.abs(y - waveY);
      const thickness = 0.22 * scale;
      if (dist < thickness) {
        return lerpRgb(secondary, primary, 1 - dist / thickness);
      }
      return [12, 16, 26];
    }
    case 'running-lines': {
      const count = Math.max(1, Math.min(4, Math.round(cfg.size || 2)));
      for (let i = 0; i < count; i++) {
        const p = (phase * 0.9 + i / count) % 1;
        const coord = dir === 'up' || dir === 'down' ? y : t;
        if (Math.abs(coord - p) < 0.12) {
          return i % 2 === 0 ? primary : secondary;
        }
      }
      return [12, 16, 26];
    }
    case 'moving-dots': {
      let glow = 0;
      const rDot = 0.16 * scale;
      for (let i = 0; i < 5; i++) {
        const ang = phase * 2.2 * dirSign + (i * Math.PI * 2) / 5;
        const dx = 0.5 + 0.36 * Math.cos(ang);
        const dy = 0.5 + 0.34 * Math.sin(ang);
        const d = Math.hypot((cell.normX - dx) * 1.15, cell.normY - dy);
        if (d < rDot) glow = Math.max(glow, 1 - d / rDot);
      }
      return glow > 0 ? lerpRgb(secondary, primary, glow) : [12, 16, 26];
    }
    case 'custom-digital':
    default:
      return computeMatrixPattern('galaxy-spiral', primary, secondary, cell, timeSec, cfg.speed / 100);
  }
}

export function computeAutoBelangRgb(
  auto: AutoBelangConfig,
  cell: PatternCoord,
  timeSec: number
): [number, number, number] {
  const paletteCount = Math.max(2, Math.min(8, auto.colorCount || auto.colors.length || 2));
  const rawColors = (auto.colors || []).slice(0, paletteCount);
  const rgbList = (rawColors.length >= 2 ? rawColors : ['#EF4444', '#22D3EE']).map(hexToRgb);
  const stripes = Math.max(2, Math.min(16, auto.stripeCount || 4));
  const spd = auto.moving ? 0.3 + ((auto.colorChangeSpeed || 50) / 100) * 2.6 : 0;
  const phase = timeSec * spd;

  const globalX = cell.side === 'left' ? 0.5 - cell.normX * 0.5 : 0.5 + cell.normX * 0.5;
  let coord = globalX;
  if (auto.direction === 'right-to-left') coord = 1 - globalX;
  else if (auto.direction === 'center-out') coord = cell.normX;
  else if (auto.direction === 'bounce') coord = Math.abs(Math.sin((globalX + phase * 0.2) * Math.PI));
  else if (auto.direction === 'alternate') coord = cell.side === 'left' ? cell.normX : 1 - cell.normX;

  if (auto.pattern === 'diagonal') {
    coord = (coord * 0.75 + cell.normY * 0.25) % 1;
  } else if (auto.pattern === 'wave') {
    coord = (coord + 0.14 * Math.sin(cell.normY * Math.PI * 2 + phase * 2)) % 1;
  }

  const shifted = coord * stripes + phase;
  const stripeIndex = Math.floor(((shifted % stripes) + stripes) % stripes);
  const colorShift = auto.moving ? Math.floor(phase * 0.7) : 0;
  const colorIdx = (stripeIndex + colorShift) % rgbList.length;
  const nextIdx = (colorIdx + 1) % rgbList.length;

  if (auto.pattern === 'pulse-split') {
    const pulse = 0.5 + 0.5 * Math.sin(phase * 3 + stripeIndex);
    return lerpRgb(rgbList[colorIdx], rgbList[nextIdx], pulse);
  }
  if (auto.pattern === 'blocks') {
    const blockShift = (stripeIndex + (cell.row < 4 ? 0 : 1) + colorShift) % rgbList.length;
    return rgbList[blockShift];
  }
  if (auto.pattern === 'wave') {
    const frac = shifted - Math.floor(shifted);
    return lerpRgb(rgbList[colorIdx], rgbList[nextIdx], frac);
  }
  return rgbList[colorIdx];
}

function resolveSideColors(
  manual: ManualSideColorConfig | undefined,
  side: 'left' | 'right',
  fallbackPrimary: [number, number, number],
  fallbackSecondary: [number, number, number],
  cell: PatternCoord,
  timeSec: number
): { primary: [number, number, number]; secondary: [number, number, number] } {
  if (!manual?.enabled) {
    return { primary: fallbackPrimary, secondary: fallbackSecondary };
  }
  const palette =
    side === 'left' || manual.syncSides
      ? manual.leftColors
      : manual.rightColors;
  const clean = (palette || []).filter(Boolean);
  if (clean.length === 0) {
    return { primary: fallbackPrimary, secondary: fallbackSecondary };
  }
  if (clean.length === 1) {
    const p = hexToRgb(clean[0]);
    return { primary: p, secondary: lerpRgb(p, [255, 255, 255], 0.25) };
  }
  // If 2+ colors chosen for this side, map smoothly across them or rotate subtly
  const step = Math.floor(timeSec * 0.4 + cell.normX * clean.length) % clean.length;
  const p = hexToRgb(clean[0]);
  const s = hexToRgb(clean[step === 0 ? 1 : step]);
  return { primary: p, secondary: s };
}

function rgbLuminance(rgb: [number, number, number]): number {
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
}

function evaluateComboModes(
  s: ControllerState,
  modes: RgbMode[],
  activeMode: RgbMode,
  cell: PatternCoord,
  timeSec: number,
  speedFactor: number
): [number, number, number] {
  const resolvePanelModes = (ids: number[]): RgbMode[] => {
    const list = (ids || [])
      .map((id) => modes.find((m) => m.id === id))
      .filter((m): m is RgbMode => Boolean(m));
    return list.length > 0 ? list : [activeMode];
  };

  const rawLeft = resolvePanelModes(s.combo?.leftModes);
  const rawRight = s.combo?.syncPanels ? rawLeft : resolvePanelModes(s.combo?.rightModes);
  const panelList = cell.side === 'left' ? rawLeft : rawRight;
  const seqInterval = Math.max(1, s.combo?.intervalSec || 3);

  const evalSingleMode = (modeObj: RgbMode, slotTimeOffset = 0): [number, number, number] => {
    const baseP = hexToRgb(modeObj.primaryColor);
    const baseS = hexToRgb(modeObj.secondaryColor);
    const { primary, secondary } = resolveSideColors(
      s.manualSideColors,
      cell.side,
      baseP,
      baseS,
      cell,
      timeSec
    );
    return computeMatrixPattern(
      modeObj.pattern,
      primary,
      secondary,
      cell,
      timeSec + slotTimeOffset,
      speedFactor
    );
  };

  if (s.combo?.style === 'sequence') {
    const slotIdx = Math.floor(timeSec / seqInterval) % panelList.length;
    return evalSingleMode(panelList[slotIdx]);
  }

  if (s.combo?.style === 'layer-blend') {
    // Run ALL selected modes simultaneously without overwriting each other!
    const priority = s.combo.priorityMode || 'blend';
    const layerRgbs = panelList.map((m, idx) => evalSingleMode(m, idx * 0.17));
    if (priority === 'first') {
      for (const c of layerRgbs) {
        if (rgbLuminance(c) > 42) return c;
      }
      return layerRgbs[0];
    }
    if (priority === 'last') {
      for (let i = layerRgbs.length - 1; i >= 0; i--) {
        if (rgbLuminance(layerRgbs[i]) > 42) return layerRgbs[i];
      }
      return layerRgbs[layerRgbs.length - 1];
    }
    // Additive screen/peak blend so every active animation remains clearly visible
    let r = 0;
    let g = 0;
    let b = 0;
    const countWeight = Math.max(1, Math.min(2.2, layerRgbs.length * 0.55));
    for (const c of layerRgbs) {
      r = Math.max(r, c[0]) + c[0] / (countWeight * 2.4);
      g = Math.max(g, c[1]) + c[1] / (countWeight * 2.4);
      b = Math.max(b, c[2]) + c[2] / (countWeight * 2.4);
    }
    return [
      Math.min(255, Math.round(r)),
      Math.min(255, Math.round(g)),
      Math.min(255, Math.round(b)),
    ];
  }

  // Default: 'zone-split' across all modes
  const zoneIdx = Math.min(panelList.length - 1, Math.floor(cell.normX * panelList.length));
  return evalSingleMode(panelList[zoneIdx]);
}

export function evaluateStoplampCell(
  s: ControllerState,
  modes: RgbMode[],
  cell: PatternCoord,
  nowMs: number,
  options?: {
    ignoreOverrides?: boolean;
    wallClockMs?: number;
    eyeCinematics?: {
      showEyes: boolean;
      eyeBehavior: string;
      pupilCol: number;
      pupilRow: number;
      halfOpen: number;
    };
  }
): [number, number, number] {
  const activeMode = modes.find((m) => m.id === s.activeModeId) || modes[0];
  const basePrimary = hexToRgb(activeMode.primaryColor);
  const baseSecondary = hexToRgb(activeMode.secondaryColor);
  const resolvedColors = resolveSideColors(
    s.manualSideColors,
    cell.side,
    basePrimary,
    baseSecondary,
    cell,
    nowMs / 1000
  );
  const solidStayRgb = hexToRgb(s.solidColor || '#EF4444');
  const speedFactor = s.speed / 100;
  const timeSec = nowMs / 1000;
  const sideBriRaw =
    s.manualSideColors?.enabled
      ? cell.side === 'left' || s.manualSideColors.syncSides
        ? s.manualSideColors.leftBrightness ?? s.brightness
        : s.manualSideColors.rightBrightness ?? s.brightness
      : s.brightness;
  const finalBri = s.manualSideColors?.enabled
    ? Math.max(0.1, (sideBriRaw / 100) * (s.brightness / 100))
    : Math.max(0.1, s.brightness / 100);

  const ledPowerOn = s.powerOn !== false;
  const clockMs = options?.wallClockMs ?? nowMs;
  const welcomeActive = s.welcomePlayingUntil > 0 && clockMs < s.welcomePlayingUntil;
  const welcomeProgress = welcomeActive
    ? Math.max(0, Math.min(1, 1 - (s.welcomePlayingUntil - clockMs) / 3000))
    : 0;

  const seinAffectsSide =
    !options?.ignoreOverrides &&
    s.led.testOverride === 'none' &&
    (s.sein === 'hazard' ||
      (s.sein === 'left' && cell.side === 'left') ||
      (s.sein === 'right' && cell.side === 'right'));

  let rgb: [number, number, number];

  if (!options?.ignoreOverrides && s.led.testOverride !== 'none') {
    if (s.led.testOverride === 'red') rgb = [239, 68, 68];
    else if (s.led.testOverride === 'green') rgb = [34, 197, 94];
    else if (s.led.testOverride === 'blue') rgb = [59, 130, 246];
    else if (s.led.testOverride === 'white') rgb = [241, 245, 249];
    else rgb = [30, 36, 48];
  } else if (!ledPowerOn) {
    rgb = [14, 17, 24];
  } else if (welcomeActive && !options?.ignoreOverrides) {
    const wChoice = s.special.welcomeColor || 'cyan';
    const wCol: [number, number, number] =
      wChoice === 'rainbow'
        ? hslToRgb((cell.normX * 240 + welcomeProgress * 360) % 360, 0.95, 0.55)
        : wChoice === 'crimson'
          ? [239, 68, 68]
          : wChoice === 'ice'
            ? [248, 250, 252]
            : wChoice === 'cyan'
              ? [34, 211, 238]
              : hexToRgb(wChoice);

    let glow = 0.1;
    const style = s.special.welcomeStyle;
    if (style === 'cyber-flash') {
      const flash = Math.floor(welcomeProgress * 12) % 2 === 0 ? 1 : 0.2;
      glow = cell.normX <= welcomeProgress * 1.18 ? flash : 0.1;
    } else if (style === 'center-out') {
      const wave = welcomeProgress < 0.65 ? welcomeProgress / 0.65 : 1;
      glow = cell.normX <= wave ? Math.max(0.3, 1 - (wave - cell.normX) * 0.4) : 0.1;
    } else if (style === 'dual-meet') {
      const distMid = Math.abs(cell.normX - 0.5) * 2;
      const reach = welcomeProgress < 0.5 ? 1 - welcomeProgress * 2 : (welcomeProgress - 0.5) * 2;
      glow = Math.max(0.12, 1 - Math.abs(distMid - reach) * 2.8);
    } else if (style === 'row-cascade') {
      const targetRow = (1 - Math.min(1, welcomeProgress * 1.15)) * (MATRIX_ROWS - 1);
      const rowDist = cell.row - targetRow;
      glow =
        rowDist >= -0.6 && rowDist <= 2.4
          ? 1 - Math.max(0, rowDist) * 0.22
          : cell.row > targetRow
            ? 0.55
            : 0.08;
    } else if (style === 'pulse-bloom') {
      glow = 0.25 + 0.75 * Math.sin(welcomeProgress * Math.PI);
    } else {
      const wave = welcomeProgress < 0.5 ? welcomeProgress * 2 : 2 - welcomeProgress * 2;
      const dist = Math.abs(cell.normX - wave);
      glow = Math.max(0.1, 1 - dist * 2.6);
    }
    rgb = lerpRgb([24, 30, 42], wCol, glow);
  } else if (s.soundReactive?.enabled && !options?.ignoreOverrides) {
    const soundFrame = getLiveAudioFrame(s.soundReactive.sensitivity ?? 65, nowMs);
    const baseP = s.solidStayActive ? solidStayRgb : resolvedColors.primary;
    const baseS = s.solidStayActive ? ([255, 255, 255] as [number, number, number]) : resolvedColors.secondary;
    const sndStyle = s.soundReactive.style || 'vu-bars';
    if (sndStyle === 'vu-bars') {
      const bandIdx = Math.min(7, Math.floor(cell.normX * 8));
      const bandVal = Math.max(0.08, soundFrame.bands[bandIdx] ?? soundFrame.level);
      const invY = 1 - cell.normY;
      rgb = invY <= bandVal ? (invY / Math.max(0.15, bandVal) > 0.78 ? baseS : baseP) : [14, 18, 28];
    } else if (sndStyle === 'bass-pulse') {
      const reach = Math.min(1, soundFrame.bass * 1.15);
      const dist = Math.hypot((cell.normX - 0.5) * 1.15, cell.normY - 0.5) * 1.4;
      rgb =
        dist <= reach
          ? lerpRgb(baseS, baseP, 1 - dist / Math.max(0.2, reach))
          : [Math.round(baseP[0] * 0.1), Math.round(baseP[1] * 0.1), Math.round(baseP[2] * 0.1)];
    } else if (sndStyle === 'strobe-beat') {
      rgb = soundFrame.peakBeat
        ? cell.side === 'left'
          ? baseP
          : baseS
        : [
            Math.round(baseP[0] * Math.max(0.08, soundFrame.level * 0.55)),
            Math.round(baseP[1] * Math.max(0.08, soundFrame.level * 0.55)),
            Math.round(baseP[2] * Math.max(0.08, soundFrame.level * 0.55)),
          ];
    } else {
      const bandIdx = Math.min(7, Math.floor(cell.normX * 8));
      const waveAmp = soundFrame.bands[bandIdx] ?? soundFrame.level;
      const hue = (cell.normX * 220 + timeSec * 70 + soundFrame.bass * 120) % 360;
      const specCol = hslToRgb(hue, 0.95, 0.52);
      const bandCenter = 0.5 + (waveAmp - 0.5) * 0.72;
      const d = Math.abs(cell.normY - (1 - waveAmp * 0.85));
      const glow =
        d < 0.25 ? 1 : Math.max(0.12, waveAmp * 0.65 - Math.abs(cell.normY - bandCenter) * 0.4);
      rgb = lerpRgb([14, 18, 28], specCol, glow);
    }
  } else if (s.ledMatrix?.enabled) {
    rgb = computeDedicatedMatrixRgb(s.ledMatrix, cell, timeSec);
  } else if (s.autoBelang?.enabled) {
    rgb = computeAutoBelangRgb(s.autoBelang, cell, timeSec);
  } else if (s.solidStayActive) {
    if (s.manualSideColors?.enabled) {
      rgb = resolvedColors.primary;
    } else {
      rgb = solidStayRgb;
    }
  } else if (s.combinationEnabled) {
    rgb = evaluateComboModes(s, modes, activeMode, cell, timeSec, speedFactor);
  } else {
    rgb = computeMatrixPattern(
      activeMode.pattern,
      resolvedColors.primary,
      resolvedColors.secondary,
      cell,
      timeSec,
      speedFactor
    );
  }

  // Optional Moving Pixel Eye overlay on ambient modes (never during Sein / Brake / Dedicated Matrix)
  const ec = options?.eyeCinematics;
  if (ec?.showEyes && !s.ledMatrix?.enabled && !s.brakeActive && !seinAffectsSide) {
    const baseRow = 2.8;
    const dx = (cell.col - ec.pupilCol) * 0.85;
    const dy = (cell.row - ec.pupilRow) * (ec.eyeBehavior === 'angry-squint' ? 1.5 : 1.25);
    const dist = Math.hypot(dx, dy);
    const insideEyelid = Math.abs(cell.row - baseRow) <= ec.halfOpen;
    if (insideEyelid) {
      if (dist < 1.65) {
        rgb = [248, 250, 252];
      } else if (dist < 3.15) {
        rgb = cell.side === 'left' ? resolvedColors.primary : resolvedColors.secondary;
        if (activeMode.pattern === 'solid-red' || activeMode.pattern === 'crimson-pulse') {
          rgb = [34, 211, 238];
        } else if (
          rgb[0] === resolvedColors.secondary[0] &&
          rgb[1] === resolvedColors.secondary[1]
        ) {
          rgb = lerpRgb(rgb, [255, 255, 255], 0.25);
        }
      } else if (dist < 4.35) {
        rgb = lerpRgb(rgb, [10, 14, 22], 0.72);
      }
    } else if (Math.abs(cell.row - baseRow) <= 4.4) {
      rgb = lerpRgb(rgb, [10, 14, 22], 0.6);
    }
  }

  // Reverse (Mundur) crisp 6000K white panel light
  if (!options?.ignoreOverrides && ledPowerOn && s.reverseActive && s.led.testOverride === 'none' && !seinAffectsSide) {
    const isCenterBar = cell.normX < 0.72 || (cell.row >= 1 && cell.row <= 5);
    rgb = isCenterBar ? [248, 250, 252] : [203, 213, 225];
  }

  // Brake override
  if (!options?.ignoreOverrides && ledPowerOn && s.brakeActive && s.led.testOverride === 'none' && !seinAffectsSide) {
    const flashRate = 9 + s.special.brakeFlashCount;
    const f1On =
      s.special.brakePattern !== 'f1-strobe' || Math.sin(timeSec * flashRate * Math.PI) > -0.2;
    const brakeRgb: [number, number, number] = f1On ? [255, 32, 32] : [65, 12, 12];
    rgb =
      s.combinationEnabled && s.special.comboPriority === 'blend'
        ? lerpRgb(rgb, brakeRgb, 0.74)
        : brakeRgb;
  }

  // Sein / Hazard full-panel override
  if (!options?.ignoreOverrides && ledPowerOn && seinAffectsSide) {
    const seinSpd = 0.85 + (s.special.seinSpeed / 100) * 2.2;
    const cyc = (timeSec * seinSpd) % 1;
    let on = false;
    if (s.special.seinPattern === 'full') on = true;
    else if (s.special.seinPattern === 'sequential') on = cyc < 0.85 && cell.normX <= Math.min(1, cyc / 0.44);
    else if (s.special.seinPattern === 'blink') on = cyc < 0.6;
    else on = true;

    const amber: [number, number, number] =
      s.special.seinPattern === 'pulse'
        ? lerpRgb([40, 22, 4], [255, 165, 10], 0.5 + 0.5 * Math.sin(timeSec * seinSpd * 6))
        : on
          ? [255, 165, 10]
          : [24, 18, 10];
    rgb = amber;
  }

  return [
    Math.min(255, Math.round(rgb[0] * finalBri)),
    Math.min(255, Math.round(rgb[1] * finalBri)),
    Math.min(255, Math.round(rgb[2] * finalBri)),
  ];
}

/**
 * Evaluates the live RGB color of the rear active mode at any normalized coordinate,
 * keeping front lamp synchronized with all modes EXCEPT rear Brake & Reverse!
 */
export function evaluateSyncedFrontRgb(
  s: ControllerState,
  modes: RgbMode[],
  side: 'left' | 'right',
  normX: number,
  normY: number,
  nowMs: number,
  options?: { allowSein?: boolean }
): [number, number, number] {
  if (s.powerOn === false || s.frontLamp?.enabled === false) {
    return [14, 18, 26];
  }
  const frontSafeState: ControllerState = {
    ...s,
    brakeActive: false,
    reverseActive: false,
    sein:
      options?.allowSein !== false && s.frontLamp?.syncSeinWithRear !== false
        ? s.sein
        : 'off',
  };
  return evaluateStoplampCell(
    frontSafeState,
    modes,
    {
      side,
      normX,
      normY,
      col: Math.round(normX * 24),
      row: Math.round(normY * 7),
    },
    nowMs
  );
}
