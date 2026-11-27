import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  CloudUpload,
  Copy,
  Cpu,
  Download,
  FileCode2,
  KeyRound,
  LayoutGrid,
  LogOut,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ALL_MODE_CATEGORIES } from '../data/modes';
import {
  ADMIN_OWNER_EMAIL,
  isCloudAdminUser,
  publishRemoteRelease,
  signInCloudAdmin,
  signOutCloudAdmin,
  subscribeCloudAuth,
} from '../firebase';
import {
  AdminMultiControllerState,
  AnimationPattern,
  AppCustomization,
  BlePacketFormat,
  BleTargetZone,
  ControllerState,
  DeviceConfig,
  EyeBehavior,
  ModeCategory,
  MultiControllerProfile,
  RgbMode,
} from '../types/controller';
import {
  downloadApkZipBundle,
  downloadAppIconPng,
  downloadProjectArchiveZip,
  downloadStandaloneHtmlApp,
} from '../utils/downloadOfflineApp';
import { downloadEsp8266Sketch, generateEsp8266Sketch } from '../utils/esp8266Firmware';
import { isApkOrWebViewRuntime } from '../hooks/usePWAInstall';
import { BleSessionInfo } from '../utils/bluetoothController';
import { AdminControllerHub } from './AdminControllerHub';
import { AdminStudioCustomizer } from './AdminStudioCustomizer';
import { PWAInstallButton } from './PWAInstallButton';

interface AdminViewProps {
  state: ControllerState;
  allModes: RgbMode[];
  isInstalled: boolean;
  connectionNote: string | null;
  hubStatus: { connected: boolean; message: string | null };
  bleSession: BleSessionInfo;
  onUpdateDevice: <K extends keyof DeviceConfig>(key: K, value: DeviceConfig[K]) => void;
  onUpdateCustomization: <K extends keyof AppCustomization>(
    key: K,
    value: AppCustomization[K]
  ) => void;
  onAddCustomMode: (mode: Omit<RgbMode, 'id' | 'code' | 'isCustom'>) => void;
  onUpdateExistingMode: (id: number, patch: Partial<RgbMode>) => void;
  onDeleteCustomMode: (id: number) => void;
  onSelectMode: (id: number) => void;
  onConnectToggle: () => void;
  onResetDefaults: () => void;
  onSelectHubProfile: (id: string) => void;
  onAddHubProfile: (profile: Omit<MultiControllerProfile, 'id'>) => void;
  onUpdateHubProfile: (id: string, patch: Partial<MultiControllerProfile>) => void;
  onDeleteHubProfile: (id: string) => void;
  onUpdateDmxChannel: (index: number, value: number) => void;
  onSetDmxChannelsBulk: (values: number[]) => void;
  onUpdateCarZone: (zone: AdminMultiControllerState['carZone']) => void;
  onConnectHubProfile: () => void;
  onSendHubSyncPacket: () => void;
  onScanBle: (zone?: BleTargetZone) => void;
  onDisconnectBle: (connectionId?: string) => void;
  onSetBleZone: (connectionId: string, zone: BleTargetZone) => void;
  onSetBleFormat: (connectionId: string, format: BlePacketFormat) => void;
  onSendRawBle: (payload: string, isHex: boolean) => void;
  moduleModes: RgbMode[];
  scanningModes: boolean;
  onDiscoverModuleModes: (profileId: string) => void;
  onToggleShowFactoryModes: (enabled: boolean) => void;
  onResetCustomization: () => void;
  onOpenBarcodeScanner: () => void;
}

type AdminSubTab = 'studio' | 'layout' | 'cloud' | 'hub' | 'device';

