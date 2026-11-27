export type NavTab =
  | 'home'
  | 'rgb'
  | 'belang'
  | 'matrix'
  | 'white'
  | 'sinyal'
  | 'admin'
  | 'mode'
  | 'music'
  | 'schedule'
  | 'connect'
  | 'special'
  | 'led';

export type UserRole = 'customer' | 'admin';

export type SeinState = 'off' | 'left' | 'right' | 'hazard';

export type ModeCategory =
  | 'Meteor'
  | 'Running'
  | 'Strobo'
  | 'Wave'
  | 'Chase'
  | 'Pulse'
  | 'Scanner'
  | 'Breathing'
  | 'Gradient'
  | 'Rainbow'
  | 'Pixel'
  | 'Matrix'
  | 'Kombinasi'
  | 'White Full'
  | 'Custom'
  | 'Flow'
  | 'Static';

export type EyeBehavior = 'look-around' | 'cyber-scan' | 'angry-squint' | 'blink-pulse' | 'off';

export type EyeExpressionId = 'angry' | 'squint' | 'blink' | 'look-lr' | 'auto-cycle';
export type EyeShapeId = 'round' | 'cyber-slit' | 'hex' | 'anime';
export type MatrixEffectId =
  | 'equalizer-rgb'
  | 'moving-pixel'
  | 'scrolling-text'
  | 'digital-wave'
  | 'running-lines'
  | 'moving-dots'
  | 'custom-digital';

export type AccentTheme = 'cyan' | 'magenta' | 'crimson' | 'amber' | 'emerald';

export type HomeSectionId = 'quick-controls' | 'sliders';
export type BackgroundMode = 'solid' | 'gradient' | 'pattern' | 'image';
export type BackgroundPatternId = 'none' | 'carbon' | 'matrix-grid' | 'diagonal' | 'hex';
export type LogoPresetId =
  | 'rns-matrix'
  | 'shield-turbo'
  | 'bolt-neon'
  | 'eye-gt'
  | 'chip-rgb'
  | 'crown-vip'
  | 'custom';
export type CustomIconId =
  | 'default'
  | 'home'
  | 'gauge'
  | 'flame'
  | 'zap'
  | 'layers'
  | 'grid'
  | 'sparkles'
  | 'star'
  | 'car'
  | 'cpu'
  | 'sliders'
  | 'shield'
  | 'crown'
  | 'wrench'
  | 'eye'
  | 'power'
  | 'palette'
  | 'radio'
  | 'hand';
export type HomeBlockId = 'sliders' | 'welcome-card' | 'stay-wheel';
export type LeftBlockId = 'status-bar' | 'visualizer' | 'mode-collector';
export type QuickControlsPlacement = 'top' | 'below-demo' | 'hidden';
export type CardStyleId = 'solid' | 'glass' | 'contrast';
export type CardRadiusId = 'sharp' | 'rounded' | 'soft';

export type AnimationPattern =
  | 'aurora-dual'
  | 'rainbow-flow'
  | 'cyber-scan'
  | 'plasma-wave'
  | 'neon-breathe'
  | 'meteor-rain'
  | 'crimson-pulse'
  | 'dual-comet'
  | 'ocean-drift'
  | 'matrix-drop'
  | 'sparkle-ice'
  | 'fire-ember'
  | 'strobe-duo'
  | 'prism-shift'
  | 'heartbeat'
  | 'vapor-fade'
  | 'knight-sweep'
  | 'solid-cyan'
  | 'solid-red'
  | 'solid-ice'
  | 'solid-amber'
  | 'solid-violet'
  | 'horizon-split'
  | 'stealth-dim'
  | 'solid-dual'
  | 'wave-bounce'
  | 'laser-cross'
  | 'dna-helix'
  | 'vortex-spin'
  | 'white-strobe-flash'
  | 'white-strobe-alt'
  | 'white-strobe-burst'
  | 'white-strobe-pulse'
  | 'white-strobe-quad'
  | 'white-strobe-wave'
  | 'white-run-out'
  | 'white-run-in'
  | 'white-run-bounce'
  | 'white-run-rows'
  | 'white-run-dual'
  | 'white-run-comet'
  | 'white-matrix-snake'
  | 'white-matrix-checker'
  | 'white-matrix-rain'
  | 'white-matrix-scan'
  | 'white-matrix-sparkle'
  | 'white-matrix-cross'
  | 'white-matrix-bars'
  | 'cyber-eyes'
  | 'police-strobe'
  | 'matrix-rain'
  | 'checker-wave'
  | 'radar-sweep'
  | 'zigzag-snake'
  | 'cyber-wing'
  | 'twister-wave'
  | 'shockwave-ring'
  | 'spectrum-bars'
  | 'warp-speed'
  | 'fireworks-burst'
  | 'galaxy-spiral'
  | 'infinity-loop'
  | 'matrix-equalizer'
  | 'matrix-moving-pixel'
  | 'matrix-scrolling-text'
  | 'matrix-digital-wave'
  | 'matrix-running-lines'
  | 'matrix-moving-dots';

