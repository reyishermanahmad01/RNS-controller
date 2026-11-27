import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Code2,
  Download,
  Image as ImageIcon,
  Layers,
  Palette,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AccentTheme,
  AppCustomization,
  BackgroundMode,
  BackgroundPatternId,
  CardRadiusId,
  CardStyleId,
  CustomIconId,
  HomeBlockId,
  LeftBlockId,
  LogoPresetId,
  NavTab,
  QuickControlsPlacement,
} from '../types/controller';
import {
  AppBrandLogo,
  CUSTOM_ICON_OPTIONS,
  LOGO_PRESET_OPTIONS,
} from './IconRegistry';

interface AdminStudioCustomizerProps {
  customization: AppCustomization;
  onUpdateCustomization: <K extends keyof AppCustomization>(
    key: K,
    value: AppCustomization[K]
  ) => void;
  onResetCustomization: () => void;
}

const ACCENT_THEMES: { id: AccentTheme; label: string; color: string }[] = [
  { id: 'cyan', label: 'Cyan', color: '#22D3EE' },
  { id: 'magenta', label: 'Magenta', color: '#EC4899' },
  { id: 'crimson', label: 'Merah', color: '#EF4444' },
  { id: 'amber', label: 'Amber', color: '#F59E0B' },
  { id: 'emerald', label: 'Hijau', color: '#10B981' },
];

const PATTERN_OPTIONS: { id: BackgroundPatternId; label: string }[] = [
  { id: 'none', label: 'Polos' },
  { id: 'carbon', label: 'Karbon Fiber' },
  { id: 'matrix-grid', label: 'Grid Matrix' },
  { id: 'diagonal', label: 'Garis Miring' },
  { id: 'hex', label: 'Titik Hexa' },
];

const NAV_TAB_DEFAULTS: Record<NavTab, string> = {
  home: 'Home',
  rgb: 'RGB',
  belang: 'Belang',
  matrix: 'Matrix',
  white: 'White Full',
  sinyal: 'Sinyal',
  music: 'Musik',
  schedule: 'Jadwal',
  connect: 'Koneksi',
  led: 'LED',
  admin: 'Admin',
  mode: 'RGB (Lama)',
  special: 'Sinyal (Lama)',
};

const ALL_TABS_LIST: NavTab[] = [
  'home',
  'rgb',
  'belang',
  'matrix',
  'white',
  'sinyal',
  'music',
  'schedule',
  'connect',
  'led',
  'admin',
];

const LEFT_BLOCK_LABELS: Record<LeftBlockId, string> = {
  'status-bar': 'Bar Status & Unduh APK/Offline',
  visualizer: 'Demo Matrix LED 2 Panel',
  'mode-collector': 'Kolektor Slide Mode Vertikal',
};

const HOME_BLOCK_LABELS: Record<HomeBlockId, string> = {
  sliders: 'Slider Kecepatan & Kecerahan',
  'welcome-card': 'Kartu Warna & Animasi Welcome',
  'stay-wheel': 'Roda Warna RGB Stay / Diam',
};

const FONT_OPTIONS: { id: NonNullable<AppCustomization['fontFamily']>; label: string }[] = [
  { id: 'jakarta', label: 'Jakarta Sans (Default)' },
  { id: 'outfit', label: 'Outfit Modern' },
  { id: 'mono', label: 'JetBrains Mono' },
  { id: 'system', label: 'System UI' },
  { id: 'serif', label: 'Elegan Serif' },
];

