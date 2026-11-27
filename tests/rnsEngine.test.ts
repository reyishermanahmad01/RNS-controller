import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUILTIN_MATRIX_MODELS,
  BUILTIN_PRESETS,
  getWhiteModeSubgroup,
  RGB_MODES,
  WHITE_SPECIAL_MODES,
} from '../src/data/modes';
import type { ControllerState } from '../src/types/controller';
import { buildBluetoothPacket } from '../src/utils/bluetoothController';
import { parseModuleBarcode } from '../src/utils/moduleBarcodeParser';
import { evaluateStoplampCell, MATRIX_CELLS } from '../src/utils/patternColorEngine';

function createTestState(overrides?: Partial<ControllerState>): ControllerState {
  return {
    powerOn: true,
    activeModeId: 1,
    speed: 65,
    brightness: 100,
    sein: 'off',
    brakeActive: false,
    reverseActive: false,
    combinationEnabled: false,
    solidStayActive: false,
    solidColor: '#22D3EE',
    welcomePlayingUntil: 0,
    favorites: [1],
    combo: {
      leftModes: [1, 3],
      rightModes: [1, 3],
      style: 'layer-blend',
      intervalSec: 3,
      priorityMode: 'blend',
      syncPanels: true,
    },
    manualSideColors: {
      enabled: false,
      syncSides: false,
      leftColors: ['#EF4444'],
      rightColors: ['#3B82F6'],
      leftBrightness: 100,
      rightBrightness: 100,
    },
    autoBelang: {
      enabled: false,
      colors: ['#EF4444', '#22D3EE', '#F59E0B', '#EC4899'],
      colorCount: 4,
      stripeCount: 8,
      colorChangeSpeed: 60,
      direction: 'left-to-right',
      pattern: 'stripes',
      moving: false,
    },
    ledMatrix: {
      enabled: false,
      activeModelId: 'eye-angry',
      category: 'eyes',
      eyeExpression: 'angry',
      eyeShape: 'cyber-slit',
      matrixEffect: 'scrolling-text',
      scrollingText: 'RNS RGB',
      primaryColor: '#EF4444',
      secondaryColor: '#22D3EE',
      speed: 60,
      size: 4,
      direction: 'left',
      customModels: [],
    },
    savedPresets: BUILTIN_PRESETS,
    special: {
      welcomeStyle: 'sweep',
      welcomeColor: 'cyan',
      seinPattern: 'sequential',
      seinSpeed: 65,
      brakePattern: 'f1-strobe',
      brakeFlashCount: 4,
      comboPriority: 'signal-over-rgb',
    },
    led: {
      leftCount: 187,
      rightCount: 187,
      chipset: 'WS2812B',
      colorOrder: 'GRB',
      maxCurrentMa: 2500,
      pixelShape: 'square',
      showMovingEyes: false,
      swapPanels: false,
      testOverride: 'none',
    },
    device: {
      boardName: 'Wemos D1 Mini',
      ssid: 'RNS',
      ipAddress: '192.168.4.1',
      port: 81,
      connectionStatus: 'simulation',
      autoReconnect: false,
      adminPin: '1234',
    },
    customization: {
      appName: 'RNS Controller',
      accentTheme: 'cyan',
      sectionOrder: ['quick-controls', 'sliders'],
      showWelcomeBtn: true,
      showSeinBtn: true,
      showBrakeBtn: true,
      showComboBtn: true,
      customModes: [],
      modeOverrides: {},
    },
    cloudMeta: {
      version: 1,
      versionLabel: 'v2.0',
      releaseNotes: '',
    },
    adminControllers: {
      activeProfileId: 'led-dmx-clariss',
      dmxChannels: [200, 34, 211, 238, 0, 0, 1, 128],
      carZone: 'all',
      profiles: [],
    },
    soundReactive: {
      enabled: false,
      sensitivity: 70,
      style: 'vu-bars',
    },
    frontLamp: {
      enabled: true,
      followRearMode: true,
      syncColorWithRear: true,
      syncSeinWithRear: true,
      brakeFollowRear: false,
      devilEye: { enabled: true, color: '#EF4444', brightness: 85, effect: 'pulse' },
      shroudBiled: { enabled: true, color: '#22D3EE', brightness: 80, effect: 'ring' },
      alis: { enabled: true, color: '#F8FAFC', brightness: 90, effect: 'solid' },
    },
    ...overrides,
  };
}

