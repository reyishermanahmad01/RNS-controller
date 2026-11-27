import {
  BleConnectionSummary,
  BlePacketFormat,
  BleTargetZone,
  ControllerState,
  RgbMode,
} from '../types/controller';

export interface GattCharacteristicLike {
  uuid: string;
  value?: DataView;
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
    notify?: boolean;
    indicate?: boolean;
  };
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValue?: (value: BufferSource) => Promise<void>;
  startNotifications?: () => Promise<GattCharacteristicLike>;
  addEventListener?: (
    type: string,
    listener: (ev: { target?: GattCharacteristicLike }) => void
  ) => void;
}

export interface GattServiceLike {
  uuid: string;
  getCharacteristics: () => Promise<GattCharacteristicLike[]>;
}

export interface GattServerLike {
  connected: boolean;
  connect: () => Promise<GattServerLike>;
  disconnect: () => void;
  getPrimaryService: (uuid: string) => Promise<GattServiceLike>;
  getPrimaryServices: () => Promise<GattServiceLike[]>;
}

export interface BluetoothDeviceLike {
  id?: string;
  name?: string;
  gatt?: GattServerLike;
  addEventListener: (type: string, listener: () => void) => void;
}

interface NavigatorBluetoothLike {
  requestDevice: (options: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
  }) => Promise<BluetoothDeviceLike>;
}

export interface AndroidBtBridge {
  send?: (data: string) => void;
  write?: (data: string) => void;
  sendHex?: (hex: string) => void;
  writeHex?: (hex: string) => void;
  sendBase64?: (b64: string) => void;
  writeBase64?: (b64: string) => void;
  sendBytes?: (bytes: number[]) => void;
  writeBytes?: (bytes: number[]) => void;
  connect?: (macOrName?: string) => boolean | void;
  disconnect?: () => void;
  isConnected?: () => boolean;
  getDeviceName?: () => string;
}

export const KNOWN_BLE_SERVICES = [
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / JDY-08 / HC-08 / LED BLE UART
  '0000ffe5-0000-1000-8000-00805f9b34fb', // Magic-LED / LEDLamp UART
  '0000ffb0-0000-1000-8000-00805f9b34fb', // LEDLamp / LED DMX BLE Service
  '0000fff0-0000-1000-8000-00805f9b34fb', // ELK-BLEDOM / LED BLE 00-05 / LotusLantern
  '0000ffd5-0000-1000-8000-00805f9b34fb', // Triones / MagicHome Write
  '0000ffd0-0000-1000-8000-00805f9b34fb', // Triones / HappyLighting
  '0000ae00-0000-1000-8000-00805f9b34fb', // Generic BLE LED Strip (AE00/AE01)
  '0000ae30-0000-1000-8000-00805f9b34fb', // LED BLE AE30 variant
  '0000af30-0000-1000-8000-00805f9b34fb', // LED BLE AF30 variant
  '0000ff12-0000-1000-8000-00805f9b34fb', // Dual-mode RGB BLE LED
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS / ESP32)
  '4fafc201-1fb5-459e-8fcc-c5c9c331914b', // ESP32 Custom BLE Service
];

/**
 * Preferred GATT write characteristic UUIDs ordered by real LED module usage.
 * Prevents blindly picking non-command writable characteristics (e.g. OTA/DFU/config).
 */
export const PREFERRED_WRITE_CHAR_UUIDS = [
  '0000fff3-0000-1000-8000-00805f9b34fb', // LED BLE 00-05 / ELK-BLEDOM primary cmd
  '0000ffb2-0000-1000-8000-00805f9b34fb', // LEDLamp / LED DMX primary cmd
  '0000ffe9-0000-1000-8000-00805f9b34fb', // Magic-LED / LEDLamp 0xFFE5 write
  '0000ffd9-0000-1000-8000-00805f9b34fb', // Triones / HappyLighting write
  '0000ffe1-0000-1000-8000-00805f9b34fb', // HM-10 / JDY-08 / LED BLE UART write
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART RX (client -> module)
  '0000ae01-0000-1000-8000-00805f9b34fb', // AE00 LED strip write
  '0000ae31-0000-1000-8000-00805f9b34fb', // AE30 LED strip write
  '0000af31-0000-1000-8000-00805f9b34fb', // AF30 LED strip write
  '0000ffb1-0000-1000-8000-00805f9b34fb', // LEDLamp secondary cmd
  '0000fff1-0000-1000-8000-00805f9b34fb', // ELK-BLEDOM alt write
  '0000ffd1-0000-1000-8000-00805f9b34fb', // HappyLighting alt write
  'beb5483e-36e1-4688-b7f5-ea07361b26a8', // ESP32 custom characteristic
];

