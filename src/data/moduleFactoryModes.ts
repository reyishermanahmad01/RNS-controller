import {
  AnimationPattern,
  BlePacketFormat,
  ControllerFamily,
  DiscoveredModuleMode,
  ModeCategory,
  MultiControllerProfile,
  RgbMode,
} from '../types/controller';

interface FactoryTemplate {
  nativeId: number;
  codeLabel: string;
  name: string;
  category: ModeCategory;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: AnimationPattern;
  bleFormat?: BlePacketFormat;
  dmxPreset?: number[];
}

export const LED_DMX_FACTORY_MODES: FactoryTemplate[] = [
  {
    nativeId: 1,
    codeLabel: 'LEDDMX-01',
    name: 'LED DMX · Mode ++ Aurora Flow',
    category: 'Flow',
    description: 'Mode ++ bawaan Modul LED LAMP → LED DMX (4 kabel): aliran dua warna lembut.',
    primaryColor: '#22D3EE',
    secondaryColor: '#3B82F6',
    pattern: 'aurora-dual',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 34, 211, 238, 0, 0, 1, 140],
  },
  {
    nativeId: 2,
    codeLabel: 'LEDDMX-02',
    name: 'LED DMX · Welcome Ice Sapuan',
    category: 'Flow',
    description: 'Program Welcome Light bawaan Modul LED DMX saat kontak ON.',
    primaryColor: '#38BDF8',
    secondaryColor: '#F8FAFC',
    pattern: 'knight-sweep',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 56, 189, 248, 80, 0, 2, 165],
  },
  {
    nativeId: 3,
    codeLabel: 'LEDDMX-03',
    name: 'LED DMX · Belang Kiri Merah / Kanan Biru',
    category: 'Static',
    description: 'Fitur Bisa Belang bawaan Modul LED DMX untuk panel kiri & kanan.',
    primaryColor: '#EF4444',
    secondaryColor: '#3B82F6',
    pattern: 'horizon-split',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 239, 68, 68, 0, 0, 3, 130],
  },
  {
    nativeId: 4,
    codeLabel: 'LEDDMX-04',
    name: 'LED DMX · Pelangi Kontes 7-Warna',
    category: 'Flow',
    description: 'Mode ++ spektrum pelangi RGB penuh 4-kabel data DMX.',
    primaryColor: '#EC4899',
    secondaryColor: '#22D3EE',
    pattern: 'rainbow-flow',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 236, 72, 153, 0, 0, 4, 150],
  },
  {
    nativeId: 5,
    codeLabel: 'LEDDMX-05',
    name: 'LED DMX · Komet Kembar Cyber',
    category: 'Chase',
    description: 'Running comet bolak-balik cepat 12V-24V input → 5V output.',
    primaryColor: '#22D3EE',
    secondaryColor: '#EC4899',
    pattern: 'dual-comet',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 34, 211, 238, 0, 0, 5, 185],
  },
  {
    nativeId: 6,
    codeLabel: 'LEDDMX-06',
    name: 'LED DMX · Mundur Putih 6000K',
    category: 'Static',
    description: 'Preset lampu mundur LED DMX putih super terang full panel.',
    primaryColor: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    pattern: 'solid-ice',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 248, 250, 252, 255, 0, 6, 128],
  },
  {
    nativeId: 7,
    codeLabel: 'LEDDMX-07',
    name: 'LED DMX · Rem Strobo F1 Merah',
    category: 'Chase',
    description: 'Sinyal rem LED DMX kedip cepat F1 merah intensitas penuh.',
    primaryColor: '#EF4444',
    secondaryColor: '#991B1B',
    pattern: 'crimson-pulse',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 255, 16, 16, 0, 200, 7, 220],
  },
  {
    nativeId: 8,
    codeLabel: 'LEDDMX-08',
    name: 'LED DMX · Sein Running Sequential',
    category: 'Chase',
    description: 'Efek running amber untuk sein dinamis dan hazard LED DMX.',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    pattern: 'wave-bounce',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 255, 165, 5, 0, 0, 8, 175],
  },
  {
    nativeId: 9,
    codeLabel: 'LEDDMX-09',
    name: 'LED DMX · Matrix Hujan Hijau/Cyan',
    category: 'Chase',
    description: 'Animasi Matrix Rain 8 baris untuk stoplamp DMX 4 kabel.',
    primaryColor: '#10B981',
    secondaryColor: '#22D3EE',
    pattern: 'matrix-rain',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 16, 185, 129, 0, 0, 9, 160],
  },
  {
    nativeId: 10,
    codeLabel: 'LEDDMX-10',
    name: 'LED DMX · Patrol Double Flash',
    category: 'Chase',
    description: 'Kilat ganda merah-biru Mode ++ DMX Bluetooth.',
    primaryColor: '#EF4444',
    secondaryColor: '#2563EB',
    pattern: 'police-strobe',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 239, 68, 68, 0, 210, 10, 215],
  },
  {
    nativeId: 11,
    codeLabel: 'LEDDMX-11',
    name: 'LED DMX · White Triple Blitz',
    category: 'Chase',
    description: 'Strobo blitz putih 3x kilat per siklus pada modul LED DMX.',
    primaryColor: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    pattern: 'white-strobe-burst',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 255, 255, 255, 255, 230, 11, 230],
  },
  {
    nativeId: 12,
    codeLabel: 'LEDDMX-12',
    name: 'LED DMX · Mata Cyber Look',
    category: 'Pulse',
    description: 'Animasi mata melirik dengan bingkai matrix LED DMX.',
    primaryColor: '#22D3EE',
    secondaryColor: '#EC4899',
    pattern: 'cyber-eyes',
    bleFormat: 'dmx-ble',
    dmxPreset: [255, 34, 211, 238, 0, 0, 12, 130],
  },
];