test('Catalog has 400 unique modes including 20 categorized White Full modes', () => {
  assert.equal(RGB_MODES.length, 400);
  const idSet = new Set(RGB_MODES.map((m) => m.id));
  assert.equal(idSet.size, 400);

  const whiteModes = RGB_MODES.filter((m) => m.category === 'White Full');
  assert.equal(whiteModes.length, 20);
  assert.equal(WHITE_SPECIAL_MODES.length, 20);

  const running = whiteModes.filter((m) => getWhiteModeSubgroup(m) === 'White Running');
  const strobo = whiteModes.filter((m) => getWhiteModeSubgroup(m) === 'White Strobo');
  const matrix = whiteModes.filter((m) => getWhiteModeSubgroup(m) === 'White Matrix');
  assert.equal(running.length, 6);
  assert.equal(strobo.length, 6);
  assert.equal(matrix.length, 8);

  // Ensure built-in presets and matrix models exist cleanly
  assert.ok(BUILTIN_MATRIX_MODELS.length >= 12);
  assert.ok(BUILTIN_PRESETS.length >= 3);
});

test('Multi-mode layer-blend combines multiple modes simultaneously without only executing the last mode', () => {
  // Mode 1: Hujan Meteor (sparse tail), Mode 387: White Strobo or Mode 400: White Solid
  const onlyMeteorState = createTestState({
    activeModeId: 1,
    combinationEnabled: false,
  });

  const combinedState = createTestState({
    activeModeId: 1,
    combinationEnabled: true,
    combo: {
      leftModes: [1, 400], // Meteor + White Solid 6000K
      rightModes: [1, 400],
      style: 'layer-blend',
      intervalSec: 3,
      priorityMode: 'blend',
      syncPanels: true,
    },
  });

  // Evaluate across left cells at t=500ms; combined blend should stay brightly lit across the whole panel
  const leftCells = MATRIX_CELLS.filter((c) => c.side === 'left');
  let combinedLitCount = 0;
  let totalLuminanceDiff = 0;

  for (const cell of leftCells) {
    const [mr, mg, mb] = evaluateStoplampCell(onlyMeteorState, RGB_MODES, cell, 500, {
      ignoreOverrides: true,
    });
    const [cr, cg, cb] = evaluateStoplampCell(combinedState, RGB_MODES, cell, 500, {
      ignoreOverrides: true,
    });
    if (cr + cg + cb > 250) combinedLitCount++;
    totalLuminanceDiff += Math.abs(cr - mr) + Math.abs(cg - mg) + Math.abs(cb - mb);
  }

  assert.equal(combinedLitCount, leftCells.length, 'Combined blend should preserve Mode 400 contribution across all cells');
  assert.ok(totalLuminanceDiff > 5000, 'Combined layer-blend output must differ from single mode');
});

test('Manual left/right colors render distinct side colors & brightnesses without altering active modes', () => {
  const state = createTestState({
    activeModeId: 1,
    combinationEnabled: true,
    solidStayActive: true,
    manualSideColors: {
      enabled: true,
      syncSides: false,
      leftColors: ['#FF0000'],
      rightColors: ['#0000FF'],
      leftBrightness: 100,
      rightBrightness: 50,
    },
  });

  const leftCell = MATRIX_CELLS.find((c) => c.side === 'left' && c.row === 2)!;
  const rightCell = MATRIX_CELLS.find((c) => c.side === 'right' && c.row === 2)!;

  const [lr, lg, lb] = evaluateStoplampCell(state, RGB_MODES, leftCell, 1000, { ignoreOverrides: true });
  const [rr, rg, rb] = evaluateStoplampCell(state, RGB_MODES, rightCell, 1000, { ignoreOverrides: true });

  assert.ok(lr > 200 && lg === 0 && lb === 0, `Expected left pure red, got [${lr},${lg},${lb}]`);
  assert.ok(rr === 0 && rg === 0 && rb >= 110 && rb <= 140, `Expected right 50% blue, got [${rr},${rg},${rb}]`);
  assert.equal(state.activeModeId, 1);
  assert.deepEqual(state.combo.leftModes, [1, 3]);
});

test('Auto Belang produces multiple distinct stripe colors across the horizontal axis', () => {
  const state = createTestState({
    autoBelang: {
      enabled: true,
      colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
      colorCount: 4,
      stripeCount: 4,
      colorChangeSpeed: 0,
      direction: 'left-to-right',
      pattern: 'stripes',
      moving: false,
    },
  });

  const rowCells = MATRIX_CELLS.filter((c) => c.side === 'right' && c.row === 2);
  const distinctSignatures = new Set(
    rowCells.map((cell) => evaluateStoplampCell(state, RGB_MODES, cell, 0, { ignoreOverrides: true }).join(','))
  );

  assert.ok(
    distinctSignatures.size >= 3,
    `Expected at least 3 distinct auto-belang colors across stripes, got ${distinctSignatures.size}`
  );
});