export const PREFERRED_NOTIFY_CHAR_UUIDS = [
  '0000fff4-0000-1000-8000-00805f9b34fb',
  '0000ffe4-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '0000ffb2-0000-1000-8000-00805f9b34fb',
  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
];

export interface BleSessionInfo {
  connected: boolean;
  via: 'web-bluetooth' | 'android-bridge' | 'none';
  deviceName: string | null;
  serviceUuid: string | null;
  charUuid: string | null;
  lastHex: string | null;
  count: number;
  connections: BleConnectionSummary[];
}

interface ManagedBleDevice {
  id: string;
  device: BluetoothDeviceLike;
  writeChar: GattCharacteristicLike;
  deviceName: string;
  zone: BleTargetZone;
  format: BlePacketFormat;
  serviceUuid: string | null;
  charUuid: string;
  lastHex: string | null;
  lastWakeSentMs: number;
  writeChain: Promise<void>;
}

const blePool = new Map<string, ManagedBleDevice>();
let bridgeLastHex: string | null = null;
let bridgeZone: BleTargetZone = 'all';
let bridgeFormat: BlePacketFormat = 'rns-json';

function getAndroidBridge(): AndroidBtBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AndroidBluetooth?: AndroidBtBridge;
    BluetoothSerial?: AndroidBtBridge;
    RnsAndroidBle?: AndroidBtBridge;
  };
  return w.RnsAndroidBle || w.AndroidBluetooth || w.BluetoothSerial || null;
}

export function isWebBluetoothSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return Boolean((navigator as unknown as { bluetooth?: NavigatorBluetoothLike }).bluetooth);
}

function pruneDisconnected(): void {
  for (const [id, entry] of blePool.entries()) {
    if (!entry.device.gatt?.connected) {
      blePool.delete(id);
    }
  }
}

export function getBleConnections(): BleConnectionSummary[] {
  pruneDisconnected();
  const list: BleConnectionSummary[] = [];

  const bridge = getAndroidBridge();
  if (bridge && (!bridge.isConnected || bridge.isConnected())) {
    list.push({
      id: 'android-bridge',
      deviceName: bridge.getDeviceName?.() || 'Android Native Bluetooth Bridge',
      via: 'android-bridge',
      zone: bridgeZone,
      format: bridgeFormat,
      serviceUuid: 'SPP / Native BLE Bridge',
      charUuid: 'Serial / GATT',
      lastHex: bridgeLastHex,
    });
  }

  for (const entry of blePool.values()) {
    list.push({
      id: entry.id,
      deviceName: entry.deviceName,
      via: 'web-bluetooth',
      zone: entry.zone,
      format: entry.format,
      serviceUuid: entry.serviceUuid,
      charUuid: entry.charUuid,
      lastHex: entry.lastHex,
    });
  }

  return list;
}

export function getBleSessionInfo(): BleSessionInfo {
  const connections = getBleConnections();
  if (connections.length === 0) {
    return {
      connected: false,
      via: 'none',
      deviceName: null,
      serviceUuid: null,
      charUuid: null,
      lastHex: null,
      count: 0,
      connections: [],
    };
  }

  const first = connections[0];
  const summaryName =
    connections.length === 1
      ? first.deviceName
      : `${connections.length} Modul BLE (${connections.map((c) => c.deviceName).join(' + ')})`;

  return {
    connected: true,
    via: first.via,
    deviceName: summaryName,
    serviceUuid: first.serviceUuid,
    charUuid: first.charUuid,
    lastHex: connections[connections.length - 1].lastHex || first.lastHex,
    count: connections.length,
    connections,
  };
}

export function setBleConnectionZone(connectionId: string, zone: BleTargetZone): void {
  if (connectionId === 'android-bridge') {
    bridgeZone = zone;
    return;
  }
  const entry = blePool.get(connectionId);
  if (entry) {
    entry.zone = zone;
  }
}

export function setBleConnectionFormat(connectionId: string, format: BlePacketFormat): void {
  if (connectionId === 'android-bridge') {
    bridgeFormat = format;
    return;
  }
  const entry = blePool.get(connectionId);
  if (entry) {
    entry.format = format;
  }
}

function bytesToHex(bytes: Uint8Array, spaced = true): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(spaced ? ' ' : '');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}