export const DMX_FACTORY_MODES: FactoryTemplate[] = [
  {
    nativeId: 10,
    codeLabel: 'DMX-01',
    name: 'A01 · 7-Color Jump (DMX)',
    category: 'Chase',
    description: 'Program bawaan DMX CH7=10: loncatan 7 warna panggung.',
    primaryColor: '#EF4444',
    secondaryColor: '#22D3EE',
    pattern: 'strobe-duo',
    dmxPreset: [255, 255, 0, 80, 0, 0, 10, 150],
  },
  {
    nativeId: 25,
    codeLabel: 'DMX-02',
    name: 'A02 · 3-Color Snap Jump',
    category: 'Chase',
    description: 'Program bawaan DMX CH7=25: pergantian cepat RGB primer.',
    primaryColor: '#22C55E',
    secondaryColor: '#3B82F6',
    pattern: 'checker-wave',
    dmxPreset: [255, 0, 255, 0, 0, 0, 25, 160],
  },
  {
    nativeId: 42,
    codeLabel: 'DMX-03',
    name: 'A03 · 7-Color Smooth Fade',
    category: 'Flow',
    description: 'Program bawaan DMX CH7=42: transisi halus 7 warna DMX.',
    primaryColor: '#22D3EE',
    secondaryColor: '#A855F7',
    pattern: 'rainbow-flow',
    dmxPreset: [255, 40, 220, 255, 0, 0, 42, 120],
  },
  {
    nativeId: 58,
    codeLabel: 'DMX-04',
    name: 'A04 · Warm White Fade Pulse',
    category: 'Pulse',
    description: 'Program bawaan DMX CH7=58: dimmer halus putih hangat.',
    primaryColor: '#FEF3C7',
    secondaryColor: '#F59E0B',
    pattern: 'neon-breathe',
    dmxPreset: [255, 255, 210, 140, 255, 0, 58, 110],
  },
  {
    nativeId: 76,
    codeLabel: 'DMX-05',
    name: 'A05 · RGB Rainbow Wash',
    category: 'Flow',
    description: 'Program bawaan DMX CH7=76: sapuan warna par LED & bar.',
    primaryColor: '#EC4899',
    secondaryColor: '#38BDF8',
    pattern: 'prism-shift',
    dmxPreset: [255, 236, 72, 153, 0, 0, 76, 135],
  },
  {
    nativeId: 94,
    codeLabel: 'DMX-06',
    name: 'A06 · Pixel Bar Matrix Chase',
    category: 'Chase',
    description: 'Program bawaan DMX CH7=94: lari piksel bar 8/24 channel.',
    primaryColor: '#22D3EE',
    secondaryColor: '#0EA5E9',
    pattern: 'matrix-drop',
    dmxPreset: [255, 0, 210, 255, 0, 0, 94, 175],
  },
  {
    nativeId: 112,
    codeLabel: 'DMX-07',
    name: 'A07 · Dual Zone Split Red/Blue',
    category: 'Static',
    description: 'Program bawaan DMX CH7=112: belah warna merah-biru.',
    primaryColor: '#EF4444',
    secondaryColor: '#3B82F6',
    pattern: 'horizon-split',
    dmxPreset: [255, 255, 0, 255, 0, 0, 112, 128],
  },
  {
    nativeId: 132,
    codeLabel: 'DMX-08',
    name: 'A08 · Strobe Flash Club (CH6)',
    category: 'Chase',
    description: 'Program bawaan DMX CH6+CH7=132: kilat strobo putih cepat.',
    primaryColor: '#FFFFFF',
    secondaryColor: '#CBD5E1',
    pattern: 'white-strobe-flash',
    dmxPreset: [255, 255, 255, 255, 255, 210, 132, 220],
  },
  {
    nativeId: 150,
    codeLabel: 'DMX-09',
    name: 'A09 · Police Red-Blue Strobe',
    category: 'Chase',
    description: 'Program bawaan DMX CH7=150: double flash merah & biru.',
    primaryColor: '#EF4444',
    secondaryColor: '#2563EB',
    pattern: 'police-strobe',
    dmxPreset: [255, 255, 0, 0, 0, 180, 150, 200],
  },
  {
    nativeId: 168,
    codeLabel: 'DMX-10',
    name: 'A10 · Fire Amber Ember Show',
    category: 'Flow',
    description: 'Program bawaan DMX CH7=168: efek api panggung oranye-merah.',
    primaryColor: '#F97316',
    secondaryColor: '#DC2626',
    pattern: 'fire-ember',
    dmxPreset: [255, 255, 110, 0, 0, 0, 168, 150],
  },
  {
    nativeId: 184,
    codeLabel: 'DMX-11',
    name: 'A11 · Ice Cyan Stage Wash',
    category: 'Pulse',
    description: 'Program bawaan DMX CH7=184: gelombang dingin cyan-es.',
    primaryColor: '#67E8F9',
    secondaryColor: '#0284C7',
    pattern: 'ocean-drift',
    dmxPreset: [255, 60, 230, 255, 40, 0, 184, 130],
  },
  {
    nativeId: 198,
    codeLabel: 'DMX-12',
    name: 'S01 · Sound Active Bass',
    category: 'Pulse',
    description: 'Program bawaan DMX CH7=198: reaktif ketukan bass mic DMX.',
    primaryColor: '#EC4899',
    secondaryColor: '#F59E0B',
    pattern: 'heartbeat',
    dmxPreset: [255, 255, 30, 180, 0, 40, 198, 180],
  },
  {
    nativeId: 214,
    codeLabel: 'DMX-13',
    name: 'S02 · Sound Active Strobe',
    category: 'Chase',
    description: 'Program bawaan DMX CH7=214: kilat strobo ikut irama musik.',
    primaryColor: '#FFFFFF',
    secondaryColor: '#22D3EE',
    pattern: 'white-strobe-alt',
    dmxPreset: [255, 220, 255, 255, 255, 200, 214, 210],
  },
  {
    nativeId: 230,
    codeLabel: 'DMX-14',
    name: 'S03 · Sound Active Rainbow',
    category: 'Flow',
    description: 'Program bawaan DMX CH7=230: pelangi dinamis ikut audio.',
    primaryColor: '#22C55E',
    secondaryColor: '#F43F5E',
    pattern: 'vortex-spin',
    dmxPreset: [255, 40, 255, 120, 0, 0, 230, 190],
  },
  {
    nativeId: 245,
    codeLabel: 'DMX-15',
    name: 'A12 · Radar Laser Sweep',
    category: 'Chase',
    description: 'Program bawaan DMX CH7=245: sapuan beam laser panggung.',
    primaryColor: '#22C55E',
    secondaryColor: '#22D3EE',
    pattern: 'radar-sweep',
    dmxPreset: [255, 0, 255, 100, 0, 0, 245, 165],
  },
  {
    nativeId: 255,
    codeLabel: 'DMX-16',
    name: 'M01 · Full White 5CH RGBW',
    category: 'Static',
    description: 'Mode manual DMX penuh semua channel putih 100%.',
    primaryColor: '#FFFFFF',
    secondaryColor: '#E2E8F0',
    pattern: 'solid-ice',
    dmxPreset: [255, 255, 255, 255, 255, 0, 255, 128],
  },
];