export interface ModuleModeMeta {
  profileId: string;
  profileName: string;
  family: ControllerFamily;
  codeLabel: string;
  nativeId: number;
  bleFormat?: BlePacketFormat;
  dmxPreset?: number[];
  fromLiveDevice?: boolean;
}

export interface RgbMode {
  id: number;
  code: string;
  name: string;
  category: ModeCategory;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  pattern: AnimationPattern;
  eyeBehavior?: EyeBehavior;
  isCustom?: boolean;
  moduleMeta?: ModuleModeMeta;
}

export type WelcomeStyle =
  | 'sweep'
  | 'center-out'
  | 'cyber-flash'
  | 'dual-meet'
  | 'row-cascade'
  | 'pulse-bloom';

export interface SpecialSettings {
  welcomeStyle: WelcomeStyle;
  welcomeColor: string; // 'cyan' | 'crimson' | 'rainbow' | 'ice' | '#RRGGBB'
  seinPattern: 'sequential' | 'full' | 'blink' | 'pulse';
  seinSpeed: number;
  brakePattern: 'f1-strobe' | 'solid' | 'pulse-hold';
  brakeFlashCount: number;
  comboPriority: 'signal-over-rgb' | 'blend';
}

export interface LedConfig {
  leftCount: number;
  rightCount: number;
  chipset: 'WS2812B' | 'WS2815' | 'SK6812';
  colorOrder: 'GRB' | 'RGB' | 'BRG';
  maxCurrentMa: number;
  pixelShape: 'square' | 'round';
  showMovingEyes: boolean;
  swapPanels?: boolean;
  testOverride: 'none' | 'red' | 'green' | 'blue' | 'white' | 'off';
}

export interface DeviceConfig {
  boardName: string;
  ssid: string;
  ipAddress: string;
  port: number;
  connectionStatus: 'simulation' | 'connecting' | 'connected';
  autoReconnect: boolean;
  adminPin: string;
}

export type ControllerFamily = 'esp8266' | 'dmx' | 'car' | 'wled' | 'bluetooth' | 'custom';
export type ControllerProtocol = 'websocket' | 'http-json' | 'artnet-ws' | 'ble';
export type BlePacketFormat = 'rns-json' | 'elk-bledom' | 'triones' | 'dmx-ble';
export type BleTargetZone = 'all' | 'rear' | 'front';

export interface BleConnectionSummary {
  id: string;
  deviceName: string;
  via: 'web-bluetooth' | 'android-bridge';
  zone: BleTargetZone;
  format: BlePacketFormat;
  serviceUuid: string | null;
  charUuid: string | null;
  lastHex: string | null;
}

export interface DiscoveredModuleMode {
  nativeId: number;
  name: string;
  codeLabel?: string;
  category?: ModeCategory;
  primaryColor?: string;
  secondaryColor?: string;
  pattern?: AnimationPattern;
  bleFormat?: BlePacketFormat;
  dmxPreset?: number[];
}

export interface MultiControllerProfile {
  id: string;
  name: string;
  family: ControllerFamily;
  protocol: ControllerProtocol;
  ipAddress: string;
  port: number;
  dmxUniverse?: number;
  dmxStartChannel?: number;
  dmxChannelMode?: '3CH' | '4CH' | '8CH' | '24CH';
  carZone?: 'all' | 'drl' | 'stoplamp' | 'cabin' | 'underglow';
  bleFormat?: BlePacketFormat;
  bleServiceUuid?: string;
  bleCharUuid?: string;
  notes?: string;
  discoveredModes?: DiscoveredModuleMode[];
}

