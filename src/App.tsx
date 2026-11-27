import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  Clock,
  Download,
  Grid,
  Home,
  Layers,
  Lock,
  LogOut,
  Music,
  Palette,
  Power,
  RotateCcw,
  ScanBarcode,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Wifi,
  X,
} from 'lucide-react';
import { AdminView } from './components/AdminView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ComboEditorModal } from './components/ComboEditorModal';
import { CustomerConnectView } from './components/CustomerConnectView';
import { HomeView } from './components/HomeView';
import { AppBrandLogo, resolveCustomIconComponent } from './components/IconRegistry';
import { LedMatrixView } from './components/LedMatrixView';
import { LedView } from './components/LedView';
import { LoginScreen } from './components/LoginScreen';
import { ModeBelangView } from './components/ModeBelangView';
import { ModeCollector } from './components/ModeCollector';
import { MusicView } from './components/MusicView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { QuickControlsBar } from './components/QuickControlsBar';
import { RgbControllerView } from './components/RgbControllerView';
import { ScheduleView } from './components/ScheduleView';
import { SpecialView } from './components/SpecialView';
import { StoplampVisualizer } from './components/StoplampVisualizer';
import { WhiteFullView } from './components/WhiteFullView';
import { BUILTIN_PRESETS, RGB_MODES } from './data/modes';
import { buildModuleFactoryModes } from './data/moduleFactoryModes';
import { subscribeToLatestRelease, testConnection } from './firebase';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  AccentTheme,
  AdminMultiControllerState,
  AppCustomization,
  AutoBelangConfig,
  BackgroundPatternId,
  BlePacketFormat,
  BleTargetZone,
  ComboConfig,
  ControllerFamily,
  ControllerState,
  CountdownTimerConfig,
  DeviceConfig,
  DiscoveredModuleMode,
  HomeBlockId,
  LedConfig,
  LedMatrixConfig,
  ManualSideColorConfig,
  MatrixModelItem,
  MultiControllerProfile,
  NavTab,
  RgbMode,
  RnsPreset,
  ScannedModuleRecord,
  ScheduleConfig,
  SeinState,
  SoundStyle,
  SpecialSettings,
  UserRole,
  WelcomeStyle,
} from './types/controller';
import {
  getLiveAudioFrame,
  getMicrophoneError,
  isMicrophoneActive,
  startMicrophoneCapture,
  stopMicrophoneCapture,
} from './utils/audioReactive';
import {
  downloadApkZipBundle,
  downloadStandaloneHtmlApp,
} from './utils/downloadOfflineApp';
import {
  BleSessionInfo,
  connectBluetoothController,
  disconnectBluetoothController,
  getBleSessionInfo,
  queryBleModuleModes,
  sendBlePasswordCommand,
  sendStateOverBluetooth,
  setBleConnectionFormat,
  setBleConnectionZone,
  writeRawBluetoothBytes,
} from './utils/bluetoothController';
import { ParsedModuleBarcode, toScannedModuleRecord } from './utils/moduleBarcodeParser';

const STORAGE_KEY = 'rns_rgb_controller_v3';
const ROLE_STORAGE_KEY = 'rns_rgb_role_v1';

const ACCENT_HEX: Record<AccentTheme, string> = {
  cyan: '#22D3EE',
  magenta: '#EC4899',
  crimson: '#EF4444',
  amber: '#F59E0B',
  emerald: '#10B981',
};

const FONT_FAMILY_CSS: Record<NonNullable<AppCustomization['fontFamily']>, string> = {
  jakarta: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  outfit: '"Outfit", "Plus Jakarta Sans", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
};

function hexToRgbaColor(hex: string, alpha01: number): string {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const clamped = Math.max(0.05, Math.min(1, alpha01));
  return clamped >= 0.999 ? `#${clean}` : `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(2)})`;
}

const DEFAULT_STATE: ControllerState = {
  powerOn: true,
  activeModeId: 1,
  speed: 50,
  brightness: 75,
  sein: 'off',
  brakeActive: false,
  reverseActive: false,
  combinationEnabled: false,
  solidStayActive: false,
  solidColor: '#EF4444',
  welcomePlayingUntil: 0,
  favorites: [1, 2, 7],
  combo: {
    leftModes: [1, 3, 34],
    rightModes: [1, 3, 34],
    style: 'layer-blend',
    intervalSec: 3,
    priorityMode: 'blend',
    syncPanels: false,
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
    stripeCount: 6,
    colorChangeSpeed: 60,
    direction: 'left-to-right',
    pattern: 'stripes',
    moving: true,
  },
  ledMatrix: {
    enabled: false,
    activeModelId: 'eye-angry',
    category: 'eyes',
    eyeExpression: 'angry',
    eyeShape: 'cyber-slit',
    matrixEffect: 'equalizer-rgb',
    scrollingText: 'RNS RGB',
    primaryColor: '#22D3EE',
    secondaryColor: '#EF4444',
    speed: 65,
    size: 4,
    direction: 'left',
    customModels: [],
  },
  savedPresets: [],
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
    swapPanels: false,
    chipset: 'WS2812B',
    colorOrder: 'GRB',
    maxCurrentMa: 2500,
    pixelShape: 'square',
    showMovingEyes: true,
    testOverride: 'none',
  },
  device: {
    boardName: 'Wemos D1 Mini · ESP8266',
    ssid: 'RNS-STOPLAMP-AP',
    ipAddress: '192.168.4.1',
    port: 81,
    connectionStatus: 'simulation',
    autoReconnect: false,
    adminPin: '1234',
  },
  customization: {
    appName: 'RNS Controller',
    accentTheme: 'cyan',
    customAccentHex: '',
    sectionOrder: ['quick-controls', 'sliders'],
    showWelcomeBtn: true,
    showSeinBtn: true,
    showBrakeBtn: true,
    showComboBtn: true,
    customModes: [],
    modeOverrides: {},
    backgroundMode: 'solid',
    backgroundColor: '#090C12',
    backgroundGradientStart: '#090C12',
    backgroundGradientEnd: '#0F1E33',
    backgroundPattern: 'none',
    backgroundImageUrl: '',
    backgroundOverlayOpacity: 65,
    backgroundBlur: 2,
    cardStyle: 'solid',
    cardRadius: 'rounded',
    cardBgColor: '',
    logoPreset: 'rns-matrix',
    customLogoUrl: '',
    navOrder: ['home', 'rgb', 'belang', 'matrix', 'white', 'sinyal', 'music', 'schedule', 'connect', 'led', 'admin'],
    navLabels: {},
    navIcons: {},
    quickIcons: {},
    leftBlockOrder: ['status-bar', 'visualizer', 'mode-collector'],
    homeBlockOrder: ['sliders', 'welcome-card', 'stay-wheel'],
    quickControlsPlacement: 'top',
    showStatusBar: true,
    showModeCollector: true,
    showSlidersCard: true,
    showWelcomeCard: true,
    showStayWheelCard: true,
    showCustomBanner: false,
    customBannerText: '',
    footerText: '',
    backgroundGradientAngle: 180,
    backgroundGradientMid: '',
    textColor: '',
    mutedTextColor: '',
    headerBgColor: '',
    navBgColor: '',
    borderColor: '',
    fontFamily: 'jakarta',
    fontScale: 100,
    cardOpacity: 100,
    cardBlurPx: 0,
    cardBorderWidth: 1,
    quickLabels: {},
    visualizerTitle: '',
    visualizerSubtitle: '',
    hiddenTabs: [],
    customerUnlockedTabs: [],
    customCss: '',
    customMatrixModels: [],
    builtInPresets: [],
  },
  cloudMeta: {
    version: 0,
    versionLabel: 'v1.0',
    releaseNotes: '',
  },
  adminControllers: {
    activeProfileId: 'esp-main',
    dmxChannels: [200, 34, 211, 238, 0, 0, 1, 128],
    carZone: 'all',
    showFactoryModesInApp: true,
    profiles: [
      {
        id: 'esp-main',
        name: 'RNS Wemos D1 Mini · 374 LED',
        family: 'esp8266',
        protocol: 'websocket',
        ipAddress: '192.168.4.1',
        port: 81,
      },
      {
        id: 'led-dmx-clariss',
        name: 'LED LAMP → LED DMX · 4-Kabel BLE',
        family: 'bluetooth',
        protocol: 'ble',
        ipAddress: 'BLE',
        port: 0,
        bleFormat: 'dmx-ble',
        dmxChannelMode: '8CH',
      },
      {
        id: 'bt-ble',
        name: 'Bluetooth BLE / HC-05 / LED Strip',
        family: 'bluetooth',
        protocol: 'ble',
        ipAddress: 'BLE',
        port: 0,
        bleFormat: 'rns-json',
      },
      {
        id: 'dmx-artnet',
        name: 'DMX512 / Art-Net Bridge (All Series)',
        family: 'dmx',
        protocol: 'artnet-ws',
        ipAddress: '192.168.4.10',
        port: 6454,
        dmxUniverse: 0,
        dmxStartChannel: 1,
        dmxChannelMode: '8CH',
      },
      {
        id: 'car-module',
        name: 'CAR Module · DRL & Ambient',
        family: 'car',
        protocol: 'websocket',
        ipAddress: '192.168.4.20',
        port: 81,
        carZone: 'all',
      },
      {
        id: 'wled-pixel',
        name: 'WLED Pixel Strip Controller',
        family: 'wled',
        protocol: 'http-json',
        ipAddress: '192.168.4.30',
        port: 80,
      },
    ],
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
    devilEye: {
      enabled: true,
      color: '#EF4444',
      brightness: 85,
      effect: 'pulse',
    },
    shroudBiled: {
      enabled: true,
      color: '#22D3EE',
      brightness: 80,
      effect: 'ring',
    },
    alis: {
      enabled: true,
      color: '#F8FAFC',
      brightness: 90,
      effect: 'solid',
    },
  },
  autoLoopModes: false,
  autoLoopIntervalSec: 5,
  modulePassword: '',
  modulePasswordEnabled: false,
  moduleLocked: false,
  shakeToChange: false,
  schedule: {
    onEnabled: false,
    onTime: '18:00',
    offEnabled: false,
    offTime: '22:00',
    triggerWelcomeOnStart: true,
  },
  countdownTimer: {
    active: false,
    endsAt: 0,
    action: 'off',
  },
  scannedModules: [],
};

function ensureDefaultProfiles(
  profiles?: MultiControllerProfile[]
): MultiControllerProfile[] {
  const list = profiles?.length ? [...profiles] : [...DEFAULT_STATE.adminControllers.profiles];
  const ledDmxDefault = DEFAULT_STATE.adminControllers.profiles.find(
    (p) => p.id === 'led-dmx-clariss'
  );
  const btDefault = DEFAULT_STATE.adminControllers.profiles.find((p) => p.id === 'bt-ble');
  if (ledDmxDefault && !list.some((p) => p.id === 'led-dmx-clariss')) {
    list.splice(Math.min(1, list.length), 0, ledDmxDefault);
  }
  if (btDefault && !list.some((p) => p.id === 'bt-ble')) {
    list.splice(Math.min(2, list.length), 0, btDefault);
  }
  return list;
}