export const WLED_FACTORY_MODES: FactoryTemplate[] = [
  { nativeId: 0, codeLabel: 'FX-000', name: 'WLED · Solid', category: 'Static', description: 'Efek bawaan WLED fx=0', primaryColor: '#22D3EE', secondaryColor: '#0EA5E9', pattern: 'solid-cyan' },
  { nativeId: 1, codeLabel: 'FX-001', name: 'WLED · Blink', category: 'Chase', description: 'Efek bawaan WLED fx=1', primaryColor: '#F59E0B', secondaryColor: '#EF4444', pattern: 'strobe-duo' },
  { nativeId: 2, codeLabel: 'FX-002', name: 'WLED · Breathe', category: 'Pulse', description: 'Efek bawaan WLED fx=2', primaryColor: '#38BDF8', secondaryColor: '#1D4ED8', pattern: 'neon-breathe' },
  { nativeId: 3, codeLabel: 'FX-003', name: 'WLED · Wipe', category: 'Flow', description: 'Efek bawaan WLED fx=3', primaryColor: '#22D3EE', secondaryColor: '#EC4899', pattern: 'knight-sweep' },
  { nativeId: 6, codeLabel: 'FX-006', name: 'WLED · Sweep', category: 'Flow', description: 'Efek bawaan WLED fx=6', primaryColor: '#A855F7', secondaryColor: '#22D3EE', pattern: 'wave-bounce' },
  { nativeId: 8, codeLabel: 'FX-008', name: 'WLED · Colorloop', category: 'Flow', description: 'Efek bawaan WLED fx=8', primaryColor: '#F43F5E', secondaryColor: '#10B981', pattern: 'prism-shift' },
  { nativeId: 9, codeLabel: 'FX-009', name: 'WLED · Rainbow', category: 'Flow', description: 'Efek bawaan WLED fx=9', primaryColor: '#EF4444', secondaryColor: '#22D3EE', pattern: 'rainbow-flow' },
  { nativeId: 10, codeLabel: 'FX-010', name: 'WLED · Scan', category: 'Chase', description: 'Efek bawaan WLED fx=10 (Larson/Cyber)', primaryColor: '#EF4444', secondaryColor: '#F97316', pattern: 'cyber-scan' },
  { nativeId: 12, codeLabel: 'FX-012', name: 'WLED · Theater', category: 'Chase', description: 'Efek bawaan WLED fx=12', primaryColor: '#F59E0B', secondaryColor: '#38BDF8', pattern: 'checker-wave' },
  { nativeId: 13, codeLabel: 'FX-013', name: 'WLED · Theater Rainbow', category: 'Chase', description: 'Efek bawaan WLED fx=13', primaryColor: '#EC4899', secondaryColor: '#22C55E', pattern: 'dna-helix' },
  { nativeId: 15, codeLabel: 'FX-015', name: 'WLED · Running', category: 'Chase', description: 'Efek bawaan WLED fx=15', primaryColor: '#22D3EE', secondaryColor: '#3B82F6', pattern: 'dual-comet' },
  { nativeId: 17, codeLabel: 'FX-017', name: 'WLED · Twinkle', category: 'Pulse', description: 'Efek bawaan WLED fx=17', primaryColor: '#E0F2FE', secondaryColor: '#38BDF8', pattern: 'sparkle-ice' },
  { nativeId: 20, codeLabel: 'FX-020', name: 'WLED · Sparkle', category: 'Pulse', description: 'Efek bawaan WLED fx=20', primaryColor: '#FFFFFF', secondaryColor: '#22D3EE', pattern: 'sparkle-ice' },
  { nativeId: 23, codeLabel: 'FX-023', name: 'WLED · Strobe', category: 'Chase', description: 'Efek bawaan WLED fx=23', primaryColor: '#FFFFFF', secondaryColor: '#94A3B8', pattern: 'white-strobe-flash' },
  { nativeId: 25, codeLabel: 'FX-025', name: 'WLED · Strobe Mega', category: 'Chase', description: 'Efek bawaan WLED fx=25', primaryColor: '#FFFFFF', secondaryColor: '#E2E8F0', pattern: 'white-strobe-burst' },
  { nativeId: 28, codeLabel: 'FX-028', name: 'WLED · Chase', category: 'Chase', description: 'Efek bawaan WLED fx=28', primaryColor: '#3B82F6', secondaryColor: '#22D3EE', pattern: 'zigzag-snake' },
  { nativeId: 30, codeLabel: 'FX-030', name: 'WLED · Chase Rainbow', category: 'Chase', description: 'Efek bawaan WLED fx=30', primaryColor: '#F43F5E', secondaryColor: '#22D3EE', pattern: 'laser-cross' },
  { nativeId: 38, codeLabel: 'FX-038', name: 'WLED · Aurora', category: 'Flow', description: 'Efek bawaan WLED fx=38', primaryColor: '#10B981', secondaryColor: '#22D3EE', pattern: 'aurora-dual' },
  { nativeId: 41, codeLabel: 'FX-041', name: 'WLED · Lighthouse', category: 'Chase', description: 'Efek bawaan WLED fx=41', primaryColor: '#F59E0B', secondaryColor: '#E2E8F0', pattern: 'radar-sweep' },
  { nativeId: 42, codeLabel: 'FX-042', name: 'WLED · Fireworks', category: 'Pulse', description: 'Efek bawaan WLED fx=42', primaryColor: '#EC4899', secondaryColor: '#F59E0B', pattern: 'sparkle-ice' },
  { nativeId: 43, codeLabel: 'FX-043', name: 'WLED · Rain', category: 'Flow', description: 'Efek bawaan WLED fx=43', primaryColor: '#38BDF8', secondaryColor: '#10B981', pattern: 'matrix-rain' },
  { nativeId: 46, codeLabel: 'FX-046', name: 'WLED · Gradient', category: 'Flow', description: 'Efek bawaan WLED fx=46', primaryColor: '#A855F7', secondaryColor: '#F43F5E', pattern: 'plasma-wave' },
  { nativeId: 57, codeLabel: 'FX-057', name: 'WLED · Lightning', category: 'Chase', description: 'Efek bawaan WLED fx=57', primaryColor: '#FFFFFF', secondaryColor: '#60A5FA', pattern: 'white-strobe-alt' },
  { nativeId: 66, codeLabel: 'FX-066', name: 'WLED · Fire 2012', category: 'Flow', description: 'Efek bawaan WLED fx=66', primaryColor: '#F97316', secondaryColor: '#EF4444', pattern: 'fire-ember' },
  { nativeId: 76, codeLabel: 'FX-076', name: 'WLED · Meteor', category: 'Chase', description: 'Efek bawaan WLED fx=76', primaryColor: '#22D3EE', secondaryColor: '#A855F7', pattern: 'meteor-rain' },
  { nativeId: 97, codeLabel: 'FX-097', name: 'WLED · Plasma', category: 'Flow', description: 'Efek bawaan WLED fx=97', primaryColor: '#EC4899', secondaryColor: '#22D3EE', pattern: 'vortex-spin' },
  { nativeId: 101, codeLabel: 'FX-101', name: 'WLED · Pacifica', category: 'Flow', description: 'Efek bawaan WLED fx=101', primaryColor: '#0EA5E9', secondaryColor: '#10B981', pattern: 'ocean-drift' },
];

