import React from 'react';
import {
  Bluetooth,
  BluetoothConnected,
  Clock,
  Cpu,
  Grid,
  Layers,
  Music,
  Palette,
  Radio,
  ScanBarcode,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Wifi,
} from 'lucide-react';
import { ControllerState, NavTab, RgbMode, UserRole } from '../types/controller';
import { BleSessionInfo } from '../utils/bluetoothController';
import { AppBrandLogo } from './IconRegistry';

interface HomeViewProps {
  state: ControllerState;
  allModes: RgbMode[];
  role: UserRole;
  bleSession: BleSessionInfo;
  accentHex: string;
  onOpenTab: (tab: NavTab) => void;
  onOpenDeviceManager: () => void;
  onOpenBarcodeScanner: () => void;
  onTriggerWelcome: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  state,
  allModes,
  role,
  bleSession,
  accentHex,
  onOpenTab,
  onOpenDeviceManager,
  onOpenBarcodeScanner,
  onTriggerWelcome,
}) => {
  const activeMode = allModes.find((m) => m.id === state.activeModeId) || allModes[0];
  const activeProfile =
    state.adminControllers.profiles.find(
      (p) => p.id === state.adminControllers.activeProfileId
    ) || state.adminControllers.profiles[0];

  const wifiConnected = state.device.connectionStatus === 'connected';
  const bleConnected = bleSession.connected;

  const activeSummaryTitle = state.ledMatrix?.enabled
    ? `LED Matrix · ${
        state.ledMatrix.category === 'eyes'
          ? `Eyes (${state.ledMatrix.eyeExpression})`
          : state.ledMatrix.matrixEffect
      }`
    : state.autoBelang?.enabled
      ? `Mode Belang Otomatis (${state.autoBelang.colorCount} Warna · ${state.autoBelang.stripeCount} Belang)`
      : state.combinationEnabled
        ? `Kombinasi Multi-Mode (L:${state.combo.leftModes.length} · R:${state.combo.rightModes.length})`
        : state.solidStayActive
          ? `Warna Statis (${state.solidColor})`
          : `${activeMode?.code || 'Mode 001'} · ${activeMode?.name || 'Aurora Dual'}`;

  const activeSummarySub = state.manualSideColors?.enabled
    ? `Custom Warna L/R Aktif (${state.manualSideColors.leftColors[0]} / ${
        state.manualSideColors.syncSides
          ? state.manualSideColors.leftColors[0]
          : state.manualSideColors.rightColors[0]
      })`
    : state.soundReactive?.enabled
      ? `Mode Suara Aktif (${state.soundReactive.style})`
      : activeMode?.description || 'Siap mengontrol modul RGB & LED Matrix.';

  const primaryShortcuts: {
    tab: NavTab;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      tab: 'rgb',
      label: 'RGB Controller',
      subtitle: `${allModes.length} mode, warna & speed`,
      icon: Palette,
    },
    {
      tab: 'belang',
      label: 'Mode Belang',
      subtitle: 'Kombinasi & warna L/R',
      icon: Layers,
    },
    {
      tab: 'matrix',
      label: 'LED Matrix',
      subtitle: 'Digital Eyes & teks',
      icon: Grid,
    },
    {
      tab: 'white',
      label: 'White Full',
      subtitle: 'Running, Strobo & Matrix',
      icon: Sun,
    },
    {
      tab: 'sinyal',
      label: 'Sinyal',
      subtitle: 'Sein, Hazard, Rem, Mundur',
      icon: Sparkles,
    },
    ...(role === 'admin'
      ? [
          {
            tab: 'admin' as NavTab,
            label: 'Admin Studio',
            subtitle: 'Tema, OTA, preset & animasi',
            icon: Shield,
          },
        ]
      : [
          {
            tab: 'connect' as NavTab,
            label: 'Koneksi Modul',
            subtitle: 'Wi-Fi, Bluetooth & barcode',
            icon: Wifi,
          },
        ]),
  ];

  const utilityShortcuts: {
    tab: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { tab: 'music', label: 'Musik', icon: Music },
    { tab: 'schedule', label: 'Jadwal & PIN', icon: Clock },
    { tab: 'led', label: 'LED Setup', icon: Sliders },
    ...(role === 'customer' ? [] : [{ tab: 'connect' as NavTab, label: 'Koneksi', icon: Radio }]),
  ];

  return (
    <div className="space-y-4">
      {/* 1. Identitas RNS & Status Koneksi Controller */}
      <section
        aria-label="Identitas dan Status Koneksi RNS"
        className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <AppBrandLogo
              logoPreset={state.customization.logoPreset}
              customLogoUrl={state.customization.customLogoUrl}
              accentHex={accentHex}
              className="w-11 h-11 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-slate-100 tracking-tight truncate">
                {state.customization.appName || 'RNS Controller'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {activeProfile?.name || state.device.boardName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onTriggerWelcome}
            className="px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-semibold text-cyan-300 hover:text-white whitespace-nowrap min-h-[40px]"
          >
            Welcome
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onOpenDeviceManager}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left min-h-[44px] transition-colors ${
              bleConnected || wifiConnected
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
                : 'bg-[#0B0F17] border-white/[0.08] text-slate-200 hover:border-cyan-400/40'
            }`}
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              {bleConnected ? (
                <BluetoothConnected className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Bluetooth className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span className="text-xs font-medium truncate">
                {bleConnected
                  ? `BLE: ${bleSession.deviceName}`
                  : wifiConnected
                    ? `Wi-Fi: ${state.device.ipAddress}`
                    : 'Mode Simulasi · Hubungkan Modul'}
              </span>
            </span>
            <span className="text-[11px] font-semibold text-cyan-400 shrink-0">Atur</span>
          </button>

          <button
            type="button"
            onClick={onOpenBarcodeScanner}
            className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-slate-200 hover:border-cyan-400/40 min-h-[44px] transition-colors"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <ScanBarcode className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-medium truncate">Scan Barcode / QR Modul</span>
            </span>
            <span className="text-[11px] font-semibold text-cyan-400 shrink-0">Kamera</span>
          </button>
        </div>
      </section>

      {/* 2. Informasi Perangkat & Ringkasan Mode Aktif */}
      <section
        aria-label="Informasi Perangkat dan Mode Aktif"
        className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">Mode Aktif Saat Ini</div>
              <div className="text-sm font-semibold text-slate-100 truncate">
                {activeSummaryTitle}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{activeSummarySub}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onOpenTab(
                state.ledMatrix?.enabled
                  ? 'matrix'
                  : state.combinationEnabled || state.autoBelang?.enabled
                    ? 'belang'
                    : 'rgb'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[36px] shrink-0"
          >
            Ubah
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.06] text-xs">
          <div className="rounded-xl bg-[#0B0F17] px-3 py-2">
            <div className="text-[10px] text-slate-400">Board / IC</div>
            <div className="font-mono font-semibold text-slate-100 truncate">
              {state.led.chipset}
            </div>
          </div>
          <div className="rounded-xl bg-[#0B0F17] px-3 py-2">
            <div className="text-[10px] text-slate-400">Total LED</div>
            <div className="font-mono font-semibold text-slate-100 tabular-nums">
              {state.led.leftCount + state.led.rightCount} px
            </div>
          </div>
          <div className="rounded-xl bg-[#0B0F17] px-3 py-2">
            <div className="text-[10px] text-slate-400">Kecepatan</div>
            <div className="font-mono font-semibold text-cyan-300 tabular-nums">
              {state.speed}%
            </div>
          </div>
          <div className="rounded-xl bg-[#0B0F17] px-3 py-2">
            <div className="text-[10px] text-slate-400">Kecerahan</div>
            <div className="font-mono font-semibold text-cyan-300 tabular-nums">
              {state.brightness}%
            </div>
          </div>
        </div>
      </section>

      {/* 3. Akses Cepat Menu Utama */}
      <section aria-label="Menu Utama Aplikasi" className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Akses Cepat Menu</h3>
          <span className="text-[11px] text-slate-400">Pilih halaman kontrol</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {primaryShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onOpenTab(item.tab)}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#111622] border border-white/[0.08] hover:border-cyan-400/50 text-left min-h-[64px] transition-colors"
              >
                <span className="w-9 h-9 rounded-xl bg-[#171F2E] text-cyan-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Shortcut Utilitas Tambahan */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {utilityShortcuts.map((u) => {
            const Icon = u.icon;
            return (
              <button
                key={u.tab}
                type="button"
                onClick={() => onOpenTab(u.tab)}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-[#111622] border border-white/[0.08] hover:border-cyan-400/40 text-xs font-medium text-slate-200 min-h-[44px] transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{u.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