test('LED Matrix renders both Digital Eyes and Scrolling Text across the matrix grid', () => {
  const eyeState = createTestState({
    ledMatrix: {
      enabled: true,
      activeModelId: 'eye-angry',
      category: 'eyes',
      eyeExpression: 'angry',
      eyeShape: 'cyber-slit',
      matrixEffect: 'scrolling-text',
      scrollingText: 'RNS',
      primaryColor: '#FF0000',
      secondaryColor: '#00FFFF',
      speed: 60,
      size: 4,
      direction: 'left',
      customModels: [],
    },
  });

  const eyeOutputs = MATRIX_CELLS.map((cell) =>
    evaluateStoplampCell(eyeState, RGB_MODES, cell, 400, { ignoreOverrides: true })
  );
  assert.ok(eyeOutputs.some(([r, g, b]) => r > 150 || g > 150 || b > 150), 'Digital eyes should illuminate pixels');
  assert.ok(eyeOutputs.some(([r, g, b]) => r < 40 && g < 40 && b < 40), 'Digital eyes should contrast with dark background');

  const textState = createTestState({
    ledMatrix: {
      enabled: true,
      activeModelId: 'mx-scroll-text',
      category: 'matrix',
      eyeExpression: 'angry',
      eyeShape: 'cyber-slit',
      matrixEffect: 'scrolling-text',
      scrollingText: 'RNS RGB',
      primaryColor: '#22D3EE',
      secondaryColor: '#F8FAFC',
      speed: 60,
      size: 4,
      direction: 'left',
      customModels: [],
    },
  });

  const textOutputs = MATRIX_CELLS.map((cell) =>
    evaluateStoplampCell(textState, RGB_MODES, cell, 600, { ignoreOverrides: true })
  );
  assert.ok(textOutputs.some(([r, g, b]) => g > 180 && b > 200), 'Scrolling text should render bright cyan/white glyphs');
});

test('White Full mode outputs clean neutral white pixels', () => {
  const whiteState = createTestState({
    activeModeId: 400, // Solid Full 6000K White
  });

  const sampleCell = MATRIX_CELLS.find((c) => c.side === 'left' && c.row === 2)!;
  const [r, g, b] = evaluateStoplampCell(whiteState, RGB_MODES, sampleCell, 500, {
    ignoreOverrides: true,
  });
  assert.ok(r > 230 && g > 230 && b > 230, `Expected bright neutral white, got [${r},${g},${b}]`);
  assert.ok(Math.abs(r - g) <= 15 && Math.abs(g - b) <= 15);
});

test('BLE rns-json packet includes combo, manualSideColors, autoBelang, and ledMatrix metadata', () => {
  const state = createTestState({
    combinationEnabled: true,
    manualSideColors: {
      enabled: true,
      syncSides: false,
      leftColors: ['#EF4444', '#F59E0B'],
      rightColors: ['#3B82F6'],
      leftBrightness: 90,
      rightBrightness: 75,
    },
    autoBelang: {
      enabled: true,
      colors: ['#EF4444', '#22D3EE'],
      colorCount: 2,
      stripeCount: 6,
      colorChangeSpeed: 55,
      direction: 'center-out',
      pattern: 'wave',
      moving: true,
    },
    ledMatrix: {
      enabled: true,
      activeModelId: 'mx-scroll-text',
      category: 'matrix',
      eyeExpression: 'angry',
      eyeShape: 'cyber-slit',
      matrixEffect: 'scrolling-text',
      scrollingText: 'RNS TEST',
      primaryColor: '#22D3EE',
      secondaryColor: '#FFFFFF',
      speed: 70,
      size: 4,
      direction: 'left',
      customModels: [],
    },
  });

  const bytes = buildBluetoothPacket('rns-json', state, '#22D3EE');
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  assert.equal(parsed.comboStyle, 'layer-blend');
  assert.equal(parsed.comboPriority, 'blend');
  assert.equal(parsed.comboSyncPanels, true);
  assert.equal(parsed.manualSideColors.enabled, true);
  assert.deepEqual(parsed.manualSideColors.leftColors, ['#EF4444', '#F59E0B']);
  assert.equal(parsed.autoBelang.enabled, true);
  assert.equal(parsed.autoBelang.stripeCount, 6);
  assert.equal(parsed.ledMatrix.modelId, 'mx-scroll-text');
  assert.equal(parsed.ledMatrix.matrixEffect, 'scrolling-text');
  assert.equal(parsed.ledMatrix.text, 'RNS TEST');
});