export interface AdminMultiControllerState {
  activeProfileId: string;
  profiles: MultiControllerProfile[];
  dmxChannels: number[]; // 8-channel quick fader bank (CH1..CH8, 0..255)
  carZone: 'all' | 'drl' | 'stoplamp' | 'cabin' | 'underglow';
  showFactoryModesInApp?: boolean;
}

export interface MatrixModelItem {
  id: string;
  name: string;
  category: 'eyes' | 'matrix';
  eyeExpression?: EyeExpressionId;
  eyeShape?: EyeShapeId;
  matrixEffect?: MatrixEffectId;
  scrollingText?: string;
  primaryColor: string;
  secondaryColor: string;
  speed: number;
  size: number; // 1..5
  direction: 'left' | 'right' | 'up' | 'down';
  isCustom?: boolean;
}

export interface LedMatrixConfig {
  enabled: boolean;
  activeModelId: string;
  category: 'eyes' | 'matrix';
  eyeExpression: EyeExpressionId;
  eyeShape: EyeShapeId;
  matrixEffect: MatrixEffectId;
  scrollingText: string;
  primaryColor: string;
  secondaryColor: string;
  speed: number;
  size: number;
  direction: 'left' | 'right' | 'up' | 'down';
  customModels: MatrixModelItem[];
}

export interface ManualSideColorConfig {
  enabled: boolean;
  syncSides: boolean;
  leftColors: string[];
  rightColors: string[];
  leftBrightness: number;
  rightBrightness: number;
}

export interface AutoBelangConfig {
  enabled: boolean;
  colors: string[];
  colorCount: number;
  stripeCount: number;
  colorChangeSpeed: number;
  direction: 'left-to-right' | 'right-to-left' | 'center-out' | 'bounce' | 'alternate';
  pattern: 'stripes' | 'wave' | 'blocks' | 'diagonal' | 'pulse-split';
  moving: boolean;
}

export interface ComboConfig {
  leftModes: number[];
  rightModes: number[];
  style: 'sequence' | 'zone-split' | 'layer-blend';
  intervalSec: number;
  priorityMode?: 'blend' | 'first' | 'last';
  syncPanels?: boolean;
}

export interface RnsPreset {
  id: string;
  name: string;
  description?: string;
  activeModeId: number;
  speed: number;
  brightness: number;
  combinationEnabled: boolean;
  combo: ComboConfig;
  manualSideColors: ManualSideColorConfig;
  autoBelang: AutoBelangConfig;
  solidStayActive: boolean;
  solidColor: string;
  ledMatrixEnabled?: boolean;
  createdAt: number;
}

export interface AppCustomization {
  appName: string;
  accentTheme: AccentTheme;
  customAccentHex?: string;
  sectionOrder: HomeSectionId[];
  showWelcomeBtn: boolean;
  showSeinBtn: boolean;
  showBrakeBtn: boolean;
  showComboBtn: boolean;
  customModes: RgbMode[];
  modeOverrides: Record<number, Partial<RgbMode>>;
  // Full Admin Customization Studio
  backgroundMode?: BackgroundMode;
  backgroundColor?: string;
  backgroundGradientStart?: string;
  backgroundGradientEnd?: string;
  backgroundPattern?: BackgroundPatternId;
  backgroundImageUrl?: string;
  backgroundOverlayOpacity?: number;
  backgroundBlur?: number;
  cardStyle?: CardStyleId;
  cardRadius?: CardRadiusId;
  cardBgColor?: string;
  logoPreset?: LogoPresetId;
  customLogoUrl?: string;
  navOrder?: NavTab[];
  navLabels?: Partial<Record<NavTab, string>>;
  navIcons?: Partial<Record<NavTab, CustomIconId>>;
  quickIcons?: Partial<Record<'welcome' | 'sein' | 'brake' | 'combo', CustomIconId>>;
  leftBlockOrder?: LeftBlockId[];
  homeBlockOrder?: HomeBlockId[];
  quickControlsPlacement?: QuickControlsPlacement;
  showStatusBar?: boolean;
  showModeCollector?: boolean;
  showSlidersCard?: boolean;
  showWelcomeCard?: boolean;
  showStayWheelCard?: boolean;
  showCustomBanner?: boolean;
  customBannerText?: string;
  footerText?: string;
  // Unlimited Admin App Customizer Extensions
  backgroundGradientAngle?: number;
  backgroundGradientMid?: string;
  textColor?: string;
  mutedTextColor?: string;
  headerBgColor?: string;
  navBgColor?: string;
  borderColor?: string;
  fontFamily?: 'jakarta' | 'outfit' | 'mono' | 'system' | 'serif';
  fontScale?: number;
  customCardRadiusPx?: number;
  cardOpacity?: number;
  cardBlurPx?: number;
  cardBorderWidth?: number;
  quickLabels?: Partial<Record<'welcome' | 'sein' | 'brake' | 'reverse' | 'combo', string>>;
  visualizerTitle?: string;
  visualizerSubtitle?: string;
  hiddenTabs?: NavTab[];
  customerUnlockedTabs?: NavTab[];
  customCss?: string;
  // OTA Presets & Matrix Models
  customMatrixModels?: MatrixModelItem[];
  builtInPresets?: RnsPreset[];
}