function isPrintableAscii(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 10 || b === 13 || b === 9) continue;
    if (b < 32 || b > 126) return false;
  }
  return true;
}

function dispatchToAndroidBridge(bridge: AndroidBtBridge, bytes: Uint8Array): string {
  const hexSpaced = bytesToHex(bytes, true);
  const hexCompact = bytesToHex(bytes, false);

  if (bridge.sendBytes) {
    bridge.sendBytes(Array.from(bytes));
  } else if (bridge.writeBytes) {
    bridge.writeBytes(Array.from(bytes));
  } else if (bridge.sendHex) {
    bridge.sendHex(hexCompact);
  } else if (bridge.writeHex) {
    bridge.writeHex(hexCompact);
  } else if (bridge.sendBase64) {
    bridge.sendBase64(bytesToBase64(bytes));
  } else if (bridge.writeBase64) {
    bridge.writeBase64(bytesToBase64(bytes));
  } else {
    // Only decode as UTF-8 text when payload is printable ASCII (e.g. RNS JSON).
    // For binary frames (0x7E/0xDD/0x56), send compact hex so 0x80..0xFF bytes are never corrupted into U+FFFD.
    const payload = isPrintableAscii(bytes)
      ? new TextDecoder().decode(bytes)
      : `HEX:${hexCompact}`;
    if (bridge.send) bridge.send(payload);
    else if (bridge.write) bridge.write(payload);
    else {
      throw new Error('Bridge Bluetooth Android tidak memiliki metode kirim (send/sendHex/sendBytes).');
    }
  }

  bridgeLastHex = hexSpaced;
  return hexSpaced;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [34, 211, 238];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function inferZoneFromName(name: string | undefined, fallback: BleTargetZone): BleTargetZone {
  if (!name) return fallback;
  const low = name.toLowerCase();
  if (
    low.includes('depan') ||
    low.includes('front') ||
    low.includes('headlamp') ||
    low.includes('pcx') ||
    low.includes('alis') ||
    low.includes('biled')
  ) {
    return 'front';
  }
  if (low.includes('belakang') || low.includes('rear') || low.includes('stop')) {
    return 'rear';
  }
  return fallback;
}

/**
 * Infers the wire protocol format from the advertised device name and GATT UUIDs,
 * matching real Android LED LAMP (LED BLE 00-05 / ELK / Triones / LED DMX) & RNS modules.
 */
export function inferBleFormatFromDevice(
  deviceName: string | undefined,
  serviceUuid: string | null | undefined,
  charUuid: string | null | undefined,
  fallback?: BlePacketFormat
): BlePacketFormat {
  const name = (deviceName || '').toUpperCase();
  const svc = (serviceUuid || '').toLowerCase();
  const ch = (charUuid || '').toLowerCase();

  // Explicit hardware matches take priority over generic defaults
  if (
    name.includes('DMX') ||
    name.includes('CLARIS') ||
    svc.includes('0000ffb0') ||
    ch.includes('0000ffb2')
  ) {
    return 'dmx-ble';
  }
  if (
    name.includes('TRIONES') ||
    name.includes('HAPPY') ||
    name.includes('QHM') ||
    name.includes('LEDNET') ||
    name.includes('MAGIC') ||
    svc.includes('0000ffd5') ||
    svc.includes('0000ffd0') ||
    svc.includes('0000ffe5') ||
    ch.includes('0000ffd9') ||
    ch.includes('0000ffe9')
  ) {
    return 'triones';
  }
  if (
    name.includes('ELK-') ||
    name.includes('BLEDOM') ||
    name.includes('LED BLE') ||
    name.includes('LEDBLE') ||
    name.includes('LOTUS') ||
    name.includes('MELK') ||
    svc.includes('0000fff0') ||
    ch.includes('0000fff3')
  ) {
    return 'elk-bledom';
  }
  if (
    name.includes('RNS') ||
    name.includes('ESP') ||
    name.includes('WEMOS') ||
    name.includes('HC-05') ||
    name.includes('HM-10') ||
    name.includes('JDY') ||
    svc.includes('6e400001') ||
    svc.includes('4fafc201')
  ) {
    return 'rns-json';
  }

  return fallback || 'rns-json';
}

function scoreWritableCharacteristic(
  svcUuid: string,
  ch: GattCharacteristicLike,
  targetCharUuid?: string
): number {
  const writable = Boolean(ch.properties?.write || ch.properties?.writeWithoutResponse);
  if (!writable) return -1;

  const chLow = ch.uuid.toLowerCase();
  const svcLow = svcUuid.toLowerCase();

  if (targetCharUuid && chLow === targetCharUuid) {
    return 1000;
  }

  const prefIdx = PREFERRED_WRITE_CHAR_UUIDS.indexOf(chLow);
  if (prefIdx !== -1) {
    return 500 - prefIdx * 5;
  }

  let score = 50;
  if (KNOWN_BLE_SERVICES.includes(svcLow)) {
    score += 100;
  }
  if (ch.properties?.writeWithoutResponse) {
    score += 20;
  }
  // Deprioritize standard Generic Attribute / OTA / Device Info services
  if (svcLow.startsWith('00001800') || svcLow.startsWith('00001801') || svcLow.startsWith('0000fe59')) {
    score -= 40;
  }
  return score;
}

function scoreNotifyCharacteristic(svcUuid: string, ch: GattCharacteristicLike): number {
  if (!ch.properties?.notify && !ch.properties?.indicate) return -1;
  const chLow = ch.uuid.toLowerCase();
  const svcLow = svcUuid.toLowerCase();
  const prefIdx = PREFERRED_NOTIFY_CHAR_UUIDS.indexOf(chLow);
  if (prefIdx !== -1) return 300 - prefIdx * 5;
  return KNOWN_BLE_SERVICES.includes(svcLow) ? 100 : 20;
}

export async function selectBestGattCharacteristics(
  server: GattServerLike,
  optionalServices: string[],
  customSvc?: string,
  targetCharUuid?: string
): Promise<{
  writeService: GattServiceLike | null;
  writeChar: GattCharacteristicLike | null;
  notifyChar: GattCharacteristicLike | null;
}> {
  let services: GattServiceLike[] = [];

  try {
    services = customSvc
      ? [await server.getPrimaryService(customSvc)]
      : await server.getPrimaryServices();
  } catch {
    services = [];
  }

  if (services.length === 0) {
    const settled = await Promise.all(
      optionalServices.map(async (uuid) => {
        try {
          return await server.getPrimaryService(uuid);
        } catch {
          return null;
        }
      })
    );
    services = settled.filter((s): s is GattServiceLike => s !== null);
  }

  let bestWriteScore = -1;
  let writeService: GattServiceLike | null = null;
  let writeChar: GattCharacteristicLike | null = null;

  let bestNotifyScore = -1;
  let notifyChar: GattCharacteristicLike | null = null;

  for (const svc of services) {
    let chars: GattCharacteristicLike[] = [];
    try {
      chars = await svc.getCharacteristics();
    } catch {
      continue;
    }

    for (const ch of chars) {
      const wScore = scoreWritableCharacteristic(svc.uuid, ch, targetCharUuid);
      if (wScore > bestWriteScore) {
        bestWriteScore = wScore;
        writeService = svc;
        writeChar = ch;
      }

      const nScore = scoreNotifyCharacteristic(svc.uuid, ch);
      if (nScore > bestNotifyScore) {
        bestNotifyScore = nScore;
        notifyChar = ch;
      }
    }
  }

  return { writeService, writeChar, notifyChar };
}

function pauseMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectGattWithRetry(gatt: GattServerLike, maxAttempts = 2): Promise<GattServerLike> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await gatt.connect();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await pauseMs(250);
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Gagal membuka koneksi GATT ke modul Bluetooth.');
}