export const BLE_FACTORY_MODES: FactoryTemplate[] = [
  // ELK-BLEDOM Hardware Built-in Effects (7E 00 03 XX 03 00 00 00 EF)
  { nativeId: 0x87, codeLabel: 'ELK-87', name: 'ELK · 7-Color Cross Fade', category: 'Flow', description: 'Efek bawaan IC ELK-BLEDOM (0x87)', primaryColor: '#22D3EE', secondaryColor: '#EC4899', pattern: 'rainbow-flow', bleFormat: 'elk-bledom' },
  { nativeId: 0x88, codeLabel: 'ELK-88', name: 'ELK · 3-Color Cross Fade', category: 'Flow', description: 'Efek bawaan IC ELK-BLEDOM (0x88)', primaryColor: '#EF4444', secondaryColor: '#22C55E', pattern: 'prism-shift', bleFormat: 'elk-bledom' },
  { nativeId: 0x8d, codeLabel: 'ELK-8D', name: 'ELK · 7-Color Jump', category: 'Chase', description: 'Efek bawaan IC ELK-BLEDOM (0x8D)', primaryColor: '#F59E0B', secondaryColor: '#3B82F6', pattern: 'strobe-duo', bleFormat: 'elk-bledom' },
  { nativeId: 0x8e, codeLabel: 'ELK-8E', name: 'ELK · 3-Color Jump', category: 'Chase', description: 'Efek bawaan IC ELK-BLEDOM (0x8E)', primaryColor: '#EF4444', secondaryColor: '#22C55E', pattern: 'checker-wave', bleFormat: 'elk-bledom' },
  { nativeId: 0x80, codeLabel: 'ELK-80', name: 'ELK · Red Gradual Fade', category: 'Pulse', description: 'Efek bawaan IC ELK-BLEDOM (0x80)', primaryColor: '#EF4444', secondaryColor: '#7F1D1D', pattern: 'crimson-pulse', bleFormat: 'elk-bledom' },
  { nativeId: 0x81, codeLabel: 'ELK-81', name: 'ELK · Green Gradual Fade', category: 'Pulse', description: 'Efek bawaan IC ELK-BLEDOM (0x81)', primaryColor: '#22C55E', secondaryColor: '#14532D', pattern: 'neon-breathe', bleFormat: 'elk-bledom' },
  { nativeId: 0x82, codeLabel: 'ELK-82', name: 'ELK · Blue Gradual Fade', category: 'Pulse', description: 'Efek bawaan IC ELK-BLEDOM (0x82)', primaryColor: '#3B82F6', secondaryColor: '#1E3A8A', pattern: 'neon-breathe', bleFormat: 'elk-bledom' },
  { nativeId: 0x84, codeLabel: 'ELK-84', name: 'ELK · Cyan Gradual Fade', category: 'Pulse', description: 'Efek bawaan IC ELK-BLEDOM (0x84)', primaryColor: '#22D3EE', secondaryColor: '#164E63', pattern: 'neon-breathe', bleFormat: 'elk-bledom' },
  { nativeId: 0x85, codeLabel: 'ELK-85', name: 'ELK · Purple Gradual Fade', category: 'Pulse', description: 'Efek bawaan IC ELK-BLEDOM (0x85)', primaryColor: '#A855F7', secondaryColor: '#581C87', pattern: 'vapor-fade', bleFormat: 'elk-bledom' },
  { nativeId: 0x95, codeLabel: 'ELK-95', name: 'ELK · 7-Color Strobe Flash', category: 'Chase', description: 'Efek bawaan IC ELK-BLEDOM (0x95)', primaryColor: '#FFFFFF', secondaryColor: '#EC4899', pattern: 'white-strobe-alt', bleFormat: 'elk-bledom' },
  { nativeId: 0x9c, codeLabel: 'ELK-9C', name: 'ELK · White Strobe Flash', category: 'Chase', description: 'Efek bawaan IC ELK-BLEDOM (0x9C)', primaryColor: '#FFFFFF', secondaryColor: '#CBD5E1', pattern: 'white-strobe-flash', bleFormat: 'elk-bledom' },
  // Triones / HappyLighting Hardware Built-in Effects (BB XX SPD 44)
  { nativeId: 0x25, codeLabel: 'TRI-25', name: 'Triones · 7-Color Cross Fade', category: 'Flow', description: 'Efek bawaan IC Triones/MagicHome (0x25)', primaryColor: '#22D3EE', secondaryColor: '#EC4899', pattern: 'aurora-dual', bleFormat: 'triones' },
  { nativeId: 0x26, codeLabel: 'TRI-26', name: 'Triones · Red Gradual', category: 'Pulse', description: 'Efek bawaan IC Triones/MagicHome (0x26)', primaryColor: '#EF4444', secondaryColor: '#991B1B', pattern: 'heartbeat', bleFormat: 'triones' },
  { nativeId: 0x2d, codeLabel: 'TRI-2D', name: 'Triones · Red-Green Cross', category: 'Flow', description: 'Efek bawaan IC Triones/MagicHome (0x2D)', primaryColor: '#EF4444', secondaryColor: '#22C55E', pattern: 'horizon-split', bleFormat: 'triones' },
  { nativeId: 0x2e, codeLabel: 'TRI-2E', name: 'Triones · Red-Blue Cross', category: 'Flow', description: 'Efek bawaan IC Triones/MagicHome (0x2E)', primaryColor: '#EF4444', secondaryColor: '#3B82F6', pattern: 'horizon-split', bleFormat: 'triones' },
  { nativeId: 0x30, codeLabel: 'TRI-30', name: 'Triones · 7-Color Strobe', category: 'Chase', description: 'Efek bawaan IC Triones/MagicHome (0x30)', primaryColor: '#FFFFFF', secondaryColor: '#F59E0B', pattern: 'white-strobe-burst', bleFormat: 'triones' },
  { nativeId: 0x37, codeLabel: 'TRI-37', name: 'Triones · 7-Color Jump', category: 'Chase', description: 'Efek bawaan IC Triones/MagicHome (0x37)', primaryColor: '#22D3EE', secondaryColor: '#F43F5E', pattern: 'checker-wave', bleFormat: 'triones' },
  { nativeId: 0x38, codeLabel: 'TRI-38', name: 'Triones · 3-Color Jump', category: 'Chase', description: 'Efek bawaan IC Triones/MagicHome (0x38)', primaryColor: '#3B82F6', secondaryColor: '#22C55E', pattern: 'strobe-duo', bleFormat: 'triones' },
];