export interface CloudReleaseMeta {
  version: number;
  versionLabel: string;
  releaseNotes: string;
}

export interface RemoteAppRelease {
  version: number;
  versionLabel: string;
  releaseNotes: string;
  customization: AppCustomization;
  updatedByUid: string;
}

export type SoundStyle = 'vu-bars' | 'bass-pulse' | 'spectrum-wave' | 'strobe-beat';

export interface SoundReactiveConfig {
  enabled: boolean;
  sensitivity: number; // 10..100
  style: SoundStyle;
}

export type FrontZoneEffect = 'solid' | 'pulse' | 'flow' | 'ring';

export interface FrontLampZoneConfig {
  enabled: boolean;
  color: string;
  brightness: number; // 10..100
  effect: FrontZoneEffect;
}

export interface FrontLampConfig {
  enabled: boolean;
  followRearMode?: boolean;
  syncColorWithRear: boolean;
  syncSeinWithRear: boolean;
  brakeFollowRear: false;
  devilEye: FrontLampZoneConfig;
  shroudBiled: FrontLampZoneConfig;
  alis: FrontLampZoneConfig;
}

export interface ScheduleConfig {
  onEnabled: boolean;
  onTime: string; // HH:MM
  offEnabled: boolean;
  offTime: string; // HH:MM
  triggerWelcomeOnStart: boolean;
}

export interface CountdownTimerConfig {
  active: boolean;
  endsAt: number;
  action: 'off' | 'on' | 'welcome';
}

export interface ScannedModuleRecord {
  id: string;
  rawCode: string;
  formatLabel: string;
  moduleName: string;
  family: ControllerFamily;
  protocol: ControllerProtocol;
  bleFormat?: BlePacketFormat;
  ipAddress?: string;
  port?: number;
  ssid?: string;
  macAddress?: string;
  scannedAt: number;
}

export interface ControllerState {
  powerOn?: boolean;
  activeModeId: number;
  speed: number;
  brightness: number;
  sein: SeinState;
  brakeActive: boolean;
  reverseActive?: boolean;
  combinationEnabled: boolean;
  solidStayActive: boolean;
  solidColor: string;
  welcomePlayingUntil: number;
  favorites: number[];
  combo: ComboConfig;
  manualSideColors?: ManualSideColorConfig;
  autoBelang?: AutoBelangConfig;
  ledMatrix?: LedMatrixConfig;
  savedPresets?: RnsPreset[];
  special: SpecialSettings;
  led: LedConfig;
  device: DeviceConfig;
  customization: AppCustomization;
  cloudMeta: CloudReleaseMeta;
  adminControllers: AdminMultiControllerState;
  soundReactive: SoundReactiveConfig;
  frontLamp: FrontLampConfig;
  autoLoopModes?: boolean;
  autoLoopIntervalSec?: number;
  modulePassword?: string;
  modulePasswordEnabled?: boolean;
  moduleLocked?: boolean;
  shakeToChange?: boolean;
  schedule?: ScheduleConfig;
  countdownTimer?: CountdownTimerConfig;
  scannedModules?: ScannedModuleRecord[];
}