const PATTERN_OPTIONS: { id: AnimationPattern; label: string }[] = [
  { id: 'meteor-rain', label: 'Meteor · Hujan Meteor' },
  { id: 'warp-speed', label: 'Meteor · Bintang Warp' },
  { id: 'knight-sweep', label: 'Running · Sapuan Knight' },
  { id: 'cyber-wing', label: 'Running · Sayap Cyber' },
  { id: 'infinity-loop', label: 'Running · Simpul Infinity' },
  { id: 'matrix-running-lines', label: 'Running · Garis Multi-Baris' },
  { id: 'strobe-duo', label: 'Strobo · Ganda L-R' },
  { id: 'police-strobe', label: 'Strobo · Patwal Double Blitz' },
  { id: 'plasma-wave', label: 'Wave · Plasma Drift' },
  { id: 'wave-bounce', label: 'Wave · Pantulan Pusat' },
  { id: 'twister-wave', label: 'Wave · Twister 2D' },
  { id: 'matrix-digital-wave', label: 'Wave · Digital Matrix' },
  { id: 'dual-comet', label: 'Chase · Komet Ganda' },
  { id: 'zigzag-snake', label: 'Chase · Ular Zigzag' },
  { id: 'laser-cross', label: 'Chase · Silang Laser' },
  { id: 'crimson-pulse', label: 'Pulse · Denyut Sport' },
  { id: 'heartbeat', label: 'Pulse · Detak Jantung' },
  { id: 'shockwave-ring', label: 'Pulse · Cincin Kejut' },
  { id: 'cyber-scan', label: 'Scanner · Cyber Presisi' },
  { id: 'radar-sweep', label: 'Scanner · Radar 360' },
  { id: 'neon-breathe', label: 'Breathing · Napas Halus' },
  { id: 'stealth-dim', label: 'Breathing · Stealth Malam' },
  { id: 'vapor-fade', label: 'Breathing · Senja Fade' },
  { id: 'aurora-dual', label: 'Gradient · Aurora Dual' },
  { id: 'ocean-drift', label: 'Gradient · Arus Samudra' },
  { id: 'horizon-split', label: 'Gradient · Belah Horizon' },
  { id: 'solid-dual', label: 'Gradient · Dua Lapis Statis' },
  { id: 'rainbow-flow', label: 'Rainbow · Spektrum Flow' },
  { id: 'prism-shift', label: 'Rainbow · Prisma Geser' },
  { id: 'sparkle-ice', label: 'Pixel · Kilau Kristal' },
  { id: 'fireworks-burst', label: 'Pixel · Kembang Api' },
  { id: 'matrix-moving-pixel', label: 'Pixel · Bergerak Acak' },
  { id: 'matrix-moving-dots', label: 'Pixel · Titik Orbit' },
  { id: 'matrix-rain', label: 'Matrix · Hujan 2D' },
  { id: 'matrix-drop', label: 'Matrix · Segmen Turun' },
  { id: 'checker-wave', label: 'Matrix · Catur Digital' },
  { id: 'cyber-eyes', label: 'Matrix · Digital Eyes' },
  { id: 'spectrum-bars', label: 'Matrix · Spektrum Bar' },
  { id: 'matrix-equalizer', label: 'Matrix · Equalizer RGB' },
  { id: 'matrix-scrolling-text', label: 'Matrix · Tulisan Berjalan' },
  { id: 'dna-helix', label: 'Kombinasi · Spiral Helix' },
  { id: 'vortex-spin', label: 'Kombinasi · Pusaran Vortex' },
  { id: 'galaxy-spiral', label: 'Kombinasi · Spiral Galaksi' },
  { id: 'fire-ember', label: 'Kombinasi · Bara Api' },
  { id: 'white-run-out', label: 'White Running · Tengah → Luar' },
  { id: 'white-run-in', label: 'White Running · Luar → Tengah' },
  { id: 'white-run-bounce', label: 'White Running · Ping-Pong' },
  { id: 'white-run-rows', label: 'White Running · 8 Baris' },
  { id: 'white-run-dual', label: 'White Running · Dual Sweep' },
  { id: 'white-run-comet', label: 'White Running · Ekor Komet' },
  { id: 'white-strobe-flash', label: 'White Strobo · Kilat' },
  { id: 'white-strobe-alt', label: 'White Strobo · Kiri-Kanan' },
  { id: 'white-strobe-burst', label: 'White Strobo · Triple Blitz' },
  { id: 'white-strobe-pulse', label: 'White Strobo · Fade' },
  { id: 'white-strobe-quad', label: 'White Strobo · Tactical Quad' },
  { id: 'white-strobe-wave', label: 'White Strobo · Gelombang Blitz' },
  { id: 'white-matrix-snake', label: 'White Matrix · Ular 8 Baris' },
  { id: 'white-matrix-checker', label: 'White Matrix · Catur Digital' },
  { id: 'white-matrix-rain', label: 'White Matrix · Hujan Salju' },
  { id: 'white-matrix-scan', label: 'White Matrix · Radar Laser Grid' },
  { id: 'white-matrix-sparkle', label: 'White Matrix · Kilau Berlian' },
  { id: 'white-matrix-cross', label: 'White Matrix · Silang X-Beam' },
  { id: 'white-matrix-bars', label: 'White Matrix · Equalizer Bar' },
];

const EYE_OPTIONS: { id: EyeBehavior; label: string }[] = [
  { id: 'look-around', label: 'Mata Melirik' },
  { id: 'cyber-scan', label: 'Mata Cyber' },
  { id: 'angry-squint', label: 'Mata Tajam' },
  { id: 'blink-pulse', label: 'Kedip Halus' },
  { id: 'off', label: 'Tanpa Mata' },
];