function processImageFile(
  file: File,
  maxDim: number,
  mime: 'image/jpeg' | 'image/webp' | 'image/png',
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      if (file.type === 'image/svg+xml' || file.size <= 350000) {
        resolve(rawUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(16, Math.round(img.width * scale));
        const h = Math.max(16, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

function swapItems<T>(arr: T[], idx: number, delta: -1 | 1): T[] {
  const next = [...arr];
  const target = idx + delta;
  if (target < 0 || target >= next.length) return next;
  const tmp = next[idx];
  next[idx] = next[target];
  next[target] = tmp;
  return next;
}

export const AdminStudioCustomizer: React.FC<AdminStudioCustomizerProps> = ({
  customization,
  onUpdateCustomization,
  onResetCustomization,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [themeNotice, setThemeNotice] = useState<string | null>(null);
  const [section, setSection] = useState<'brand' | 'bg' | 'icons' | 'layout' | 'pro'>('brand');

  const baseNav = customization.navOrder || ALL_TABS_LIST;
  const navOrder: NavTab[] = [
    ...baseNav,
    ...ALL_TABS_LIST.filter((t) => !baseNav.includes(t)),
  ];
  const leftOrder = customization.leftBlockOrder || ['status-bar', 'visualizer', 'mode-collector'];
  const rawHomeOrder = customization.homeBlockOrder || ['sliders', 'welcome-card', 'stay-wheel'];
  const filteredHomeOrder = rawHomeOrder.filter(
    (id): id is HomeBlockId => id === 'sliders' || id === 'welcome-card' || id === 'stay-wheel'
  );
  const homeOrder: HomeBlockId[] = filteredHomeOrder.length
    ? filteredHomeOrder
    : ['sliders', 'welcome-card', 'stay-wheel'];
  const bgMode: BackgroundMode = customization.backgroundMode || 'solid';
  const activeAccentHex =
    customization.customAccentHex ||
    ACCENT_THEMES.find((t) => t.id === customization.accentTheme)?.color ||
    '#22D3EE';

  const hiddenTabs = customization.hiddenTabs || [];
  const customerUnlockedTabs = customization.customerUnlockedTabs || [];

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const processed = await processImageFile(file, 512, 'image/png', 0.92);
      onUpdateCustomization('customLogoUrl', processed);
      onUpdateCustomization('logoPreset', 'custom');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal unggah logo.');
    }
    e.target.value = '';
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const processed = await processImageFile(file, 1920, 'image/jpeg', 0.88);
      onUpdateCustomization('backgroundImageUrl', processed);
      onUpdateCustomization('backgroundMode', 'image');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal unggah foto latar.');
    }
    e.target.value = '';
  };

  const toggleHiddenTab = (tabId: NavTab) => {
    const next = hiddenTabs.includes(tabId)
      ? hiddenTabs.filter((t) => t !== tabId)
      : [...hiddenTabs, tabId];
    onUpdateCustomization('hiddenTabs', next);
  };

  const toggleCustomerTabUnlock = (tabId: NavTab) => {
    const next = customerUnlockedTabs.includes(tabId)
      ? customerUnlockedTabs.filter((t) => t !== tabId)
      : [...customerUnlockedTabs, tabId];
    onUpdateCustomization('customerUnlockedTabs', next);
  };

  const handleExportThemeJson = () => {
    const blob = new Blob([JSON.stringify(customization, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rns-tema-admin-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    setThemeNotice('File JSON tema & kustomisasi lengkap berhasil diunduh.');
  };

  const handleImportThemeJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AppCustomization>;
      (Object.keys(parsed) as (keyof AppCustomization)[]).forEach((key) => {
        if (parsed[key] !== undefined) {
          onUpdateCustomization(key, parsed[key] as AppCustomization[typeof key]);
        }
      });
      setThemeNotice('Seluruh pengaturan tema JSON berhasil diterapkan tanpa batasan!');
    } catch {
      setUploadError('File JSON tema tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Studio Kustomisasi Penuh Admin (Tanpa Batasan)
          </h3>
          <p className="text-[11px] text-slate-400">
            Atur bebas warna, teks, font, kartu, ikon, nama tombol, hak akses menu, foto, hingga CSS custom tanpa batas lalu terbitkan ke semua Customer.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetCustomization}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171F2E] border border-white/[0.08] text-[11px] font-medium text-slate-300 hover:text-white min-h-[34px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Tampilan</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-[#111622] border border-white/[0.08]">
        {(
          [
            { id: 'brand', label: 'Logo & Teks', icon: Sparkles },
            { id: 'bg', label: 'Warna & Kartu', icon: ImageIcon },
            { id: 'icons', label: 'Menu & Ikon', icon: Palette },
            { id: 'layout', label: 'Susunan', icon: Layers },
            { id: 'pro', label: 'CSS & Ekspor', icon: Code2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10px] sm:text-[11px] font-medium min-h-[38px] transition-colors ${
                active
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {uploadError && (
        <div className="rounded-xl bg-red-500/15 border border-red-400/30 px-3 py-2 text-xs text-red-300">
          {uploadError}
        </div>
      )}

      {themeNotice && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3 py-2 text-xs text-emerald-300">
          {themeNotice}
        </div>
      )}

      {/* 1. IDENTITAS, LOGO, BANNER & DEMO LABEL (TANPA BATASAN KARAKTER) */}
      {section === 'brand' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
            <div>
              <label htmlFor="custom-app-name" className="text-xs text-slate-400 block mb-1.5">
                Nama Aplikasi di Header &amp; Layar Login (Bebas Panjang)
              </label>
              <input
                id="custom-app-name"
                type="text"
                value={customization.appName}
                onChange={(e) => onUpdateCustomization('appName', e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm text-slate-100 focus:outline-none focus:border-cyan-400/60"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">Logo Utama Aplikasi (Resolusi Tinggi)</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#171F2E] border border-cyan-400/35 text-[11px] font-medium text-cyan-300 cursor-pointer hover:text-white">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="sr-only"
                    />
                  </label>
                  {customization.customLogoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateCustomization('customLogoUrl', '');
                        onUpdateCustomization('logoPreset', 'rns-matrix');
                      }}
                      aria-label="Hapus logo custom"
                      className="p-1.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {LOGO_PRESET_OPTIONS.map((preset: { id: LogoPresetId; label: string }) => {
                  const selected = (customization.logoPreset || 'rns-matrix') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onUpdateCustomization('logoPreset', preset.id)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[10px] font-medium transition-colors ${
                        selected
                          ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                          : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <AppBrandLogo
                        logoPreset={preset.id}
                        customLogoUrl={customization.customLogoUrl}
                        accentHex={activeAccentHex}
                        className="w-8 h-8"
                      />
                      <span className="truncate w-full text-center">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="custom-vis-title" className="text-xs text-slate-400 block mb-1">
                  Judul Kartu Demo Matrix LED
                </label>
                <input
                  id="custom-vis-title"
                  type="text"
                  value={customization.visualizerTitle || ''}
                  onChange={(e) => onUpdateCustomization('visualizerTitle', e.target.value)}
                  placeholder="Default: Demo Matrix LED"
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="custom-vis-sub" className="text-xs text-slate-400 block mb-1">
                  Subjudul / Info Bengkel Demo
                </label>
                <input
                  id="custom-vis-sub"
                  type="text"
                  value={customization.visualizerSubtitle || ''}
                  onChange={(e) => onUpdateCustomization('visualizerSubtitle', e.target.value)}
                  placeholder="Kosongkan untuk status mode live"
                  className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Banner Pengumuman / Nama Bengkel Atas
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Muncul di bagian atas halaman untuk semua Customer (panjang teks bebas).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCustomization('showCustomBanner', !customization.showCustomBanner)
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[34px] ${
                    customization.showCustomBanner
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.08]'
                  }`}
                >
                  {customization.showCustomBanner ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
              <input
                type="text"
                value={customization.customBannerText || ''}
                onChange={(e) => onUpdateCustomization('customBannerText', e.target.value)}
                placeholder="Contoh: RNS GARAGE · Bengkel Custom Stoplamp Matrix"
                className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
              />
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <label htmlFor="custom-footer-text" className="text-xs text-slate-400 block mb-1">
                Teks Footer Bawah (Opsional · Panjang Bebas)
              </label>
              <input
                id="custom-footer-text"
                type="text"
                value={customization.footerText || ''}
                onChange={(e) => onUpdateCustomization('footerText', e.target.value)}
                placeholder="Contoh: Powered by RNS RGB Project · WA 08xx"
                className="w-full h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
              />
            </div>
          </section>
        </div>
      )}

      {/* 2. LATAR BELAKANG, WARNA BEBAS, TIPOGRAFI & KARTU */}
      {section === 'bg' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">Jenis Latar Belakang Aplikasi</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'solid', label: 'Solid' },
                    { id: 'gradient', label: 'Gradasi' },
                    { id: 'pattern', label: 'Pola' },
                    { id: 'image', label: 'Foto' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onUpdateCustomization('backgroundMode', m.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border min-h-[38px] ${
                      bgMode === m.id
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {bgMode === 'solid' && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0B0F17] border border-white/[0.06] p-3">
                <span className="text-xs text-slate-300">Warna Latar Solid</span>
                <input
                  type="color"
                  value={customization.backgroundColor || '#090C12'}
                  onChange={(e) => onUpdateCustomization('backgroundColor', e.target.value)}
                  className="w-12 h-9 p-0.5 rounded-lg bg-[#171F2E] border border-white/10 cursor-pointer"
                />
              </div>
            )}

            {bgMode === 'gradient' && (
              <div className="space-y-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.06] p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] text-slate-300">Awal</span>
                    <input
                      type="color"
                      value={customization.backgroundGradientStart || '#090C12'}
                      onChange={(e) =>
                        onUpdateCustomization('backgroundGradientStart', e.target.value)
                      }
                      className="w-full h-9 p-0.5 rounded-lg bg-[#171F2E] border border-white/10 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] text-slate-300">Tengah</span>
                    <input
                      type="color"
                      value={customization.backgroundGradientMid || customization.backgroundGradientStart || '#0D1524'}
                      onChange={(e) =>
                        onUpdateCustomization('backgroundGradientMid', e.target.value)
                      }
                      className="w-full h-9 p-0.5 rounded-lg bg-[#171F2E] border border-white/10 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] text-slate-300">Akhir</span>
                    <input
                      type="color"
                      value={customization.backgroundGradientEnd || '#0F1E33'}
                      onChange={(e) =>
                        onUpdateCustomization('backgroundGradientEnd', e.target.value)
                      }
                      className="w-full h-9 p-0.5 rounded-lg bg-[#171F2E] border border-white/10 cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Sudut Gradasi</span>
                    <span className="font-mono">{customization.backgroundGradientAngle ?? 180}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={customization.backgroundGradientAngle ?? 180}
                    onChange={(e) =>
                      onUpdateCustomization('backgroundGradientAngle', Number(e.target.value))
                    }
                    className="rns-slider w-full"
                  />
                </div>
              </div>
            )}

            {bgMode === 'pattern' && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {PATTERN_OPTIONS.map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => onUpdateCustomization('backgroundPattern', pat.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border min-h-[38px] ${
                      (customization.backgroundPattern || 'carbon') === pat.id
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>
            )}

            {bgMode === 'image' && (
              <div className="space-y-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.06] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold cursor-pointer hover:bg-cyan-400">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Foto Wallpaper HD</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadBg}
                      className="sr-only"
                    />
                  </label>
                  {customization.backgroundImageUrl && (
                    <button
                      type="button"
                      onClick={() => onUpdateCustomization('backgroundImageUrl', '')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-300 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  value={
                    customization.backgroundImageUrl?.startsWith('data:')
                      ? ''
                      : customization.backgroundImageUrl || ''
                  }
                  onChange={(e) => onUpdateCustomization('backgroundImageUrl', e.target.value)}
                  placeholder="Atau tempel URL gambar https://..."
                  className="w-full h-9 px-3 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Gelap Overlay</span>
                      <span className="font-mono">
                        {customization.backgroundOverlayOpacity ?? 65}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={customization.backgroundOverlayOpacity ?? 65}
                      onChange={(e) =>
                        onUpdateCustomization('backgroundOverlayOpacity', Number(e.target.value))
                      }
                      className="rns-slider w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Blur Foto</span>
                      <span className="font-mono">{customization.backgroundBlur ?? 2}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={40}
                      value={customization.backgroundBlur ?? 2}
                      onChange={(e) =>
                        onUpdateCustomization('backgroundBlur', Number(e.target.value))
                      }
                      className="rns-slider w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Accent Color */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Warna Aksen Utama &amp; Tombol Aktif</span>
                {customization.customAccentHex && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomization('customAccentHex', '')}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    Pakai Preset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {ACCENT_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onUpdateCustomization('accentTheme', t.id);
                      onUpdateCustomization('customAccentHex', '');
                    }}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[10px] font-medium min-h-[46px] transition-colors ${
                      !customization.customAccentHex && customization.accentTheme === t.id
                        ? 'bg-[#172133] border-white/40 text-white'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span>{t.label}</span>
                  </button>
                ))}
                <label className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl border border-white/[0.1] bg-[#0B0F17] text-[10px] text-slate-300 cursor-pointer min-h-[46px]">
                  <input
                    type="color"
                    value={activeAccentHex}
                    onChange={(e) => onUpdateCustomization('customAccentHex', e.target.value)}
                    className="w-6 h-4 p-0 bg-transparent border-0 cursor-pointer"
                  />
                  <span>Bebas</span>
                </label>
              </div>
            </div>

            {/* Palet Warna Lengkap (Teks, Header, Nav Bawah, Border) */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">
                  Warna Bebas Semua Komponen
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateCustomization('textColor', '');
                    onUpdateCustomization('mutedTextColor', '');
                    onUpdateCustomization('headerBgColor', '');
                    onUpdateCustomization('navBgColor', '');
                    onUpdateCustomization('borderColor', '');
                    onUpdateCustomization('cardBgColor', '');
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Reset Warna
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    { key: 'textColor', label: 'Teks Utama', def: '#F1F5F9' },
                    { key: 'mutedTextColor', label: 'Teks Sekunder', def: '#94A3B8' },
                    { key: 'cardBgColor', label: 'Latar Kartu', def: '#111622' },
                    { key: 'borderColor', label: 'Garis Border', def: '#334155' },
                    { key: 'headerBgColor', label: 'Bar Header Atas', def: '#090C12' },
                    { key: 'navBgColor', label: 'Navigasi Bawah', def: '#0D121C' },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[#0B0F17] border border-white/[0.06] px-2.5 py-2 cursor-pointer"
                  >
                    <span className="text-[11px] text-slate-300 truncate">{item.label}</span>
                    <input
                      type="color"
                      value={customization[item.key] || item.def}
                      onChange={(e) => onUpdateCustomization(item.key, e.target.value)}
                      className="w-8 h-6 p-0.5 rounded bg-[#171F2E] border border-white/10 cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Geometri Kartu & Tipografi Presisi */}
            <div className="pt-2 border-t border-white/[0.06] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400 block mb-1.5">Jenis Huruf (Font)</span>
                  <select
                    value={customization.fontFamily || 'jakarta'}
                    onChange={(e) =>
                      onUpdateCustomization(
                        'fontFamily',
                        e.target.value as AppCustomization['fontFamily']
                      )
                    }
                    className="w-full h-9 px-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Skala Ukuran Teks</span>
                    <span className="font-mono text-slate-200">{customization.fontScale ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={130}
                    value={customization.fontScale ?? 100}
                    onChange={(e) => onUpdateCustomization('fontScale', Number(e.target.value))}
                    className="rns-slider w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400 block mb-1.5">Gaya Kartu</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'solid', label: 'Solid' },
                        { id: 'glass', label: 'Kaca' },
                        { id: 'contrast', label: 'Gelap' },
                      ] as { id: CardStyleId; label: string }[]
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onUpdateCustomization('cardStyle', st.id)}
                        className={`py-1.5 rounded-lg text-[11px] font-medium border ${
                          (customization.cardStyle || 'solid') === st.id
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                            : 'bg-[#0B0F17] border-white/[0.06] text-slate-400'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1.5">Preset Sudut</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'sharp', label: 'Tegas' },
                        { id: 'rounded', label: 'Standar' },
                        { id: 'soft', label: 'Bulat' },
                      ] as { id: CardRadiusId; label: string }[]
                    ).map((rd) => (
                      <button
                        key={rd.id}
                        type="button"
                        onClick={() => {
                          onUpdateCustomization('cardRadius', rd.id);
                          onUpdateCustomization('customCardRadiusPx', undefined);
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-medium border ${
                          customization.customCardRadiusPx === undefined &&
                          (customization.cardRadius || 'rounded') === rd.id
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                            : 'bg-[#0B0F17] border-white/[0.06] text-slate-400'
                        }`}
                      >
                        {rd.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Radius Sudut</span>
                    <span className="font-mono">{customization.customCardRadiusPx ?? 16}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={customization.customCardRadiusPx ?? 16}
                    onChange={(e) =>
                      onUpdateCustomization('customCardRadiusPx', Number(e.target.value))
                    }
                    className="rns-slider w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Tebal Border</span>
                    <span className="font-mono">{customization.cardBorderWidth ?? 1}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    value={customization.cardBorderWidth ?? 1}
                    onChange={(e) =>
                      onUpdateCustomization('cardBorderWidth', Number(e.target.value))
                    }
                    className="rns-slider w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Opasitas Kartu</span>
                    <span className="font-mono">{customization.cardOpacity ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    value={customization.cardOpacity ?? 100}
                    onChange={(e) =>
                      onUpdateCustomization('cardOpacity', Number(e.target.value))
                    }
                    className="rns-slider w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Blur Kaca</span>
                    <span className="font-mono">{customization.cardBlurPx ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={customization.cardBlurPx ?? 0}
                    onChange={(e) =>
                      onUpdateCustomization('cardBlurPx', Number(e.target.value))
                    }
                    className="rns-slider w-full"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 3. IKON, LABEL MENU & HAK AKSES TAB BEBAS */}
      {section === 'icons' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">
                Ubah Nama, Ikon, Tampil/Sembunyi &amp; Akses Customer (Tanpa Batas)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Centang &ldquo;Buka Customer&rdquo; jika Admin ingin mengizinkan Customer mengakses menu tersebut (misal Sinyal/Special).
              </p>
            </div>
            <div className="space-y-2">
              {ALL_TABS_LIST.map((tabId) => {
                const labelVal =
                  customization.navLabels?.[tabId] ?? NAV_TAB_DEFAULTS[tabId];
                const iconVal = customization.navIcons?.[tabId] || 'default';
                const isHidden = hiddenTabs.includes(tabId);
                const unlockedForCust = customerUnlockedTabs.includes(tabId);
                return (
                  <div
                    key={tabId}
                    className="p-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.06] space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <span className="col-span-3 text-[11px] font-mono text-slate-400 uppercase">
                        {tabId}
                      </span>
                      <input
                        type="text"
                        value={labelVal}
                        onChange={(e) =>
                          onUpdateCustomization('navLabels', {
                            ...(customization.navLabels || {}),
                            [tabId]: e.target.value,
                          })
                        }
                        className="col-span-5 h-8 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-100"
                      />
                      <select
                        value={iconVal}
                        onChange={(e) =>
                          onUpdateCustomization('navIcons', {
                            ...(customization.navIcons || {}),
                            [tabId]: e.target.value as CustomIconId,
                          })
                        }
                        className="col-span-4 h-8 px-2 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-200"
                      >
                        {CUSTOM_ICON_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => toggleHiddenTab(tabId)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                          isHidden
                            ? 'bg-red-500/20 text-red-300 border border-red-400/35'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                        }`}
                      >
                        {isHidden ? 'Menu Disembunyikan' : 'Menu Tampil'}
                      </button>
                      {(tabId === 'sinyal' || tabId === 'special') && (
                        <button
                          type="button"
                          onClick={() => toggleCustomerTabUnlock(tabId)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                            unlockedForCust
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-[#171F2E] text-slate-300 border border-white/[0.08]'
                          }`}
                        >
                          {unlockedForCust ? 'Terbuka untuk Customer ✓' : 'Buka ke Customer'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200">
              Tombol Kontrol Cepat Atas (Nama Bebas, Tampil/Sembunyi &amp; Ikon)
            </h4>
            <div className="space-y-2">
              {(
                [
                  { id: 'welcome', showKey: 'showWelcomeBtn', label: 'Welcome' },
                  { id: 'sein', showKey: 'showSeinBtn', label: 'Sein / Hazard' },
                  { id: 'brake', showKey: 'showBrakeBtn', label: 'Rem' },
                  { id: 'reverse', showKey: null, label: 'Mundur' },
                  { id: 'combo', showKey: 'showComboBtn', label: 'Belang' },
                ] as const
              ).map((item) => {
                const enabled = item.showKey ? customization[item.showKey] : true;
                const iconVal =
                  item.id !== 'reverse'
                    ? customization.quickIcons?.[item.id] || 'default'
                    : 'default';
                const customLabel = customization.quickLabels?.[item.id] ?? item.label;
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.06]"
                  >
                    {item.showKey ? (
                      <button
                        type="button"
                        onClick={() => onUpdateCustomization(item.showKey, !enabled)}
                        className={`col-span-4 px-2 py-1.5 rounded-lg text-[11px] font-medium text-center ${
                          enabled
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                            : 'bg-[#171F2E] text-slate-500'
                        }`}
                      >
                        {enabled ? 'Tampil' : 'Sembunyi'}
                      </button>
                    ) : (
                      <span className="col-span-4 px-2 py-1.5 rounded-lg text-[11px] text-center bg-cyan-500/10 text-cyan-300">
                        Aktif
                      </span>
                    )}
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) =>
                        onUpdateCustomization('quickLabels', {
                          ...(customization.quickLabels || {}),
                          [item.id]: e.target.value,
                        })
                      }
                      aria-label={`Nama tombol ${item.label}`}
                      className="col-span-4 h-8 px-2.5 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-100"
                    />
                    {item.id !== 'reverse' ? (
                      <select
                        value={iconVal}
                        onChange={(e) =>
                          onUpdateCustomization('quickIcons', {
                            ...(customization.quickIcons || {}),
                            [item.id]: e.target.value as CustomIconId,
                          })
                        }
                        aria-label={`Pilih ikon tombol ${item.label}`}
                        className="col-span-4 h-8 px-2 rounded-lg bg-[#111622] border border-white/[0.08] text-xs text-slate-200"
                      >
                        {CUSTOM_ICON_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="col-span-4 text-[10px] text-slate-500 text-center">
                        Ikon Bohlam
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* 4. SUSUNAN PENUH APLIKASI */}
      {section === 'layout' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-200 block">
              Posisi Bar Kontrol Cepat
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'top', label: 'Paling Atas' },
                  { id: 'below-demo', label: 'Bawah Demo' },
                  { id: 'hidden', label: 'Sembunyikan' },
                ] as { id: QuickControlsPlacement; label: string }[]
              ).map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onUpdateCustomization('quickControlsPlacement', pos.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border ${
                    (customization.quickControlsPlacement || 'top') === pos.id
                      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                      : 'bg-[#0B0F17] border-white/[0.06] text-slate-400'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200">
              Susunan Kolom Demo LED &amp; Bar Status
            </h4>
            {leftOrder.map((blk, idx) => {
              const toggleKey =
                blk === 'status-bar'
                  ? 'showStatusBar'
                  : blk === 'mode-collector'
                    ? 'showModeCollector'
                    : null;
              const isVisible = toggleKey ? customization[toggleKey] !== false : true;
              return (
                <div
                  key={blk}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B0F17] border border-white/[0.06]"
                >
                  <span className="text-xs text-slate-200 truncate">
                    {idx + 1}. {LEFT_BLOCK_LABELS[blk]}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {toggleKey && (
                      <button
                        type="button"
                        onClick={() => onUpdateCustomization(toggleKey, !isVisible)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold mr-1 ${
                          isVisible
                            ? 'bg-cyan-500/20 text-cyan-200'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isVisible ? 'Tampil' : 'Mati'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        onUpdateCustomization('leftBlockOrder', swapItems(leftOrder, idx, -1))
                      }
                      aria-label="Naik"
                      className="min-w-[30px] min-h-[30px] rounded-lg bg-[#171F2E] text-slate-300 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === leftOrder.length - 1}
                      onClick={() =>
                        onUpdateCustomization('leftBlockOrder', swapItems(leftOrder, idx, 1))
                      }
                      aria-label="Turun"
                      className="min-w-[30px] min-h-[30px] rounded-lg bg-[#171F2E] text-slate-300 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200">
              Susunan Blok Beranda (Home)
            </h4>
            {homeOrder.map((blk, idx) => {
              const toggleKey =
                blk === 'sliders'
                  ? 'showSlidersCard'
                  : blk === 'welcome-card'
                    ? 'showWelcomeCard'
                    : 'showStayWheelCard';
              const isVisible = customization[toggleKey] !== false;
              return (
                <div
                  key={blk}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B0F17] border border-white/[0.06]"
                >
                  <span className="text-xs text-slate-200 truncate">
                    {idx + 1}. {HOME_BLOCK_LABELS[blk]}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateCustomization(toggleKey, !isVisible)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold mr-1 ${
                        isVisible
                          ? 'bg-cyan-500/20 text-cyan-200'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isVisible ? 'Tampil' : 'Mati'}
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        onUpdateCustomization('homeBlockOrder', swapItems(homeOrder, idx, -1))
                      }
                      aria-label="Naik"
                      className="min-w-[30px] min-h-[30px] rounded-lg bg-[#171F2E] text-slate-300 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === homeOrder.length - 1}
                      onClick={() =>
                        onUpdateCustomization('homeBlockOrder', swapItems(homeOrder, idx, 1))
                      }
                      aria-label="Turun"
                      className="min-w-[30px] min-h-[30px] rounded-lg bg-[#171F2E] text-slate-300 disabled:opacity-30 flex items-center justify-center"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-200">
              Urutan Tab Navigasi Aplikasi
            </h4>
            {navOrder.map((tabId, idx) => (
              <div
                key={tabId}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B0F17] border border-white/[0.06]"
              >
                <span className="text-xs text-slate-200">
                  {idx + 1}. {customization.navLabels?.[tabId] || NAV_TAB_DEFAULTS[tabId]}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() =>
                      onUpdateCustomization('navOrder', swapItems(navOrder, idx, -1))
                    }
                    aria-label="Naik"
                    className="min-w-[30px] min-h-[30px] rounded-lg bg-[#171F2E] text-slate-300 disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === navOrder.length - 1}
                    onClick={() =>
                      onUpdateCustomization('navOrder', swapItems(navOrder, idx, 1))
                    }
                    aria-label="Turun"
                    className="min-w-[30px] min-h-[30px] rounded-lg bg-[#171F2E] text-slate-300 disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* 5. CUSTOM CSS BEBAS & EKSPOR / IMPOR TEMA JSON */}
      {section === 'pro' && (
        <div className="space-y-4">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">
                  Custom CSS Bebas (Mode Pakar Admin)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tulis aturan CSS apa pun secara langsung untuk memodifikasi seluruh tampilan aplikasi tanpa batas.
                </p>
              </div>
              {customization.customCss && (
                <button
                  type="button"
                  onClick={() => onUpdateCustomization('customCss', '')}
                  className="text-[11px] text-red-300 hover:underline"
                >
                  Hapus CSS
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateCustomization(
                    'customCss',
                    `.rns-theme-root section.rounded-2xl { box-shadow: 0 0 22px rgba(34, 211, 238, 0.14); border-color: rgba(34, 211, 238, 0.35); }`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-[11px] text-cyan-300 hover:border-cyan-400/50"
              >
                + Glow Neon Cyan
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateCustomization(
                    'customCss',
                    `.rns-theme-root section.rounded-2xl { box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55); background: linear-gradient(145deg, rgba(20, 27, 42, 0.92), rgba(9, 13, 22, 0.95)) !important; }`
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-[11px] text-slate-200 hover:border-cyan-400/50"
              >
                + Kartu 3D Racing
              </button>
            </div>

            <textarea
              rows={6}
              value={customization.customCss || ''}
              onChange={(e) => onUpdateCustomization('customCss', e.target.value)}
              placeholder="/* Contoh: .rns-theme-root header { border-bottom-color: #22d3ee; } */"
              className="w-full p-3 rounded-xl bg-[#0B0F17] border border-white/[0.1] text-xs font-mono text-cyan-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60"
            />
          </section>

          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">
                Cadangkan &amp; Muat Preset Tema (.json)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Simpan seluruh hasil kustomisasi Admin menjadi file JSON atau terapkan ulang kapan saja.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportThemeJson}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor Tema JSON</span>
              </button>
              <label className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#171F2E] border border-white/[0.1] text-xs font-semibold text-slate-200 hover:text-white cursor-pointer min-h-[42px]">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Impor Tema JSON</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportThemeJson}
                  className="sr-only"
                />
              </label>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