export const CAR_FACTORY_MODES: FactoryTemplate[] = [
  { nativeId: 1, codeLabel: 'CAR-01', name: 'CAR · DRL Ice Blue Welcome', category: 'Flow', description: 'Program bawaan modul CAR: sapuan DRL Ice Blue.', primaryColor: '#67E8F9', secondaryColor: '#0EA5E9', pattern: 'knight-sweep' },
  { nativeId: 2, codeLabel: 'CAR-02', name: 'CAR · DRL OEM Pure White', category: 'Static', description: 'Program bawaan modul CAR: putih bersih 6000K.', primaryColor: '#FFFFFF', secondaryColor: '#E2E8F0', pattern: 'solid-ice' },
  { nativeId: 3, codeLabel: 'CAR-03', name: 'CAR · Sequential Amber Flow', category: 'Chase', description: 'Program bawaan modul CAR: running amber sein/DRL.', primaryColor: '#F59E0B', secondaryColor: '#EA580C', pattern: 'dual-comet' },
  { nativeId: 4, codeLabel: 'CAR-04', name: 'CAR · Demon Eye Crimson', category: 'Pulse', description: 'Program bawaan modul CAR: sorot merah demon eye.', primaryColor: '#EF4444', secondaryColor: '#F43F5E', pattern: 'cyber-eyes' },
  { nativeId: 5, codeLabel: 'CAR-05', name: 'CAR · Underglow Neon Aurora', category: 'Flow', description: 'Program bawaan modul CAR: gradient kolong mobil.', primaryColor: '#A855F7', secondaryColor: '#22D3EE', pattern: 'aurora-dual' },
  { nativeId: 6, codeLabel: 'CAR-06', name: 'CAR · Interior Ambient Breath', category: 'Pulse', description: 'Program bawaan modul CAR: kabin & footwell halus.', primaryColor: '#38BDF8', secondaryColor: '#818CF8', pattern: 'neon-breathe' },
  { nativeId: 7, codeLabel: 'CAR-07', name: 'CAR · Showcar Rainbow Wave', category: 'Flow', description: 'Program bawaan modul CAR: kontes mobil pelangi.', primaryColor: '#EC4899', secondaryColor: '#22C55E', pattern: 'rainbow-flow' },
  { nativeId: 8, codeLabel: 'CAR-08', name: 'CAR · Grille Knight Scanner', category: 'Chase', description: 'Program bawaan modul CAR: scanner bolak-balik.', primaryColor: '#EF4444', secondaryColor: '#22D3EE', pattern: 'cyber-scan' },
  { nativeId: 9, codeLabel: 'CAR-09', name: 'CAR · Patrol Show Strobe', category: 'Chase', description: 'Program bawaan modul CAR: strobo kontes kiri-kanan.', primaryColor: '#EF4444', secondaryColor: '#2563EB', pattern: 'police-strobe' },
  { nativeId: 10, codeLabel: 'CAR-10', name: 'CAR · Matrix Cascade 8-Row', category: 'Chase', description: 'Program bawaan modul CAR: hujan matrix baris penuh.', primaryColor: '#22D3EE', secondaryColor: '#10B981', pattern: 'matrix-rain' },
];