export const AdminView: React.FC<AdminViewProps> = ({
  state,
  allModes,
  isInstalled,
  connectionNote,
  hubStatus,
  bleSession,
  onUpdateDevice,
  onUpdateCustomization,
  onAddCustomMode,
  onUpdateExistingMode,
  onDeleteCustomMode,
  onSelectMode,
  onConnectToggle,
  onResetDefaults,
  onSelectHubProfile,
  onAddHubProfile,
  onUpdateHubProfile,
  onDeleteHubProfile,
  onUpdateDmxChannel,
  onSetDmxChannelsBulk,
  onUpdateCarZone,
  onConnectHubProfile,
  onSendHubSyncPacket,
  onScanBle,
  onDisconnectBle,
  onSetBleZone,
  onSetBleFormat,
  onSendRawBle,
  moduleModes,
  scanningModes,
  onDiscoverModuleModes,
  onToggleShowFactoryModes,
  onResetCustomization,
  onOpenBarcodeScanner,
}) => {
  const { device, customization, cloudMeta } = state;
  const [subTab, setSubTab] = useState<AdminSubTab>('studio');
  const [exported, setExported] = useState(false);
  const [downloadedHtml, setDownloadedHtml] = useState(false);
  const [downloadedZip, setDownloadedZip] = useState(false);
  const [downloadedFullZip, setDownloadedFullZip] = useState(false);
  const [downloadedIntZip, setDownloadedIntZip] = useState(false);
  const [downloadedIcon, setDownloadedIcon] = useState(false);
  const [downloadedIno, setDownloadedIno] = useState(false);
  const [copiedIno, setCopiedIno] = useState(false);
  const [showInoCode, setShowInoCode] = useState(false);
  const [bundleBusy, setBundleBusy] = useState<'zip' | 'html' | 'full' | 'integration' | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState(device.adminPin);
  const [pinSaved, setPinSaved] = useState(false);

  // Cloud OTA state (Admin Only)
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [versionLabel, setVersionLabel] = useState(
    `v1.${Math.max(1, (cloudMeta?.version || 0) + 1)}`
  );
  const [releaseNotes, setReleaseNotes] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  useEffect(() => {
    return subscribeCloudAuth((user) => {
      setCloudUser(user);
    });
  }, []);

  useEffect(() => {
    setVersionLabel(`v1.${Math.max(1, (cloudMeta?.version || 0) + 1)}`);
  }, [cloudMeta?.version]);

  // Mode Studio state (Add new mode or update currently selected mode)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ModeCategory>('Custom');
  const [newPattern, setNewPattern] = useState<AnimationPattern>('aurora-dual');
  const [newEye, setNewEye] = useState<EyeBehavior>('look-around');
  const [newPrimary, setNewPrimary] = useState('#22D3EE');
  const [newSecondary, setNewSecondary] = useState('#EC4899');
  const [modeSavedNotice, setModeSavedNotice] = useState<string | null>(null);

  const activeMode = allModes.find((m) => m.id === state.activeModeId) || allModes[0];
  const isAuthorizedCloudAdmin = isCloudAdminUser(cloudUser);

  const handleCloudSignIn = async () => {
    setCloudBusy(true);
    setCloudStatus(null);
    try {
      const user = await signInCloudAdmin();
      if (!isCloudAdminUser(user)) {
        setCloudStatus({
          type: 'err',
          text: `Akun ${user.email || 'ini'} bukan Admin Cloud resmi (${ADMIN_OWNER_EMAIL}).`,
        });
      } else {
        setCloudStatus({
          type: 'ok',
          text: 'Akun Admin Cloud terverifikasi. Siap menerbitkan pembaruan.',
        });
      }
    } catch (err) {
      setCloudStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal login Google Admin.',
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCloudPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudBusy(true);
    setCloudStatus(null);
    try {
      const nextVersion = Math.max(1, (cloudMeta?.version || 0) + 1);
      await publishRemoteRelease({
        nextVersion,
        versionLabel: versionLabel.trim() || `v1.${nextVersion}`,
        releaseNotes: releaseNotes.trim(),
        customization,
      });
      setCloudStatus({
        type: 'ok',
        text: `Pembaruan ${versionLabel.trim() || `v1.${nextVersion}`} diterbitkan! Semua aplikasi Customer otomatis tersinkron.`,
      });
      setReleaseNotes('');
    } catch (err) {
      setCloudStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menerbitkan update cloud.',
      });
    } finally {
      setCloudBusy(false);
    }
  };

  const handleCreateMode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddCustomMode({
      name: trimmed,
      category: newCategory,
      description: 'Mode animasi tambahan buatan Admin.',
      primaryColor: newPrimary,
      secondaryColor: newSecondary,
      pattern: newPattern,
      eyeBehavior: newEye,
    });
    setNewName('');
    setModeSavedNotice(`Mode baru "${trimmed}" ditambahkan dan langsung aktif.`);
    window.setTimeout(() => setModeSavedNotice(null), 2600);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim();
    if (cleaned.length < 4) return;
    onUpdateDevice('adminPin', cleaned);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
  };

  const handleExportConfig = () => {
    const payload = JSON.stringify(
      {
        version: 'RNS-V1',
        activeModeId: state.activeModeId,
        speed: state.speed,
        brightness: state.brightness,
        special: state.special,
        led: state.led,
        customization,
        device: {
          boardName: device.boardName,
          ssid: device.ssid,
          ipAddress: device.ipAddress,
          port: device.port,
        },
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rns-stoplamp-config.json';
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleDownloadOfflineHtml = async () => {
    setBundleBusy('html');
    try {
      await downloadStandaloneHtmlApp(state, allModes);
      setDownloadedHtml(true);
      setTimeout(() => setDownloadedHtml(false), 2500);
    } finally {
      setBundleBusy(null);
    }
  };

  const handleDownloadApkZip = async () => {
    setBundleBusy('zip');
    try {
      await downloadApkZipBundle(state, allModes);
      setDownloadedZip(true);
      setTimeout(() => setDownloadedZip(false), 2500);
    } finally {
      setBundleBusy(null);
    }
  };

  const handleDownloadIcon = async () => {
    await downloadAppIconPng();
    setDownloadedIcon(true);
    setTimeout(() => setDownloadedIcon(false), 2500);
  };

  const handleDownloadProjectArchive = async (kind: 'full' | 'integration') => {
    setBundleBusy(kind);
    setBundleError(null);
    try {
      await downloadProjectArchiveZip(kind);
      if (kind === 'full') {
        setDownloadedFullZip(true);
        setTimeout(() => setDownloadedFullZip(false), 2500);
      } else {
        setDownloadedIntZip(true);
        setTimeout(() => setDownloadedIntZip(false), 2500);
      }
    } catch (err) {
      setBundleError(err instanceof Error ? err.message : 'Gagal mengunduh ZIP proyek.');
    } finally {
      setBundleBusy(null);
    }
  };

  const handleDownloadIno = () => {
    downloadEsp8266Sketch(state);
    setDownloadedIno(true);
    setTimeout(() => setDownloadedIno(false), 2500);
  };

  const handleCopyIno = async () => {
    const code = generateEsp8266Sketch(state);
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIno(true);
      setTimeout(() => setCopiedIno(false), 2500);
    } catch {
      setShowInoCode(true);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
          Panel Admin & Update Jarak Jauh
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Khusus Admin: atur mode animasi, tata letak, dan terbitkan pembaruan jarak jauh tanpa coding ke semua Customer.
        </p>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-[#111622] border border-white/[0.08]">
        <button
          type="button"
          onClick={() => setSubTab('studio')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium min-h-[40px] transition-colors ${
            subTab === 'studio'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Mode</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('layout')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium min-h-[40px] transition-colors ${
            subTab === 'layout'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Tampilan</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('cloud')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium min-h-[40px] transition-colors ${
            subTab === 'cloud'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CloudUpload className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">OTA</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('hub')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium min-h-[40px] transition-colors ${
            subTab === 'hub'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Modul</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('device')}
          className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-medium min-h-[40px] transition-colors ${
            subTab === 'device'
              ? 'bg-cyan-500 text-slate-950 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">ESP8266</span>
        </button>
      </div>

      {/* TAB 1: STUDIO MODE (Tambah / Edit Animasi) */}
      {subTab === 'studio' && (
        <div className="space-y-4">
          {modeSavedNotice && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3.5 py-2.5 text-xs text-emerald-300">
              {modeSavedNotice}
            </div>
          )}

          {/* Add New Animation Mode */}
          <form
            onSubmit={handleCreateMode}
            className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Tambah Mode Animasi Baru ({Math.max(400, ...customization.customModes.map((m) => m.id)) + 1})
              </h3>
              <span className="text-[11px] font-mono text-cyan-400">
                Mode {String(Math.max(400, ...customization.customModes.map((m) => m.id)) + 1).padStart(3, '0')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="new-mode-name" className="text-xs text-slate-400 block mb-1">
                  Nama Mode Baru
                </label>
                <input
                  id="new-mode-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Mata Elang Neon"
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="new-mode-category" className="text-xs text-slate-400 block mb-1">
                  Kategori Mode
                </label>
                <select
                  id="new-mode-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ModeCategory)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {ALL_MODE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-mode-pattern" className="text-xs text-slate-400 block mb-1">
                  Pola Gerakan Matrix
                </label>
                <select
                  id="new-mode-pattern"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value as AnimationPattern)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {PATTERN_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="new-mode-eye" className="text-xs text-slate-400 block mb-1">
                  Gaya Mata Bergerak
                </label>
                <select
                  id="new-mode-eye"
                  value={newEye}
                  onChange={(e) => setNewEye(e.target.value as EyeBehavior)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {EYE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="new-mode-c1" className="text-xs text-slate-400 block mb-1">
                    Warna 1
                  </label>
                  <input
                    id="new-mode-c1"
                    type="color"
                    value={newPrimary}
                    onChange={(e) => setNewPrimary(e.target.value)}
                    className="w-full h-10 p-1 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="new-mode-c2" className="text-xs text-slate-400 block mb-1">
                    Warna 2
                  </label>
                  <input
                    id="new-mode-c2"
                    type="color"
                    value={newSecondary}
                    onChange={(e) => setNewSecondary(e.target.value)}
                    className="w-full h-10 p-1 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambahkan Mode & Terapkan</span>
            </button>
          </form>

          {/* Edit / Update Currently Selected Mode */}
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                Edit Mode Aktif ({activeMode.code})
              </h3>
              {activeMode.isCustom && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomMode(activeMode.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-mode-name" className="text-xs text-slate-400 block mb-1">
                  Nama Mode
                </label>
                <input
                  id="edit-mode-name"
                  type="text"
                  value={activeMode.name}
                  onChange={(e) => onUpdateExistingMode(activeMode.id, { name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="edit-mode-eye" className="text-xs text-slate-400 block mb-1">
                  Gaya Mata Bergerak
                </label>
                <select
                  id="edit-mode-eye"
                  value={activeMode.eyeBehavior || 'look-around'}
                  onChange={(e) =>
                    onUpdateExistingMode(activeMode.id, {
                      eyeBehavior: e.target.value as EyeBehavior,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {EYE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-mode-pattern" className="text-xs text-slate-400 block mb-1">
                  Pola Gerakan Matrix
                </label>
                <select
                  id="edit-mode-pattern"
                  value={activeMode.pattern}
                  onChange={(e) =>
                    onUpdateExistingMode(activeMode.id, {
                      pattern: e.target.value as AnimationPattern,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {PATTERN_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-mode-category" className="text-xs text-slate-400 block mb-1">
                  Kategori Mode
                </label>
                <select
                  id="edit-mode-category"
                  value={activeMode.category}
                  onChange={(e) =>
                    onUpdateExistingMode(activeMode.id, {
                      category: e.target.value as ModeCategory,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
                >
                  {ALL_MODE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div>
                  <label htmlFor="edit-mode-c1" className="text-xs text-slate-400 block mb-1">
                    Ubah Warna 1
                  </label>
                  <input
                    id="edit-mode-c1"
                    type="color"
                    value={activeMode.primaryColor}
                    onChange={(e) =>
                      onUpdateExistingMode(activeMode.id, { primaryColor: e.target.value })
                    }
                    className="w-full h-10 p-1 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="edit-mode-c2" className="text-xs text-slate-400 block mb-1">
                    Ubah Warna 2
                  </label>
                  <input
                    id="edit-mode-c2"
                    type="color"
                    value={activeMode.secondaryColor}
                    onChange={(e) =>
                      onUpdateExistingMode(activeMode.id, { secondaryColor: e.target.value })
                    }
                    className="w-full h-10 p-1 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {customization.customModes.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="text-xs text-slate-400 mb-2">
                  Mode Tambahan Admin ({customization.customModes.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {customization.customModes.map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => onSelectMode(cm.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        state.activeModeId === cm.id
                          ? 'bg-cyan-500 text-slate-950 font-semibold'
                          : 'bg-[#171F2E] text-slate-300 hover:text-white'
                      }`}
                    >
                      {String(cm.id).padStart(3, '0')} · {cm.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: STUDIO KUSTOMISASI PENUH APLIKASI */}
      {subTab === 'layout' && (
        <AdminStudioCustomizer
          customization={customization}
          onUpdateCustomization={onUpdateCustomization}
          onResetCustomization={onResetCustomization}
        />
      )}

      {/* TAB 3: UPDATE CLOUD JARAK JAUH (KHUSUS ADMIN) */}
      {subTab === 'cloud' && (
        <div className="space-y-4">
          {/* Cloud Admin Google Auth Gate */}
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isAuthorizedCloudAdmin
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-cyan-500/10 text-cyan-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-100">
                    {isAuthorizedCloudAdmin
                      ? 'Admin Cloud Terhubung'
                      : 'Verifikasi Akun Admin Cloud'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {cloudUser
                      ? cloudUser.email || cloudUser.uid
                      : `Khusus ${ADMIN_OWNER_EMAIL} untuk kirim update massal`}
                  </div>
                </div>
              </div>

              {cloudUser ? (
                <button
                  type="button"
                  onClick={signOutCloudAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[38px] whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={handleCloudSignIn}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[38px] whitespace-nowrap disabled:opacity-50"
                >
                  <span>{cloudBusy ? 'Membuka...' : 'Login Google Admin'}</span>
                </button>
              )}
            </div>

            {isApkOrWebViewRuntime() && !isAuthorizedCloudAdmin && (
              <div className="rounded-xl px-3 py-2 text-xs bg-amber-500/10 border border-amber-400/25 text-amber-200">
                Untuk login Google & menerbitkan Update OTA jarak jauh, buka versi browser Chrome (Google memblokir popup login di dalam WebView APK). APK Customer tetap otomatis menerima update begitu terhubung internet.
              </div>
            )}

            {cloudStatus && (
              <div
                className={`rounded-xl px-3 py-2.5 text-xs border ${
                  cloudStatus.type === 'ok'
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                    : 'bg-red-500/15 border-red-400/30 text-red-300'
                }`}
              >
                {cloudStatus.text}
              </div>
            )}
          </section>

          {/* Publish Form */}
          <form
            onSubmit={handleCloudPublish}
            className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                Terbitkan Update Jarak Jauh (Tanpa Coding)
              </h3>
              <span className="text-[11px] font-mono text-cyan-400">
                {cloudMeta.version > 0 ? `Aktif: ${cloudMeta.versionLabel}` : 'Rilis Awal'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Sekali terbit, semua HP Customer produk massal Anda langsung menerima mode animasi baru, edit mode, nama brand, tema warna, dan tata letak kontrol cepat terbaru secara otomatis.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="ota-version-label" className="text-xs text-slate-400 block mb-1">
                  Label Versi
                </label>
                <input
                  id="ota-version-label"
                  type="text"
                  required
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ota-notes" className="text-xs text-slate-400 block mb-1">
                  Catatan Pembaruan (Opsional)
                </label>
                <input
                  id="ota-notes"
                  type="text"
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="Contoh: Tambah mode Mata Elang & perbaikan warna"
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-400">Mode Custom</div>
                <div className="text-xs font-mono font-semibold text-cyan-300 mt-0.5 tabular-nums">
                  {customization.customModes.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Mode Diedit</div>
                <div className="text-xs font-mono font-semibold text-slate-100 mt-0.5 tabular-nums">
                  {Object.keys(customization.modeOverrides).length}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Tema</div>
                <div className="text-xs font-semibold text-slate-100 mt-0.5 capitalize">
                  {customization.accentTheme}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isAuthorizedCloudAdmin || cloudBusy}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CloudUpload className="w-4 h-4" />
              <span>
                {cloudBusy
                  ? 'Mengirim Pembaruan...'
                  : 'Terbitkan Update ke Semua Customer'}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: MULTI-MODUL HUB KHUSUS ADMIN (DMX, CAR, WLED, ESP, BLE) */}
      {subTab === 'hub' && (
        <AdminControllerHub
          hubState={state.adminControllers}
          activeColorHex={state.solidStayActive ? state.solidColor : activeMode.primaryColor}
          activeModeId={state.activeModeId}
          brightness={state.brightness}
          speed={state.speed}
          hubStatus={hubStatus}
          bleSession={bleSession}
          onSelectProfile={onSelectHubProfile}
          onAddProfile={onAddHubProfile}
          onUpdateProfile={onUpdateHubProfile}
          onDeleteProfile={onDeleteHubProfile}
          onUpdateDmxChannel={onUpdateDmxChannel}
          onSetDmxChannelsBulk={onSetDmxChannelsBulk}
          onUpdateCarZone={onUpdateCarZone}
          onConnectHubProfile={onConnectHubProfile}
          onSendSyncPacket={onSendHubSyncPacket}
          onScanBle={onScanBle}
          onDisconnectBle={onDisconnectBle}
          onSetBleZone={onSetBleZone}
          onSetBleFormat={onSetBleFormat}
          onSendRawBle={onSendRawBle}
          moduleModes={moduleModes}
          scanningModes={scanningModes}
          onSelectModuleMode={onSelectMode}
          onDiscoverModuleModes={onDiscoverModuleModes}
          onToggleShowFactoryModes={onToggleShowFactoryModes}
          onOpenBarcodeScanner={onOpenBarcodeScanner}
        />
      )}

      {/* TAB 5: PERANGKAT, PIN & DOWNLOAD */}
      {subTab === 'device' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    device.connectionStatus === 'connected'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-800 text-cyan-400'
                  }`}
                >
                  {device.connectionStatus === 'connected' ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{device.boardName}</div>
                  <div className="text-xs text-slate-400">
                    {device.connectionStatus === 'connected'
                      ? `Terhubung ke ${device.ipAddress}:${device.port}`
                      : device.connectionStatus === 'connecting'
                        ? 'Menghubungkan ke perangkat...'
                        : 'Siap terhubung ke modul'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onConnectToggle}
                className={`px-4 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors whitespace-nowrap ${
                  device.connectionStatus === 'connected'
                    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
              >
                {device.connectionStatus === 'connected'
                  ? 'Putuskan'
                  : device.connectionStatus === 'connecting'
                    ? 'Menyambung...'
                    : 'Hubungkan'}
              </button>
            </div>

            {connectionNote && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                {connectionNote}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="esp-ssid" className="text-xs text-slate-400 block mb-1.5">
                  SSID Wi-Fi AP
                </label>
                <input
                  id="esp-ssid"
                  type="text"
                  value={device.ssid}
                  onChange={(e) => onUpdateDevice('ssid', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="esp-ip" className="text-xs text-slate-400 block mb-1.5">
                  Alamat IP ESP8266
                </label>
                <input
                  id="esp-ip"
                  type="text"
                  value={device.ipAddress}
                  onChange={(e) => onUpdateDevice('ipAddress', e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label htmlFor="esp-port" className="text-xs text-slate-400 block mb-1.5">
                  Port WebSocket
                </label>
                <input
                  id="esp-port"
                  type="number"
                  value={device.port}
                  onChange={(e) => onUpdateDevice('port', Number(e.target.value) || 81)}
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-cyan-400/60"
                />
              </div>
            </div>
          </section>

          <form
            onSubmit={handleSavePin}
            className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 flex flex-wrap items-end justify-between gap-3"
          >
            <div className="flex-1 min-w-[180px]">
              <label htmlFor="new-admin-pin" className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ubah PIN Login Admin (min 4 digit)</span>
              </label>
              <input
                id="new-admin-pin"
                type="text"
                inputMode="numeric"
                minLength={4}
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-400/60"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-semibold text-cyan-300 hover:bg-[#1E293B] min-h-[40px] whitespace-nowrap"
            >
              {pinSaved ? 'PIN Tersimpan' : 'Simpan PIN'}
            </button>
          </form>

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Firmware Wemos D1 Mini ESP8266 (.ino)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    8 baris: 27, 32, 32, 28, 24, 20, 16, 8 (187×2 = 374 LED) · Baris 8 → Baris 1 · 390+ mode, 6 Welcome &amp; Belang.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadIno}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[40px] whitespace-nowrap"
                >
                  {downloadedIno ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadedIno ? 'Firmware Tersimpan' : 'Unduh Firmware (.ino)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyIno}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[40px] whitespace-nowrap"
                >
                  {copiedIno ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedIno ? 'Kode Disalin' : 'Salin Kode'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInoCode((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white min-h-[40px] whitespace-nowrap"
                >
                  <span>{showInoCode ? 'Tutup Kode' : 'Lihat Kode'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2">
                <div className="text-[10px] text-slate-400">Data LED Belakang</div>
                <div className="text-xs font-semibold font-mono text-cyan-300">D5 (GPIO14)</div>
              </div>
              <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2">
                <div className="text-[10px] text-slate-400">Data Lampu Depan</div>
                <div className="text-xs font-semibold font-mono text-cyan-300">D6 (GPIO12)</div>
              </div>
              <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2">
                <div className="text-[10px] text-slate-400">Rem (Brake)</div>
                <div className="text-xs font-semibold font-mono text-red-400">D1 (GPIO5)</div>
              </div>
              <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2">
                <div className="text-[10px] text-slate-400">Sein Kiri</div>
                <div className="text-xs font-semibold font-mono text-amber-300">D7 (GPIO13)</div>
              </div>
              <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2">
                <div className="text-[10px] text-slate-400">Sein Kanan</div>
                <div className="text-xs font-semibold font-mono text-amber-300">D2 (GPIO4)</div>
              </div>
              <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] px-3 py-2">
                <div className="text-[10px] text-slate-400">Sensor Suara / Mic</div>
                <div className="text-xs font-semibold font-mono text-emerald-300">A0 / Mic HP</div>
              </div>
            </div>

            {showInoCode && (
              <textarea
                readOnly
                value={generateEsp8266Sketch(state)}
                onClick={(e) => e.currentTarget.select()}
                aria-label="Kode sumber ESP8266 Wemos D1 Mini"
                className="w-full h-64 p-3 rounded-xl bg-[#070A0F] border border-white/[0.08] font-mono text-[11px] text-slate-200 leading-relaxed focus:outline-none"
              />
            )}

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-white/[0.06] pt-2">
              Library wajib di Arduino IDE / ArduinoDroid (OTG HP):{' '}
              <span className="font-mono text-slate-200">FastLED</span>,{' '}
              <span className="font-mono text-slate-200">WebSockets</span>,{' '}
              <span className="font-mono text-slate-200">ArduinoJson</span>. Total{' '}
              <span className="font-mono text-slate-200">{state.led.leftCount + state.led.rightCount}</span> LED seri ({state.led.leftCount} + {state.led.rightCount}).
            </p>
          </section>

          {!isInstalled && (
            <>
              <PWAInstallButton variant="card" />

              <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                      <FileCode2 className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-100">
                        Paket Aplikasi Mandiri (.ZIP untuk WebIntoApp)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sudah berisi <span className="font-mono text-slate-200">index.html</span> di root ZIP &amp; terkompresi Deflate (&lt; 1 MB) agar langsung lolos batas 2 MB gratis WebIntoApp.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={bundleBusy !== null}
                    onClick={handleDownloadApkZip}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[40px] whitespace-nowrap disabled:opacity-60"
                  >
                    {downloadedZip ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    <span>
                      {bundleBusy === 'zip'
                        ? 'Menyiapkan ZIP...'
                        : downloadedZip
                          ? 'ZIP Tersimpan'
                          : 'Unduh Paket .ZIP (APK)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadIcon}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[40px] whitespace-nowrap"
                  >
                    {downloadedIcon ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{downloadedIcon ? 'Ikon Tersimpan' : 'Unduh Ikon 512px (.png)'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={bundleBusy !== null}
                    onClick={handleDownloadOfflineHtml}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:text-white min-h-[40px] whitespace-nowrap disabled:opacity-60"
                  >
                    {downloadedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>
                      {bundleBusy === 'html'
                        ? 'Menyiapkan...'
                        : downloadedHtml
                          ? 'HTML Tersimpan'
                          : 'Ekspor (.html)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={bundleBusy !== null}
                    onClick={() => void handleDownloadProjectArchive('full')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs font-semibold text-emerald-200 hover:text-white min-h-[40px] whitespace-nowrap disabled:opacity-60"
                  >
                    {downloadedFullZip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>
                      {bundleBusy === 'full'
                        ? 'Mengunduh Full ZIP...'
                        : downloadedFullZip
                          ? 'Full ZIP Tersimpan'
                          : 'Unduh Source Lengkap + Android (.ZIP)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={bundleBusy !== null}
                    onClick={() => void handleDownloadProjectArchive('integration')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#171F2E] border border-cyan-400/35 text-xs font-medium text-cyan-200 hover:text-white min-h-[40px] whitespace-nowrap disabled:opacity-60"
                  >
                    {downloadedIntZip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>
                      {bundleBusy === 'integration'
                        ? 'Mengunduh Integrasi...'
                        : downloadedIntZip
                          ? 'ZIP Integrasi Tersimpan'
                          : 'Unduh ZIP Integrasi GitHub'}
                    </span>
                  </button>
                </div>

                {bundleError && (
                  <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                    {bundleError}
                  </p>
                )}

                <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed pt-1 border-t border-white/[0.06]">
                  <li>
                    Tekan <strong>Unduh Paket .ZIP (APK)</strong> dan <strong>Unduh Ikon 512px (.png)</strong> di atas.
                  </li>
                  <li>
                    Buka <strong>webintoapp.com</strong> di browser HP → pilih menu <strong>HTML / Local Files (ZIP)</strong> (<em>jangan pakai URL server</em>).
                  </li>
                  <li>
                    Unggah file <span className="font-mono text-slate-200">RNS-RGB-Controller-APK.zip</span> dan ikon <span className="font-mono text-slate-200">rns-icon-512.png</span>, lalu tekan <strong>Make App</strong> untuk mengunduh file <strong>.APK</strong> siap jual.
                  </li>
                </ol>
              </section>
            </>
          )}

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Cadangan Pengaturan</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ekspor JSON atau reset seluruh pengaturan ke awal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportConfig}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-medium text-slate-200 hover:bg-[#1E293B] min-h-[40px]"
              >
                {exported ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>{exported ? 'Tersimpan' : 'Ekspor JSON'}</span>
              </button>

              <button
                type="button"
                onClick={onResetDefaults}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-300 hover:bg-red-500/20 min-h-[40px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
