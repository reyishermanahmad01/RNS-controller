import { ControllerState } from '../types/controller';

function resolveWelcomeHexForIno(val: string): { isRainbow: boolean; hex: string } {
  if (val === 'rainbow') return { isRainbow: true, hex: '#22D3EE' };
  if (val === 'crimson') return { isRainbow: false, hex: '#EF4444' };
  if (val === 'ice') return { isRainbow: false, hex: '#F8FAFC' };
  if (val === 'cyan') return { isRainbow: false, hex: '#22D3EE' };
  if (val.startsWith('#') && val.length >= 7) return { isRainbow: false, hex: val };
  return { isRainbow: false, hex: '#22D3EE' };
}

function welcomeStyleToCode(style: ControllerState['special']['welcomeStyle']): number {
  switch (style) {
    case 'center-out':
      return 1;
    case 'cyber-flash':
      return 2;
    case 'dual-meet':
      return 3;
    case 'row-cascade':
      return 4;
    case 'pulse-bloom':
      return 5;
    case 'sweep':
    default:
      return 0;
  }
}

/**
 * Generates the complete RNS RGB Controller firmware (.ino) for Wemos D1 Mini (ESP8266),
 * aligned with the user's 374-LED twin-panel layout (187 LEDs x 2 panels):
 *   Urutan baris per panel (dari bawah pin data masuk):
 *     Baris 8: 8, Baris 7: 16, Baris 6: 20, Baris 5: 24, Baris 4: 28, Baris 3: 32, Baris 2: 32, Baris 1 (atas): 27
 *     Total = 187 LED per panel x 2 = 374 LED WS2812B
 *   Pinout:
 *     Data LED  : D5 (GPIO14)
 *     Brake/Rem : D1 (GPIO5)
 *     Sein Kiri : D7 (GPIO13)
 *     Sein Kanan: D2 (GPIO4)
 *   390+ Mode Matrix + 6 Mode Welcome + Sein Full-Panel per Sisi
 */