function formatBluetoothConnectError(err: unknown): Error {
  if (!(err instanceof Error)) {
    return new Error('Gagal menghubungkan ke perangkat Bluetooth BLE.');
  }
  const name = err.name;
  const msg = err.message || '';

  if (name === 'NotFoundError') {
    return new Error(
      'Pemindaian dibatalkan atau modul tidak ditemukan. Pastikan modul menyala, Bluetooth & Lokasi (GPS) Android aktif, serta aplikasi LED LAMP lain tidak sedang mengunci modul.'
    );
  }
  if (name === 'SecurityError') {
    return new Error(
      'Izin Web Bluetooth diblokir. Jalankan aplikasi melalui HTTPS di Google Chrome Android atau melalui APK dengan bridge BLE.'
    );
  }
  if (name === 'NetworkError' || msg.includes('GATT')) {
    return new Error(
      'Koneksi GATT gagal terhubung. Dekatkan HP ke modul, tutup koneksi aplikasi LED LAMP di background jika masih aktif, lalu coba hubungkan lagi.'
    );
  }
  return err;
}

export async function connectBluetoothController(options?: {
  customServiceUuid?: string;
  customCharUuid?: string;
  zone?: BleTargetZone;
  format?: BlePacketFormat;
  onDisconnected?: (connectionId?: string) => void;
  onNotifyMessage?: (text: string) => void;
}): Promise<BleSessionInfo> {
  const bridge = getAndroidBridge();
  if (bridge && blePool.size === 0 && !isWebBluetoothSupported()) {
    bridge.connect?.();
    if (options?.zone) bridgeZone = options.zone;
    if (options?.format) bridgeFormat = options.format;
    return getBleSessionInfo();
  }

  const bt = (navigator as unknown as { bluetooth?: NavigatorBluetoothLike }).bluetooth;
  if (!bt) {
    if (bridge) {
      bridge.connect?.();
      if (options?.zone) bridgeZone = options.zone;
      if (options?.format) bridgeFormat = options.format;
      return getBleSessionInfo();
    }
    throw new Error(
      'Web Bluetooth tidak tersedia di WebView/browser ini. Buka aplikasi lewat Google Chrome Android (HTTPS), aktifkan Lokasi + Bluetooth Android, atau gunakan modul Wi-Fi ESP8266/WLED.'
    );
  }

  const customSvc = options?.customServiceUuid?.trim().toLowerCase();
  const optionalServices = customSvc
    ? Array.from(new Set([customSvc, ...KNOWN_BLE_SERVICES]))
    : KNOWN_BLE_SERVICES;

  let device: BluetoothDeviceLike;
  try {
    device = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices,
    });
  } catch (err) {
    throw formatBluetoothConnectError(err);
  }

  if (!device.gatt) {
    throw new Error('Perangkat Bluetooth ini tidak mendukung koneksi GATT BLE.');
  }

  let server: GattServerLike;
  try {
    server = await connectGattWithRetry(device.gatt, 2);
  } catch (err) {
    throw formatBluetoothConnectError(err);
  }

  const targetCharUuid = options?.customCharUuid?.trim().toLowerCase();
  const { writeService: chosenService, writeChar: chosenChar, notifyChar: chosenNotifyChar } =
    await selectBestGattCharacteristics(server, optionalServices, customSvc, targetCharUuid);

  if (!chosenChar) {
    server.disconnect();
    throw new Error(
      `Terhubung ke "${device.name || 'Perangkat BLE'}", tetapi Characteristic tulis (Write) tidak ditemukan. Pastikan Service/Char UUID benar.`
    );
  }

  const connId = device.id || `ble-${Date.now().toString(36)}-${blePool.size + 1}`;
  const isAlreadyReplacingSame = blePool.has(connId);

  let resolvedZone: BleTargetZone = options?.zone || 'all';
  if (!options?.zone) {
    const existingZones = Array.from(blePool.values()).map((c) => c.zone);
    const defaultGuess: BleTargetZone =
      blePool.size === 0
        ? 'rear'
        : existingZones.includes('rear') && !existingZones.includes('front')
          ? 'front'
          : 'all';
    resolvedZone = inferZoneFromName(device.name, defaultGuess);
  }

  const resolvedFormat = inferBleFormatFromDevice(
    device.name,
    chosenService?.uuid,
    chosenChar.uuid,
    options?.format
  );

  const managed: ManagedBleDevice = {
    id: connId,
    device,
    writeChar: chosenChar,
    deviceName: device.name || `Modul BLE ${blePool.size + 1}`,
    zone: resolvedZone,
    format: resolvedFormat,
    serviceUuid: chosenService?.uuid || null,
    charUuid: chosenChar.uuid,
    lastHex: null,
    lastWakeSentMs: 0,
    writeChain: Promise.resolve(),
  };

  blePool.set(connId, managed);

  if (
    chosenNotifyChar &&
    options?.onNotifyMessage &&
    chosenNotifyChar.startNotifications &&
    chosenNotifyChar.addEventListener
  ) {
    try {
      let rxBuffer = '';
      const decoder = new TextDecoder();
      await chosenNotifyChar.startNotifications();
      chosenNotifyChar.addEventListener('characteristicvaluechanged', (ev) => {
        const dv = ev.target?.value;
        if (!dv) return;
        const chunk = decoder.decode(
          dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength)
        );
        rxBuffer += chunk;
        const lines = rxBuffer.split(/\r?\n/);
        rxBuffer = lines.pop() || '';
        for (const line of lines) {
          const clean = line.trim();
          if (clean) options.onNotifyMessage?.(clean);
        }
      });
    } catch {
      // Ignore notify subscription failures on write-only BLE strips
    }
  }

  if (!isAlreadyReplacingSame) {
    device.addEventListener('gattserverdisconnected', () => {
      blePool.delete(connId);
      options?.onDisconnected?.(connId);
    });
  }

  return getBleSessionInfo();
}