export const CUSTOM_FACTORY_MODES: FactoryTemplate[] = [
  { nativeId: 1, codeLabel: 'MOD-01', name: 'Modul · Rainbow Cycle', category: 'Flow', description: 'Preset universal modul eksternal', primaryColor: '#EC4899', secondaryColor: '#22D3EE', pattern: 'rainbow-flow' },
  { nativeId: 2, codeLabel: 'MOD-02', name: 'Modul · Comet Chase', category: 'Chase', description: 'Preset universal modul eksternal', primaryColor: '#22D3EE', secondaryColor: '#3B82F6', pattern: 'dual-comet' },
  { nativeId: 3, codeLabel: 'MOD-03', name: 'Modul · Strobe Blitz', category: 'Chase', description: 'Preset universal modul eksternal', primaryColor: '#FFFFFF', secondaryColor: '#94A3B8', pattern: 'white-strobe-flash' },
  { nativeId: 4, codeLabel: 'MOD-04', name: 'Modul · Matrix Pulse', category: 'Pulse', description: 'Preset universal modul eksternal', primaryColor: '#10B981', secondaryColor: '#22D3EE', pattern: 'matrix-drop' },
];

export function inferPatternFromName(name: string, index: number): {
  pattern: AnimationPattern;
  category: ModeCategory;
  primaryColor: string;
  secondaryColor: string;
} {
  const lower = name.toLowerCase();
  if (lower.includes('strobe') || lower.includes('flash') || lower.includes('lightning')) {
    return { pattern: 'white-strobe-flash', category: 'Chase', primaryColor: '#FFFFFF', secondaryColor: '#38BDF8' };
  }
  if (lower.includes('fire') || lower.includes('lava') || lower.includes('ember')) {
    return { pattern: 'fire-ember', category: 'Flow', primaryColor: '#F97316', secondaryColor: '#EF4444' };
  }
  if (lower.includes('rainbow') || lower.includes('pride') || lower.includes('colorloop')) {
    return { pattern: 'rainbow-flow', category: 'Flow', primaryColor: '#EF4444', secondaryColor: '#22D3EE' };
  }
  if (lower.includes('aurora') || lower.includes('pacifica') || lower.includes('ocean')) {
    return { pattern: 'aurora-dual', category: 'Flow', primaryColor: '#10B981', secondaryColor: '#22D3EE' };
  }
  if (lower.includes('matrix') || lower.includes('rain')) {
    return { pattern: 'matrix-rain', category: 'Chase', primaryColor: '#22C55E', secondaryColor: '#22D3EE' };
  }
  if (lower.includes('meteor') || lower.includes('comet')) {
    return { pattern: 'meteor-rain', category: 'Chase', primaryColor: '#22D3EE', secondaryColor: '#A855F7' };
  }
  if (lower.includes('scan') || lower.includes('larson') || lower.includes('wipe')) {
    return { pattern: 'cyber-scan', category: 'Chase', primaryColor: '#EF4444', secondaryColor: '#F97316' };
  }
  if (lower.includes('sparkle') || lower.includes('twinkle') || lower.includes('firework')) {
    return { pattern: 'sparkle-ice', category: 'Pulse', primaryColor: '#FFFFFF', secondaryColor: '#EC4899' };
  }
  if (lower.includes('breath') || lower.includes('fade') || lower.includes('pulse')) {
    return { pattern: 'neon-breathe', category: 'Pulse', primaryColor: '#38BDF8', secondaryColor: '#6366F1' };
  }
  if (lower.includes('solid') || lower.includes('static')) {
    return { pattern: 'solid-cyan', category: 'Static', primaryColor: '#22D3EE', secondaryColor: '#0EA5E9' };
  }
  if (lower.includes('plasma') || lower.includes('vortex')) {
    return { pattern: 'plasma-wave', category: 'Flow', primaryColor: '#EC4899', secondaryColor: '#8B5CF6' };
  }
  const fallbackPatterns: AnimationPattern[] = [
    'dual-comet',
    'prism-shift',
    'checker-wave',
    'radar-sweep',
    'dna-helix',
  ];
  return {
    pattern: fallbackPatterns[index % fallbackPatterns.length],
    category: 'Chase',
    primaryColor: '#22D3EE',
    secondaryColor: '#EC4899',
  };
}

