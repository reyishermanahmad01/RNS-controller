import {
  BlePacketFormat,
  ControllerFamily,
  ControllerProtocol,
  LedConfig,
  ScannedModuleRecord,
} from '../types/controller';

export interface ParsedModuleBarcode {
  rawCode: string;
  formatLabel: string;
  moduleName: string;
  summary: string;
  family: ControllerFamily;
  protocol: ControllerProtocol;
  bleFormat?: BlePacketFormat;
  ipAddress?: string;
  port?: number;
  ssid?: string;
  macAddress?: string;
  pin?: string;
  leftCount?: number;
  rightCount?: number;
  chipset?: LedConfig['chipset'];
  colorOrder?: LedConfig['colorOrder'];
  bleNamePrefix?: string;
}

const MAC_REGEX = /\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/;
const IP_REGEX = /\b((?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})(?::(\d{2,5}))?\b/;

function normalizeChipset(val: unknown): LedConfig['chipset'] | undefined {
  const s = String(val || '').toUpperCase();
  if (s === 'WS2812B' || s === 'WS2815' || s === 'SK6812') return s;
  return undefined;
}

function normalizeColorOrder(val: unknown): LedConfig['colorOrder'] | undefined {
  const s = String(val || '').toUpperCase();
  if (s === 'GRB' || s === 'RGB' || s === 'BRG') return s;
  return undefined;
}

function normalizeBleFormat(val: unknown): BlePacketFormat | undefined {
  const s = String(val || '').toLowerCase();
  if (s === 'dmx-ble' || s === 'rns-json' || s === 'elk-bledom' || s === 'triones') {
    return s;
  }
  if (s.includes('dmx')) return 'dmx-ble';
  if (s.includes('elk') || s.includes('ledlamp') || s.includes('lotus')) return 'elk-bledom';
  if (s.includes('triones') || s.includes('happy')) return 'triones';
  if (s.includes('rns') || s.includes('json')) return 'rns-json';
  return undefined;
}

function clampLedCount(n: unknown): number | undefined {
  const parsed = Number(n);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.min(1000, Math.max(1, Math.round(parsed)));
}