test('Welcome mode animation progresses across the panel even when RAF nowMs differs from Date.now()', () => {
  const welcomeUntil = 1795658403000;
  const welcomeState = createTestState({
    activeModeId: 1,
    welcomePlayingUntil: welcomeUntil,
    special: {
      welcomeStyle: 'sweep',
      welcomeColor: 'cyan',
      seinPattern: 'sequential',
      seinSpeed: 65,
      brakePattern: 'f1-strobe',
      brakeFlashCount: 4,
      comboPriority: 'signal-over-rgb',
    },
  });

  const centerCell = MATRIX_CELLS.find((c) => c.side === 'right' && c.row === 2 && c.normX <= 0.1)!;
  const outerCell = MATRIX_CELLS.find((c) => c.side === 'right' && c.row === 2 && c.normX >= 0.9)!;

  // Near start (progress ~ 0.05 -> center bright, outer dim)
  const startCenter = evaluateStoplampCell(welcomeState, RGB_MODES, centerCell, 120, {
    wallClockMs: welcomeUntil - 2850,
  });
  const startOuter = evaluateStoplampCell(welcomeState, RGB_MODES, outerCell, 120, {
    wallClockMs: welcomeUntil - 2850,
  });

  // Midpoint (progress ~ 0.5 -> wave at outer wing: outer bright cyan, center dim)
  const midCenter = evaluateStoplampCell(welcomeState, RGB_MODES, centerCell, 1500, {
    wallClockMs: welcomeUntil - 1500,
  });
  const midOuter = evaluateStoplampCell(welcomeState, RGB_MODES, outerCell, 1500, {
    wallClockMs: welcomeUntil - 1500,
  });

  assert.ok(startCenter[2] > startOuter[2] + 80, 'At start of welcome sweep, center must be brighter than outer wing');
  assert.ok(midOuter[2] > midCenter[2] + 80, 'At midpoint of welcome sweep, outer wing must be brighter than center');
});

test('All 6 Welcome styles render distinct active animations and return to normal mode once ended', () => {
  const styles = ['sweep', 'center-out', 'cyber-flash', 'dual-meet', 'row-cascade', 'pulse-bloom'] as const;
  const welcomeUntil = 1795658403000;
  const sampleCell = MATRIX_CELLS.find((c) => c.side === 'left' && c.row === 3 && c.normX >= 0.45)!;

  for (const style of styles) {
    const activeState = createTestState({
      activeModeId: 1,
      welcomePlayingUntil: welcomeUntil,
      special: {
        welcomeStyle: style,
        welcomeColor: 'crimson',
        seinPattern: 'sequential',
        seinSpeed: 65,
        brakePattern: 'f1-strobe',
        brakeFlashCount: 4,
        comboPriority: 'signal-over-rgb',
      },
    });
    const frames = [2700, 2100, 1500, 900].map((rem) =>
      evaluateStoplampCell(activeState, RGB_MODES, sampleCell, 500, {
        wallClockMs: welcomeUntil - rem,
      })
    );
    const maxRed = Math.max(...frames.map(([r]) => r));
    assert.ok(maxRed > 90, `Welcome style "${style}" should illuminate red LEDs brightly`);
  }

  // After welcomePlayingUntil expires, normal activeModeId must resume cleanly
  const expiredState = createTestState({
    activeModeId: 400, // Pure White 6000K
    welcomePlayingUntil: welcomeUntil,
  });
  const afterExpired = evaluateStoplampCell(expiredState, RGB_MODES, sampleCell, 500, {
    wallClockMs: welcomeUntil + 100,
  });
  assert.ok(afterExpired[0] > 230 && afterExpired[1] > 230 && afterExpired[2] > 230);
});

test('parseModuleBarcode decodes JSON, Wi-Fi QR, LED DMX, ELK-BLEDOM, and generic RNS barcodes safely', () => {
  const wifiParsed = parseModuleBarcode('WIFI:T:WPA;S:RNS-STOPLAMP-AP;P:12345678;;', 'QR Code');
  assert.equal(wifiParsed.protocol, 'websocket');
  assert.equal(wifiParsed.ssid, 'RNS-STOPLAMP-AP');
  assert.equal(wifiParsed.ipAddress, '192.168.4.1');

  const jsonParsed = parseModuleBarcode(
    '{"name":"RNS Rear PRO","protocol":"ble","bleFormat":"rns-json","leftCount":187,"rightCount":187,"chipset":"WS2812B"}',
    'QR Code'
  );
  assert.equal(jsonParsed.moduleName, 'RNS Rear PRO');
  assert.equal(jsonParsed.bleFormat, 'rns-json');
  assert.equal(jsonParsed.leftCount, 187);
  assert.equal(jsonParsed.chipset, 'WS2812B');

  const dmxParsed = parseModuleBarcode('C.ID.0096-LEDDMX-3232', 'Code 128');
  assert.equal(dmxParsed.protocol, 'ble');
  assert.equal(dmxParsed.bleFormat, 'dmx-ble');

  const elkParsed = parseModuleBarcode('ELK-BLEDOM-9F02', 'QR Code');
  assert.equal(elkParsed.protocol, 'ble');
  assert.equal(elkParsed.bleFormat, 'elk-bledom');
});