export function disconnectBluetoothController(connectionId?: string): void {
  if (connectionId === 'android-bridge') {
    getAndroidBridge()?.disconnect?.();
    return;
  }

  if (connectionId) {
    const entry = blePool.get(connectionId);
    if (entry) {
      try {
        entry.device.gatt?.disconnect();
      } catch {
        // Ignore disconnect error
      }
      blePool.delete(connectionId);
    }
    return;
  }

  getAndroidBridge()?.disconnect?.();
  for (const entry of blePool.values()) {
    try {
      entry.device.gatt?.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
  blePool.clear();
}

async function writeChunkWithFallback(
  ch: GattCharacteristicLike,
  chunk: Uint8Array
): Promise<void> {
  const safeChunk = new Uint8Array(chunk.length);
  safeChunk.set(chunk);

  if (ch.properties?.writeWithoutResponse && ch.writeValueWithoutResponse) {
    try {
      await ch.writeValueWithoutResponse(safeChunk);
      return;
    } catch (err) {
      if (ch.writeValueWithResponse) {
        await ch.writeValueWithResponse(safeChunk);
        return;
      }
      if (ch.writeValue) {
        await ch.writeValue(safeChunk);
        return;
      }
      throw err;
    }
  }

  if (ch.writeValueWithResponse) {
    await ch.writeValueWithResponse(safeChunk);
    return;
  }

  if (ch.writeValue) {
    await ch.writeValue(safeChunk);
    return;
  }

  throw new Error(`Characteristic ${ch.uuid} tidak memiliki API write.`);
}

function enqueueDeviceWrite(entry: ManagedBleDevice, bytes: Uint8Array): Promise<string> {
  const hexSummary = bytesToHex(bytes);
  const run = entry.writeChain.then(async () => {
    if (!entry.device.gatt?.connected) {
      throw new Error(`Koneksi "${entry.deviceName}" sudah terputus.`);
    }
    const CHUNK_SIZE = 20;
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
      await writeChunkWithFallback(entry.writeChar, chunk);
      if (offset + CHUNK_SIZE < bytes.length) {
        await pauseMs(12);
      }
    }
    entry.lastHex = hexSummary;
  });
  entry.writeChain = run.catch(() => {});
  return run.then(() => hexSummary);
}

export async function writeRawBluetoothBytes(
  bytes: Uint8Array,
  targetConnectionId?: string
): Promise<string> {
  const hexSummary = bytesToHex(bytes);
  const bridge = getAndroidBridge();

  if (bridge && blePool.size === 0) {
    return dispatchToAndroidBridge(bridge, bytes);
  }

  pruneDisconnected();
  const targets = targetConnectionId
    ? Array.from(blePool.values()).filter((d) => d.id === targetConnectionId)
    : Array.from(blePool.values());

  if (targets.length === 0) {
    throw new Error('Belum ada perangkat Bluetooth yang terhubung.');
  }

  await Promise.all(targets.map((entry) => enqueueDeviceWrite(entry, bytes)));
  return hexSummary;
}

export function buildBluetoothPacket(
  format: BlePacketFormat,
  state: ControllerState,
  activeColorHex: string,
  dmxOptions?: { universe: number; startChannel: number; channels: number[] },
  activeMode?: RgbMode,
  extra?: { resetLed?: boolean; zone?: BleTargetZone }
): Uint8Array {
  const [r, g, b] = hexToRgbTuple(activeColorHex);
  const meta = activeMode?.moduleMeta;
  const effectiveFormat: BlePacketFormat = meta?.bleFormat || format;
  const zone: BleTargetZone = extra?.zone || 'all';
  const isFrontOnly = zone === 'front';

  // Bagian depan ikut belakang kecerahan/mode/warna/sein/welcome/suara KECUALI REM & MUNDUR!
  const isPowerOn =
    state.powerOn !== false && (!isFrontOnly || state.frontLamp?.enabled !== false);
  const effectiveBrake = isFrontOnly ? false : state.brakeActive;
  const effectiveReverse = isFrontOnly ? false : Boolean(state.reverseActive);

  if (effectiveFormat === 'elk-bledom') {
    if (!isPowerOn) {
      return new Uint8Array([0x7e, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef]);
    }
    if (effectiveReverse) {
      return new Uint8Array([0x7e, 0x00, 0x05, 0x03, 255, 255, 255, 0x00, 0xef]);
    }
    if (!state.solidStayActive && meta && meta.nativeId >= 0x80 && meta.nativeId <= 0x9f) {
      return new Uint8Array([0x7e, 0x00, 0x03, meta.nativeId & 0xff, 0x03, 0x00, 0x00, 0x00, 0xef]);
    }
    return new Uint8Array([0x7e, 0x00, 0x05, 0x03, r, g, b, 0x00, 0xef]);
  }

  if (effectiveFormat === 'triones') {
    if (!isPowerOn) {
      return new Uint8Array([0xcc, 0x24, 0x33]);
    }
    if (effectiveReverse) {
      return new Uint8Array([0x56, 255, 255, 255, 0xff, 0x0f, 0xaa]);
    }
    if (!state.solidStayActive && meta && meta.nativeId >= 0x25 && meta.nativeId <= 0x38) {
      const speedInv = Math.max(1, Math.min(31, Math.round(32 - (state.speed / 100) * 31)));
      return new Uint8Array([0xbb, meta.nativeId & 0xff, speedInv, 0x44]);
    }
    return new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
  }

  if (effectiveFormat === 'dmx-ble') {
    const ch = isPowerOn
      ? [...(meta?.dmxPreset || dmxOptions?.channels || state.adminControllers.dmxChannels)]
      : [0, 0, 0, 0, 0, 0, 0, 0];
    while (ch.length < 8) ch.push(0);
    if (isPowerOn) {
      ch[0] = Math.round((state.brightness / 100) * 255);
      ch[7] = Math.round((state.speed / 100) * 255);
      if (effectiveReverse) {
        ch[1] = 255;
        ch[2] = 255;
        ch[3] = 255;
        ch[4] = 255;
        ch[6] = 6;
      } else if (effectiveBrake) {
        ch[1] = 255;
        ch[2] = 16;
        ch[3] = 16;
        ch[5] = 200;
        ch[6] = 7;
      }
    }
    // Flags byte: bit0=brake, bit1=reverse, bit2=seinL, bit3=seinR, bit4=belang, bit5=welcome
    const seinL = state.sein === 'left' || state.sein === 'hazard' ? 1 : 0;
    const seinR = state.sein === 'right' || state.sein === 'hazard' ? 1 : 0;
    const flags =
      (effectiveBrake ? 1 : 0) |
      (effectiveReverse ? 2 : 0) |
      (seinL << 2) |
      (seinR << 3) |
      (state.combinationEnabled ? 16 : 0) |
      (state.welcomePlayingUntil > Date.now() ? 32 : 0);

    return new Uint8Array([
      0xdd,
      (dmxOptions?.universe ?? 0) & 0xff,
      (dmxOptions?.startChannel ?? 1) & 0xff,
      Math.min(24, ch.length),
      ...ch.map((v) => Math.max(0, Math.min(255, v))),
      flags & 0xff,
    ]);
  }

  // Default: RNS JSON over BLE UART / HC-05 / HM-10 / ESP32 / LED DMX
  const payload = JSON.stringify({
    zone,
    power: isPowerOn,
    resetLed: Boolean(extra?.resetLed),
    mode: meta ? meta.nativeId : state.activeModeId,
    codeLabel: meta?.codeLabel,
    moduleFamily: meta?.family,
    speed: state.speed,
    brightness: state.brightness,
    sein: isFrontOnly && state.frontLamp?.syncSeinWithRear === false ? 'off' : state.sein,
    seinPattern: state.special.seinPattern,
    seinSpeed: state.special.seinSpeed,
    brake: effectiveBrake,
    reverse: effectiveReverse,
    combo: state.combinationEnabled,
    comboLeft: state.combo.leftModes,
    comboRight: state.combo.rightModes,
    comboStyle: state.combo.style,
    comboPriority: state.combo.priorityMode || 'blend',
    comboSyncPanels: Boolean(state.combo.syncPanels),
    manualSideColors: state.manualSideColors?.enabled ? state.manualSideColors : undefined,
    autoBelang: state.autoBelang?.enabled ? state.autoBelang : undefined,
    ledMatrix: state.ledMatrix?.enabled
      ? {
          modelId: state.ledMatrix.activeModelId,
          category: state.ledMatrix.category,
          eyeExpression: state.ledMatrix.eyeExpression,
          eyeShape: state.ledMatrix.eyeShape,
          matrixEffect: state.ledMatrix.matrixEffect,
          text: state.ledMatrix.scrollingText,
          primaryColor: state.ledMatrix.primaryColor,
          secondaryColor: state.ledMatrix.secondaryColor,
          speed: state.ledMatrix.speed,
          size: state.ledMatrix.size,
          direction: state.ledMatrix.direction,
        }
      : undefined,
    solidStay: state.solidStayActive,
    solidColor: state.solidColor,
    welcome: state.welcomePlayingUntil > Date.now(),
    welcomeColor: state.special.welcomeColor,
    welcomeStyle: state.special.welcomeStyle,
    soundMode: Boolean(state.soundReactive?.enabled),
    soundStyle: state.soundReactive?.style || 'vu-bars',
    swapPanels: Boolean(state.led.swapPanels),
    chipset: state.led.chipset,
    colorOrder: state.led.colorOrder,
    locked: Boolean(state.moduleLocked),
  });
  return new TextEncoder().encode(payload + '\n');
}

export async function sendStateOverBluetooth(
  defaultFormat: BlePacketFormat,
  state: ControllerState,
  activeColorHex: string,
  dmxOptions?: { universe: number; startChannel: number; channels: number[] },
  activeMode?: RgbMode,
  extra?: { resetLed?: boolean }
): Promise<string> {
  pruneDisconnected();
  const bridge = getAndroidBridge();
  const hasPool = blePool.size > 0;

  if (!hasPool && bridge) {
    const bytes = buildBluetoothPacket(
      bridgeFormat || defaultFormat,
      state,
      activeColorHex,
      dmxOptions,
      activeMode,
      { ...extra, zone: bridgeZone }
    );
    return dispatchToAndroidBridge(bridge, bytes);
  }

  if (!hasPool) {
    throw new Error('Perangkat Bluetooth belum terhubung.');
  }

  const now = Date.now();
  const results = await Promise.all(
    Array.from(blePool.values()).map(async (entry) => {
      const targetFormat = activeMode?.moduleMeta?.bleFormat || entry.format || defaultFormat;
      const isPowerOn =
        state.powerOn !== false && (entry.zone !== 'front' || state.frontLamp?.enabled !== false);

      const shouldSendWake = now - entry.lastWakeSentMs > 4000;
      if (isPowerOn && shouldSendWake && targetFormat === 'elk-bledom') {
        entry.lastWakeSentMs = now;
        try {
          await enqueueDeviceWrite(
            entry,
            new Uint8Array([0x7e, 0x00, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0xef])
          );
        } catch {
          // Optional wake packet
        }
      } else if (isPowerOn && shouldSendWake && targetFormat === 'triones') {
        entry.lastWakeSentMs = now;
        try {
          await enqueueDeviceWrite(entry, new Uint8Array([0xcc, 0x23, 0x33]));
        } catch {
          // Optional wake packet
        }
      }

      const bytes = buildBluetoothPacket(
        targetFormat,
        state,
        activeColorHex,
        dmxOptions,
        activeMode,
        { ...extra, zone: entry.zone }
      );
      const summary = await enqueueDeviceWrite(entry, bytes);

      if (isPowerOn && targetFormat === 'elk-bledom') {
        try {
          const spd = Math.max(1, Math.min(100, state.speed));
          const bri = Math.max(1, Math.min(100, state.brightness));
          await enqueueDeviceWrite(
            entry,
            new Uint8Array([0x7e, 0x00, 0x02, spd, 0x00, 0x00, 0x00, 0x00, 0xef])
          );
          await enqueueDeviceWrite(
            entry,
            new Uint8Array([0x7e, 0x00, 0x01, bri, 0x00, 0x00, 0x00, 0x00, 0xef])
          );
        } catch {
          // Ignore follow-up write errors
        }
      }
      return `${entry.zone.toUpperCase()}:${summary.slice(0, 14)}`;
    })
  );

  return results.join(' | ');
}

export async function queryBleModuleModes(): Promise<void> {
  const cmd = new TextEncoder().encode('{"action":"get_modes"}\n');
  await writeRawBluetoothBytes(cmd);
}

export async function sendBlePasswordCommand(
  password: string,
  action: 'set' | 'unlock' | 'lock' | 'disable'
): Promise<string | null> {
  if (!getBleSessionInfo().connected) return null;
  const clean = password.trim().slice(0, 12);
  const cmd = new TextEncoder().encode(
    JSON.stringify({ action: `pwd_${action}`, password: clean }) + '\n'
  );
  return writeRawBluetoothBytes(cmd);
}