export function parseModuleBarcode(
  rawText: string,
  symbologyLabel = 'QR / Barcode'
): ParsedModuleBarcode {
  const rawCode = rawText.trim();
  const lower = rawCode.toLowerCase();

  // 1. Payload JSON terstruktur
  if (rawCode.startsWith('{') && rawCode.endsWith('}')) {
    try {
      const obj = JSON.parse(rawCode) as Record<string, unknown>;
      const bleFormat = normalizeBleFormat(obj.bleFormat || obj.format || obj.type);
      const ipAddress = typeof obj.ip === 'string'
        ? obj.ip
        : typeof obj.ipAddress === 'string'
          ? obj.ipAddress
          : undefined;
      const port = Number(obj.port) > 0 ? Number(obj.port) : undefined;
      const ssid = typeof obj.ssid === 'string' ? obj.ssid : undefined;
      const macAddress = typeof obj.mac === 'string' ? obj.mac : undefined;
      const pin = typeof obj.pin === 'string' || typeof obj.password === 'string'
        ? String(obj.pin || obj.password).slice(0, 8)
        : undefined;

      const protoRaw = String(obj.protocol || '').toLowerCase();
      const familyRaw = String(obj.family || obj.type || '').toLowerCase();

      const protocol: ControllerProtocol =
        protoRaw === 'websocket' || protoRaw === 'ble' || protoRaw === 'artnet-ws' || protoRaw === 'http-json'
          ? (protoRaw as ControllerProtocol)
          : ipAddress
            ? familyRaw.includes('wled')
              ? 'http-json'
              : 'websocket'
            : 'ble';

      const family: ControllerFamily =
        familyRaw === 'esp8266' ||
        familyRaw === 'bluetooth' ||
        familyRaw === 'dmx' ||
        familyRaw === 'car' ||
        familyRaw === 'wled' ||
        familyRaw === 'custom'
          ? (familyRaw as ControllerFamily)
          : protocol === 'ble'
            ? 'bluetooth'
            : familyRaw.includes('wled')
              ? 'wled'
              : 'esp8266';

      const moduleName =
        typeof obj.name === 'string' && obj.name.trim()
          ? obj.name.trim()
          : bleFormat === 'dmx-ble'
            ? 'Modul LED DMX BLE'
            : 'Modul RNS Terdaftar';

      return {
        rawCode,
        formatLabel: symbologyLabel,
        moduleName,
        summary: `Konfigurasi JSON modul berhasil dibaca (${protocol.toUpperCase()})`,
        family,
        protocol,
        bleFormat: bleFormat || (protocol === 'ble' ? 'dmx-ble' : undefined),
        ipAddress,
        port,
        ssid,
        macAddress,
        pin,
        leftCount: clampLedCount(obj.leftCount),
        rightCount: clampLedCount(obj.rightCount),
        chipset: normalizeChipset(obj.chipset),
        colorOrder: normalizeColorOrder(obj.colorOrder),
        bleNamePrefix: typeof obj.blePrefix === 'string' ? obj.blePrefix : undefined,
      };
    } catch {
      // lanjut ke parser berikutnya
    }
  }

  // 2. Standar Wi-Fi QR Code (WIFI:T:WPA;S:RNS-STOPLAMP-AP;P:12345678;;)
  if (lower.startsWith('wifi:')) {
    const ssidMatch = rawCode.match(/S:([^;]+)/i);
    const ssid = ssidMatch?.[1]?.trim() || 'RNS-STOPLAMP-AP';
    const isWled = ssid.toLowerCase().includes('wled');
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: isWled ? `WLED Wi-Fi (${ssid})` : `Modul Wi-Fi (${ssid})`,
      summary: `QR Wi-Fi terdeteksi · SSID "${ssid}" siap dihubungkan ke 192.168.4.1.`,
      family: isWled ? 'wled' : 'esp8266',
      protocol: isWled ? 'http-json' : 'websocket',
      ipAddress: '192.168.4.1',
      port: isWled ? 80 : 81,
      ssid,
    };
  }

  // 3. Alamat IP / URL WebSocket / WLED / Link Aplikasi Stiker Modul
  const ipMatch = rawCode.match(IP_REGEX);
  if (ipMatch && (lower.includes('http') || lower.includes('ws') || lower.includes('192.168.') || lower.includes('10.'))) {
    const ipAddress = ipMatch[1];
    const port = ipMatch[2] ? Number(ipMatch[2]) : lower.includes('wled') ? 80 : 81;
    const isWled = lower.includes('wled') || port === 80;
    const isArtnet = lower.includes('dmx') || lower.includes('artnet') || port === 6454;
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: isWled
        ? `WLED Pixel (${ipAddress})`
        : isArtnet
          ? `DMX Bridge (${ipAddress})`
          : `RNS Wi-Fi (${ipAddress})`,
      summary: `Alamat modul Wi-Fi ${ipAddress}:${port} siap dihubungkan.`,
      family: isArtnet ? 'dmx' : isWled ? 'wled' : 'esp8266',
      protocol: isArtnet ? 'artnet-ws' : isWled ? 'http-json' : 'websocket',
      ipAddress,
      port,
    };
  }

  // 4. URL / QR Sticker Modul LEDLAMP / LED DMX / ELK-BLEDOM / Triones / RNS
  if (
    lower.includes('ledlamp') ||
    lower.includes('leddmx') ||
    lower.includes('led-dmx') ||
    lower.includes('clariss') ||
    lower.includes('3232-003') ||
    lower.includes('dmx')
  ) {
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: 'LED LAMP → LED DMX (4-Kabel BLE)',
      summary: 'Barcode / QR Modul LED DMX terdeteksi. Siap dipasangkan via Bluetooth BLE.',
      family: 'bluetooth',
      protocol: 'ble',
      bleFormat: 'dmx-ble',
      bleNamePrefix: 'LED',
    };
  }

  if (lower.includes('elk') || lower.includes('bledom') || lower.includes('lotus')) {
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: 'Modul LEDLamp / ELK-BLEDOM BLE',
      summary: 'Barcode modul ELK-BLEDOM / LotusLantern terdeteksi.',
      family: 'bluetooth',
      protocol: 'ble',
      bleFormat: 'elk-bledom',
      bleNamePrefix: 'ELK',
    };
  }

  if (lower.includes('triones') || lower.includes('happy') || lower.includes('magichome')) {
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: 'Modul Triones / HappyLighting BLE',
      summary: 'Barcode modul Triones BLE terdeteksi.',
      family: 'bluetooth',
      protocol: 'ble',
      bleFormat: 'triones',
      bleNamePrefix: 'Triones',
    };
  }

  // 5. Key-value string sederhana (contoh: RNS;IP=192.168.4.1;PORT=81;SSID=RNS-AP)
  if (rawCode.includes('=') && (lower.includes('ip=') || lower.includes('ssid=') || lower.includes('ble=') || lower.includes('mac='))) {
    const getVal = (k: string) => {
      const m = rawCode.match(new RegExp(`${k}=([^;|&\\s]+)`, 'i'));
      return m?.[1]?.trim();
    };
    const ipAddress = getVal('ip');
    const port = getVal('port') ? Number(getVal('port')) : undefined;
    const ssid = getVal('ssid');
    const macAddress = getVal('mac');
    const bleFormat = normalizeBleFormat(getVal('ble') || getVal('format')) || 'dmx-ble';
    const isWifi = Boolean(ipAddress || ssid) && !macAddress;
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: getVal('name') || (isWifi ? `Modul Wi-Fi (${ssid || ipAddress})` : 'Modul Bluetooth Terdaftar'),
      summary: isWifi
        ? `Parameter Wi-Fi modul terdeteksi (${ipAddress || ssid}).`
        : 'Parameter Bluetooth modul berhasil dibaca.',
      family: isWifi ? 'esp8266' : 'bluetooth',
      protocol: isWifi ? 'websocket' : 'ble',
      bleFormat: isWifi ? undefined : bleFormat,
      ipAddress,
      port,
      ssid,
      macAddress,
      pin: getVal('pin'),
    };
  }

  // 6. Alamat MAC Bluetooth
  const macMatch = rawCode.match(MAC_REGEX);
  if (macMatch) {
    const mac = macMatch[0].toUpperCase();
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: `Modul BLE (${mac.slice(-5)})`,
      summary: `Alamat MAC Bluetooth ${mac} terdeteksi. Siap dipindai & dikoneksikan.`,
      family: 'bluetooth',
      protocol: 'ble',
      bleFormat: 'dmx-ble',
      macAddress: mac,
    };
  }

  // 7. Barcode 1D Produk / Nomor Seri RNS / ESP / LED Strip Umum (Code128, EAN13, Code39, Serial)
  const isRnsWifi = lower.includes('rns') || lower.includes('esp') || lower.includes('wemos');
  const isCar = lower.includes('car') || lower.includes('drl');
  const shortSerial = rawCode.length > 18 ? `${rawCode.slice(0, 18)}…` : rawCode;

  if (isRnsWifi) {
    return {
      rawCode,
      formatLabel: symbologyLabel,
      moduleName: `RNS Stoplamp (${shortSerial})`,
      summary: 'Serial barcode modul RNS ESP8266 terdeteksi. Siap dihubungkan ke Wi-Fi atau BLE.',
      family: 'esp8266',
      protocol: 'websocket',
      ipAddress: '192.168.4.1',
      port: 81,
      ssid: 'RNS-STOPLAMP-AP',
    };
  }

  return {
    rawCode,
    formatLabel: symbologyLabel,
    moduleName: isCar ? `Modul CAR (${shortSerial})` : `Modul LED DMX (${shortSerial})`,
    summary: `Kode barcode modul "${shortSerial}" terbaca. Siap dikoneksikan via Bluetooth LED DMX / BLE.`,
    family: isCar ? 'car' : 'bluetooth',
    protocol: 'ble',
    bleFormat: 'dmx-ble',
  };
}

export function toScannedModuleRecord(parsed: ParsedModuleBarcode): ScannedModuleRecord {
  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rawCode: parsed.rawCode,
    formatLabel: parsed.formatLabel,
    moduleName: parsed.moduleName,
    family: parsed.family,
    protocol: parsed.protocol,
    bleFormat: parsed.bleFormat,
    ipAddress: parsed.ipAddress,
    port: parsed.port,
    ssid: parsed.ssid,
    macAddress: parsed.macAddress,
    scannedAt: Date.now(),
  };
}