export function generateEsp8266Sketch(state: ControllerState): string {
  const ssid = (state.device.ssid || 'RNS-STOPLAMP-AP').replace(/"/g, '');
  const port = state.device.port || 81;
  const leftCount = state.led.leftCount || 187;
  const rightCount = state.led.rightCount || 187;
  const maxMa = state.led.maxCurrentMa || 2500;
  const welcomeResolved = resolveWelcomeHexForIno(state.special.welcomeColor || 'cyan');
  const wNum = parseInt(welcomeResolved.hex.replace('#', ''), 16) || 0x22d3ee;
  const wR = (wNum >> 16) & 0xff;
  const wG = (wNum >> 8) & 0xff;
  const wB = wNum & 0xff;
  const wStyleCode = welcomeStyleToCode(state.special.welcomeStyle);
  const seinPatCode =
    state.special.seinPattern === 'blink'
      ? 1
      : state.special.seinPattern === 'pulse'
        ? 2
        : state.special.seinPattern === 'full'
          ? 3
          : 0;
  const swapPanelsFlag = state.led.swapPanels ? 'true' : 'false';
  const fl = state.frontLamp;
  const parseRgbTuple = (hex: string): string => {
    const clean = (hex || '#22D3EE').replace('#', '');
    const n = parseInt(clean, 16);
    if (Number.isNaN(n)) return '34, 211, 238';
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  };
  const effectToCode = (ef: string): number =>
    ef === 'pulse' ? 1 : ef === 'flow' ? 2 : ef === 'ring' ? 3 : 0;
  const soundStyleCode =
    state.soundReactive?.style === 'bass-pulse'
      ? 1
      : state.soundReactive?.style === 'spectrum-wave'
        ? 2
        : state.soundReactive?.style === 'strobe-beat'
          ? 3
          : 0;

  return `/*
 * ============================================================
 * RNS RGB CONTROLLER — FIRMWARE WEMOS D1 MINI (ESP8266)
 * ============================================================
 * Disempurnakan untuk proyek RNS Stoplamp Matrix (390+ Mode):
 *   - LED WS2812B - 374 LED - SINGLE DATA (D5 / GPIO14)
 *   - Panel Kiri : index 0 - 186   (187 LED)
 *   - Panel Kanan: index 187 - 373 (187 LED)
 *
 * Urutan Baris Per Panel (Pin Data masuk dari Baris 8 naik ke Baris 1):
 *   Index 0 (Baris 8 - Bawah):  8 LED  (start:   0)
 *   Index 1 (Baris 7)        : 16 LED  (start:   8)
 *   Index 2 (Baris 6)        : 20 LED  (start:  24)
 *   Index 3 (Baris 5)        : 24 LED  (start:  44)
 *   Index 4 (Baris 4)        : 28 LED  (start:  68)
 *   Index 5 (Baris 3)        : 32 LED  (start:  96)
 *   Index 6 (Baris 2)        : 32 LED  (start: 128)
 *   Index 7 (Baris 1 - Atas) : 27 LED  (start: 160)
 *   Total = 8+16+20+24+28+32+32+27 = 187 LED x 2 panel = 374 LED
 *
 * Pinout Hardware Wemos D1 Mini:
 *   - DATA LED  : D5 (GPIO14)
 *   - BRAKE/REM : D1 (GPIO5)
 *   - SEIN KIRI : D7 (GPIO13) -> Full 187 LED Panel Kiri
 *   - SEIN KANAN: D2 (GPIO4)  -> Full 187 LED Panel Kanan
 *   - BLUETOOTH : Pin RX/TX (HC-05 / HM-10 / JDY-08 9600 baud) opsional
 *
 * Library Wajib (Arduino IDE / ArduinoDroid HP OTG):
 *   1. FastLED
 *   2. WebSockets (by Markus Sattler)
 *   3. ArduinoJson (v6 atau v7)
 * ============================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <FastLED.h>

// ---------------- KONFIGURASI PIN WEMOS D1 MINI ----------------
#define LED_DATA_PIN     D5   // GPIO14 - Jalur Data LED Matrix Belakang (Stoplamp)
#define FRONT_DATA_PIN   D6   // GPIO12 - Jalur Data LED Lampu Depan (Devil Eye + Shroud Biled + Alis)
#define BRAKE_PIN        D1   // GPIO5  - Input Lampu Rem (pakai optocoupler/isolator)
#define SEIN_LEFT_PIN    D7   // GPIO13 - Input Sein Kiri
#define SEIN_RIGHT_PIN   D2   // GPIO4  - Input Sein Kanan
#define SOUND_MIC_PIN    A0   // Analog 0 - Opsional modul mic KY-037/MAX4466 (atau stream Mic HP via WiFi)

// Ubah ke false jika input D1/D7/D2 aktif pada logika HIGH (3.3V)
#define SIGNAL_ACTIVE_LOW true
#define BT_SERIAL_BAUD    9600

// ---------------- KONFIGURASI LED MATRIX (BELAKANG & DEPAN) ----------------
#define ROW_COUNT        8
#define PANEL_LEDS       ${leftCount}
#define RIGHT_LEDS       ${rightCount}
#define NUM_LEDS         (PANEL_LEDS + RIGHT_LEDS)
#define FRONT_DEVIL_LEDS 12   // index 0..11   (Devil Eye Lensa Biled Kiri+Kanan)
#define FRONT_SHROUD_LEDS 16  // index 12..27  (Shroud Biled Ring Kiri+Kanan)
#define FRONT_ALIS_LEDS  20   // index 28..47  (Alis DRL + Sein Running Kiri & Kanan)
#define FRONT_NUM_LEDS   (FRONT_DEVIL_LEDS + FRONT_SHROUD_LEDS + FRONT_ALIS_LEDS)
#define LED_CHIPSET      WS2812B
#define COLOR_ORDER      GRB
#define MAX_MILLIAMPS    ${maxMa}
#define TOTAL_MODES      390

// Urutan baris dari pin data masuk (index 0 = Baris 8 bawah ... index 7 = Baris 1 atas)
const uint8_t  rowCount[ROW_COUNT] = { 8, 16, 20, 24, 28, 32, 32, 27 };
const uint16_t rowStart[ROW_COUNT] = { 0,  8, 24, 44, 68, 96, 128, 160 };

// Susunan lurus dari tengah ke samping semua (non zig-zag = semua false).
// Ubah salah satu jadi true HANYA jika ada baris yang arah kabelnya terbalik.
const bool rowReverse[ROW_COUNT] = {
  false, false, false, false,
  false, false, false, false
};

// ---------------- KONFIGURASI WIFI AP, WEB & WEBSOCKET ----------------
const char* AP_SSID = "${ssid}";
const char* AP_PASS = "12345678";

ESP8266WebServer server(80);
WebSocketsServer webSocket(${port});

CRGB leds[NUM_LEDS];
CRGB frontLeds[FRONT_NUM_LEDS];
uint8_t pixelRow[NUM_LEDS];     // 0 = Baris 1 (Atas) .. 7 = Baris 8 (Bawah)
uint8_t pixelXNorm[NUM_LEDS];   // 0 = Tengah .. 255 = Samping Luar

// ---------------- PENYIMPANAN EEPROM ----------------
struct SavedSettings {
  uint8_t magic;
  int16_t modeId;
  uint8_t speed;
  uint8_t brightness;
  uint8_t welcomeR;
  uint8_t welcomeG;
  uint8_t welcomeB;
  uint8_t welcomeRainbow;
  uint8_t welcomeStyle; // 0=sweep, 1=center-out, 2=cyber-flash, 3=dual-meet, 4=row-cascade, 5=pulse-bloom
  uint8_t solidStay;
  uint8_t solidR;
  uint8_t solidG;
  uint8_t solidB;
  uint8_t comboEnabled;
  uint8_t comboSeq;
  uint8_t seinPattern; // 0=sequential, 1=blink, 2=pulse, 3=full 1 panel
  uint8_t seinSpeed;
  uint8_t swapPanels;
};

int activeModeId = ${Math.min(390, Math.max(1, state.activeModeId))};
int animSpeed = ${state.speed};
int animBrightness = ${state.brightness};
bool autoMode = false;
bool stopped = false;
bool hwSignalsEnabled = true;
bool swapPanels = ${swapPanelsFlag};

String appSein = "off"; // "off", "left", "right", "hazard"
uint8_t seinPattern = ${seinPatCode}; // 0=sequential, 1=blink, 2=pulse, 3=full 1 panel
uint8_t seinSpeed = ${state.special.seinSpeed || 65};
bool appBrake = false;
bool prevSeinLeft = false;
bool prevSeinRight = false;
unsigned long seinLeftStartMs = 0;
unsigned long seinRightStartMs = 0;

bool comboEnabled = false;
int comboLeft[6] = {1, 9, 3, 6, 2, 7};
int comboLeftCount = 6;
int comboRight[6] = {12, 4, 8, 2, 19, 1};
int comboRightCount = 6;
String comboStyle = "zone-split"; // "zone-split" (Belang Zona) / "sequence" (Bergantian)

bool solidStay = false;
CRGB solidColor = CRGB(239, 68, 68);

CRGB welcomeColor = CRGB(${wR}, ${wG}, ${wB});
bool welcomeRainbow = ${welcomeResolved.isRainbow ? 'true' : 'false'};
uint8_t welcomeStyle = ${wStyleCode};
unsigned long welcomeUntilMs = 0;
unsigned long lastAutoMs = 0;
String btSerialBuf = "";

// ---------------- MODE SUARA (REAKTIF MUSIK / MIC) ----------------
bool soundMode = ${state.soundReactive?.enabled ? 'true' : 'false'};
uint8_t soundStyle = ${soundStyleCode}; // 0=vu-bars, 1=bass-pulse, 2=spectrum-wave, 3=strobe-beat
uint8_t soundSensitivity = ${state.soundReactive?.sensitivity ?? 70};
uint8_t soundLevel = 0;
uint8_t soundBass = 0;
unsigned long lastAppAudioMs = 0;

// ---------------- LAMPU DEPAN (DEVIL EYE, SHROUD BILED, ALIS) ----------------
// Catatan: Lampu depan TIDAK PERNAH ikut kedip saat rem belakang (brakeOn) menyala!
bool frontEnabled = ${fl?.enabled !== false ? 'true' : 'false'};
bool frontSyncColor = ${fl?.syncColorWithRear ? 'true' : 'false'};
bool frontSyncSein = ${fl?.syncSeinWithRear !== false ? 'true' : 'false'};

bool frontDevilOn = ${fl?.devilEye?.enabled !== false ? 'true' : 'false'};
CRGB frontDevilColor = CRGB(${parseRgbTuple(fl?.devilEye?.color || '#EF4444')});
uint8_t frontDevilBright = ${fl?.devilEye?.brightness ?? 85};
uint8_t frontDevilEffect = ${effectToCode(fl?.devilEye?.effect || 'pulse')};

bool frontShroudOn = ${fl?.shroudBiled?.enabled !== false ? 'true' : 'false'};
CRGB frontShroudColor = CRGB(${parseRgbTuple(fl?.shroudBiled?.color || '#22D3EE')});
uint8_t frontShroudBright = ${fl?.shroudBiled?.brightness ?? 80};
uint8_t frontShroudEffect = ${effectToCode(fl?.shroudBiled?.effect || 'ring')};

bool frontAlisOn = ${fl?.alis?.enabled !== false ? 'true' : 'false'};
CRGB frontAlisColor = CRGB(${parseRgbTuple(fl?.alis?.color || '#F8FAFC')});
uint8_t frontAlisBright = ${fl?.alis?.brightness ?? 90};
uint8_t frontAlisEffect = ${effectToCode(fl?.alis?.effect || 'solid')};

// Palet 10 Tema Warna (38 Pola Matrix x 10 Tema = 380 + 10 Mode Putih = 390 Mode Bawaan)
const CRGB THEME_PRIMARY[10] = {
  CRGB(239, 68, 68),  CRGB(34, 211, 238), CRGB(239, 68, 68),  CRGB(236, 72, 153), CRGB(168, 85, 247),
  CRGB(16, 185, 129), CRGB(226, 232, 240),CRGB(245, 158, 11), CRGB(34, 197, 94),  CRGB(248, 250, 252)
};
const CRGB THEME_SECONDARY[10] = {
  CRGB(34, 211, 238), CRGB(59, 130, 246), CRGB(245, 158, 11), CRGB(6, 182, 212),  CRGB(56, 189, 248),
  CRGB(20, 184, 166), CRGB(56, 189, 248), CRGB(244, 63, 94),  CRGB(34, 211, 238), CRGB(239, 68, 68)
};

uint16_t pixelIndex(uint8_t panel, uint8_t hwRowIdx, uint8_t pos) {
  uint16_t p = pos;
  if (rowReverse[hwRowIdx]) {
    p = rowCount[hwRowIdx] - 1 - pos;
  }
  uint16_t base = (panel == 0) ? 0 : PANEL_LEDS;
  return base + rowStart[hwRowIdx] + p;
}

void buildPixelMap() {
  // Linear fallback agar jumlah LED berapa pun (kurang atau lebih dari 187/panel) tetap terpetakan rapi
  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    bool isFirst = (i < PANEL_LEDS);
    uint16_t local = isFirst ? i : (i - PANEL_LEDS);
    uint16_t span = isFirst ? max((int)PANEL_LEDS, 1) : max((int)RIGHT_LEDS, 1);
    pixelRow[i] = (uint8_t)min(7, (int)((local * ROW_COUNT) / span));
    pixelXNorm[i] = (span > 1) ? (uint8_t)(((local % 32) * 255) / 31) : 0;
  }

  for (uint8_t panel = 0; panel < 2; panel++) {
    uint16_t base = (panel == 0) ? 0 : PANEL_LEDS;
    uint16_t panelLimit = (panel == 0) ? PANEL_LEDS : RIGHT_LEDS;
    for (uint8_t hwRow = 0; hwRow < ROW_COUNT; hwRow++) {
      uint8_t w = rowCount[hwRow];
      uint8_t logicalTopToBottom = (ROW_COUNT - 1) - hwRow; // 0 = Baris 1 (Atas), 7 = Baris 8 (Bawah)
      for (uint8_t pos = 0; pos < w; pos++) {
        uint16_t idx = pixelIndex(panel, hwRow, pos);
        if (idx >= base && idx < (uint16_t)(base + panelLimit) && idx < NUM_LEDS) {
          pixelRow[idx] = logicalTopToBottom;
          pixelXNorm[idx] = (w > 1) ? (uint8_t)((pos * 255) / (w - 1)) : 0;
        }
      }
    }
  }
}

void saveSettings() {
  SavedSettings s;
  s.magic = 0x5D;
  s.modeId = (int16_t)activeModeId;
  s.speed = (uint8_t)animSpeed;
  s.brightness = (uint8_t)animBrightness;
  s.welcomeR = welcomeColor.r;
  s.welcomeG = welcomeColor.g;
  s.welcomeB = welcomeColor.b;
  s.welcomeRainbow = welcomeRainbow ? 1 : 0;
  s.welcomeStyle = welcomeStyle;
  s.solidStay = solidStay ? 1 : 0;
  s.solidR = solidColor.r;
  s.solidG = solidColor.g;
  s.solidB = solidColor.b;
  s.comboEnabled = comboEnabled ? 1 : 0;
  s.comboSeq = (comboStyle == "sequence") ? 1 : 0;
  s.seinPattern = seinPattern;
  s.seinSpeed = seinSpeed;
  s.swapPanels = swapPanels ? 1 : 0;
  EEPROM.put(0, s);
  EEPROM.commit();
}

void loadSettings() {
  SavedSettings s;
  EEPROM.get(0, s);
  if (s.magic != 0x5D) return;
  activeModeId = constrain((int)s.modeId, 1, TOTAL_MODES);
  animSpeed = constrain((int)s.speed, 5, 100);
  animBrightness = constrain((int)s.brightness, 5, 100);
  welcomeColor = CRGB(s.welcomeR, s.welcomeG, s.welcomeB);
  welcomeRainbow = (s.welcomeRainbow == 1);
  welcomeStyle = constrain((int)s.welcomeStyle, 0, 5);
  solidStay = (s.solidStay == 1);
  solidColor = CRGB(s.solidR, s.solidG, s.solidB);
  comboEnabled = (s.comboEnabled == 1);
  comboStyle = (s.comboSeq == 1) ? "sequence" : "zone-split";
  seinPattern = constrain((int)s.seinPattern, 0, 3);
  seinSpeed = constrain((int)s.seinSpeed, 15, 100);
  swapPanels = (s.swapPanels == 1);
}

CRGB parseHexColor(const char* hexStr) {
  if (!hexStr) return CRGB(34, 211, 238);
  const char* p = (hexStr[0] == '#') ? hexStr + 1 : hexStr;
  if (strlen(p) < 6) return CRGB(34, 211, 238);
  long val = strtol(p, nullptr, 16);
  return CRGB((val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF);
}

bool readSignalPin(uint8_t pin) {
  int raw = digitalRead(pin);
  return SIGNAL_ACTIVE_LOW ? (raw == LOW) : (raw == HIGH);
}

// ---------------- PARSER JSON BERSAMA (WIFI WEBSOCKET & BLUETOOTH HC-05/HM-10) ----------------
void applyControlJson(const uint8_t* payload, size_t length) {
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<768> doc;
#endif
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  bool shouldSave = false;

  if (!doc["mode"].isNull()) { activeModeId = constrain((int)doc["mode"], 1, TOTAL_MODES); stopped = false; autoMode = false; shouldSave = true; }
  if (!doc["speed"].isNull()) { animSpeed = constrain((int)doc["speed"], 5, 100); shouldSave = true; }
  if (!doc["brightness"].isNull()) { animBrightness = constrain((int)doc["brightness"], 5, 100); shouldSave = true; }
  if (!doc["sein"].isNull()) appSein = doc["sein"].as<String>();
  if (!doc["seinPattern"].isNull()) {
    String sp = doc["seinPattern"].as<String>();
    if (sp == "blink") seinPattern = 1;
    else if (sp == "pulse") seinPattern = 2;
    else if (sp == "full") seinPattern = 3;
    else seinPattern = 0;
    shouldSave = true;
  }
  if (!doc["seinSpeed"].isNull()) { seinSpeed = constrain((int)doc["seinSpeed"], 15, 100); shouldSave = true; }
  if (!doc["swapPanels"].isNull()) { swapPanels = doc["swapPanels"].as<bool>(); shouldSave = true; }
  if (!doc["brake"].isNull()) {
    String pktZone = doc["zone"] | "";
    appBrake = (pktZone == "front") ? false : doc["brake"].as<bool>();
  }
  if (!doc["combo"].isNull()) { comboEnabled = doc["combo"].as<bool>(); stopped = false; shouldSave = true; }
  if (!doc["comboStyle"].isNull()) { comboStyle = doc["comboStyle"].as<String>(); shouldSave = true; }
  if (!doc["solidStay"].isNull()) { solidStay = doc["solidStay"].as<bool>(); stopped = false; shouldSave = true; }
  if (!doc["solidColor"].isNull()) { solidColor = parseHexColor(doc["solidColor"].as<const char*>()); shouldSave = true; }

  if (!doc["welcomeColor"].isNull()) {
    String wc = doc["welcomeColor"].as<String>();
    if (wc == "rainbow") {
      welcomeRainbow = true;
    } else if (wc == "crimson") {
      welcomeRainbow = false;
      welcomeColor = CRGB(239, 68, 68);
    } else if (wc == "ice") {
      welcomeRainbow = false;
      welcomeColor = CRGB(248, 250, 252);
    } else if (wc == "cyan") {
      welcomeRainbow = false;
      welcomeColor = CRGB(34, 211, 238);
    } else {
      welcomeRainbow = false;
      welcomeColor = parseHexColor(wc.c_str());
    }
    shouldSave = true;
  }

  if (!doc["welcomeStyle"].isNull()) {
    String ws = doc["welcomeStyle"].as<String>();
    if (ws == "center-out") welcomeStyle = 1;
    else if (ws == "cyber-flash") welcomeStyle = 2;
    else if (ws == "dual-meet") welcomeStyle = 3;
    else if (ws == "row-cascade") welcomeStyle = 4;
    else if (ws == "pulse-bloom") welcomeStyle = 5;
    else welcomeStyle = 0;
    shouldSave = true;
  }

  if (doc["welcome"] == true) {
    welcomeUntilMs = millis() + 3000;
    stopped = false;
  }

  if (doc["comboLeft"].is<JsonArray>()) {
    JsonArray arr = doc["comboLeft"].as<JsonArray>();
    comboLeftCount = 0;
    for (JsonVariant v : arr) {
      if (comboLeftCount < 6) comboLeft[comboLeftCount++] = constrain(v.as<int>(), 1, TOTAL_MODES);
    }
  }
  if (doc["comboRight"].is<JsonArray>()) {
    JsonArray arr = doc["comboRight"].as<JsonArray>();
    comboRightCount = 0;
    for (JsonVariant v : arr) {
      if (comboRightCount < 6) comboRight[comboRightCount++] = constrain(v.as<int>(), 1, TOTAL_MODES);
    }
  }

  if (!doc["power"].isNull()) {
    bool pwr = doc["power"].as<bool>();
    stopped = !pwr;
    if (stopped) {
      welcomeUntilMs = 0;
      fill_solid(leds, NUM_LEDS, CRGB::Black);
      FastLED.show();
    }
  }

  if (doc["resetLed"] == true) {
    activeModeId = 1;
    animSpeed = 50;
    animBrightness = 75;
    comboEnabled = false;
    solidStay = false;
    soundMode = false;
    stopped = false;
    autoMode = false;
    appSein = "off";
    appBrake = false;
    welcomeUntilMs = millis() + 1500;
    FastLED.clear(true);
    shouldSave = true;
  }

  // Kontrol Mode Suara
  if (!doc["soundMode"].isNull()) { soundMode = doc["soundMode"].as<bool>(); stopped = false; }
  if (!doc["soundSensitivity"].isNull()) soundSensitivity = constrain((int)doc["soundSensitivity"], 10, 100);
  if (!doc["soundStyle"].isNull()) {
    String ss = doc["soundStyle"].as<String>();
    if (ss == "bass-pulse") soundStyle = 1;
    else if (ss == "spectrum-wave") soundStyle = 2;
    else if (ss == "strobe-beat") soundStyle = 3;
    else soundStyle = 0;
  }
  if (!doc["soundLevel"].isNull()) {
    soundLevel = constrain((int)doc["soundLevel"], 0, 255);
    soundBass = doc["soundBass"].isNull() ? soundLevel : constrain((int)doc["soundBass"], 0, 255);
    lastAppAudioMs = millis();
  }

  // Kontrol Lampu Depan (Devil Eye, Shroud Biled, Alis) - Selalu kebal terhadap rem belakang
  if (doc["front"].is<JsonObject>()) {
    JsonObject f = doc["front"].as<JsonObject>();
    if (!f["enabled"].isNull()) frontEnabled = f["enabled"].as<bool>();
    if (!f["syncColor"].isNull()) frontSyncColor = f["syncColor"].as<bool>();
    if (!f["syncSein"].isNull()) frontSyncSein = f["syncSein"].as<bool>();

    if (f["devilEye"].is<JsonObject>()) {
      JsonObject z = f["devilEye"].as<JsonObject>();
      if (!z["enabled"].isNull()) frontDevilOn = z["enabled"].as<bool>();
      if (!z["color"].isNull()) frontDevilColor = parseHexColor(z["color"].as<const char*>());
      if (!z["brightness"].isNull()) frontDevilBright = constrain((int)z["brightness"], 10, 100);
      if (!z["effect"].isNull()) {
        String ef = z["effect"].as<String>();
        frontDevilEffect = (ef == "pulse") ? 1 : (ef == "flow") ? 2 : (ef == "ring") ? 3 : 0;
      }
    }
    if (f["shroudBiled"].is<JsonObject>()) {
      JsonObject z = f["shroudBiled"].as<JsonObject>();
      if (!z["enabled"].isNull()) frontShroudOn = z["enabled"].as<bool>();
      if (!z["color"].isNull()) frontShroudColor = parseHexColor(z["color"].as<const char*>());
      if (!z["brightness"].isNull()) frontShroudBright = constrain((int)z["brightness"], 10, 100);
      if (!z["effect"].isNull()) {
        String ef = z["effect"].as<String>();
        frontShroudEffect = (ef == "pulse") ? 1 : (ef == "flow") ? 2 : (ef == "ring") ? 3 : 0;
      }
    }
    if (f["alis"].is<JsonObject>()) {
      JsonObject z = f["alis"].as<JsonObject>();
      if (!z["enabled"].isNull()) frontAlisOn = z["enabled"].as<bool>();
      if (!z["color"].isNull()) frontAlisColor = parseHexColor(z["color"].as<const char*>());
      if (!z["brightness"].isNull()) frontAlisBright = constrain((int)z["brightness"], 10, 100);
      if (!z["effect"].isNull()) {
        String ef = z["effect"].as<String>();
        frontAlisEffect = (ef == "pulse") ? 1 : (ef == "flow") ? 2 : (ef == "ring") ? 3 : 0;
      }
    }
  }

  FastLED.setBrightness(map(animBrightness, 5, 100, 15, 255));
  if (shouldSave) saveSettings();
}

void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_TEXT) {
    if (length > 5 && strstr((const char*)payload, "get_modes") != nullptr) {
      String reply = "{\"type\":\"modes\",\"family\":\"esp8266\",\"total\":390,\"modes\":[{\"nativeId\":381,\"name\":\"RNS Strobo Putih Kilat\"},{\"nativeId\":385,\"name\":\"RNS Running Putih Tengah-Luar\"},{\"nativeId\":389,\"name\":\"RNS Matrix Putih Ular\"}]}";
      webSocket.sendTXT(num, reply);
      return;
    }
    applyControlJson(payload, length);
  }
}

void handleBluetoothSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\\n' || c == '\\r') {
      if (btSerialBuf.length() > 2) {
        if (btSerialBuf.indexOf("get_modes") >= 0) {
          Serial.println("{\"type\":\"modes\",\"family\":\"esp8266\",\"total\":390,\"modes\":[{\"nativeId\":381,\"name\":\"RNS Strobo Putih Kilat\"},{\"nativeId\":385,\"name\":\"RNS Running Putih Tengah-Luar\"},{\"nativeId\":389,\"name\":\"RNS Matrix Putih Ular\"}]}");
        } else {
          applyControlJson((const uint8_t*)btSerialBuf.c_str(), btSerialBuf.length());
        }
      }
      btSerialBuf = "";
    } else if (btSerialBuf.length() < 600) {
      btSerialBuf += c;
    }
  }
}

// ---------------- MESIN ANIMASI 390+ MODE ----------------
CRGB computeWhiteSpecialPixel(int modeId, uint8_t xNorm, uint8_t row, bool isLeft, uint32_t tMs) {
  uint32_t rate = max((uint32_t)35, (uint32_t)(280 - animSpeed * 2));
  uint16_t speedPhase = (tMs * (14 + animSpeed * 3)) / 1000;

  switch (modeId) {
    case 381: { // Strobo Putih Kilat Full
      bool on = ((tMs / rate) % 2) == 0;
      return on ? CRGB::White : CRGB::Black;
    }
    case 382: { // Strobo Putih Bergantian Kiri-Kanan
      bool step = ((tMs / rate) % 2) == 0;
      bool on = (isLeft && step) || (!isLeft && !step);
      return on ? CRGB::White : CRGB::Black;
    }
    case 383: { // Strobo Putih Triple Blitz (Patwal)
      uint32_t cyc = tMs % (rate * 6);
      bool hit = (cyc < rate / 2) ||
                 (cyc >= rate && cyc < rate + rate / 2) ||
                 (cyc >= rate * 2 && cyc < rate * 2 + rate / 2);
      return hit ? CRGB::White : CRGB::Black;
    }
    case 384: { // Strobo Putih Fade Halus
      uint32_t cyc = tMs % (rate * 3);
      uint8_t br = (cyc < rate / 2) ? 255 : (uint8_t)max(0, 255 - (int)((cyc - rate / 2) * 255 / (rate * 2)));
      return CRGB(br, br, br);
    }
    case 385: { // Running Putih Tengah -> Samping
      uint8_t head = (uint8_t)((speedPhase * 2) % 256);
      uint8_t d = (uint8_t)(head - xNorm);
      return (d < 70) ? CRGB(255 - d * 3, 255 - d * 3, 255 - d * 3) : CRGB::Black;
    }
    case 386: { // Running Putih Samping -> Tengah
      uint8_t head = (uint8_t)(255 - ((speedPhase * 2) % 256));
      uint8_t d = (uint8_t)(xNorm - head);
      return (d < 70) ? CRGB(255 - d * 3, 255 - d * 3, 255 - d * 3) : CRGB::Black;
    }
    case 387: { // Running Putih Ping-Pong
      uint8_t pos = beatsin8(18 + animSpeed / 2, 0, 255);
      uint8_t dist = abs((int)xNorm - (int)pos);
      return (dist < 42) ? CRGB(255 - dist * 5, 255 - dist * 5, 255 - dist * 5) : CRGB::Black;
    }
    case 388: { // Running Putih Turun 8 Baris
      uint8_t activeRow = (tMs / max((uint32_t)45, (uint32_t)(240 - animSpeed * 2))) % ROW_COUNT;
      int diff = abs((int)row - (int)activeRow);
      if (diff == 0) return CRGB::White;
      if (diff == 1) return CRGB(90, 90, 90);
      return CRGB::Black;
    }
    case 389: { // Matrix Putih Ular 8 Baris
      uint32_t stepMs = max((uint32_t)30, (uint32_t)(210 - animSpeed * 2));
      uint32_t total = (tMs / stepMs) % (ROW_COUNT * 16);
      uint8_t activeRow = total / 16;
      uint8_t colPhase = (total % 16) * 16;
      uint8_t headX = (activeRow % 2 == 0) ? colPhase : (uint8_t)(255 - colPhase);
      if (row == activeRow && abs((int)xNorm - (int)headX) < 55) return CRGB::White;
      if (abs((int)row - (int)activeRow) == 1 && abs((int)xNorm - (int)headX) < 25) return CRGB(70, 70, 70);
      return CRGB::Black;
    }
    case 390: { // Matrix Putih Catur Strobo
      uint8_t shift = (tMs / max((uint32_t)60, (uint32_t)(280 - animSpeed * 2))) % 2;
      uint8_t bx = xNorm / 42;
      return ((bx + row + shift) % 2 == 0) ? CRGB::White : CRGB::Black;
    }
    default:
      return CRGB::White;
  }
}

CRGB computeModePixel(int modeId, uint8_t xNorm, uint8_t row, bool isLeft, uint32_t tMs) {
  if (modeId >= 381 && modeId <= 390) {
    return computeWhiteSpecialPixel(modeId, xNorm, row, isLeft, tMs);
  }

  int idx = max(0, modeId - 1);
  int patternIdx = idx % 38;
  int themeIdx = (idx / 38) % 10;

  CRGB c1 = THEME_PRIMARY[themeIdx];
  CRGB c2 = THEME_SECONDARY[themeIdx];

  uint16_t speedPhase = (tMs * (12 + animSpeed * 3)) / 1000;
  uint8_t yNorm = (uint8_t)((row * 255) / max(1, ROW_COUNT - 1));
  uint8_t wave8 = sin8(xNorm - (uint8_t)speedPhase + (yNorm >> 2));

  switch (patternIdx) {
    case 0: // Aurora Dual
      return isLeft ? blend(c1, c2, wave8) : blend(c2, c1, wave8);
    case 1: // Spektrum Flow
      return CHSV((uint8_t)((xNorm >> 1) + (yNorm >> 2) + speedPhase), 240, 255);
    case 2: // Cyber Scanner
    {
      uint8_t head = beatsin8(15 + animSpeed / 2, 0, 255);
      uint8_t dist = abs((int)xNorm - (int)head);
      return dist < 35 ? c1 : CRGB(10, 14, 22);
    }
    case 3: // Plasma Drift
      return blend(c1, c2, sin8((uint8_t)((isLeft ? -xNorm : xNorm) + yNorm + speedPhase * 2)));
    case 4: // Napas Halus
    {
      uint8_t br = beatsin8(10 + animSpeed / 3, 35, 255);
      CRGB out = c1;
      out.nscale8(br);
      return out;
    }
    case 5: // Hujan Meteor
    {
      uint8_t sweep = (uint8_t)(speedPhase * 2 + (xNorm >> 2));
      uint8_t d = (uint8_t)(sweep - yNorm);
      return d < 85 ? blend(c1, CRGB(10, 14, 22), d * 3) : CRGB(10, 14, 22);
    }
    case 6: // Denyut Sport
    {
      uint8_t br = beatsin8(18 + animSpeed / 2, 45, 255, 0, xNorm >> 2);
      CRGB out = c1;
      out.nscale8(br);
      return out;
    }
    case 7: // Komet Ganda
    {
      uint8_t p1 = (uint8_t)(speedPhase * 2);
      uint8_t p2 = (uint8_t)(255 - p1);
      uint8_t d1 = abs((int)xNorm - (int)p1);
      uint8_t d2 = abs((int)xNorm - (int)p2);
      CRGB out = CRGB(10, 14, 22);
      if (d1 < 42) out += blend(c1, CRGB::Black, d1 * 6);
      if (d2 < 42) out += blend(c2, CRGB::Black, d2 * 6);
      return out;
    }
    case 8: // Arus Gradasi
      return blend(c1, c2, sin8((uint8_t)(xNorm / 2 - yNorm / 3 + speedPhase)));
    case 9: // Matrix Drop / Segmen Turun
    {
      uint8_t colSeed = (uint8_t)(xNorm * 37);
      uint8_t seg = (uint8_t)(yNorm + speedPhase * 2 + colSeed);
      return seg < 85 ? blend(c1, CRGB(10, 14, 22), seg * 3) : CRGB(10, 14, 22);
    }
    case 10: // Kilau Kristal
      return (sin8((uint8_t)(xNorm * 13 + row * 41 + speedPhase * 3)) > 215) ? c1 : blend(CRGB(14, 18, 28), c2, 70);
    case 11: // Bara Berpijar
      return blend(c1, c2, sin8((uint8_t)(xNorm * 2 + yNorm * 2 - speedPhase * 3)));
    case 12: // Strobo Ganda
    {
      bool flip = ((tMs / max(60, 420 - animSpeed * 3)) % 2) == 0;
      return ((isLeft && flip) || (!isLeft && !flip)) ? (isLeft ? c1 : c2) : CRGB(10, 12, 18);
    }
    case 13: // Prisma Geser
      return CHSV((uint8_t)((isLeft ? 255 - xNorm : xNorm) + yNorm / 2 + speedPhase * 2), 255, 255);
    case 14: // Detak Ganda (Heartbeat)
    {
      uint32_t cyc = (tMs * (8 + animSpeed / 4)) % 1000;
      uint8_t br = (cyc < 140 || (cyc > 220 && cyc < 360)) ? 255 : 42;
      CRGB out = c1;
      out.nscale8(br);
      return out;
    }
    case 15: // Senja Fade
      return blend(c1, c2, cos8((uint8_t)(xNorm + speedPhase)));
    case 16: // Sapuan Knight
    {
      uint8_t head = beatsin8(20 + animSpeed / 2, 0, 255);
      uint8_t dist = abs((int)xNorm - (int)head);
      return dist < 44 ? blend(c1, CRGB(16, 10, 14), dist * 5) : CRGB(16, 10, 14);
    }
    case 17: // Pantulan Gelombang
      return blend(c2, c1, sin8((uint8_t)(abs((int)xNorm - 128) * 2 - speedPhase * 2)));
    case 18: // Belah Horizon
    {
      uint8_t mix = beatsin8(12 + animSpeed / 3, 0, 255);
      return isLeft ? blend(c1, c2, mix) : blend(c2, c1, mix);
    }
    case 19: // Silang Laser
    {
      uint8_t beam = (uint8_t)((tMs / max(8, 35 - animSpeed / 4)) % 255);
      int pos = (xNorm * 7 + yNorm * 3) / 10;
      bool hit = abs(pos - (int)beam) < 22 || abs(pos - (255 - (int)beam)) < 22;
      return hit ? blend(c1, c2, 128) : CRGB(10, 14, 22);
    }
    case 20: // Spiral Helix
      return (sin8((uint8_t)(xNorm + speedPhase)) > 128) ? c1 : c2;
    case 21: // Pusaran Vortex
      return blend(c1, c2, sin8((uint8_t)(xNorm - yNorm - speedPhase * 2)));
    case 22: // Mata Cyber
    {
      int centerX = 128 + (int)(sin8(speedPhase) - 128) / 3;
      int dx = abs((int)xNorm - centerX);
      int dy = abs((int)yNorm - 110);
      int dist = (dx + dy) / 2;
      if (dist < 28) return CRGB::White;
      if (dist < 58) return isLeft ? c1 : c2;
      return CRGB(10, 14, 22);
    }
    case 23: // Patrol Double Flash
    {
      uint32_t rate = max((uint32_t)40, (uint32_t)(320 - animSpeed * 2));
      uint8_t slot = (tMs / rate) % 8;
      if (isLeft && (slot == 0 || slot == 2)) return c1;
      if (!isLeft && (slot == 4 || slot == 6)) return c2;
      return CRGB(8, 10, 16);
    }
    case 24: // Hujan Matrix 2D
    {
      uint8_t seed = (uint8_t)((xNorm / 16) * 53);
      uint8_t head = (uint8_t)(speedPhase * 2 + seed);
      uint8_t d = (uint8_t)(head - yNorm);
      if (d < 22) return blend(c1, CRGB::White, 140);
      if (d < 95) return blend(c1, CRGB(10, 14, 22), d * 2);
      return CRGB(10, 14, 22);
    }
    case 25: // Kotak Catur Matrix
    {
      uint8_t shift = (uint8_t)(speedPhase / 8);
      uint8_t bx = (xNorm / 48) + shift;
      return ((bx + row) % 2 == 0) ? c1 : c2;
    }
    case 26: // Radar Sapu 360
    {
      int dx = (int)xNorm - 128;
      int dy = (int)yNorm - 128;
      uint8_t angle = (uint8_t)((atan2((float)dy, (float)dx) + 3.14159f) * 40.58f);
      uint8_t beam = (uint8_t)(speedPhase * 2);
      uint8_t d = (uint8_t)(beam - angle);
      return d < 75 ? blend(c1, c2, d * 3) : CRGB(10, 14, 22);
    }
    case 27: // Ular Matrix (Zigzag Snake)
    {
      uint32_t stepMs = max((uint32_t)30, (uint32_t)(200 - animSpeed * 2));
      uint32_t total = (tMs / stepMs) % (ROW_COUNT * 16);
      uint8_t activeRow = total / 16;
      uint8_t colPhase = (total % 16) * 16;
      uint8_t headX = (activeRow % 2 == 0) ? colPhase : (uint8_t)(255 - colPhase);
      if (row == activeRow && abs((int)xNorm - (int)headX) < 55) return blend(c2, c1, 180);
      if (abs((int)row - (int)activeRow) == 1 && abs((int)xNorm - (int)headX) < 28) return c2;
      return CRGB(10, 14, 22);
    }
    case 29: // Solid Statis
      return isLeft ? c1 : c2;
    case 30: // Sayap Cyber
    {
      int wing = (speedPhase * 2) % 300;
      int diag = ((int)xNorm * 7 + abs((int)yNorm - 128) * 5) / 10;
      int d = abs(diag - wing);
      if (d < 32) return blend(c1, CRGB::White, 80);
      if (d < 64) return blend(c2, c1, 255 - d * 3);
      return CRGB(10, 14, 22);
    }
    case 31: // Gelombang Twister
    {
      uint8_t bandY = 128 + (int)(sin8((uint8_t)(xNorm * 2 - speedPhase * 2)) - 128) * 3 / 4;
      int dist = abs((int)yNorm - (int)bandY);
      if (dist < 64) return blend(c1, c2, cos8((uint8_t)(xNorm + speedPhase)));
      return CRGB(10, 14, 22);
    }
    case 32: // Cincin Kejut
    {
      int dx = (int)xNorm - 128;
      int dy = (int)yNorm - 128;
      int r = (int)sqrt((float)(dx * dx + dy * dy));
      int ring = (speedPhase * 2) % 180;
      return abs(r - ring) < 28 ? blend(c1, c2, 100) : CRGB(10, 14, 22);
    }
    case 33: // Bar Spektrum
    {
      uint8_t barIdx = xNorm / 26;
      uint8_t barH = 50 + (sin8((uint8_t)(speedPhase * 3 + barIdx * 35)) >> 1);
      uint8_t invY = 255 - yNorm;
      if (invY <= barH) return (invY > barH - 28) ? c2 : c1;
      return CRGB(10, 14, 22);
    }
    case 34: // Kecepatan Warp
    {
      uint8_t seed = (uint8_t)(row * 47);
      uint8_t pos = (uint8_t)(speedPhase * 3 + seed);
      uint8_t d = (uint8_t)(pos - xNorm);
      return d < 65 ? blend(c1, c2, d * 3) : CRGB(10, 14, 22);
    }
    case 35: // Kembang Api Matrix
    {
      uint32_t slot = tMs / max((uint32_t)120, (uint32_t)(750 - animSpeed * 5));
      int cx = 50 + ((slot * 73) % 155);
      int cy = 40 + ((slot * 41) % 175);
      int dx = (int)xNorm - cx;
      int dy = (int)yNorm - cy;
      int r = (int)sqrt((float)(dx * dx + dy * dy));
      int rad = (int)((tMs % max((uint32_t)120, (uint32_t)(750 - animSpeed * 5))) * 150 / max((uint32_t)120, (uint32_t)(750 - animSpeed * 5)));
      return abs(r - rad) < 24 ? ((slot % 2 == 0) ? c1 : c2) : CRGB(10, 14, 22);
    }
    case 36: // Spiral Galaksi
    {
      int dx = (int)xNorm - 128;
      int dy = (int)yNorm - 128;
      uint8_t ang = (uint8_t)((atan2((float)dy, (float)dx) + 3.14159f) * 40.58f);
      uint8_t rad = (uint8_t)min(255, (int)sqrt((float)(dx * dx + dy * dy)));
      return blend(c2, c1, sin8((uint8_t)(ang * 2 + rad * 2 - speedPhase * 2)));
    }
    case 37: // Simpul Infinity
    default:
    {
      int px = 128 + (int)(sin8((uint8_t)(speedPhase * 2)) - 128) * 3 / 4;
      int py = 128 + (int)(sin8((uint8_t)(speedPhase * 4)) - 128) * 2 / 3;
      int d = abs((int)xNorm - px) + abs((int)yNorm - py);
      if (d < 58) return c1;
      int px2 = 255 - px;
      int py2 = 255 - py;
      int d2 = abs((int)xNorm - px2) + abs((int)yNorm - py2);
      if (d2 < 58) return c2;
      return CRGB(10, 14, 22);
    }
  }
}

// ---------------- HALAMAN WEB CADANGAN (PORT 80) ----------------
String htmlPage() {
  return R"rawliteral(<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RNS RGB Controller</title>
<style>
body{background:#090c12;color:#f1f5f9;font-family:system-ui,Arial;text-align:center;padding:12px}
.card{background:#111622;border:1px solid #1e293b;padding:14px;margin:10px auto;max-width:440px;border-radius:16px}
button,select,input{padding:10px 12px;margin:4px;border-radius:10px;border:0;font-size:14px}
button{background:#22d3ee;color:#090c12;font-weight:700}
select,input[type=number]{background:#0b0f17;color:#f1f5f9;border:1px solid #334155}
</style></head><body>
<h3>RNS STOPLAMP CONTROLLER (374 LED · 390 MODE)</h3>
<div class="card">
  <div>Mode (1-390)</div>
  <input id="m" type="number" min="1" max="390" value="1">
  <button onclick="go('/preset?n='+m.value)">PILIH</button>
  <button onclick="go('/prev')">PREV</button>
  <button onclick="go('/next')">NEXT</button>
</div>
<div class="card">
  <button onclick="go('/welcome')">WELCOME</button>
  <select onchange="go('/wstyle?s='+this.value)">
    <option value="0">Welcome: Sapuan</option>
    <option value="1">Welcome: Mekar Tengah</option>
    <option value="2">Welcome: Cyber Flash</option>
    <option value="3">Welcome: Temu Tengah</option>
    <option value="4">Welcome: Naik 8 Baris</option>
    <option value="5">Welcome: Napas Halus</option>
  </select>
  <button onclick="go('/combo?on=1')">BELANG ON</button>
  <button onclick="go('/combo?on=0')">BELANG OFF</button>
  <button onclick="go('/auto?v=1')">AUTO</button>
  <button onclick="go('/stop')">OFF</button>
</div>
<div class="card">
  <div>Atur Kombinasi / Belang (Kiri &amp; Kanan)</div>
  Kiri <input id="cl" type="number" min="1" max="390" value="1" style="width:64px">
  Kanan <input id="cr" type="number" min="1" max="390" value="12" style="width:64px">
  <button onclick="go('/belang?l='+cl.value+'&r='+cr.value)">SET BELANG</button>
</div>
<div class="card">
  <div>Warna Welcome &amp; Stay</div>
  <input id="wc" type="color" value="#22d3ee">
  <button onclick="go('/wcolor?c='+wc.value.substring(1))">WARNA WELCOME</button>
  <button onclick="go('/stay?c='+wc.value.substring(1))">STAY WARNA</button>
</div>
<script>function go(u){fetch(u);}</script>
</body></html>)rawliteral";
}

void setupWeb() {
  server.on("/", []() { server.send(200, "text/html", htmlPage()); });

  server.on("/preset", []() {
    if (server.hasArg("n")) {
      activeModeId = constrain(server.arg("n").toInt(), 1, TOTAL_MODES);
      comboEnabled = false;
      solidStay = false;
      stopped = false;
      saveSettings();
    }
    server.send(200, "text/plain", "OK");
  });

  server.on("/next", []() {
    activeModeId = (activeModeId % TOTAL_MODES) + 1;
    comboEnabled = false;
    solidStay = false;
    stopped = false;
    saveSettings();
    server.send(200, "text/plain", "OK");
  });

  server.on("/prev", []() {
    activeModeId = (activeModeId <= 1) ? TOTAL_MODES : (activeModeId - 1);
    comboEnabled = false;
    solidStay = false;
    stopped = false;
    saveSettings();
    server.send(200, "text/plain", "OK");
  });

  server.on("/auto", []() {
    autoMode = server.arg("v") == "1";
    lastAutoMs = millis();
    stopped = false;
    server.send(200, "text/plain", "OK");
  });

  server.on("/combo", []() {
    comboEnabled = server.arg("on") == "1";
    solidStay = false;
    stopped = false;
    saveSettings();
    server.send(200, "text/plain", "OK");
  });

  server.on("/belang", []() {
    if (server.hasArg("l")) {
      comboLeft[0] = constrain(server.arg("l").toInt(), 1, TOTAL_MODES);
      comboLeftCount = 1;
    }
    if (server.hasArg("r")) {
      comboRight[0] = constrain(server.arg("r").toInt(), 1, TOTAL_MODES);
      comboRightCount = 1;
    }
    comboEnabled = true;
    solidStay = false;
    stopped = false;
    saveSettings();
    server.send(200, "text/plain", "OK");
  });

  server.on("/wcolor", []() {
    if (server.hasArg("c")) {
      welcomeRainbow = false;
      welcomeColor = parseHexColor(server.arg("c").c_str());
      welcomeUntilMs = millis() + 3000;
      stopped = false;
      saveSettings();
    }
    server.send(200, "text/plain", "OK");
  });

  server.on("/wstyle", []() {
    if (server.hasArg("s")) {
      welcomeStyle = constrain(server.arg("s").toInt(), 0, 5);
      welcomeUntilMs = millis() + 3000;
      stopped = false;
      saveSettings();
    }
    server.send(200, "text/plain", "OK");
  });

  server.on("/stay", []() {
    if (server.hasArg("c")) {
      solidColor = parseHexColor(server.arg("c").c_str());
      solidStay = true;
      comboEnabled = false;
      stopped = false;
      saveSettings();
    }
    server.send(200, "text/plain", "OK");
  });

  server.on("/welcome", []() {
    welcomeUntilMs = millis() + 3000;
    stopped = false;
    server.send(200, "text/plain", "OK");
  });

  server.on("/stop", []() {
    stopped = true;
    welcomeUntilMs = 0;
    fill_solid(leds, NUM_LEDS, CRGB::Black);
    FastLED.show();
    server.send(200, "text/plain", "OK");
  });

  server.on("/power", []() {
    bool on = server.arg("on") != "0";
    stopped = !on;
    if (stopped) {
      welcomeUntilMs = 0;
      fill_solid(leds, NUM_LEDS, CRGB::Black);
      FastLED.show();
    }
    server.send(200, "text/plain", on ? "ON" : "OFF");
  });

  server.on("/resetled", []() {
    activeModeId = 1;
    animSpeed = 50;
    animBrightness = 75;
    comboEnabled = false;
    solidStay = false;
    stopped = false;
    autoMode = false;
    appSein = "off";
    appBrake = false;
    welcomeUntilMs = millis() + 1500;
    FastLED.clear(true);
    FastLED.setBrightness(map(animBrightness, 5, 100, 15, 255));
    saveSettings();
    server.send(200, "text/plain", "RESET_OK");
  });

  server.on("/api/modes", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"family\":\"esp8266\",\"total\":390,\"modes\":[{\"nativeId\":381,\"name\":\"RNS Strobo Putih Kilat\"},{\"nativeId\":385,\"name\":\"RNS Running Putih Tengah-Luar\"},{\"nativeId\":389,\"name\":\"RNS Matrix Putih Ular\"}]}");
  });

  server.begin();
}

void setup() {
  Serial.begin(BT_SERIAL_BAUD);

  pinMode(BRAKE_PIN, SIGNAL_ACTIVE_LOW ? INPUT_PULLUP : INPUT);
  pinMode(SEIN_LEFT_PIN, SIGNAL_ACTIVE_LOW ? INPUT_PULLUP : INPUT);
  pinMode(SEIN_RIGHT_PIN, SIGNAL_ACTIVE_LOW ? INPUT_PULLUP : INPUT);

  EEPROM.begin(96);
  loadSettings();
  buildPixelMap();

  FastLED.addLeds<LED_CHIPSET, LED_DATA_PIN, COLOR_ORDER>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
  FastLED.addLeds<LED_CHIPSET, FRONT_DATA_PIN, COLOR_ORDER>(frontLeds, FRONT_NUM_LEDS).setCorrection(TypicalLEDStrip);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, MAX_MILLIAMPS);
  FastLED.setBrightness(map(animBrightness, 5, 100, 15, 255));

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(IPAddress(192, 168, 4, 1), IPAddress(192, 168, 4, 1), IPAddress(255, 255, 255, 0));
  WiFi.softAP(AP_SSID, AP_PASS);

  setupWeb();
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);

  // Welcome otomatis menyala saat kunci kontak ON (3 detik)
  welcomeUntilMs = millis() + 3000;
}

uint8_t sampleAudioEnvelope() {
  if (millis() - lastAppAudioMs < 600) {
    return soundLevel;
  }
  // Fallback pembacaan sensor mic analog pada pin A0 jika HP tidak sedang stream
  int raw = analogRead(SOUND_MIC_PIN);
  int dev = abs(raw - 512);
  int scaled = (dev * (int)soundSensitivity) / 35;
  return (uint8_t)constrain(scaled, 0, 255);
}

void renderSoundRear(uint32_t now) {
  uint8_t lvl = sampleAudioEnvelope();
  uint8_t bass = (millis() - lastAppAudioMs < 600) ? soundBass : lvl;
  uint8_t themeIdx = (uint8_t)(((activeModeId - 1) / 38) % 10);
  CRGB c1 = solidStay ? solidColor : THEME_PRIMARY[themeIdx];
  CRGB c2 = solidStay ? solidColor : THEME_SECONDARY[themeIdx];

  for (int i = 0; i < NUM_LEDS; i++) {
    uint8_t x = pixelXNorm[i];
    uint8_t row = pixelRow[i];
    if (soundStyle == 1) { // Bass Pulse
      CRGB col = blend(c2, c1, bass);
      col.nscale8(max((uint8_t)25, bass));
      leds[i] = col;
    } else if (soundStyle == 2) { // Spektrum
      uint8_t hue = (uint8_t)(x + (now / 12) + row * 12);
      uint8_t br = (uint8_t)constrain(40 + ((int)lvl * (255 - abs((int)x - 128))) / 255, 20, 255);
      leds[i] = CHSV(hue, 240, br);
    } else if (soundStyle == 3) { // Strobo Beat
      bool flash = (bass > 155) && (((now / 45) % 2) == 0);
      leds[i] = flash ? CRGB::White : blend(CRGB(12, 16, 28), c1, lvl / 2);
    } else { // VU Meter 8 Baris dari tengah/bawah
      uint8_t fillReach = lvl;
      if (x <= fillReach) {
        leds[i] = (x > 190) ? CRGB::Red : blend(c1, c2, x);
      } else {
        leds[i] = CRGB(10, 14, 22);
      }
    }
  }
}

CRGB applyFrontEffect(CRGB base, uint8_t brightPct, uint8_t effect, int idx, int len, uint32_t now) {
  CRGB col = base;
  if (effect == 2) { // Flow RGB
    col = CHSV((uint8_t)((now / 14) + idx * (255 / max(1, len))), 245, 255);
  } else if (effect == 1) { // Pulse
    uint8_t wave = beatsin8(28, 70, 255);
    col.nscale8(wave);
  } else if (effect == 3) { // Putar Ring
    int head = (int)((now / 45) % max(1, len));
    int d = abs(idx - head);
    d = min(d, max(1, len) - d);
    uint8_t fade = (d <= 2) ? 255 : 45;
    col.nscale8(fade);
  }
  col.nscale8((uint8_t)map(constrain((int)brightPct, 10, 100), 10, 100, 25, 255));
  return col;
}

// Lampu Depan (Devil Eye, Shroud Biled, Alis + Sein Running Depan) — Ikut mode/warna/welcome/suara belakang, TIDAK PERNAH ikut kedip rem belakang!
void renderFrontLamp(uint32_t now, bool seinLeftOn, bool seinRightOn, CRGB rearPrimary) {
  if (stopped || !frontEnabled) {
    fill_solid(frontLeds, FRONT_NUM_LEDS, CRGB::Black);
    return;
  }

  CRGB syncedBase = rearPrimary;
  if (now < welcomeUntilMs) {
    syncedBase = welcomeRainbow ? CHSV((uint8_t)(now / 10), 240, 255) : welcomeColor;
  } else if (soundMode) {
    uint8_t lvl = sampleAudioEnvelope();
    uint8_t scale = max((uint8_t)30, lvl);
    syncedBase.nscale8(scale);
  }

  CRGB devilCol = frontSyncColor ? syncedBase : frontDevilColor;
  CRGB shroudCol = frontSyncColor ? syncedBase : frontShroudColor;
  CRGB alisCol = frontSyncColor ? syncedBase : frontAlisColor;

  // 1. Devil Eye (0 .. FRONT_DEVIL_LEDS - 1)
  for (int i = 0; i < FRONT_DEVIL_LEDS; i++) {
    frontLeds[i] = frontDevilOn
      ? applyFrontEffect(devilCol, frontDevilBright, frontDevilEffect, i, FRONT_DEVIL_LEDS, now)
      : CRGB::Black;
  }

  // 2. Shroud Biled Ring (FRONT_DEVIL_LEDS .. +FRONT_SHROUD_LEDS - 1)
  int shroudStart = FRONT_DEVIL_LEDS;
  for (int i = 0; i < FRONT_SHROUD_LEDS; i++) {
    frontLeds[shroudStart + i] = frontShroudOn
      ? applyFrontEffect(shroudCol, frontShroudBright, frontShroudEffect, i, FRONT_SHROUD_LEDS, now)
      : CRGB::Black;
  }

  // 3. Alis DRL + Sinkron Running Sein Depan (setengah kiri & setengah kanan)
  int alisStart = FRONT_DEVIL_LEDS + FRONT_SHROUD_LEDS;
  int halfAlis = FRONT_ALIS_LEDS / 2;
  uint32_t period = max((uint32_t)240, (uint32_t)(820 - seinSpeed * 5));
  for (int i = 0; i < FRONT_ALIS_LEDS; i++) {
    bool isLeftAlis = (i < halfAlis);
    bool activeSein = frontSyncSein && ((isLeftAlis && seinLeftOn) || (!isLeftAlis && seinRightOn));
    if (activeSein) {
      unsigned long sMs = isLeftAlis ? seinLeftStartMs : seinRightStartMs;
      float cycNorm = (float)((now - sMs) % period) / (float)period;
      int localIdx = isLeftAlis ? i : (i - halfAlis);
      int seqCount = (int)((cycNorm / 0.44f) * halfAlis) + 1;
      bool on = (cycNorm < 0.86f) && (localIdx <= seqCount);
      frontLeds[alisStart + i] = on ? CRGB(255, 165, 5) : CRGB::Black;
    } else {
      frontLeds[alisStart + i] = frontAlisOn
        ? applyFrontEffect(alisCol, frontAlisBright, frontAlisEffect, i, FRONT_ALIS_LEDS, now)
        : CRGB::Black;
    }
  }
}

void renderSeinPanel(int startIdx, int endIdx, unsigned long startMs, uint32_t now) {
  if (seinPattern == 3) { // Full 1 Panel Solid Amber
    for (int i = startIdx; i < endIdx; i++) leds[i] = CRGB(255, 165, 5);
    return;
  }

  uint32_t period = max((uint32_t)240, (uint32_t)(820 - seinSpeed * 5));
  uint32_t elapsed = (now >= startMs) ? (now - startMs) : 0;
  float cycNorm = (float)(elapsed % period) / (float)period;

  if (seinPattern == 1) { // Blink
    CRGB col = (cycNorm < 0.60f) ? CRGB(255, 160, 0) : CRGB::Black;
    for (int i = startIdx; i < endIdx; i++) leds[i] = col;
    return;
  }

  if (seinPattern == 2) { // Pulse halus
    uint8_t br = beatsin8(20 + seinSpeed / 2, 15, 255);
    CRGB col = CRGB(255, 160, 0);
    col.nscale8(br);
    for (int i = startIdx; i < endIdx; i++) leds[i] = col;
    return;
  }

  // Sequential full panel: menyapu cepat di awal (0..0.44), menahan FULL 1 PANEL (0.44..0.86), lalu jeda mati bersih
  uint8_t seqX = (uint8_t)min(255, (int)((cycNorm / 0.44f) * 255.0f));
  bool active = (cycNorm < 0.86f);
  for (int i = startIdx; i < endIdx; i++) {
    leds[i] = (active && pixelXNorm[i] <= seqX) ? CRGB(255, 165, 5) : CRGB::Black;
  }
}

void loop() {
  server.handleClient();
  webSocket.loop();
  handleBluetoothSerial();

  uint32_t now = millis();

  // 1. Prioritas sinyal fisik motor (D1 Rem, D7 Sein Kiri, D2 Sein Kanan) + tombol App
  bool hwBrake = hwSignalsEnabled && readSignalPin(BRAKE_PIN);
  bool hwSeinL = hwSignalsEnabled && readSignalPin(SEIN_LEFT_PIN);
  bool hwSeinR = hwSignalsEnabled && readSignalPin(SEIN_RIGHT_PIN);

  bool brakeOn = appBrake || hwBrake;
  bool seinLeftOn = hwSeinL || appSein == "left" || appSein == "hazard";
  bool seinRightOn = hwSeinR || appSein == "right" || appSein == "hazard";

  if (seinLeftOn && !prevSeinLeft) seinLeftStartMs = now;
  if (seinRightOn && !prevSeinRight) seinRightStartMs = now;
  prevSeinLeft = seinLeftOn;
  prevSeinRight = seinRightOn;

  uint8_t activeThemeIdx = (uint8_t)(((activeModeId - 1) / 38) % 10);
  CRGB frontRearBase = solidStay ? solidColor : THEME_PRIMARY[activeThemeIdx];

  if (stopped && !brakeOn && !seinLeftOn && !seinRightOn) {
    fill_solid(leds, NUM_LEDS, CRGB::Black);
    fill_solid(frontLeds, FRONT_NUM_LEDS, CRGB::Black);
    FastLED.show();
    delay(20);
    return;
  }

  // 2. Animasi Welcome (6 mode pilihan + warna bebas dari aplikasi, durasi 3 detik)
  if (now < welcomeUntilMs && !brakeOn && !seinLeftOn && !seinRightOn) {
    float prog = 1.0f - (float)(welcomeUntilMs - now) / 3000.0f;
    prog = constrain(prog, 0.0f, 1.0f);
    float wave = (prog < 0.5f) ? (prog * 2.0f) : (2.0f - prog * 2.0f);
    uint8_t waveByte = (uint8_t)(constrain(wave, 0.0f, 1.0f) * 255.0f);

    for (int i = 0; i < NUM_LEDS; i++) {
      uint8_t x = pixelXNorm[i];
      uint8_t r = pixelRow[i];
      CRGB target = welcomeRainbow
        ? CHSV((uint8_t)(x + (uint8_t)(prog * 255)), 240, 255)
        : welcomeColor;

      if (welcomeStyle == 2) { // Cyber Flash
        bool flash = ((int)(prog * 12.0f) % 2) == 0;
        leds[i] = (x <= (uint8_t)min(255, (int)(prog * 290))) ? (flash ? target : CRGB(20, 24, 32)) : CRGB(8, 10, 16);
      } else if (welcomeStyle == 1) { // Mekar dari Tengah
        uint8_t reach = (uint8_t)min(255, (int)((prog < 0.65f ? prog / 0.65f : 1.0f) * 255.0f));
        leds[i] = (x <= reach) ? target : CRGB(8, 10, 16);
      } else if (welcomeStyle == 3) { // Temu Tengah
        int distMid = abs((int)x - 128) * 2;
        int reach = (int)(abs(1.0f - prog * 2.0f) * 255.0f);
        int d = abs(distMid - reach);
        leds[i] = (d < 85) ? blend(target, CRGB(8, 10, 16), d * 3) : CRGB(8, 10, 16);
      } else if (welcomeStyle == 4) { // Naik 8 Baris (Baris 8 bawah -> Baris 1 atas)
        int targetRow = (int)((1.0f - min(1.0f, prog * 1.15f)) * 7.0f);
        if (r == targetRow) leds[i] = target;
        else if (r > targetRow) leds[i] = blend(target, CRGB(8, 10, 16), 110);
        else leds[i] = CRGB(8, 10, 16);
      } else if (welcomeStyle == 5) { // Napas Halus
        uint8_t br = (uint8_t)(60 + 195 * sin(prog * 3.14159f));
        CRGB out = target;
        out.nscale8(br);
        leds[i] = out;
      } else { // Sapuan
        int dist = abs((int)x - (int)waveByte);
        leds[i] = (dist < 64) ? blend(target, CRGB(8, 10, 16), dist * 4) : CRGB(8, 10, 16);
      }
    }
    renderFrontLamp(now, seinLeftOn, seinRightOn, frontRearBase);
    FastLED.show();
    delay(16);
    return;
  }

  if (autoMode && (now - lastAutoMs >= 10000)) {
    lastAutoMs = now;
    activeModeId = (activeModeId % TOTAL_MODES) + 1;
  }

  // 3. Render Panel Belakang 0 (0..186) & Panel 1 (187..373) — Mode Suara / 390+ Mode / Belang / Stay RGB
  if (soundMode) {
    renderSoundRear(now);
  } else {
    for (int i = 0; i < NUM_LEDS; i++) {
      bool isFirstHalf = (i < PANEL_LEDS);
      bool isLeft = swapPanels ? !isFirstHalf : isFirstHalf;
      uint8_t xNorm = pixelXNorm[i];
      uint8_t row = pixelRow[i];

      if (solidStay) {
        leds[i] = solidColor;
      } else if (comboEnabled) {
        int* list = isLeft ? comboLeft : comboRight;
        int count = isLeft ? comboLeftCount : comboRightCount;
        if (count <= 0) count = 1;
        int slot = 0;
        if (comboStyle == "sequence") {
          slot = (now / 3000) % count;
        } else {
          slot = min(count - 1, (int)((xNorm * count) / 256));
        }
        leds[i] = computeModePixel(list[slot], xNorm, row, isLeft, now);
      } else {
        leds[i] = computeModePixel(activeModeId, xNorm, row, isLeft, now);
      }
    }
  }

  // 4. Prioritas Rem (D1) — F1 Strobo Merah HANYA untuk LED BELAKANG (Lampu Depan tetap stabil, tidak ikut kedip!)
  if (brakeOn) {
    bool strobe = ((now / 70) % 2) == 0;
    fill_solid(leds, NUM_LEDS, strobe ? CRGB(255, 16, 16) : CRGB(65, 6, 6));
  }

  // 5. Prioritas Sein Kiri (D7) & Kanan (D2) — FULL 1 PANEL Kiri / Kanan (187 LED per sisi)
  int leftStart  = swapPanels ? PANEL_LEDS : 0;
  int leftEnd    = swapPanels ? NUM_LEDS   : PANEL_LEDS;
  int rightStart = swapPanels ? 0          : PANEL_LEDS;
  int rightEnd   = swapPanels ? PANEL_LEDS : NUM_LEDS;

  if (seinLeftOn) {
    renderSeinPanel(leftStart, leftEnd, seinLeftStartMs, now);
  }
  if (seinRightOn) {
    renderSeinPanel(rightStart, rightEnd, seinRightStartMs, now);
  }

  // 6. Render Lampu Depan (Devil Eye, Shroud Biled, Alis + Sein Running Depan; kebal rem belakang)
  renderFrontLamp(now, seinLeftOn, seinRightOn, frontRearBase);

  FastLED.show();
  delay(16);
}
`;
}

export function downloadEsp8266Sketch(state: ControllerState): void {
  const code = generateEsp8266Sketch(state);
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RNS_Stoplamp_ESP8266.ino';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 15000);
}