function getTemplatesForProfile(profile: MultiControllerProfile): FactoryTemplate[] {
  if (profile.id === 'led-dmx-clariss') {
    return LED_DMX_FACTORY_MODES;
  }
  if (profile.family === 'dmx' || profile.protocol === 'artnet-ws') {
    return DMX_FACTORY_MODES;
  }
  if (profile.family === 'wled') {
    return WLED_FACTORY_MODES;
  }
  if (profile.family === 'bluetooth' || profile.protocol === 'ble') {
    if (profile.bleFormat === 'elk-bledom') {
      return BLE_FACTORY_MODES.filter((m) => m.bleFormat === 'elk-bledom');
    }
    if (profile.bleFormat === 'triones') {
      return BLE_FACTORY_MODES.filter((m) => m.bleFormat === 'triones');
    }
    if (profile.bleFormat === 'dmx-ble') {
      return [
        ...LED_DMX_FACTORY_MODES,
        ...DMX_FACTORY_MODES.map((m) => ({ ...m, bleFormat: 'dmx-ble' as BlePacketFormat })),
      ];
    }
    return BLE_FACTORY_MODES;
  }
  if (profile.family === 'car') {
    return CAR_FACTORY_MODES;
  }
  if (profile.family === 'custom') {
    return CUSTOM_FACTORY_MODES;
  }
  // esp8266 already has 310 RNS modes; return only live discovered extra modes if any
  return [];
}