function loadInitialState(): ControllerState {
  const boot = (
    typeof window !== 'undefined'
      ? (window as unknown as { __RNS_BOOT_STATE__?: Partial<ControllerState> }).__RNS_BOOT_STATE__
      : undefined
  ) || {};

  const baseline: ControllerState = {
    ...DEFAULT_STATE,
    ...boot,
    combo: { ...DEFAULT_STATE.combo, ...(boot.combo || {}) },
    manualSideColors: {
      ...DEFAULT_STATE.manualSideColors!,
      ...(boot.manualSideColors || {}),
    },
    autoBelang: {
      ...DEFAULT_STATE.autoBelang!,
      ...(boot.autoBelang || {}),
    },
    ledMatrix: {
      ...DEFAULT_STATE.ledMatrix!,
      ...(boot.ledMatrix || {}),
    },
    savedPresets: Array.isArray(boot.savedPresets) ? boot.savedPresets : [],
    special: { ...DEFAULT_STATE.special, ...(boot.special || {}) },
    led: { ...DEFAULT_STATE.led, ...(boot.led || {}), testOverride: 'none' },
    device: {
      ...DEFAULT_STATE.device,
      ...(boot.device || {}),
      connectionStatus: 'simulation',
    },
    customization: {
      ...DEFAULT_STATE.customization,
      ...(boot.customization || {}),
      sectionOrder: boot.customization?.sectionOrder?.length
        ? boot.customization.sectionOrder
        : DEFAULT_STATE.customization.sectionOrder,
    },
    cloudMeta: {
      ...DEFAULT_STATE.cloudMeta,
      ...(boot.cloudMeta || {}),
    },
    adminControllers: {
      ...DEFAULT_STATE.adminControllers,
      ...(boot.adminControllers || {}),
      profiles: ensureDefaultProfiles(boot.adminControllers?.profiles),
      dmxChannels: boot.adminControllers?.dmxChannels?.length
        ? boot.adminControllers.dmxChannels
        : DEFAULT_STATE.adminControllers.dmxChannels,
    },
    soundReactive: {
      ...DEFAULT_STATE.soundReactive,
      ...(boot.soundReactive || {}),
      enabled: false,
    },
    frontLamp: {
      ...DEFAULT_STATE.frontLamp,
      ...(boot.frontLamp || {}),
      followRearMode: true,
      syncColorWithRear: true,
      brakeFollowRear: false,
      devilEye: {
        ...DEFAULT_STATE.frontLamp.devilEye,
        ...(boot.frontLamp?.devilEye || {}),
      },
      shroudBiled: {
        ...DEFAULT_STATE.frontLamp.shroudBiled,
        ...(boot.frontLamp?.shroudBiled || {}),
      },
      alis: {
        ...DEFAULT_STATE.frontLamp.alis,
        ...(boot.frontLamp?.alis || {}),
      },
    },
    welcomePlayingUntil: 0,
  };

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('rns_rgb_controller_v2') ||
      localStorage.getItem('rns_rgb_controller_v1');
    if (!raw) return baseline;
    const parsed = JSON.parse(raw);
    const legacyDefaultLed =
      (parsed.led?.leftCount === 181 && parsed.led?.rightCount === 181) ||
      (parsed.led?.leftCount === 215 && parsed.led?.rightCount === 215);
    const normalizeTab = (t: string): NavTab =>
      t === 'mode' ? 'rgb' : t === 'special' ? 'sinyal' : (t as NavTab);
    const rawNavOrder: NavTab[] | undefined = Array.isArray(parsed.customization?.navOrder)
      ? Array.from(new Set(parsed.customization.navOrder.map(normalizeTab)))
      : undefined;
    return {
      ...baseline,
      ...parsed,
      combo: { ...baseline.combo, ...(parsed.combo || {}) },
      manualSideColors: {
        ...baseline.manualSideColors!,
        ...(parsed.manualSideColors || {}),
      },
      autoBelang: {
        ...baseline.autoBelang!,
        ...(parsed.autoBelang || {}),
      },
      ledMatrix: {
        ...baseline.ledMatrix!,
        ...(parsed.ledMatrix || {}),
      },
      savedPresets: Array.isArray(parsed.savedPresets) ? parsed.savedPresets : baseline.savedPresets,
      special: { ...baseline.special, ...(parsed.special || {}) },
      led: {
        ...baseline.led,
        ...(parsed.led || {}),
        ...(legacyDefaultLed ? { leftCount: 187, rightCount: 187 } : {}),
        testOverride: 'none',
      },
      device: {
        ...baseline.device,
        ...(parsed.device || {}),
        connectionStatus: 'simulation',
      },
      customization: {
        ...baseline.customization,
        ...(parsed.customization || {}),
        navOrder: rawNavOrder?.length ? rawNavOrder : baseline.customization.navOrder,
        sectionOrder: parsed.customization?.sectionOrder?.length
          ? parsed.customization.sectionOrder
          : baseline.customization.sectionOrder,
        homeBlockOrder: (() => {
          const order = (parsed.customization?.homeBlockOrder || []).filter(
            (id: string): id is HomeBlockId =>
              id === 'sliders' || id === 'welcome-card' || id === 'stay-wheel'
          );
          return order.length ? order : baseline.customization.homeBlockOrder;
        })(),
      },
      cloudMeta: {
        ...baseline.cloudMeta,
        ...(parsed.cloudMeta || {}),
      },
      adminControllers: {
        ...baseline.adminControllers,
        ...(parsed.adminControllers || {}),
        profiles: ensureDefaultProfiles(parsed.adminControllers?.profiles),
        dmxChannels: parsed.adminControllers?.dmxChannels?.length
          ? parsed.adminControllers.dmxChannels
          : baseline.adminControllers.dmxChannels,
      },
      soundReactive: {
        ...baseline.soundReactive,
        ...(parsed.soundReactive || {}),
        enabled: false,
      },
      frontLamp: {
        ...baseline.frontLamp,
        ...(parsed.frontLamp || {}),
        followRearMode: true,
        syncColorWithRear: true,
        brakeFollowRear: false,
        devilEye: {
          ...baseline.frontLamp.devilEye,
          ...(parsed.frontLamp?.devilEye || {}),
        },
        shroudBiled: {
          ...baseline.frontLamp.shroudBiled,
          ...(parsed.frontLamp?.shroudBiled || {}),
        },
        alis: {
          ...baseline.frontLamp.alis,
          ...(parsed.frontLamp?.alis || {}),
        },
      },
      scannedModules: Array.isArray(parsed.scannedModules) ? parsed.scannedModules : [],
      welcomePlayingUntil: 0,
    };
  } catch {
    return baseline;
  }
}

function loadSavedRole(): UserRole | null {
  try {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    return saved === 'customer' || saved === 'admin' ? saved : null;
  } catch {
    return null;
  }
}

const ALL_NAV_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  customerOnly?: boolean;
}[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'rgb', label: 'RGB', icon: Palette },
  { id: 'belang', label: 'Belang', icon: Layers },
  { id: 'matrix', label: 'Matrix', icon: Grid },
  { id: 'white', label: 'White Full', icon: Sun },
  { id: 'sinyal', label: 'Sinyal', icon: Sparkles },
  { id: 'music', label: 'Musik', icon: Music },
  { id: 'schedule', label: 'Jadwal', icon: Clock },
  { id: 'connect', label: 'Koneksi', icon: Wifi, customerOnly: true },
  { id: 'led', label: 'LED', icon: Sliders },
  { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
];

