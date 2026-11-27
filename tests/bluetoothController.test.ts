import assert from 'node:assert/strict';
import test from 'node:test';
import type { ControllerState, RgbMode } from '../src/types/controller';
import {
  buildBluetoothPacket,
  connectBluetoothController,
  disconnectBluetoothController,
  getBleSessionInfo,
  inferBleFormatFromDevice,
  KNOWN_BLE_SERVICES,
  selectBestGattCharacteristics,
  sendStateOverBluetooth,
  writeRawBluetoothBytes,
  type AndroidBtBridge,
  type BluetoothDeviceLike,
  type GattCharacteristicLike,
  type GattServerLike,
} from '../src/utils/bluetoothController';

function makeBaseState(overrides?: Partial<ControllerState>): ControllerState {
  return {
    powerOn: true,
    activeModeId: 1,
    speed: 60,
    brightness: 80,
    sein: 'off',
    brakeActive: false,
    reverseActive: false,
    combinationEnabled: false,
    solidStayActive: false,
    solidColor: '#22D3EE',
    welcomePlayingUntil: 0,
    favorites: [1],
    combo: {
      leftModes: [1],
      rightModes: [2],
      style: 'zone-split',
      intervalSec: 3,
    },
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
      showMovingEyes: true,
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
      version: 0,
      versionLabel: 'v1.0',
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

function resetGlobals(): void {
  disconnectBluetoothController();
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.navigator;
}

test('inferBleFormatFromDevice recognizes LED LAMP, ELK, Triones, LED DMX, and RNS modules', () => {
  assert.equal(
    inferBleFormatFromDevice('LED BLE 00-1A2B', '0000fff0-0000-1000-8000-00805f9b34fb', '0000fff3-0000-1000-8000-00805f9b34fb'),
    'elk-bledom'
  );
  assert.equal(
    inferBleFormatFromDevice('ELK-BLEDOM', null, null),
    'elk-bledom'
  );
  assert.equal(
    inferBleFormatFromDevice('LED DMX 4CH', '0000ffb0-0000-1000-8000-00805f9b34fb', '0000ffb2-0000-1000-8000-00805f9b34fb'),
    'dmx-ble'
  );
  assert.equal(
    inferBleFormatFromDevice('Triones-9F02', '0000ffd5-0000-1000-8000-00805f9b34fb', '0000ffd9-0000-1000-8000-00805f9b34fb'),
    'triones'
  );
  assert.equal(
    inferBleFormatFromDevice('RNS-Matrix-ESP32', '6e400001-b5a3-f393-e0a9-e50e24dcca9e', '6e400002-b5a3-f393-e0a9-e50e24dcca9e'),
    'rns-json'
  );
});

test('selectBestGattCharacteristics prioritizes real LED command UUIDs over unrelated writable chars', async () => {
  const fakeServer: GattServerLike = {
    connected: true,
    connect: async () => fakeServer,
    disconnect: () => {},
    getPrimaryService: async () => {
      throw new Error('not needed');
    },
    getPrimaryServices: async () => [
      {
        uuid: '00001800-0000-1000-8000-00805f9b34fb',
        getCharacteristics: async () => [
          {
            uuid: '00002a00-0000-1000-8000-00805f9b34fb',
            properties: { write: true },
          },
        ],
      },
      {
        uuid: '0000fff0-0000-1000-8000-00805f9b34fb',
        getCharacteristics: async () => [
          {
            uuid: '0000fff2-0000-1000-8000-00805f9b34fb',
            properties: { write: true },
          },
          {
            uuid: '0000fff4-0000-1000-8000-00805f9b34fb',
            properties: { notify: true },
          },
          {
            uuid: '0000fff3-0000-1000-8000-00805f9b34fb',
            properties: { writeWithoutResponse: true },
          },
        ],
      },
    ],
  };

  const result = await selectBestGattCharacteristics(fakeServer, KNOWN_BLE_SERVICES);
  assert.equal(result.writeService?.uuid, '0000fff0-0000-1000-8000-00805f9b34fb');
  assert.equal(result.writeChar?.uuid, '0000fff3-0000-1000-8000-00805f9b34fb');
  assert.equal(result.notifyChar?.uuid, '0000fff4-0000-1000-8000-00805f9b34fb');
});

test('buildBluetoothPacket generates valid binary and JSON packets and isolates front lamp from rear brake/reverse', () => {
  const state = makeBaseState({
    brakeActive: true,
    reverseActive: false,
    sein: 'left',
    combinationEnabled: true,
    solidStayActive: true,
    solidColor: '#FF1020',
  });

  // ELK-BLEDOM (LED LAMP 0x7E ... 0xEF)
  const elkPkt = buildBluetoothPacket('elk-bledom', state, '#FF1020');
  assert.deepEqual(
    Array.from(elkPkt),
    [0x7e, 0x00, 0x05, 0x03, 0xff, 0x10, 0x20, 0x00, 0xef]
  );

  // LED DMX BLE (0xDD header, rear includes brake flag bit0 + seinL bit2 + combo bit4 = 21)
  const dmxRear = buildBluetoothPacket('dmx-ble', state, '#FF1020', undefined, undefined, { zone: 'rear' });
  assert.equal(dmxRear[0], 0xdd);
  assert.equal(dmxRear[dmxRear.length - 1] & 0b00010101, 0b00010101);

  // Front zone must keep brake=false (bit0 = 0)
  const dmxFront = buildBluetoothPacket('dmx-ble', state, '#FF1020', undefined, undefined, { zone: 'front' });
  assert.equal(dmxFront[dmxFront.length - 1] & 1, 0);

  // RNS JSON respects front isolation too
  const rnsFrontBytes = buildBluetoothPacket('rns-json', state, '#FF1020', undefined, undefined, { zone: 'front' });
  const rnsFrontJson = JSON.parse(new TextDecoder().decode(rnsFrontBytes));
  assert.equal(rnsFrontJson.brake, false);
  assert.equal(rnsFrontJson.reverse, false);
  assert.equal(rnsFrontJson.zone, 'front');
  assert.equal(rnsFrontJson.combo, true);

  // Factory ELK effect frame
  const elkMode: RgbMode = {
    id: 500,
    code: 'ELK-87',
    name: 'ELK 7-Color',
    category: 'Flow',
    description: '',
    primaryColor: '#22D3EE',
    secondaryColor: '#EC4899',
    pattern: 'rainbow-flow',
    moduleMeta: {
      profileId: 'led-dmx-clariss',
      profileName: 'LED BLE',
      family: 'bluetooth',
      codeLabel: 'ELK-87',
      nativeId: 0x87,
      bleFormat: 'elk-bledom',
    },
  };
  const effectState = makeBaseState({ solidStayActive: false });
  const elkEff = buildBluetoothPacket('elk-bledom', effectState, '#22D3EE', undefined, elkMode);
  assert.deepEqual(Array.from(elkEff), [0x7e, 0x00, 0x03, 0x87, 0x03, 0x00, 0x00, 0x00, 0xef]);
});

test('Web Bluetooth GATT connect retries once, chunks 20-byte writes, and falls back when writeWithoutResponse rejects', async () => {
  resetGlobals();
  const writes: Uint8Array[] = [];
  let connectAttempts = 0;

  const writeChar: GattCharacteristicLike = {
    uuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    properties: { writeWithoutResponse: true, write: true },
    writeValueWithoutResponse: async () => {
      throw new Error('Simulated Android writeWithoutResponse failure');
    },
    writeValueWithResponse: async (buf) => {
      const view = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      writes.push(view);
    },
  };

  let gattConnected = false;
  const server: GattServerLike = {
    get connected() {
      return gattConnected;
    },
    connect: async () => {
      connectAttempts++;
      if (connectAttempts === 1) {
        throw new Error('Transient GATT connect error');
      }
      gattConnected = true;
      return server;
    },
    disconnect: () => {
      gattConnected = false;
    },
    getPrimaryService: async () => {
      throw new Error('unused');
    },
    getPrimaryServices: async () => [
      {
        uuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        getCharacteristics: async () => [writeChar],
      },
    ],
  };

  const mockDevice: BluetoothDeviceLike = {
    id: 'dev-rns-1',
    name: 'RNS-ESP32-Test',
    gatt: server,
    addEventListener: () => {},
  };

  (globalThis as Record<string, unknown>).navigator = {
    bluetooth: {
      requestDevice: async () => mockDevice,
    },
  };

  try {
    const session = await connectBluetoothController({ zone: 'rear' });
    assert.equal(connectAttempts, 2);
    assert.equal(session.connected, true);
    assert.equal(session.deviceName, 'RNS-ESP32-Test');
    assert.equal(session.connections[0].format, 'rns-json');

    await sendStateOverBluetooth('rns-json', makeBaseState(), '#22D3EE');
    assert.ok(writes.length > 1, 'JSON payload should be split into <= 20-byte MTU chunks');
    for (const chunk of writes) {
      assert.ok(chunk.length <= 20);
    }
    const reassembled = new TextDecoder().decode(Buffer.concat(writes));
    const parsed = JSON.parse(reassembled.trim());
    assert.equal(parsed.zone, 'rear');
    assert.equal(parsed.speed, 60);
  } finally {
    resetGlobals();
  }
});

test('Android native WebView bridge sends binary frames via sendHex without UTF-8 replacement corruption', async () => {
  resetGlobals();
  const sentHex: string[] = [];
  const sentText: string[] = [];

  const mockBridge: AndroidBtBridge = {
    isConnected: () => true,
    getDeviceName: () => 'LED BLE 00-A1B2',
    sendHex: (hex) => sentHex.push(hex),
    send: (txt) => sentText.push(txt),
  };

  (globalThis as Record<string, unknown>).window = {
    AndroidBluetooth: mockBridge,
  };
  (globalThis as Record<string, unknown>).navigator = {};

  try {
    const info = await connectBluetoothController({ zone: 'all', format: 'elk-bledom' });
    assert.equal(info.connected, true);
    assert.equal(info.via, 'android-bridge');

    const binaryFrame = new Uint8Array([0x7e, 0x00, 0x05, 0x03, 0xff, 0x22, 0x11, 0x00, 0xef]);
    const summary = await writeRawBluetoothBytes(binaryFrame);
    assert.equal(summary, '7E 00 05 03 FF 22 11 00 EF');
    assert.deepEqual(sentHex, ['7E000503FF221100EF']);
    assert.equal(sentText.length, 0);
  } finally {
    resetGlobals();
  }
});