function toRgbModeFromDiscovered(
  profile: MultiControllerProfile,
  item: DiscoveredModuleMode,
  id: number,
  idx: number
): RgbMode {
  const inferred = inferPatternFromName(item.name, idx);
  const prefix =
    profile.family === 'wled'
      ? `FX-${String(item.nativeId).padStart(3, '0')}`
      : profile.family === 'dmx'
        ? `DMX-${String(idx + 1).padStart(2, '0')}`
        : `${profile.family.toUpperCase().slice(0, 3)}-${String(item.nativeId).padStart(2, '0')}`;
  const codeLabel = item.codeLabel || prefix;

  return {
    id,
    code: codeLabel,
    name: item.name,
    category: item.category || inferred.category,
    description: `Mode bawaan langsung dari modul ${profile.name}`,
    primaryColor: item.primaryColor || inferred.primaryColor,
    secondaryColor: item.secondaryColor || inferred.secondaryColor,
    pattern: item.pattern || inferred.pattern,
    eyeBehavior: 'off',
    moduleMeta: {
      profileId: profile.id,
      profileName: profile.name,
      family: profile.family,
      codeLabel,
      nativeId: item.nativeId,
      bleFormat: item.bleFormat || profile.bleFormat,
      dmxPreset: item.dmxPreset,
      fromLiveDevice: true,
    },
  };
}

export function buildModuleFactoryModes(profiles: MultiControllerProfile[]): RgbMode[] {
  const result: RgbMode[] = [];

  profiles.forEach((profile, pIdx) => {
    const baseId = 1000 + pIdx * 1000;

    if (profile.discoveredModes && profile.discoveredModes.length > 0) {
      profile.discoveredModes.forEach((item, idx) => {
        result.push(toRgbModeFromDiscovered(profile, item, baseId + idx + 1, idx));
      });
      return;
    }

    const templates = getTemplatesForProfile(profile);
    templates.forEach((tpl, idx) => {
      result.push({
        id: baseId + idx + 1,
        code: tpl.codeLabel,
        name: tpl.name,
        category: tpl.category,
        description: `${tpl.description} · ${profile.name}`,
        primaryColor: tpl.primaryColor,
        secondaryColor: tpl.secondaryColor,
        pattern: tpl.pattern,
        eyeBehavior: profile.family === 'car' ? 'look-around' : 'off',
        moduleMeta: {
          profileId: profile.id,
          profileName: profile.name,
          family: profile.family,
          codeLabel: tpl.codeLabel,
          nativeId: tpl.nativeId,
          bleFormat: tpl.bleFormat || profile.bleFormat,
          dmxPreset: tpl.dmxPreset,
          fromLiveDevice: false,
        },
      });
    });
  });

  return result;
}

export const FAMILY_SHORT_LABEL: Record<ControllerFamily, string> = {
  esp8266: 'ESP',
  dmx: 'DMX',
  wled: 'WLED',
  bluetooth: 'BLE',
  car: 'CAR',
  custom: 'MOD',
};