export default function App() {
  const [role, setRole] = useState<UserRole | null>(loadSavedRole);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [state, setState] = useState<ControllerState>(loadInitialState);
  const [connectionNote, setConnectionNote] = useState<string | null>(null);
  const [otaNotice, setOtaNotice] = useState<string | null>(null);
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<'zip' | 'html' | null>(null);
  const [hubStatus, setHubStatus] = useState<{ connected: boolean; message: string | null }>({
    connected: false,
    message: null,
  });
  const [bleSession, setBleSession] = useState<BleSessionInfo>(getBleSessionInfo);
  const [scanningModes, setScanningModes] = useState(false);
  const [ledResetFlash, setLedResetFlash] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hubWsRef = useRef<WebSocket | null>(null);
  const lastScheduleFiredRef = useRef<string>('');
  const lastShakeMsRef = useRef<number>(0);
  const latestStateRef = useRef<ControllerState>(state);
  latestStateRef.current = state;
  const pendingHardwareSyncRef = useRef<{ needed: boolean; resetLed: boolean }>({
    needed: false,
    resetLed: false,
  });
  const hardwareThrottleTimerRef = useRef<number | null>(null);
  const lastHardwareSyncMsRef = useRef<number>(0);
  const { isInstalled } = usePWAInstall();

  const rnsAndCustomModes = useMemo<RgbMode[]>(() => {
    const base = RGB_MODES.map((m) => {
      const override = state.customization.modeOverrides[m.id];
      return override ? { ...m, ...override } : m;
    });
    return [...base, ...state.customization.customModes];
  }, [state.customization.modeOverrides, state.customization.customModes]);

  const moduleModes = useMemo<RgbMode[]>(
    () => buildModuleFactoryModes(state.adminControllers.profiles),
    [state.adminControllers.profiles]
  );

  const allModes = useMemo<RgbMode[]>(() => {
    return state.adminControllers.showFactoryModesInApp !== false
      ? [...rnsAndCustomModes, ...moduleModes]
      : rnsAndCustomModes;
  }, [rnsAndCustomModes, moduleModes, state.adminControllers.showFactoryModesInApp]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage quota errors
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flushState = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestStateRef.current));
      } catch {
        // Ignore storage quota errors
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushState();
    };
    window.addEventListener('pagehide', flushState);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flushState);
      document.removeEventListener('visibilitychange', onVisibility);
      flushState();
      if (hardwareThrottleTimerRef.current !== null) {
        window.clearTimeout(hardwareThrottleTimerRef.current);
        hardwareThrottleTimerRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      try {
        hubWsRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  // Verify Firestore connection on startup and subscribe to Admin remote OTA updates
  useEffect(() => {
    testConnection();
    const unsub = subscribeToLatestRelease((remote) => {
      if (!remote) return;
      setState((prev) => {
        if (remote.version <= (prev.cloudMeta?.version || 0)) {
          return prev;
        }
        setOtaNotice(
          `Update aplikasi ${remote.versionLabel} diterapkan${
            remote.releaseNotes ? `: ${remote.releaseNotes}` : ''
          }`
        );
        return {
          ...prev,
          customization: {
            ...prev.customization,
            ...remote.customization,
          },
          cloudMeta: {
            version: remote.version,
            versionLabel: remote.versionLabel,
            releaseNotes: remote.releaseNotes,
          },
        };
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!otaNotice) return;
    const t = window.setTimeout(() => setOtaNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [otaNotice]);

  useEffect(() => {
    if (state.welcomePlayingUntil <= Date.now()) return;
    const remaining = state.welcomePlayingUntil - Date.now();
    const timer = window.setTimeout(() => {
      setState((prev) => ({ ...prev, welcomePlayingUntil: 0 }));
    }, remaining + 30);
    return () => window.clearTimeout(timer);
  }, [state.welcomePlayingUntil]);

  useEffect(() => {
    if (allModes.length > 0 && !allModes.some((m) => m.id === state.activeModeId)) {
      setState((prev) => ({ ...prev, activeModeId: allModes[0].id }));
    }
  }, [allModes, state.activeModeId]);

  const handleLogin = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setActiveTab('home');
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, selectedRole);
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    return () => {
      stopMicrophoneCapture();
    };
  }, []);

  const handleLogout = () => {
    stopMicrophoneCapture();
    setMicActive(false);
    setRole(null);
    setActiveTab('home');
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const parseDiscoveredModes = useCallback(
    (raw: unknown, family: ControllerFamily): DiscoveredModuleMode[] => {
      const toItem = (entry: unknown, idx: number): DiscoveredModuleMode | null => {
        if (typeof entry === 'string') {
          const clean = entry.trim();
          if (!clean || clean === '-' || clean.toUpperCase() === 'RSVD') return null;
          return {
            nativeId: idx,
            name: family === 'wled' ? `WLED · ${clean}` : clean,
            codeLabel:
              family === 'wled'
                ? `FX-${String(idx).padStart(3, '0')}`
                : `${family.toUpperCase().slice(0, 3)}-${String(idx + 1).padStart(2, '0')}`,
          };
        }
        if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          const name = String(obj.name || obj.label || `Mode ${idx + 1}`).trim();
          const nativeId =
            typeof obj.nativeId === 'number'
              ? obj.nativeId
              : typeof obj.id === 'number'
                ? obj.id
                : idx + 1;
          return {
            nativeId,
            name,
            codeLabel: typeof obj.codeLabel === 'string' ? obj.codeLabel : undefined,
          };
        }
        return null;
      };

      let list: unknown[] = [];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.effects)) list = obj.effects;
        else if (Array.isArray(obj.modes)) list = obj.modes;
      }

      return list
        .map((item, idx) => toItem(item, idx))
        .filter((x): x is DiscoveredModuleMode => x !== null)
        .slice(0, 160);
    },
    []
  );

  const buildHubPayload = useCallback(
    (
      nextState: ControllerState,
      profile: MultiControllerProfile,
      activeModeOverride?: RgbMode,
      extra?: { resetLed?: boolean }
    ) => {
      const selectedMode =
        activeModeOverride ||
        allModes.find((m) => m.id === nextState.activeModeId) ||
        moduleModes.find((m) => m.id === nextState.activeModeId);

      const isPowerOn = nextState.powerOn !== false;
      const hex = nextState.solidStayActive
        ? nextState.solidColor
        : selectedMode?.primaryColor || '#22D3EE';
      const num = parseInt(hex.replace('#', ''), 16) || 0x22d3ee;
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;

      if (profile.family === 'dmx' || profile.protocol === 'artnet-ws') {
        return {
          type: 'dmx512',
          power: isPowerOn,
          resetLed: Boolean(extra?.resetLed),
          universe: profile.dmxUniverse ?? 0,
          startChannel: profile.dmxStartChannel ?? 1,
          channelMode: profile.dmxChannelMode ?? '8CH',
          channels: isPowerOn
            ? nextState.adminControllers.dmxChannels
            : [0, 0, 0, 0, 0, 0, 0, 0],
          brightness: isPowerOn ? nextState.brightness : 0,
          speed: nextState.speed,
          mode: selectedMode?.moduleMeta ? selectedMode.moduleMeta.nativeId : nextState.activeModeId,
          factoryCode: selectedMode?.moduleMeta?.codeLabel,
        };
      }

      if (profile.family === 'wled' || profile.protocol === 'http-json') {
        const fx =
          selectedMode?.moduleMeta?.family === 'wled'
            ? selectedMode.moduleMeta.nativeId
            : selectedMode?.moduleMeta
              ? selectedMode.moduleMeta.nativeId % 118
              : nextState.activeModeId % 118;
        return {
          on: isPowerOn && nextState.brightness > 0,
          bri: Math.round((nextState.brightness / 100) * 255),
          seg: [
            {
              col: [[r, g, b]],
              sx: Math.round((nextState.speed / 100) * 255),
              fx,
            },
          ],
        };
      }

      return {
        targetFamily: profile.family,
        power: isPowerOn,
        resetLed: Boolean(extra?.resetLed),
        carZone: nextState.adminControllers.carZone,
        mode: selectedMode?.moduleMeta ? selectedMode.moduleMeta.nativeId : nextState.activeModeId,
        factoryCode: selectedMode?.moduleMeta?.codeLabel,
        speed: nextState.speed,
        brightness: nextState.brightness,
        sein: nextState.sein,
        seinPattern: nextState.special.seinPattern,
        seinSpeed: nextState.special.seinSpeed,
        brake: nextState.brakeActive,
        reverse: Boolean(nextState.reverseActive),
        combo: nextState.combinationEnabled,
        comboLeft: nextState.combo.leftModes,
        comboRight: nextState.combo.rightModes,
        comboStyle: nextState.combo.style,
        comboPriority: nextState.combo.priorityMode || 'blend',
        comboSyncPanels: Boolean(nextState.combo.syncPanels),
        manualSideColors: nextState.manualSideColors,
        autoBelang: nextState.autoBelang,
        ledMatrix: nextState.ledMatrix,
        solidStay: nextState.solidStayActive,
        solidColor: nextState.solidColor,
        swapPanels: Boolean(nextState.led.swapPanels),
        welcome: nextState.welcomePlayingUntil > Date.now(),
        welcomeColor: nextState.special.welcomeColor,
        welcomeStyle: nextState.special.welcomeStyle,
        soundMode: nextState.soundReactive.enabled,
        soundStyle: nextState.soundReactive.style,
        soundSensitivity: nextState.soundReactive.sensitivity,
        front: {
          enabled: nextState.frontLamp.enabled,
          syncColor: nextState.frontLamp.syncColorWithRear,
          syncSein: nextState.frontLamp.syncSeinWithRear,
          brakeFollowRear: false,
          devilEye: nextState.frontLamp.devilEye,
          shroudBiled: nextState.frontLamp.shroudBiled,
          alis: nextState.frontLamp.alis,
        },
      };
    },
    [allModes, moduleModes]
  );

  const syncHardware = useCallback(
    (nextState: ControllerState, extra?: { resetLed?: boolean }) => {
      const selectedMode =
        allModes.find((m) => m.id === nextState.activeModeId) ||
        moduleModes.find((m) => m.id === nextState.activeModeId);

      const espSafeModeId = selectedMode?.moduleMeta
        ? ((selectedMode.moduleMeta.nativeId - 1) % 400 + 400) % 400 + 1
        : nextState.activeModeId;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              power: nextState.powerOn !== false,
              resetLed: Boolean(extra?.resetLed),
              mode: espSafeModeId,
              factoryCode: selectedMode?.moduleMeta?.codeLabel,
              speed: nextState.speed,
              brightness: nextState.brightness,
              sein: nextState.sein,
              seinPattern: nextState.special.seinPattern,
              seinSpeed: nextState.special.seinSpeed,
              brake: nextState.brakeActive,
              reverse: Boolean(nextState.reverseActive),
              combo: nextState.combinationEnabled,
              comboLeft: nextState.combo.leftModes,
              comboRight: nextState.combo.rightModes,
              comboStyle: nextState.combo.style,
              comboPriority: nextState.combo.priorityMode || 'blend',
              comboSyncPanels: Boolean(nextState.combo.syncPanels),
              manualSideColors: nextState.manualSideColors,
              autoBelang: nextState.autoBelang,
              ledMatrix: nextState.ledMatrix,
              solidStay: nextState.solidStayActive,
              solidColor: nextState.solidColor,
              ledLeft: nextState.led.leftCount,
              ledRight: nextState.led.rightCount,
              swapPanels: Boolean(nextState.led.swapPanels),
              welcome: nextState.welcomePlayingUntil > Date.now(),
              welcomeColor: nextState.special.welcomeColor,
              welcomeStyle: nextState.special.welcomeStyle,
              soundMode: nextState.soundReactive.enabled,
              soundStyle: nextState.soundReactive.style,
              soundSensitivity: nextState.soundReactive.sensitivity,
              front: {
                enabled: nextState.frontLamp.enabled,
                syncColor: nextState.frontLamp.syncColorWithRear,
                syncSein: nextState.frontLamp.syncSeinWithRear,
                brakeFollowRear: false,
                devilEye: nextState.frontLamp.devilEye,
                shroudBiled: nextState.frontLamp.shroudBiled,
                alis: nextState.frontLamp.alis,
              },
            })
          );
        } catch {
          // Ignore transient socket send failures
        }
      }

      const activeProf =
        nextState.adminControllers.profiles.find(
          (p) => p.id === nextState.adminControllers.activeProfileId
        ) || nextState.adminControllers.profiles[0];

      if (hubWsRef.current && hubWsRef.current.readyState === WebSocket.OPEN && activeProf) {
        try {
          hubWsRef.current.send(
            JSON.stringify(buildHubPayload(nextState, activeProf, selectedMode, extra))
          );
        } catch {
          // Ignore transient hub socket error
        }
      }

      if (activeProf?.protocol === 'http-json' && hubStatus.connected) {
        const endpoint =
          activeProf.family === 'wled'
            ? `http://${activeProf.ipAddress}:${activeProf.port}/json/state`
            : `http://${activeProf.ipAddress}:${activeProf.port}/api/control`;
        void fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildHubPayload(nextState, activeProf, selectedMode, extra)),
        }).catch(() => {
          // Ignore unreachable local HTTP during preview
        });
      }

      if (getBleSessionInfo().connected) {
        const activeColorHex = nextState.solidStayActive
          ? nextState.solidColor
          : selectedMode?.primaryColor || '#22D3EE';
        const bleProf =
          activeProf && (activeProf.family === 'bluetooth' || activeProf.protocol === 'ble')
            ? activeProf
            : nextState.adminControllers.profiles.find(
                (p) => p.family === 'bluetooth' || p.protocol === 'ble'
              );
        const bleFormat = bleProf?.bleFormat || 'rns-json';
        void sendStateOverBluetooth(
          bleFormat,
          nextState,
          activeColorHex,
          {
            universe: bleProf?.dmxUniverse ?? 0,
            startChannel: bleProf?.dmxStartChannel ?? 1,
            channels: nextState.adminControllers.dmxChannels,
          },
          selectedMode,
          extra
        )
          .then(() => setBleSession(getBleSessionInfo()))
          .catch(() => setBleSession(getBleSessionInfo()));
      }
    },
    [allModes, moduleModes, buildHubPayload, hubStatus.connected]
  );

  useEffect(() => {
    if (!pendingHardwareSyncRef.current.needed) return;
    const resetLed = pendingHardwareSyncRef.current.resetLed;
    pendingHardwareSyncRef.current = { needed: false, resetLed: false };

    const now = performance.now();
    const elapsed = now - lastHardwareSyncMsRef.current;

    if (resetLed || elapsed >= 45) {
      if (hardwareThrottleTimerRef.current !== null) {
        window.clearTimeout(hardwareThrottleTimerRef.current);
        hardwareThrottleTimerRef.current = null;
      }
      lastHardwareSyncMsRef.current = now;
      syncHardware(state, resetLed ? { resetLed: true } : undefined);
      return;
    }

    if (hardwareThrottleTimerRef.current !== null) {
      window.clearTimeout(hardwareThrottleTimerRef.current);
    }
    hardwareThrottleTimerRef.current = window.setTimeout(() => {
      hardwareThrottleTimerRef.current = null;
      lastHardwareSyncMsRef.current = performance.now();
      syncHardware(latestStateRef.current);
    }, Math.max(10, 45 - elapsed));
  }, [state, syncHardware]);

  const updateState = useCallback(
    (updater: (prev: ControllerState) => ControllerState) => {
      pendingHardwareSyncRef.current.needed = true;
      setState(updater);
    },
    []
  );

  const handleToggleLedPower = () => {
    updateState((prev) => ({
      ...prev,
      powerOn: prev.powerOn === false ? true : false,
    }));
  };

  const handleResetLed = () => {
    stopMicrophoneCapture();
    setMicActive(false);
    setMicError(null);
    pendingHardwareSyncRef.current = { needed: true, resetLed: true };
    setState((prev) => ({
      ...prev,
      powerOn: true,
      activeModeId: 1,
      speed: 50,
      brightness: 75,
      sein: 'off',
      brakeActive: false,
      reverseActive: false,
      combinationEnabled: false,
      solidStayActive: false,
      welcomePlayingUntil: 0,
      soundReactive: {
        ...prev.soundReactive,
        enabled: false,
      },
      led: {
        ...prev.led,
        testOverride: 'none',
      },
    }));
    setLedResetFlash(true);
    window.setTimeout(() => setLedResetFlash(false), 1400);
  };

  const handleSelectAnimatedMode = (id: number) => {
    const chosenMode =
      allModes.find((m) => m.id === id) || moduleModes.find((m) => m.id === id);

    updateState((prev) => {
      const nextAdmin = { ...prev.adminControllers };
      if (chosenMode?.moduleMeta?.dmxPreset) {
        nextAdmin.dmxChannels = [...chosenMode.moduleMeta.dmxPreset];
      }
      if (
        chosenMode?.moduleMeta?.profileId &&
        prev.adminControllers.profiles.some((p) => p.id === chosenMode.moduleMeta?.profileId)
      ) {
        nextAdmin.activeProfileId = chosenMode.moduleMeta.profileId;
      }
      return {
        ...prev,
        activeModeId: id,
        solidStayActive: false,
        combinationEnabled: false,
        autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
        ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
        adminControllers: nextAdmin,
      };
    });
  };

  const handleTriggerWelcome = () => {
    const now = Date.now();
    updateState((prev) => {
      const isPlaying = prev.welcomePlayingUntil > now;
      if (isPlaying) {
        return {
          ...prev,
          welcomePlayingUntil: 0,
        };
      }
      return {
        ...prev,
        powerOn: true,
        welcomePlayingUntil: now + 3000,
        brakeActive: false,
        reverseActive: false,
        sein: 'off',
        led: { ...prev.led, testOverride: 'none' },
      };
    });
  };

  const handleCycleSein = () => {
    const order: SeinState[] = ['off', 'left', 'right', 'hazard'];
    updateState((prev) => {
      const nextIdx = (order.indexOf(prev.sein) + 1) % order.length;
      return { ...prev, sein: order[nextIdx] };
    });
  };

  const handleToggleBrake = () => {
    updateState((prev) => ({ ...prev, brakeActive: !prev.brakeActive }));
  };

  const handleToggleReverse = () => {
    updateState((prev) => ({ ...prev, reverseActive: !prev.reverseActive }));
  };

  const handleStepMode = useCallback(
    (delta: -1 | 1) => {
      if (allModes.length === 0) return;
      updateState((prev) => {
        const currIdx = allModes.findIndex((m) => m.id === prev.activeModeId);
        const safeIdx = currIdx >= 0 ? currIdx : 0;
        const nextIdx = (safeIdx + delta + allModes.length) % allModes.length;
        const target = allModes[nextIdx];
        const nextAdmin = { ...prev.adminControllers };
        if (target?.moduleMeta?.dmxPreset) {
          nextAdmin.dmxChannels = [...target.moduleMeta.dmxPreset];
        }
        return {
          ...prev,
          activeModeId: target.id,
          solidStayActive: false,
          combinationEnabled: false,
          autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
          ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
          adminControllers: nextAdmin,
        };
      });
    },
    [allModes, updateState]
  );

  const handleToggleAutoLoop = () => {
    setState((prev) => ({ ...prev, autoLoopModes: !prev.autoLoopModes }));
  };

  const handleChangeAutoLoopInterval = (sec: number) => {
    setState((prev) => ({ ...prev, autoLoopIntervalSec: Math.max(2, Math.min(60, sec)) }));
  };

  const handleStartCountdown = (minutes: number, action: CountdownTimerConfig['action']) => {
    setState((prev) => ({
      ...prev,
      countdownTimer: {
        active: true,
        endsAt: Date.now() + minutes * 60 * 1000,
        action,
      },
    }));
  };

  const handleCancelCountdown = () => {
    setState((prev) => ({
      ...prev,
      countdownTimer: { active: false, endsAt: 0, action: prev.countdownTimer?.action || 'off' },
    }));
  };

  const handleUpdateSchedule = (patch: Partial<ScheduleConfig>) => {
    setState((prev) => ({
      ...prev,
      schedule: {
        onEnabled: false,
        onTime: '18:00',
        offEnabled: false,
        offTime: '22:00',
        triggerWelcomeOnStart: true,
        ...(prev.schedule || {}),
        ...patch,
      },
    }));
  };

  const handleToggleShake = () => {
    setState((prev) => ({ ...prev, shakeToChange: !prev.shakeToChange }));
  };

  const handleSaveModulePassword = (password: string, enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      modulePassword: password,
      modulePasswordEnabled: enabled,
      moduleLocked: enabled ? prev.moduleLocked : false,
    }));
    void sendBlePasswordCommand(password, enabled ? 'set' : 'disable').catch(() => {});
  };

  const handleToggleModuleLock = (locked: boolean, pinAttempt?: string): boolean => {
    if (!locked && state.modulePasswordEnabled && state.modulePassword) {
      if ((pinAttempt || '').trim() !== state.modulePassword) {
        return false;
      }
    }
    updateState((prev) => ({ ...prev, moduleLocked: locked }));
    void sendBlePasswordCommand(
      state.modulePassword || pinAttempt || '',
      locked ? 'lock' : 'unlock'
    ).catch(() => {});
    return true;
  };

  const handleToggleCombination = () => {
    updateState((prev) => ({
      ...prev,
      combinationEnabled: !prev.combinationEnabled,
      solidStayActive: false,
      autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
      ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
    }));
  };

  const handleUpdateCombo = (nextCombo: ComboConfig) => {
    updateState((prev) => ({
      ...prev,
      combo: nextCombo,
      combinationEnabled: true,
      solidStayActive: false,
      autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
      ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
    }));
  };

  const handleAddModeToCombo = (modeId: number) => {
    updateState((prev) => {
      const nextLeft = [...prev.combo.leftModes, modeId];
      const nextRight = [...prev.combo.rightModes, modeId];
      return {
        ...prev,
        combinationEnabled: true,
        solidStayActive: false,
        autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
        ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
        combo: {
          ...prev.combo,
          style: prev.combo.style === 'sequence' ? 'sequence' : 'layer-blend',
          leftModes: nextLeft,
          rightModes: nextRight,
        },
      };
    });
    setActiveTab('belang');
  };

  const handleUpdateManualSideColors = (nextColors: ManualSideColorConfig) => {
    updateState((prev) => ({
      ...prev,
      manualSideColors: nextColors,
    }));
  };

  const handleApplyManualTintColor = (hex: string) => {
    const clean = hex.toUpperCase();
    updateState((prev) => {
      const current = prev.manualSideColors || DEFAULT_STATE.manualSideColors!;
      return {
        ...prev,
        solidStayActive: false,
        manualSideColors: {
          ...current,
          enabled: true,
          syncSides: true,
          leftColors: [clean],
          rightColors: [clean],
        },
      };
    });
  };

  const handleToggleManualTint = () => {
    updateState((prev) => {
      const current = prev.manualSideColors || DEFAULT_STATE.manualSideColors!;
      return {
        ...prev,
        manualSideColors: {
          ...current,
          enabled: !current.enabled,
        },
      };
    });
  };

  const handleUpdateAutoBelang = (nextAuto: AutoBelangConfig) => {
    updateState((prev) => ({
      ...prev,
      autoBelang: nextAuto,
      ...(nextAuto.enabled
        ? {
            solidStayActive: false,
            combinationEnabled: false,
            ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
          }
        : {}),
    }));
  };

  const handleUpdateLedMatrix = (nextMatrix: LedMatrixConfig) => {
    updateState((prev) => ({
      ...prev,
      ledMatrix: nextMatrix,
      ...(nextMatrix.enabled
        ? {
            solidStayActive: false,
            combinationEnabled: false,
            autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
          }
        : {}),
    }));
  };

  const handleAddMatrixModel = (input: Omit<MatrixModelItem, 'id' | 'isCustom'>) => {
    const newModel: MatrixModelItem = {
      ...input,
      id: `mx-cust-${Date.now().toString(36)}`,
      isCustom: true,
    };
    setState((prev) => {
      const currentMatrix = prev.ledMatrix || DEFAULT_STATE.ledMatrix!;
      return {
        ...prev,
        ledMatrix: {
          ...currentMatrix,
          enabled: true,
          activeModelId: newModel.id,
          category: newModel.category,
          customModels: [...(currentMatrix.customModels || []), newModel],
        },
        customization: {
          ...prev.customization,
          customMatrixModels: [...(prev.customization.customMatrixModels || []), newModel],
        },
      };
    });
  };

  const handleSavePreset = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState((prev) => {
      const preset: RnsPreset = {
        id: `preset-${Date.now().toString(36)}`,
        name: clean,
        activeModeId: prev.activeModeId,
        speed: prev.speed,
        brightness: prev.brightness,
        combinationEnabled: prev.combinationEnabled,
        combo: {
          ...prev.combo,
          leftModes: [...prev.combo.leftModes],
          rightModes: [...prev.combo.rightModes],
        },
        manualSideColors: {
          ...(prev.manualSideColors || DEFAULT_STATE.manualSideColors!),
          leftColors: [...(prev.manualSideColors?.leftColors || ['#EF4444'])],
          rightColors: [...(prev.manualSideColors?.rightColors || ['#3B82F6'])],
        },
        autoBelang: {
          ...(prev.autoBelang || DEFAULT_STATE.autoBelang!),
          colors: [...(prev.autoBelang?.colors || ['#EF4444', '#22D3EE'])],
        },
        solidStayActive: prev.solidStayActive,
        solidColor: prev.solidColor,
        ledMatrixEnabled: Boolean(prev.ledMatrix?.enabled),
        createdAt: Date.now(),
      };
      return {
        ...prev,
        savedPresets: [preset, ...(prev.savedPresets || [])],
      };
    });
  };

  const handleLoadPreset = (preset: RnsPreset) => {
    updateState((prev) => ({
      ...prev,
      activeModeId: preset.activeModeId,
      speed: preset.speed,
      brightness: preset.brightness,
      combinationEnabled: preset.combinationEnabled,
      combo: {
        ...preset.combo,
        leftModes: [...preset.combo.leftModes],
        rightModes: [...preset.combo.rightModes],
      },
      manualSideColors: {
        ...preset.manualSideColors,
        leftColors: [...preset.manualSideColors.leftColors],
        rightColors: [...preset.manualSideColors.rightColors],
      },
      autoBelang: {
        ...preset.autoBelang,
        colors: [...preset.autoBelang.colors],
      },
      solidStayActive: preset.solidStayActive,
      solidColor: preset.solidColor,
      ledMatrix: prev.ledMatrix
        ? { ...prev.ledMatrix, enabled: Boolean(preset.ledMatrixEnabled) }
        : prev.ledMatrix,
    }));
  };

  const handleDuplicatePreset = (preset: RnsPreset) => {
    setState((prev) => {
      const copy: RnsPreset = {
        ...preset,
        id: `preset-${Date.now().toString(36)}`,
        name: `${preset.name} (Salinan)`,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        savedPresets: [copy, ...(prev.savedPresets || [])],
      };
    });
  };

  const handleRenamePreset = (id: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setState((prev) => ({
      ...prev,
      savedPresets: (prev.savedPresets || []).map((p) =>
        p.id === id ? { ...p, name: clean } : p
      ),
    }));
  };

  const handleDeletePreset = (id: string) => {
    setState((prev) => ({
      ...prev,
      savedPresets: (prev.savedPresets || []).filter((p) => p.id !== id),
    }));
  };

  const handleChangeSolidColor = (hex: string) => {
    updateState((prev) => ({
      ...prev,
      solidColor: hex,
      solidStayActive: true,
      combinationEnabled: false,
      autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
      ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
    }));
  };

  const handleToggleSolidStay = () => {
    updateState((prev) => ({
      ...prev,
      solidStayActive: !prev.solidStayActive,
      combinationEnabled: false,
      autoBelang: prev.autoBelang ? { ...prev.autoBelang, enabled: false } : prev.autoBelang,
      ledMatrix: prev.ledMatrix ? { ...prev.ledMatrix, enabled: false } : prev.ledMatrix,
    }));
  };

  const handleToggleFavorite = (modeId: number) => {
    updateState((prev) => {
      const exists = prev.favorites.includes(modeId);
      return {
        ...prev,
        favorites: exists
          ? prev.favorites.filter((id) => id !== modeId)
          : [...prev.favorites, modeId],
      };
    });
  };

  const handleUpdateSpecial = <K extends keyof SpecialSettings>(
    key: K,
    value: SpecialSettings[K]
  ) => {
    updateState((prev) => ({
      ...prev,
      special: { ...prev.special, [key]: value },
    }));
  };

  const handleUpdateLed = <K extends keyof LedConfig>(key: K, value: LedConfig[K]) => {
    updateState((prev) => ({
      ...prev,
      led: { ...prev.led, [key]: value },
    }));
  };

  // ---------------- MODE SUARA (REAKTIF MUSIK / MIC) ----------------
  const handleToggleSoundMode = async () => {
    const nextEnabled = !state.soundReactive.enabled;
    if (nextEnabled) {
      updateState((prev) => ({
        ...prev,
        powerOn: true,
        soundReactive: { ...prev.soundReactive, enabled: true },
      }));
      const res = await startMicrophoneCapture();
      setMicActive(res.ok || isMicrophoneActive());
      setMicError(res.ok ? null : res.error || getMicrophoneError());
    } else {
      stopMicrophoneCapture();
      setMicActive(false);
      setMicError(null);
      updateState((prev) => ({
        ...prev,
        soundReactive: { ...prev.soundReactive, enabled: false },
      }));
    }
  };

  const handleEnableSoundForPlayer = () => {
    updateState((prev) => ({
      ...prev,
      powerOn: true,
      soundReactive: { ...prev.soundReactive, enabled: true },
    }));
  };

  const handleChangeSoundSensitivity = (val: number) => {
    updateState((prev) => ({
      ...prev,
      soundReactive: {
        ...prev.soundReactive,
        sensitivity: Math.max(10, Math.min(100, val)),
      },
    }));
  };

  const handleChangeSoundStyle = (style: SoundStyle) => {
    updateState((prev) => ({
      ...prev,
      powerOn: true,
      soundReactive: { ...prev.soundReactive, enabled: true, style },
    }));
  };

  // Auto-Loop Mode++ Effect
  useEffect(() => {
    if (!state.autoLoopModes || state.powerOn === false || state.solidStayActive || state.combinationEnabled) {
      return;
    }
    const sec = Math.max(2, state.autoLoopIntervalSec || 5);
    const id = window.setInterval(() => {
      handleStepMode(1);
    }, sec * 1000);
    return () => window.clearInterval(id);
  }, [
    state.autoLoopModes,
    state.autoLoopIntervalSec,
    state.powerOn,
    state.solidStayActive,
    state.combinationEnabled,
    handleStepMode,
  ]);

  // Countdown Timer & Daily Schedule Effect
  useEffect(() => {
    const timerActive = Boolean(state.countdownTimer?.active);
    const schedOn = Boolean(state.schedule?.onEnabled);
    const schedOff = Boolean(state.schedule?.offEnabled);
    if (!timerActive && !schedOn && !schedOff) return;

    const id = window.setInterval(() => {
      const now = Date.now();
      if (state.countdownTimer?.active && now >= state.countdownTimer.endsAt) {
        const action = state.countdownTimer.action;
        updateState((prev) => ({
          ...prev,
          powerOn: action === 'off' ? false : true,
          welcomePlayingUntil: action === 'welcome' ? now + 3000 : prev.welcomePlayingUntil,
          countdownTimer: { active: false, endsAt: 0, action },
        }));
      }

      if (schedOn || schedOff) {
        const d = new Date();
        const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        if (lastScheduleFiredRef.current !== hhmm) {
          if (schedOn && state.schedule?.onTime === hhmm) {
            lastScheduleFiredRef.current = hhmm;
            updateState((prev) => ({
              ...prev,
              powerOn: true,
              welcomePlayingUntil: prev.schedule?.triggerWelcomeOnStart ? now + 3000 : prev.welcomePlayingUntil,
            }));
          } else if (schedOff && state.schedule?.offTime === hhmm) {
            lastScheduleFiredRef.current = hhmm;
            updateState((prev) => ({ ...prev, powerOn: false }));
          }
        }
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [state.countdownTimer, state.schedule, updateState]);

  // Shake-to-Change Mode Effect (LEDLamp Shake Feature)
  useEffect(() => {
    if (!state.shakeToChange) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const total = Math.hypot(acc.x || 0, acc.y || 0, acc.z || 0);
      if (total > 23) {
        const now = Date.now();
        if (now - lastShakeMsRef.current > 1200) {
          lastShakeMsRef.current = now;
          handleStepMode(1);
        }
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [state.shakeToChange, handleStepMode]);

  useEffect(() => {
    if (!state.soundReactive.enabled || state.powerOn === false) return;
    const timer = window.setInterval(() => {
      const frame = getLiveAudioFrame(state.soundReactive.sensitivity, performance.now());
      const packet = JSON.stringify({
        soundMode: true,
        soundLevel: Math.round(frame.level * 255),
        soundBass: Math.round(frame.bass * 255),
        soundStyle: state.soundReactive.style,
      });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(packet);
        } catch {
          // Ignore transient stream send error
        }
      }
      if (hubWsRef.current && hubWsRef.current.readyState === WebSocket.OPEN) {
        try {
          hubWsRef.current.send(packet);
        } catch {
          // Ignore transient hub stream send error
        }
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [
    state.soundReactive.enabled,
    state.soundReactive.sensitivity,
    state.soundReactive.style,
    state.powerOn,
  ]);


  const handleUpdateDevice = <K extends keyof DeviceConfig>(
    key: K,
    value: DeviceConfig[K]
  ) => {
    setState((prev) => ({
      ...prev,
      device: { ...prev.device, [key]: value },
    }));
  };

  const handleUpdateCustomization = <K extends keyof AppCustomization>(
    key: K,
    value: AppCustomization[K]
  ) => {
    setState((prev) => ({
      ...prev,
      customization: { ...prev.customization, [key]: value },
    }));
  };

  const handleResetCustomization = () => {
    setState((prev) => ({
      ...prev,
      customization: {
        ...DEFAULT_STATE.customization,
        customModes: prev.customization.customModes,
        modeOverrides: prev.customization.modeOverrides,
      },
    }));
  };

  const handleAddCustomMode = (input: Omit<RgbMode, 'id' | 'code' | 'isCustom'>) => {
    setState((prev) => {
      const maxId = Math.max(
        RGB_MODES.length,
        ...prev.customization.customModes.map((m) => m.id)
      );
      const nextId = maxId + 1;
      const newMode: RgbMode = {
        ...input,
        id: nextId,
        code: `Mode ${String(nextId).padStart(3, '0')}`,
        isCustom: true,
      };
      return {
        ...prev,
        activeModeId: nextId,
        solidStayActive: false,
        combinationEnabled: false,
        customization: {
          ...prev.customization,
          customModes: [...prev.customization.customModes, newMode],
        },
      };
    });
  };

  const handleUpdateExistingMode = (id: number, patch: Partial<RgbMode>) => {
    setState((prev) => {
      const isCustom = prev.customization.customModes.some((m) => m.id === id);
      if (isCustom) {
        return {
          ...prev,
          customization: {
            ...prev.customization,
            customModes: prev.customization.customModes.map((m) =>
              m.id === id ? { ...m, ...patch } : m
            ),
          },
        };
      }
      return {
        ...prev,
        customization: {
          ...prev.customization,
          modeOverrides: {
            ...prev.customization.modeOverrides,
            [id]: { ...(prev.customization.modeOverrides[id] || {}), ...patch },
          },
        },
      };
    });
  };

  const handleDeleteCustomMode = (id: number) => {
    setState((prev) => ({
      ...prev,
      activeModeId: prev.activeModeId === id ? 1 : prev.activeModeId,
      customization: {
        ...prev.customization,
        customModes: prev.customization.customModes.filter((m) => m.id !== id),
      },
    }));
  };

  const handleConnectToggle = (overrideTarget?: { ipAddress?: string; port?: number }) => {
    const currentDevice = latestStateRef.current.device;
    if (currentDevice.connectionStatus === 'connected' && !overrideTarget) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnectionNote(null);
      handleUpdateDevice('connectionStatus', 'simulation');
      return;
    }

    const targetIp = overrideTarget?.ipAddress || currentDevice.ipAddress;
    const targetPort = overrideTarget?.port || currentDevice.port;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setConnectionNote(null);
    handleUpdateDevice('connectionStatus', 'connecting');

    try {
      const wsUrl = `ws://${targetIp}:${targetPort}/ws`;
      const socket = new WebSocket(wsUrl);
      const timeout = window.setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          handleUpdateDevice('connectionStatus', 'simulation');
          setConnectionNote(
            `Perangkat di ${targetIp}:${targetPort} tidak terjangkau.`
          );
        }
      }, 2500);

      socket.onopen = () => {
        window.clearTimeout(timeout);
        wsRef.current = socket;
        handleUpdateDevice('connectionStatus', 'connected');
        setConnectionNote(null);
      };

      socket.onerror = () => {
        window.clearTimeout(timeout);
        socket.close();
        handleUpdateDevice('connectionStatus', 'simulation');
        setConnectionNote(
          `ESP8266 belum terdeteksi di jaringan lokal (${targetIp}).`
        );
      };

      socket.onclose = () => {
        window.clearTimeout(timeout);
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        setState((prev) =>
          prev.device.connectionStatus === 'connected'
            ? { ...prev, device: { ...prev.device, connectionStatus: 'simulation' } }
            : prev
        );
      };
    } catch {
      handleUpdateDevice('connectionStatus', 'simulation');
      setConnectionNote(
        'Koneksi WebSocket lokal diblokir browser. Akses via jaringan lokal ESP8266.'
      );
    }
  };

  const handleResetDefaults = () => {
    stopMicrophoneCapture();
    setMicActive(false);
    setMicError(null);
    wsRef.current?.close();
    wsRef.current = null;
    hubWsRef.current?.close();
    hubWsRef.current = null;
    disconnectBluetoothController();
    setBleSession(getBleSessionInfo());
    setConnectionNote(null);
    setHubStatus({ connected: false, message: null });
    setState(DEFAULT_STATE);
  };

  // ---------------- ADMIN-ONLY MULTI-CONTROLLER HUB HANDLERS ----------------
  const handleSelectHubProfile = (id: string) => {
    hubWsRef.current?.close();
    hubWsRef.current = null;
    setHubStatus({ connected: false, message: null });
    setState((prev) => ({
      ...prev,
      adminControllers: { ...prev.adminControllers, activeProfileId: id },
    }));
  };

  const handleAddHubProfile = (profile: Omit<MultiControllerProfile, 'id'>) => {
    const newId = `mod-${Date.now().toString(36)}`;
    setState((prev) => ({
      ...prev,
      adminControllers: {
        ...prev.adminControllers,
        activeProfileId: newId,
        profiles: [...prev.adminControllers.profiles, { ...profile, id: newId }],
      },
    }));
  };

  const handleUpdateHubProfile = (id: string, patch: Partial<MultiControllerProfile>) => {
    setState((prev) => ({
      ...prev,
      adminControllers: {
        ...prev.adminControllers,
        profiles: prev.adminControllers.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      },
    }));
  };

  const handleDeleteHubProfile = (id: string) => {
    setState((prev) => {
      const filtered = prev.adminControllers.profiles.filter((p) => p.id !== id);
      if (filtered.length === 0) return prev;
      const nextActive =
        prev.adminControllers.activeProfileId === id
          ? filtered[0].id
          : prev.adminControllers.activeProfileId;
      return {
        ...prev,
        adminControllers: {
          ...prev.adminControllers,
          activeProfileId: nextActive,
          profiles: filtered,
        },
      };
    });
  };

  const handleUpdateDmxChannel = (index: number, value: number) => {
    updateState((prev) => {
      const nextCh = [...prev.adminControllers.dmxChannels];
      nextCh[index] = Math.max(0, Math.min(255, value));
      return {
        ...prev,
        adminControllers: { ...prev.adminControllers, dmxChannels: nextCh },
      };
    });
  };

  const handleSetDmxChannelsBulk = (values: number[]) => {
    updateState((prev) => ({
      ...prev,
      adminControllers: { ...prev.adminControllers, dmxChannels: values.slice(0, 8) },
    }));
  };

  const handleUpdateCarZone = (carZone: AdminMultiControllerState['carZone']) => {
    updateState((prev) => ({
      ...prev,
      adminControllers: { ...prev.adminControllers, carZone },
    }));
  };

  const applyDiscoveredModesToProfile = useCallback(
    (profileId: string, discovered: DiscoveredModuleMode[], sourceNote?: string) => {
      if (discovered.length === 0) return;
      setState((prev) => ({
        ...prev,
        adminControllers: {
          ...prev.adminControllers,
          profiles: prev.adminControllers.profiles.map((p) =>
            p.id === profileId ? { ...p, discoveredModes: discovered } : p
          ),
        },
      }));
      setHubStatus({
        connected: true,
        message:
          sourceNote ||
          `${discovered.length} mode bawaan modul berhasil dimuat ke Tab Mode & Kolektor.`,
      });
    },
    []
  );

  const handleDiscoverModuleModes = async (profileId: string) => {
    const prof = state.adminControllers.profiles.find((p) => p.id === profileId);
    if (!prof) return;
    setScanningModes(true);
    try {
      if (prof.family === 'bluetooth' || prof.protocol === 'ble') {
        if (getBleSessionInfo().connected) {
          await queryBleModuleModes();
          setHubStatus({
            connected: true,
            message: `Permintaan daftar mode dikirim ke perangkat BLE. Mode bawaan standar ${prof.bleFormat || 'BLE'} sudah tampil di Tab Mode.`,
          });
        } else {
          const builtInCount = moduleModes.filter(
            (m) => m.moduleMeta?.profileId === prof.id
          ).length;
          setHubStatus({
            connected: false,
            message: `${builtInCount} mode bawaan modul Bluetooth siap digunakan di Tab Mode. Hubungkan perangkat BLE untuk sinkron & baca daftar kustom.`,
          });
        }
        return;
      }

      if (
        (prof.protocol === 'websocket' || prof.protocol === 'artnet-ws') &&
        hubWsRef.current &&
        hubWsRef.current.readyState === WebSocket.OPEN
      ) {
        hubWsRef.current.send(JSON.stringify({ action: 'get_modes' }));
      }

      const modeUrl =
        prof.family === 'wled'
          ? `http://${prof.ipAddress}:${prof.port}/json/effects`
          : `http://${prof.ipAddress}:${prof.family === 'esp8266' ? 80 : prof.port}/api/modes`;

      const ctrl = new AbortController();
      const timeout = window.setTimeout(() => ctrl.abort(), 2400);
      try {
        const res = await fetch(modeUrl, { signal: ctrl.signal });
        window.clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const parsed = parseDiscoveredModes(data, prof.family);
          if (parsed.length > 0) {
            applyDiscoveredModesToProfile(
              prof.id,
              parsed,
              `${parsed.length} mode asli dari ${prof.name} berhasil disinkronkan ke Tab Mode!`
            );
            return;
          }
        }
      } catch {
        window.clearTimeout(timeout);
      }

      const builtInCount = moduleModes.filter(
        (m) => m.moduleMeta?.profileId === prof.id
      ).length;
      setHubStatus({
        connected: hubStatus.connected,
        message:
          prof.family === 'esp8266'
            ? `390+ mode RNS siap di Tab Mode. Sambungkan HP ke Wi-Fi modul (${prof.ipAddress}) untuk membaca efek tambahan langsung.`
            : `${builtInCount} mode standar pabrik ${prof.name} aktif di Tab Mode. Hubungkan HP ke jaringan modul (${prof.ipAddress}) untuk sinkron daftar live.`,
      });
    } finally {
      setScanningModes(false);
    }
  };

  const handleToggleShowFactoryModes = (enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      adminControllers: { ...prev.adminControllers, showFactoryModesInApp: enabled },
    }));
  };

  const handleDisconnectBle = (connectionId?: string) => {
    disconnectBluetoothController(connectionId);
    const updated = getBleSessionInfo();
    setBleSession(updated);
    setHubStatus({
      connected: updated.connected,
      message: updated.connected
        ? `1 perangkat diputus · Masih terhubung ke ${updated.count} modul (${updated.deviceName}).`
        : 'Semua koneksi Bluetooth diputus.',
    });
  };

  const handleSetBleZone = (connectionId: string, zone: BleTargetZone) => {
    setBleConnectionZone(connectionId, zone);
    const updated = getBleSessionInfo();
    setBleSession(updated);
    syncHardware(state);
    setHubStatus({
      connected: updated.connected,
      message:
        zone === 'front'
          ? 'Zona Bluetooth disetel ke DEPAN (ikut mode belakang, bebas rem).'
          : zone === 'rear'
            ? 'Zona Bluetooth disetel ke BELAKANG (terima rem & semua mode).'
            : 'Zona Bluetooth disetel ke SEMUA.',
    });
  };

  const handleSetBleFormat = (connectionId: string, format: BlePacketFormat) => {
    setBleConnectionFormat(connectionId, format);
    const updated = getBleSessionInfo();
    setBleSession(updated);
    syncHardware(state);
  };

  const handleScanBle = async (zone?: BleTargetZone, formatOverride?: BlePacketFormat) => {
    const btProfile =
      state.adminControllers.profiles.find((p) => p.id === 'led-dmx-clariss') ||
      state.adminControllers.profiles.find(
        (p) => p.family === 'bluetooth' || p.protocol === 'ble'
      );
    const activeProf =
      state.adminControllers.profiles.find(
        (p) =>
          p.id === state.adminControllers.activeProfileId &&
          (p.family === 'bluetooth' || p.protocol === 'ble')
      ) ||
      btProfile ||
      state.adminControllers.profiles[0];

    const chosenFormat = formatOverride || activeProf?.bleFormat || 'dmx-ble';
    const zoneLabel = zone === 'front' ? 'Lampu Depan' : zone === 'rear' ? 'Lampu Belakang' : 'LED DMX Bluetooth';
    setHubStatus({
      connected: getBleSessionInfo().connected,
      message: `Memindai perangkat ${zoneLabel}...`,
    });
    try {
      const info = await connectBluetoothController({
        zone,
        format: chosenFormat,
        customServiceUuid: activeProf?.bleServiceUuid,
        customCharUuid: activeProf?.bleCharUuid,
        onDisconnected: () => {
          const updated = getBleSessionInfo();
          setBleSession(updated);
          setHubStatus({
            connected: updated.connected,
            message: updated.connected
              ? `1 modul terputus · Masih aktif: ${updated.deviceName}`
              : 'Perangkat Bluetooth terputus.',
          });
        },
        onNotifyMessage: (text) => {
          try {
            const parsedJson = JSON.parse(text);
            const items = parseDiscoveredModes(parsedJson, activeProf?.family || 'bluetooth');
            if (items.length > 0 && activeProf) {
              applyDiscoveredModesToProfile(activeProf.id, items);
            }
          } catch {
            // Ignore non-JSON notification telemetry
          }
        },
      });
      const selectedMode =
        allModes.find((m) => m.id === state.activeModeId) ||
        moduleModes.find((m) => m.id === state.activeModeId);
      const activeColorHex = state.solidStayActive
        ? state.solidColor
        : selectedMode?.primaryColor || '#22D3EE';
      const latestConn = info.connections[info.connections.length - 1];
      const detectedFormat = formatOverride || latestConn?.format || chosenFormat;
      const hexSent = await sendStateOverBluetooth(
        detectedFormat,
        state,
        activeColorHex,
        {
          universe: activeProf?.dmxUniverse ?? 0,
          startChannel: activeProf?.dmxStartChannel ?? 1,
          channels: state.adminControllers.dmxChannels,
        },
        selectedMode
      );
      if (detectedFormat === 'rns-json') {
        void queryBleModuleModes().catch(() => {});
      }
      const updated = getBleSessionInfo();
      setBleSession(updated);
      setHubStatus({
        connected: true,
        message: `${updated.count} modul BT terhubung (${info.deviceName || 'Modul BLE'}) · Sinkron (${hexSent.slice(0, 26)})`,
      });
    } catch (err) {
      const updated = getBleSessionInfo();
      setBleSession(updated);
      setHubStatus({
        connected: updated.connected,
        message:
          err instanceof Error
            ? err.message
            : 'Gagal menghubungkan ke perangkat Bluetooth BLE.',
      });
    }
  };

  const handleDeleteSavedModule = (id: string) => {
    setState((prev) => ({
      ...prev,
      scannedModules: (prev.scannedModules || []).filter((item) => item.id !== id),
    }));
  };

  const handleReconnectSavedModule = (record: ScannedModuleRecord) => {
    if (record.protocol === 'ble') {
      void handleScanBle('all', record.bleFormat || 'dmx-ble');
      return;
    }
    setState((prev) => ({
      ...prev,
      device: {
        ...prev.device,
        ipAddress: record.ipAddress || prev.device.ipAddress,
        port: record.port || prev.device.port,
        ssid: record.ssid || prev.device.ssid,
      },
    }));
    setHubStatus({
      connected: false,
      message: `Konfigurasi Wi-Fi "${record.moduleName}" (${record.ipAddress || '192.168.4.1'}) diterapkan.`,
    });
    if (role === 'customer') setActiveTab('connect');
  };

  const handleApplyScannedModule = (
    parsed: ParsedModuleBarcode,
    action: 'connect' | 'save'
  ) => {
    const newRecord = toScannedModuleRecord(parsed);
    const matchingExistingId =
      parsed.protocol === 'ble'
        ? parsed.bleFormat === 'dmx-ble'
          ? 'led-dmx-clariss'
          : 'bt-ble'
        : undefined;

    setState((prev) => {
      const filteredHistory = (prev.scannedModules || []).filter(
        (m) => m.rawCode !== newRecord.rawCode
      );
      const nextScanned = [newRecord, ...filteredHistory].slice(0, 10);

      let nextProfiles = [...prev.adminControllers.profiles];
      let nextActiveProfileId = prev.adminControllers.activeProfileId;

      if (matchingExistingId && nextProfiles.some((p) => p.id === matchingExistingId)) {
        nextProfiles = nextProfiles.map((p) =>
          p.id === matchingExistingId
            ? {
                ...p,
                bleFormat: parsed.bleFormat || p.bleFormat,
              }
            : p
        );
        nextActiveProfileId = matchingExistingId;
      } else {
        const createdId = `scan-${Date.now()}`;
        nextProfiles = [
          {
            id: createdId,
            name: parsed.moduleName,
            family: parsed.family,
            protocol: parsed.protocol,
            ipAddress: parsed.ipAddress || (parsed.protocol === 'ble' ? 'BLE' : '192.168.4.1'),
            port: parsed.port || (parsed.protocol === 'ble' ? 0 : 81),
            bleFormat: parsed.bleFormat,
          },
          ...nextProfiles,
        ];
        nextActiveProfileId = createdId;
      }

      return {
        ...prev,
        scannedModules: nextScanned,
        ...(parsed.leftCount || parsed.rightCount || parsed.chipset || parsed.colorOrder
          ? {
              led: {
                ...prev.led,
                ...(parsed.leftCount ? { leftCount: parsed.leftCount } : {}),
                ...(parsed.rightCount ? { rightCount: parsed.rightCount } : {}),
                ...(parsed.chipset ? { chipset: parsed.chipset } : {}),
                ...(parsed.colorOrder ? { colorOrder: parsed.colorOrder } : {}),
              },
            }
          : {}),
        ...(parsed.pin
          ? {
              modulePassword: parsed.pin,
              modulePasswordEnabled: true,
            }
          : {}),
        ...(parsed.protocol !== 'ble' && (parsed.ipAddress || parsed.ssid)
          ? {
              device: {
                ...prev.device,
                ipAddress: parsed.ipAddress || prev.device.ipAddress,
                port: parsed.port || prev.device.port,
                ssid: parsed.ssid || prev.device.ssid,
              },
            }
          : {}),
        adminControllers: {
          ...prev.adminControllers,
          activeProfileId: nextActiveProfileId,
          profiles: nextProfiles,
        },
      };
    });

    setHubStatus({
      connected: bleSession.connected,
      message: `Barcode modul "${parsed.moduleName}" berhasil disimpan.`,
    });

    if (action === 'connect') {
      if (parsed.protocol === 'ble') {
        void handleScanBle('all', parsed.bleFormat || 'dmx-ble');
      } else {
        handleConnectToggle({
          ipAddress: parsed.ipAddress || state.device.ipAddress,
          port: parsed.port || state.device.port,
        });
      }
    }
  };

  const handleSendRawBle = async (payload: string, isHex: boolean) => {
    const trimmed = payload.trim();
    if (!trimmed) return;
    try {
      let bytes: Uint8Array;
      if (isHex) {
        const tokens = trimmed.split(/[\s,:-]+/).filter(Boolean);
        const parsed = tokens.map((t) => parseInt(t, 16));
        if (parsed.length === 0 || parsed.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
          setHubStatus({
            connected: getBleSessionInfo().connected,
            message: 'Format HEX tidak valid. Contoh benar: 7E 00 05 03 FF 00 00 00 EF',
          });
          return;
        }
        bytes = new Uint8Array(parsed);
      } else {
        bytes = new TextEncoder().encode(trimmed + '\n');
      }
      const hexSummary = await writeRawBluetoothBytes(bytes);
      setBleSession(getBleSessionInfo());
      setHubStatus({
        connected: true,
        message: `Paket manual Bluetooth terkirim (${bytes.length} byte): ${hexSummary}`,
      });
    } catch (err) {
      setBleSession(getBleSessionInfo());
      setHubStatus({
        connected: false,
        message: err instanceof Error ? err.message : 'Gagal mengirim data Bluetooth.',
      });
    }
  };

  const handleConnectHubProfile = () => {
    const activeProf =
      state.adminControllers.profiles.find(
        (p) => p.id === state.adminControllers.activeProfileId
      ) || state.adminControllers.profiles[0];
    if (!activeProf) return;

    if (activeProf.family === 'bluetooth' || activeProf.protocol === 'ble') {
      if (getBleSessionInfo().connected) {
        handleDisconnectBle();
      } else {
        void handleScanBle();
      }
      return;
    }

    if (hubStatus.connected && hubWsRef.current) {
      hubWsRef.current.close();
      hubWsRef.current = null;
      setHubStatus({ connected: false, message: 'Koneksi modul diputus.' });
      return;
    }

    if (activeProf.protocol === 'http-json') {
      void handleSendHubSyncPacket();
      void handleDiscoverModuleModes(activeProf.id);
      return;
    }

    setHubStatus({
      connected: false,
      message: `Menghubungkan ke ${activeProf.ipAddress}:${activeProf.port}...`,
    });

    try {
      const path = activeProf.protocol === 'artnet-ws' ? '/dmx' : '/ws';
      const socket = new WebSocket(`ws://${activeProf.ipAddress}:${activeProf.port}${path}`);
      const timer = window.setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          setHubStatus({
            connected: false,
            message: `Modul ${activeProf.name} di ${activeProf.ipAddress}:${activeProf.port} belum terjangkau. Gunakan APK lokal saat terhubung ke Wi-Fi modul.`,
          });
        }
      }, 2500);

      socket.onopen = () => {
        window.clearTimeout(timer);
        hubWsRef.current = socket;
        setHubStatus({
          connected: true,
          message: `Terhubung ke ${activeProf.name} (${activeProf.ipAddress}:${activeProf.port}).`,
        });
        socket.send(JSON.stringify(buildHubPayload(state, activeProf)));
        socket.send(JSON.stringify({ action: 'get_modes' }));
      };

      socket.onmessage = (ev) => {
        if (typeof ev.data !== 'string') return;
        try {
          const msg = JSON.parse(ev.data);
          const discovered = parseDiscoveredModes(msg, activeProf.family);
          if (discovered.length > 0) {
            applyDiscoveredModesToProfile(activeProf.id, discovered);
          }
        } catch {
          // Ignore non-JSON WS text
        }
      };

      socket.onerror = () => {
        window.clearTimeout(timer);
        socket.close();
        setHubStatus({
          connected: false,
          message: `Gagal membuka WebSocket ke ${activeProf.ipAddress}:${activeProf.port}.`,
        });
      };

      socket.onclose = () => {
        hubWsRef.current = null;
        setHubStatus((prev) => (prev.connected ? { connected: false, message: 'Koneksi modul terputus.' } : prev));
      };
    } catch {
      setHubStatus({
        connected: false,
        message: 'Koneksi WebSocket lokal diblokir browser HTTPS. Jalankan lewat APK lokal untuk kontrol langsung.',
      });
    }
  };

  const handleSendHubSyncPacket = async () => {
    const activeProf =
      state.adminControllers.profiles.find(
        (p) => p.id === state.adminControllers.activeProfileId
      ) || state.adminControllers.profiles[0];
    if (!activeProf) return;

    const selectedMode =
      allModes.find((m) => m.id === state.activeModeId) ||
      moduleModes.find((m) => m.id === state.activeModeId);

    if (activeProf.family === 'bluetooth' || activeProf.protocol === 'ble') {
      if (!getBleSessionInfo().connected) {
        await handleScanBle();
        return;
      }
      try {
        const activeColorHex = state.solidStayActive
          ? state.solidColor
          : selectedMode?.primaryColor || '#22D3EE';
        const hexSummary = await sendStateOverBluetooth(
          activeProf.bleFormat || 'rns-json',
          state,
          activeColorHex,
          {
            universe: activeProf.dmxUniverse ?? 0,
            startChannel: activeProf.dmxStartChannel ?? 1,
            channels: state.adminControllers.dmxChannels,
          },
          selectedMode
        );
        setBleSession(getBleSessionInfo());
        setHubStatus({
          connected: true,
          message: `Paket ${activeProf.bleFormat || 'rns-json'} terkirim via Bluetooth: ${hexSummary}`,
        });
      } catch (err) {
        setBleSession(getBleSessionInfo());
        setHubStatus({
          connected: false,
          message: err instanceof Error ? err.message : 'Gagal mengirim paket Bluetooth.',
        });
      }
      return;
    }

    const payload = buildHubPayload(state, activeProf, selectedMode);

    if (activeProf.protocol === 'http-json') {
      const endpoint =
        activeProf.family === 'wled'
          ? `http://${activeProf.ipAddress}:${activeProf.port}/json/state`
          : `http://${activeProf.ipAddress}:${activeProf.port}/api/control`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setHubStatus({
            connected: true,
            message: `Data mode & warna terkirim ke ${activeProf.name} (${endpoint}).`,
          });
        } else {
          setHubStatus({
            connected: false,
            message: `Respon HTTP ${res.status} dari ${activeProf.ipAddress}.`,
          });
        }
      } catch {
        setHubStatus({
          connected: false,
          message: `Paket siap untuk ${endpoint}. Jika dibuka dari HTTPS, jalankan via APK lokal agar tidak terblokir jaringan.`,
        });
      }
      return;
    }

    if (hubWsRef.current && hubWsRef.current.readyState === WebSocket.OPEN) {
      hubWsRef.current.send(JSON.stringify(payload));
      setHubStatus({
        connected: true,
        message: `Paket sinkronisasi terkirim ke ${activeProf.name}.`,
      });
    } else {
      handleConnectHubProfile();
    }
  };

  const cust = state.customization;
  const accentHex =
    (cust.customAccentHex && cust.customAccentHex.trim()) ||
    ACCENT_HEX[cust.accentTheme] ||
    '#22D3EE';

  if (!role) {
    return (
      <LoginScreen
        expectedPin={state.device.adminPin}
        appName={cust.appName}
        logoPreset={cust.logoPreset}
        customLogoUrl={cust.customLogoUrl}
        accentHex={accentHex}
        onLogin={handleLogin}
      />
    );
  }

  const navOrderList = cust.navOrder?.length
    ? cust.navOrder
    : (['home', 'rgb', 'belang', 'matrix', 'white', 'sinyal', 'music', 'schedule', 'connect', 'led', 'admin'] as NavTab[]);

  const orderedNavItems = navOrderList
    .map((id) => ALL_NAV_ITEMS.find((item) => item.id === id))
    .filter((item): item is (typeof ALL_NAV_ITEMS)[number] => Boolean(item));

  for (const baseItem of ALL_NAV_ITEMS) {
    if (!orderedNavItems.some((x) => x.id === baseItem.id)) {
      orderedNavItems.push(baseItem);
    }
  }

  const hiddenTabsSet = new Set<NavTab>(cust.hiddenTabs || []);
  const unlockedCustSet = new Set<NavTab>(cust.customerUnlockedTabs || []);

  const visibleNavItems = orderedNavItems
    .filter((item) => {
      // Never hide 'admin' from Admin so they cannot lock themselves out
      if (hiddenTabsSet.has(item.id) && !(role === 'admin' && item.id === 'admin')) {
        return false;
      }
      if (role === 'admin') return !item.customerOnly;
      if (item.adminOnly) {
        return item.id !== 'admin' && unlockedCustSet.has(item.id);
      }
      return true;
    })
    .map((item) => ({
      ...item,
      label: (cust.navLabels?.[item.id] || '').trim() || item.label,
      icon: resolveCustomIconComponent(cust.navIcons?.[item.id], item.icon),
    }));

  // Cap mobile bottom bar at 5 ergonomic primary thumb tabs; remaining visible tabs appear cleanly in compact top mobile jump bar
  const mobilePriorityFallback: NavTab[] = ['home', 'rgb', 'belang', 'matrix', 'white'];
  const mobileNavItems =
    visibleNavItems.length <= 5
      ? visibleNavItems
      : visibleNavItems
          .filter((item) => mobilePriorityFallback.includes(item.id))
          .slice(0, 5);
  const mobileSecondaryNavItems = visibleNavItems.filter(
    (item) => !mobileNavItems.some((m) => m.id === item.id)
  );

  const normalizedActiveTab: NavTab =
    activeTab === 'mode' ? 'rgb' : activeTab === 'special' ? 'sinyal' : activeTab;

  const effectiveTab: NavTab = visibleNavItems.some((item) => item.id === normalizedActiveTab)
    ? normalizedActiveTab
    : visibleNavItems[0]?.id || 'home';

  const allPresets = useMemo<RnsPreset[]>(() => {
    const userSaved = state.savedPresets || [];
    const otaBuiltIn = state.customization.builtInPresets || [];
    const merged = [...userSaved, ...otaBuiltIn, ...BUILTIN_PRESETS];
    const seen = new Set<string>();
    return merged.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [state.savedPresets, state.customization.builtInPresets]);

  const isConnected = state.device.connectionStatus === 'connected';
  const showPreInstallBar = !isInstalled;

  const patternBackground = (pat: BackgroundPatternId | undefined): React.CSSProperties => {
    switch (pat) {
      case 'carbon':
        return {
          backgroundColor: '#090C12',
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 6px 6px',
        };
      case 'matrix-grid':
        return {
          backgroundColor: '#080C14',
          backgroundImage: `linear-gradient(${accentHex}18 1px, transparent 1px), linear-gradient(90deg, ${accentHex}18 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
        };
      case 'diagonal':
        return {
          backgroundColor: '#090C12',
          backgroundImage: `repeating-linear-gradient(135deg, ${accentHex}14 0, ${accentHex}14 2px, transparent 2px, transparent 16px)`,
        };
      case 'hex':
        return {
          backgroundColor: '#090D16',
          backgroundImage: `radial-gradient(${accentHex}29 1.3px, transparent 1.3px)`,
          backgroundSize: '18px 18px',
        };
      case 'none':
      default:
        return { backgroundColor: cust.backgroundColor || '#090C12' };
    }
  };

  const bgMode = cust.backgroundMode || 'solid';
  const gradAngle = cust.backgroundGradientAngle ?? 180;
  const gradStart = cust.backgroundGradientStart || '#090C12';
  const gradMid = cust.backgroundGradientMid?.trim();
  const gradEnd = cust.backgroundGradientEnd || '#0F1E33';
  const gradStops = gradMid
    ? `${gradStart} 0%, ${gradMid} 50%, ${gradEnd} 100%`
    : `${gradStart} 0%, ${gradEnd} 100%`;

  const wrapperBgStyle: React.CSSProperties =
    bgMode === 'gradient'
      ? {
          backgroundImage: `linear-gradient(${gradAngle}deg, ${gradStops})`,
        }
      : bgMode === 'pattern'
        ? patternBackground(cust.backgroundPattern)
        : bgMode === 'image' && cust.backgroundImageUrl
          ? { backgroundColor: '#090C12' }
          : { backgroundColor: cust.backgroundColor || '#090C12' };

  const cardRadiusCss =
    typeof cust.customCardRadiusPx === 'number'
      ? `${cust.customCardRadiusPx}px`
      : cust.cardRadius === 'sharp'
        ? '0.5rem'
        : cust.cardRadius === 'soft'
          ? '1.5rem'
          : '1rem';

  const baseCardHex =
    cust.cardBgColor || (cust.cardStyle === 'contrast' ? '#070A10' : '#111622');
  const resolvedOpacity =
    typeof cust.cardOpacity === 'number'
      ? cust.cardOpacity / 100
      : cust.cardStyle === 'glass'
        ? 0.72
        : 1;
  const cardBgCss = hexToRgbaColor(baseCardHex, resolvedOpacity);

  const resolvedBlurPx =
    typeof cust.cardBlurPx === 'number' && cust.cardBlurPx > 0
      ? cust.cardBlurPx
      : cust.cardStyle === 'glass'
        ? 12
        : 0;

  const themeVarsStyle: React.CSSProperties = {
    ...wrapperBgStyle,
    ...(cust.fontScale && cust.fontScale !== 100 ? { fontSize: `${cust.fontScale}%` } : {}),
    ['--rns-accent' as string]: accentHex,
    ['--rns-card-bg' as string]: cardBgCss,
    ['--rns-card-radius' as string]: cardRadiusCss,
    ['--rns-card-backdrop' as string]: resolvedBlurPx > 0 ? `blur(${resolvedBlurPx}px)` : 'none',
    ['--rns-card-border-color' as string]: cust.borderColor || 'rgba(255, 255, 255, 0.08)',
    ['--rns-card-border-width' as string]: `${cust.cardBorderWidth ?? 1}px`,
    ['--rns-text-color' as string]: cust.textColor || '#f1f5f9',
    ['--rns-muted-color' as string]: cust.mutedTextColor || '#94a3b8',
    ['--rns-header-bg' as string]: cust.headerBgColor || 'rgba(9, 12, 18, 0.85)',
    ['--rns-nav-bg' as string]: cust.navBgColor || 'rgba(13, 18, 28, 0.95)',
    ['--rns-font-family' as string]: FONT_FAMILY_CSS[cust.fontFamily || 'jakarta'],
  };

  const quickPlacement = cust.quickControlsPlacement || 'top';
  const quickControlsElement =
    quickPlacement !== 'hidden' ? (
      <QuickControlsBar
        state={state}
        onTriggerWelcome={handleTriggerWelcome}
        onCycleSein={handleCycleSein}
        onToggleBrake={handleToggleBrake}
        onToggleReverse={handleToggleReverse}
        onToggleCombination={handleToggleCombination}
        onOpenComboEditor={() => setComboModalOpen(true)}
      />
    ) : null;

  const leftOrder = cust.leftBlockOrder || ['status-bar', 'visualizer', 'mode-collector'];
  const statusBarNode =
    cust.showStatusBar !== false
      ? showPreInstallBar
        ? (
          <div
            key="status-bar"
            className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-[#111622] border border-white/[0.08]"
          >
            <div className="text-xs text-slate-300 min-w-0 truncate">
              <span className="font-medium text-slate-100">ESP8266</span>
              <span className="text-slate-600 mx-1.5" aria-hidden="true">·</span>
              <span className={isConnected ? 'text-emerald-400' : 'text-slate-400'}>
                {isConnected ? state.device.ipAddress : 'Simulasi'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <PWAInstallButton variant="compact" />
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={async () => {
                  setExportBusy('zip');
                  try {
                    await downloadApkZipBundle(state, allModes);
                  } finally {
                    setExportBusy(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171F2E] border border-cyan-400/30 text-xs font-medium text-cyan-300 hover:text-white whitespace-nowrap min-h-[34px] disabled:opacity-60"
                title="Unduh paket ZIP berisi aplikasi penuh untuk WebIntoApp"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{exportBusy === 'zip' ? 'Menyiapkan...' : 'ZIP APK'}</span>
              </button>
              <button
                type="button"
                disabled={exportBusy !== null}
                onClick={async () => {
                  setExportBusy('html');
                  try {
                    await downloadStandaloneHtmlApp(state, allModes);
                  } finally {
                    setExportBusy(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap min-h-[34px] disabled:opacity-60"
                title="Unduh file aplikasi offline (.html)"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>{exportBusy === 'html' ? 'Menyiapkan...' : 'Offline'}</span>
              </button>
            </div>
          </div>
          )
        : isConnected
          ? (
            <div
              key="status-bar"
              className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#111622] border border-white/[0.08] text-xs"
            >
              <span className="font-medium text-slate-100">ESP8266</span>
              <span className="text-emerald-400 font-mono">{state.device.ipAddress}</span>
            </div>
            )
          : null
      : null;

  const leftBlocks: Record<'status-bar' | 'visualizer' | 'mode-collector', React.ReactNode> = {
    'status-bar': statusBarNode,
    visualizer: (
      <React.Fragment key="visualizer">
        <StoplampVisualizer
          state={state}
          allModes={allModes}
          canEditLed={true}
          onSelectLedTab={() => setActiveTab('led')}
        />
        {quickPlacement === 'below-demo' && quickControlsElement}
      </React.Fragment>
    ),
    'mode-collector':
      cust.showModeCollector !== false ? (
        <ModeCollector
          key="mode-collector"
          modes={allModes}
          activeModeId={state.activeModeId}
          onSelectMode={handleSelectAnimatedMode}
          onOpenAllModes={() => setActiveTab('rgb')}
        />
      ) : null,
  };

  return (
    <div
      style={themeVarsStyle}
      className="rns-theme-root relative min-h-screen text-slate-100 flex flex-col"
    >
      {cust.customCss && (
        <style>{cust.customCss.replace(/<\/style/gi, '')}</style>
      )}
      {/* Optional Uploaded / URL Background Wallpaper Image + Overlay */}
      {bgMode === 'image' && cust.backgroundImageUrl && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{
              backgroundImage: `url("${cust.backgroundImageUrl}")`,
              filter: `blur(${cust.backgroundBlur ?? 2}px)`,
            }}
          />
          <div
            className="absolute inset-0 bg-[#070A10]"
            style={{ opacity: (cust.backgroundOverlayOpacity ?? 65) / 100 }}
          />
        </div>
      )}

      {/* Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#090C12]/85 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-2 space-y-1.5">
          <div className="h-10 flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
            >
              <AppBrandLogo
                logoPreset={cust.logoPreset}
                customLogoUrl={cust.customLogoUrl}
                accentHex={accentHex}
                className="w-8 h-8 shrink-0"
              />
              <span className="font-display text-base font-bold tracking-tight text-slate-100">
                {cust.appName || 'RNS Controller'}
              </span>
            </button>

            <nav
              aria-label="Navigasi utama"
              className="hidden md:flex items-center gap-4 lg:gap-5 text-xs lg:text-sm font-medium overflow-x-auto no-scrollbar"
            >
              {visibleNavItems.map((item) => {
                const active = effectiveTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    style={active ? { color: accentHex, borderColor: accentHex } : undefined}
                    className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                      active ? 'font-semibold' : 'text-slate-400 border-transparent hover:text-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setScannerModalOpen(true)}
                aria-label="Scan Barcode atau QR Modul"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap min-h-[34px] bg-[#111622] border border-cyan-400/35 text-cyan-200 hover:border-cyan-400 transition-colors"
                title="Scan Barcode / QR Modul"
              >
                <ScanBarcode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Scan Barcode</span>
              </button>

              <button
                type="button"
                onClick={() => setDeviceModalOpen(true)}
                aria-label="Manajer Perangkat LEDLamp & Bluetooth"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap min-h-[34px] border transition-colors ${
                  bleSession.connected || isConnected
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                    : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:text-white'
                }`}
              >
                {bleSession.connected ? (
                  <BluetoothConnected className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Bluetooth className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {bleSession.connected
                    ? `${bleSession.count} BLE`
                    : isConnected
                      ? 'Wi-Fi ON'
                      : 'Perangkat'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[34px] bg-[#111622] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16] transition-colors"
              >
                <span>{role === 'admin' ? 'Admin' : 'Customer'}</span>
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Pojok kiri atas di bawah logo: Tombol ON/OFF LED & Reset LED + Status Password */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleLedPower}
                aria-pressed={state.powerOn !== false}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold min-h-[30px] transition-colors whitespace-nowrap ${
                  state.powerOn !== false
                    ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-red-500/15 border-red-400/45 text-red-300 hover:bg-red-500/25'
                }`}
              >
                <Power className="w-3.5 h-3.5 shrink-0" />
                <span>{state.powerOn !== false ? 'LED ON' : 'LED OFF'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetLed}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium min-h-[30px] transition-colors whitespace-nowrap ${
                  ledResetFlash
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-[#111622] border-white/[0.1] text-slate-300 hover:text-white hover:border-white/[0.22]'
                }`}
                title="Reset ulang efek, kecerahan, dan posisi LED"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>{ledResetFlash ? 'Direset!' : 'Reset LED'}</span>
              </button>
            </div>

            {state.moduleLocked && (
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/35 text-[11px] font-semibold text-amber-300"
              >
                <Lock className="w-3 h-3" />
                <span>Modul Terkunci</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-3.5 pb-24 md:pb-10 space-y-3.5">
        {cust.showCustomBanner && cust.customBannerText && (
          <div
            className="rounded-xl px-3.5 py-2 text-xs font-medium text-center border"
            style={{
              backgroundColor: `${accentHex}18`,
              borderColor: `${accentHex}55`,
              color: '#F8FAFC',
            }}
          >
            {cust.customBannerText}
          </div>
        )}

        {/* Remote OTA Update Toast when Admin publishes an update */}
        {otaNotice && (
          <div
            role="status"
            className="rounded-xl bg-cyan-500/15 border border-cyan-400/35 px-3.5 py-2 text-xs text-cyan-200 flex items-center justify-between gap-2"
          >
            <span>{otaNotice}</span>
            <button
              type="button"
              onClick={() => setOtaNotice(null)}
              className="text-[11px] font-semibold text-cyan-300 hover:text-white shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Quick Controls moved to the very top with compact smaller font */}
        {quickPlacement === 'top' && quickControlsElement}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Desktop) / Top Focal Anchor (Mobile) */}
          <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-3.5">
            {leftOrder.map((blk) => leftBlocks[blk])}
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-6 space-y-3.5">
            {mobileSecondaryNavItems.length > 0 && (
              <nav
                aria-label="Menu lanjutan mobile"
                className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
              >
                {mobileSecondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = effectiveTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      style={active ? { borderColor: accentHex, color: accentHex } : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap min-h-[36px] ${
                        active
                          ? 'bg-[#171F2E] font-semibold'
                          : 'bg-[#111622] border-white/[0.08] text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {effectiveTab === 'home' && (
              <HomeView
                state={state}
                allModes={allModes}
                role={role}
                bleSession={bleSession}
                accentHex={accentHex}
                onOpenTab={(tab) => setActiveTab(tab)}
                onOpenDeviceManager={() => setDeviceModalOpen(true)}
                onOpenBarcodeScanner={() => setScannerModalOpen(true)}
                onTriggerWelcome={handleTriggerWelcome}
              />
            )}

            {effectiveTab === 'rgb' && (
              <RgbControllerView
                state={state}
                allModes={allModes}
                micActive={micActive}
                micError={micError}
                isAdmin={role === 'admin'}
                onChangeSpeed={(val) => updateState((prev) => ({ ...prev, speed: val }))}
                onChangeBrightness={(val) =>
                  updateState((prev) => ({ ...prev, brightness: val }))
                }
                onChangeSolidColor={handleChangeSolidColor}
                onToggleSolidStay={handleToggleSolidStay}
                onApplyManualTintColor={handleApplyManualTintColor}
                onToggleManualTint={handleToggleManualTint}
                onChangeWelcomeColor={(color) => {
                  updateState((prev) => ({
                    ...prev,
                    powerOn: true,
                    special: { ...prev.special, welcomeColor: color },
                    welcomePlayingUntil: Date.now() + 3000,
                    brakeActive: false,
                    reverseActive: false,
                    sein: 'off',
                    led: { ...prev.led, testOverride: 'none' },
                  }));
                }}
                onChangeWelcomeStyle={(style: WelcomeStyle) => {
                  updateState((prev) => ({
                    ...prev,
                    powerOn: true,
                    special: { ...prev.special, welcomeStyle: style },
                    welcomePlayingUntil: Date.now() + 3000,
                    brakeActive: false,
                    reverseActive: false,
                    sein: 'off',
                    led: { ...prev.led, testOverride: 'none' },
                  }));
                }}
                onTriggerWelcome={handleTriggerWelcome}
                onToggleSoundMode={() => void handleToggleSoundMode()}
                onChangeSoundSensitivity={handleChangeSoundSensitivity}
                onChangeSoundStyle={handleChangeSoundStyle}
                onSelectMode={handleSelectAnimatedMode}
                onAddModeToCombo={handleAddModeToCombo}
                onToggleFavorite={handleToggleFavorite}
                onPrevMode={() => handleStepMode(-1)}
                onNextMode={() => handleStepMode(1)}
                onToggleAutoLoop={handleToggleAutoLoop}
                onChangeAutoLoopInterval={handleChangeAutoLoopInterval}
                onOpenComboEditor={() => setComboModalOpen(true)}
                onAddCustomMode={handleAddCustomMode}
                onOpenAdminCloud={role === 'admin' ? () => setActiveTab('admin') : undefined}
              />
            )}

            {effectiveTab === 'belang' && (
              <ModeBelangView
                state={state}
                allModes={allModes}
                presets={allPresets}
                onToggleCombination={handleToggleCombination}
                onUpdateCombo={handleUpdateCombo}
                onUpdateManualSideColors={handleUpdateManualSideColors}
                onUpdateAutoBelang={handleUpdateAutoBelang}
                onSavePreset={handleSavePreset}
                onLoadPreset={handleLoadPreset}
                onDuplicatePreset={handleDuplicatePreset}
                onRenamePreset={handleRenamePreset}
                onDeletePreset={handleDeletePreset}
              />
            )}

            {effectiveTab === 'matrix' && (
              <LedMatrixView
                state={state}
                allModes={allModes}
                isAdmin={role === 'admin'}
                onUpdateLedMatrix={handleUpdateLedMatrix}
                onAddMatrixModel={handleAddMatrixModel}
                onSavePreset={handleSavePreset}
              />
            )}

            {effectiveTab === 'white' && (
              <WhiteFullView
                state={state}
                allModes={allModes}
                onSelectMode={handleSelectAnimatedMode}
                onAddModeToCombo={handleAddModeToCombo}
                onToggleFavorite={handleToggleFavorite}
                onChangeSpeed={(val) => updateState((prev) => ({ ...prev, speed: val }))}
                onChangeBrightness={(val) =>
                  updateState((prev) => ({ ...prev, brightness: val }))
                }
                onOpenBelangPage={() => setActiveTab('belang')}
              />
            )}

            {effectiveTab === 'sinyal' && (
              <SpecialView
                state={state}
                onUpdateSpecial={handleUpdateSpecial}
                onTriggerWelcome={handleTriggerWelcome}
                onSetSein={(sein) => updateState((prev) => ({ ...prev, sein }))}
                onToggleBrake={handleToggleBrake}
                onToggleReverse={handleToggleReverse}
                onToggleCombination={handleToggleCombination}
              />
            )}

            {effectiveTab === 'music' && (
              <MusicView
                state={state}
                micActive={micActive}
                micError={micError}
                onToggleSoundMode={() => void handleToggleSoundMode()}
                onEnableSoundForPlayer={handleEnableSoundForPlayer}
                onChangeSoundSensitivity={handleChangeSoundSensitivity}
                onChangeSoundStyle={handleChangeSoundStyle}
              />
            )}

            {effectiveTab === 'schedule' && (
              <ScheduleView
                state={state}
                bleConnected={bleSession.connected}
                onStartCountdown={handleStartCountdown}
                onCancelCountdown={handleCancelCountdown}
                onUpdateSchedule={handleUpdateSchedule}
                onToggleShake={handleToggleShake}
                onSaveModulePassword={handleSaveModulePassword}
                onToggleModuleLock={handleToggleModuleLock}
              />
            )}

            {role === 'customer' && effectiveTab === 'connect' && (
              <CustomerConnectView
                state={state}
                device={state.device}
                connectionNote={connectionNote}
                bleSession={bleSession}
                bleNotice={hubStatus.message}
                onUpdateDevice={handleUpdateDevice}
                onConnectToggle={handleConnectToggle}
                onScanBle={(zone, fmt) => void handleScanBle(zone, fmt)}
                onSetBleZone={handleSetBleZone}
                onSetBleFormat={handleSetBleFormat}
                onDisconnectBle={(id) => handleDisconnectBle(id)}
                onOpenTab={(tab) => setActiveTab(tab)}
                onCycleSein={handleCycleSein}
                onToggleBrake={handleToggleBrake}
                onToggleReverse={handleToggleReverse}
                onTriggerWelcome={handleTriggerWelcome}
                onOpenComboEditor={() => setComboModalOpen(true)}
                onOpenBarcodeScanner={() => setScannerModalOpen(true)}
                onReconnectScannedModule={handleReconnectSavedModule}
              />
            )}

            {effectiveTab === 'led' && (
              <LedView
                led={state.led}
                brightness={state.brightness}
                isAdmin={role === 'admin'}
                onUpdateLed={handleUpdateLed}
              />
            )}

            {role === 'admin' && effectiveTab === 'admin' && (
              <AdminView
                state={state}
                allModes={allModes}
                isInstalled={isInstalled}
                connectionNote={connectionNote}
                hubStatus={hubStatus}
                bleSession={bleSession}
                onUpdateDevice={handleUpdateDevice}
                onUpdateCustomization={handleUpdateCustomization}
                onAddCustomMode={handleAddCustomMode}
                onUpdateExistingMode={handleUpdateExistingMode}
                onDeleteCustomMode={handleDeleteCustomMode}
                onSelectMode={handleSelectAnimatedMode}
                onConnectToggle={handleConnectToggle}
                onResetDefaults={handleResetDefaults}
                onSelectHubProfile={handleSelectHubProfile}
                onAddHubProfile={handleAddHubProfile}
                onUpdateHubProfile={handleUpdateHubProfile}
                onDeleteHubProfile={handleDeleteHubProfile}
                onUpdateDmxChannel={handleUpdateDmxChannel}
                onSetDmxChannelsBulk={handleSetDmxChannelsBulk}
                onUpdateCarZone={handleUpdateCarZone}
                onConnectHubProfile={handleConnectHubProfile}
                onSendHubSyncPacket={handleSendHubSyncPacket}
                onScanBle={(zone) => void handleScanBle(zone)}
                onDisconnectBle={(id) => handleDisconnectBle(id)}
                onSetBleZone={handleSetBleZone}
                onSetBleFormat={handleSetBleFormat}
                onSendRawBle={handleSendRawBle}
                moduleModes={moduleModes}
                scanningModes={scanningModes}
                onDiscoverModuleModes={handleDiscoverModuleModes}
                onToggleShowFactoryModes={handleToggleShowFactoryModes}
                onResetCustomization={handleResetCustomization}
                onOpenBarcodeScanner={() => setScannerModalOpen(true)}
              />
            )}
          </div>
        </div>

        {cust.footerText && (
          <footer className="pt-4 text-center text-[11px] text-slate-400">
            {cust.footerText}
          </footer>
        )}
      </main>

      {/* LEDLamp Quick Device & LED DMX Drawer Modal */}
      {deviceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Manajer Perangkat LEDLamp"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#111622] border border-white/[0.1] p-4 sm:p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Perangkat LEDLamp &amp; LED DMX
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih modul Bluetooth atau lompat cepat ke Jadwal, Sinyal &amp; LED
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeviceModalOpen(false)}
                aria-label="Tutup manajer perangkat"
                className="min-w-[36px] min-h-[36px] rounded-xl bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hubStatus.message && (
              <p className="text-[11px] text-cyan-200 bg-[#0B0F17] border border-white/[0.08] rounded-xl px-3 py-2">
                {hubStatus.message}
              </p>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDeviceModalOpen(false);
                  setScannerModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[44px]"
              >
                <span className="inline-flex items-center gap-2">
                  <ScanBarcode className="w-4 h-4" />
                  <span>Scan Barcode / QR Kotak Modul</span>
                </span>
                <span>Kamera / Foto</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleScanBle('all', 'dmx-ble');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#171F2E] border border-cyan-400/45 text-cyan-200 text-xs font-semibold hover:text-white min-h-[44px]"
              >
                <span className="inline-flex items-center gap-2">
                  <Bluetooth className="w-4 h-4 text-cyan-400" />
                  <span>Hubungkan LED DMX (4-Kabel BLE)</span>
                </span>
                <span>Scan BLE</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleScanBle('rear', 'dmx-ble')}
                  className="py-2 px-3 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[40px]"
                >
                  + BT Belakang
                </button>
                <button
                  type="button"
                  onClick={() => void handleScanBle('front', 'rns-json')}
                  className="py-2 px-3 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[40px]"
                >
                  + BT Depan
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.08] grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDeviceModalOpen(false);
                  setActiveTab('schedule');
                }}
                className="py-2 px-2 rounded-xl bg-[#0B0F17] border border-white/[0.07] text-[11px] font-medium text-slate-200 hover:border-cyan-400/40"
              >
                Jadwal &amp; PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeviceModalOpen(false);
                  setActiveTab('led');
                }}
                className="py-2 px-2 rounded-xl bg-[#0B0F17] border border-white/[0.07] text-[11px] font-medium text-slate-200 hover:border-cyan-400/40"
              >
                IC &amp; LED
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeviceModalOpen(false);
                  setActiveTab(role === 'admin' ? 'special' : 'connect');
                }}
                className="py-2 px-2 rounded-xl bg-[#0B0F17] border border-white/[0.07] text-[11px] font-medium text-slate-200 hover:border-cyan-400/40"
              >
                {role === 'admin' ? 'Sinyal DMX' : 'Koneksi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Barcode / QR Modul Modal */}
      <BarcodeScannerModal
        open={scannerModalOpen}
        scannedModules={state.scannedModules || []}
        onClose={() => setScannerModalOpen(false)}
        onApplyScannedModule={handleApplyScannedModule}
        onReconnectSavedModule={handleReconnectSavedModule}
        onDeleteSavedModule={handleDeleteSavedModule}
      />

      {/* Kombinasi & Mode Belang Editor Modal */}
      <ComboEditorModal
        open={comboModalOpen}
        combo={state.combo}
        combinationEnabled={state.combinationEnabled}
        activeModeId={state.activeModeId}
        allModes={allModes}
        onClose={() => setComboModalOpen(false)}
        onToggleCombination={handleToggleCombination}
        onUpdateCombo={handleUpdateCombo}
        onOpenBelangPage={() => setActiveTab('belang')}
      />

      {/* Mobile Bottom Thumb Navigation Bar (Max 5 Ergonomic Tabs) */}
      <nav
        aria-label="Navigasi bawah"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D121C]/95 backdrop-blur-md border-t border-white/[0.08]"
      >
        <div
          className={`grid items-center h-16 px-1 ${
            mobileNavItems.length <= 2
              ? 'grid-cols-2'
              : mobileNavItems.length === 3
                ? 'grid-cols-3'
                : mobileNavItems.length === 4
                  ? 'grid-cols-4'
                  : 'grid-cols-5'
          }`}
        >
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={active ? { color: accentHex } : undefined}
                className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors ${
                  active ? '' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
