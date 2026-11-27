import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Bookmark,
  Copy,
  Layers,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AutoBelangConfig,
  ComboConfig,
  ControllerState,
  ManualSideColorConfig,
  ModeCategory,
  RnsPreset,
  RgbMode,
} from '../types/controller';
import { ALL_MODE_CATEGORIES } from '../data/modes';
import { SidePanelPreviewCanvas } from './StoplampVisualizer';

interface ModeBelangViewProps {
  state: ControllerState;
  allModes: RgbMode[];
  presets: RnsPreset[];
  onToggleCombination: () => void;
  onUpdateCombo: (next: ComboConfig) => void;
  onUpdateManualSideColors: (next: ManualSideColorConfig) => void;
  onUpdateAutoBelang: (next: AutoBelangConfig) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: RnsPreset) => void;
  onDuplicatePreset: (preset: RnsPreset) => void;
  onRenamePreset: (id: string, name: string) => void;
  onDeletePreset: (id: string) => void;
}

const DEFAULT_SIDE_COLORS: ManualSideColorConfig = {
  enabled: false,
  syncSides: false,
  leftColors: ['#EF4444'],
  rightColors: ['#3B82F6'],
  leftBrightness: 100,
  rightBrightness: 100,
};

const DEFAULT_AUTO_BELANG: AutoBelangConfig = {
  enabled: false,
  colors: ['#EF4444', '#22D3EE', '#F59E0B', '#EC4899'],
  colorCount: 4,
  stripeCount: 6,
  colorChangeSpeed: 60,
  direction: 'left-to-right',
  pattern: 'stripes',
  moving: true,
};

const QUICK_SWATCHES = [
  '#EF4444',
  '#F59E0B',
  '#22C55E',
  '#22D3EE',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
  '#FFFFFF',
];

export const ModeBelangView: React.FC<ModeBelangViewProps> = ({
  state,
  allModes,
  presets,
  onToggleCombination,
  onUpdateCombo,
  onUpdateManualSideColors,
  onUpdateAutoBelang,
  onSavePreset,
  onLoadPreset,
  onDuplicatePreset,
  onRenamePreset,
  onDeletePreset,
}) => {
  const [subTab, setSubTab] = useState<'combo' | 'colors' | 'auto' | 'presets'>('combo');
  const [targetPanel, setTargetPanel] = useState<'left' | 'right'>('left');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | ModeCategory>('Semua');
  const [manualNumberInput, setManualNumberInput] = useState('');

  // Side color input states
  const [leftColorDraft, setLeftColorDraft] = useState('#EF4444');
  const [rightColorDraft, setRightColorDraft] = useState('#3B82F6');
  const [autoColorDraft, setAutoColorDraft] = useState('#10B981');

  // Preset states
  const [presetNameInput, setPresetNameInput] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');

  const sideColors: ManualSideColorConfig = {
    ...DEFAULT_SIDE_COLORS,
    ...(state.manualSideColors || {}),
  };

  const autoBelang: AutoBelangConfig = {
    ...DEFAULT_AUTO_BELANG,
    ...(state.autoBelang || {}),
  };

  const currentList = targetPanel === 'left' ? state.combo.leftModes : state.combo.rightModes;

  const filteredModes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allModes.filter((m) => {
      if (categoryFilter !== 'Semua' && m.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        String(m.id).includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [allModes, searchQuery, categoryFilter]);

  const appendModeToTarget = (modeId: number) => {
    if (!allModes.some((m) => m.id === modeId)) return;
    if (state.combo.syncPanels) {
      const nextBoth = [...state.combo.leftModes, modeId];
      onUpdateCombo({
        ...state.combo,
        leftModes: nextBoth,
        rightModes: nextBoth,
      });
      return;
    }
    const nextList = [...currentList, modeId];
    onUpdateCombo({
      ...state.combo,
      [targetPanel === 'left' ? 'leftModes' : 'rightModes']: nextList,
    });
  };

  const moveComboSlot = (panel: 'left' | 'right', idx: number, delta: -1 | 1) => {
    const list = [...(panel === 'left' ? state.combo.leftModes : state.combo.rightModes)];
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = tmp;
    if (state.combo.syncPanels) {
      onUpdateCombo({ ...state.combo, leftModes: list, rightModes: list });
    } else {
      onUpdateCombo({
        ...state.combo,
        [panel === 'left' ? 'leftModes' : 'rightModes']: list,
      });
    }
  };

  const removeComboSlot = (panel: 'left' | 'right', idx: number) => {
    const list = panel === 'left' ? state.combo.leftModes : state.combo.rightModes;
    if (list.length <= 1) return;
    const next = list.filter((_, i) => i !== idx);
    if (state.combo.syncPanels) {
      onUpdateCombo({ ...state.combo, leftModes: next, rightModes: next });
    } else {
      onUpdateCombo({
        ...state.combo,
        [panel === 'left' ? 'leftModes' : 'rightModes']: next,
      });
    }
  };

  const handleAddManualNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = manualNumberInput
      .split(/[\s,;]+/)
      .map((t) => parseInt(t.trim(), 10))
      .filter((n) => !Number.isNaN(n) && allModes.some((m) => m.id === n));
    if (tokens.length === 0) return;

    if (state.combo.syncPanels) {
      const next = [...state.combo.leftModes, ...tokens];
      onUpdateCombo({ ...state.combo, leftModes: next, rightModes: next });
    } else {
      const next = [...currentList, ...tokens];
      onUpdateCombo({
        ...state.combo,
        [targetPanel === 'left' ? 'leftModes' : 'rightModes']: next,
      });
    }
    setManualNumberInput('');
  };

  const addSideColor = (side: 'left' | 'right', hex: string) => {
    const clean = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
    if (!/^#[0-9A-F]{6}$/.test(clean)) return;
    const key = side === 'left' ? 'leftColors' : 'rightColors';
    const existing = sideColors[key];
    const nextArr = existing.includes(clean) ? existing : [...existing, clean].slice(0, 6);
    onUpdateManualSideColors({
      ...sideColors,
      enabled: true,
      [key]: nextArr,
    });
  };

  const removeSideColor = (side: 'left' | 'right', idx: number) => {
    const key = side === 'left' ? 'leftColors' : 'rightColors';
    if (sideColors[key].length <= 1) return;
    onUpdateManualSideColors({
      ...sideColors,
      [key]: sideColors[key].filter((_, i) => i !== idx),
    });
  };

  const handleSaveNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = presetNameInput.trim();
    if (!clean) return;
    onSavePreset(clean);
    setPresetNameInput('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
          Mode Belang &amp; Kombinasi Multi-Mode
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Gabungkan beberapa mode animasi sekaligus, atur warna kiri &amp; kanan bebas, mode belang otomatis, dan preset.
        </p>
      </div>

      {/* Preview Terpisah Kiri & Kanan secara Real-Time */}
      <section
        aria-label="Preview Panel Kiri dan Kanan Terpisah"
        className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3 space-y-2.5"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">Preview Kiri &amp; Kanan Terpisah</span>
          <span className="font-mono text-[11px] text-cyan-300">
            {autoBelang.enabled
              ? 'Belang Otomatis ON'
              : state.combinationEnabled
                ? `Kombinasi (${state.combo.style})`
                : 'Mode Tunggal'}
            {sideColors.enabled ? ' · Warna L/R Custom' : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#070A0F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.06] text-[11px]">
              <span className="font-semibold text-slate-200">Panel Kiri</span>
              <span className="font-mono text-cyan-300 tabular-nums">
                {sideColors.enabled ? `${sideColors.leftBrightness}%` : `${state.brightness}%`}
              </span>
            </div>
            <div className="h-20 sm:h-24">
              <SidePanelPreviewCanvas state={state} allModes={allModes} side="left" />
            </div>
          </div>

          <div className="rounded-xl bg-[#070A0F] border border-white/[0.08] overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.06] text-[11px]">
              <span className="font-semibold text-slate-200">Panel Kanan</span>
              <span className="font-mono text-cyan-300 tabular-nums">
                {sideColors.enabled
                  ? `${sideColors.syncSides ? sideColors.leftBrightness : sideColors.rightBrightness}%`
                  : `${state.brightness}%`}
              </span>
            </div>
            <div className="h-20 sm:h-24">
              <SidePanelPreviewCanvas state={state} allModes={allModes} side="right" />
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#0B0F17] p-1 rounded-2xl border border-white/[0.08]">
        {(
          [
            { id: 'combo', label: 'Kombinasi Mode' },
            { id: 'colors', label: 'Warna Kiri/Kanan' },
            { id: 'auto', label: 'Belang Otomatis' },
            { id: 'presets', label: `Preset (${presets.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold min-h-[40px] whitespace-nowrap transition-colors ${
              subTab === tab.id
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MULTI-MODE COMBINATION */}
      {subTab === 'combo' && (
        <div className="space-y-3.5">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onToggleCombination}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[42px] border transition-colors ${
                  state.combinationEnabled
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-[#171F2E] text-slate-200 border-white/[0.08]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>
                  {state.combinationEnabled ? 'Kombinasi Multi-Mode: AKTIF' : 'Aktifkan Kombinasi Multi-Mode'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateCombo({
                    ...state.combo,
                    syncPanels: !state.combo.syncPanels,
                    rightModes: !state.combo.syncPanels
                      ? [...state.combo.leftModes]
                      : state.combo.rightModes,
                  })
                }
                className={`px-3 py-2 rounded-xl text-xs font-medium min-h-[40px] border ${
                  state.combo.syncPanels
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-[#0B0F17] border-white/[0.08] text-slate-300'
                }`}
              >
                {state.combo.syncPanels ? 'Kiri = Kanan (Sinkron)' : 'Mode Kiri/Kanan Terpisah'}
              </button>
            </div>

            {/* Gaya Eksekusi Multi-Mode */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400 block">
                Cara Menjalankan Banyak Mode Sekaligus
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'layer-blend', label: 'Gabung Simultan' },
                    { id: 'zone-split', label: 'Bagi Zona' },
                    { id: 'sequence', label: 'Bergantian' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onUpdateCombo({ ...state.combo, style: st.id })}
                    className={`py-2 px-2 rounded-xl text-[11px] font-semibold min-h-[38px] border transition-colors ${
                      state.combo.style === st.id
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioritas Penggabungan */}
            {state.combo.style === 'layer-blend' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-slate-400 block">
                  Prioritas Zona yang Sama
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'blend', label: 'Campur / Blend' },
                      { id: 'first', label: 'Urutan Pertama' },
                      { id: 'last', label: 'Urutan Terakhir' },
                    ] as const
                  ).map((pr) => (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => onUpdateCombo({ ...state.combo, priorityMode: pr.id })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium min-h-[34px] border ${
                        (state.combo.priorityMode || 'blend') === pr.id
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                          : 'bg-[#0B0F17] border-white/[0.06] text-slate-400'
                      }`}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Daftar Mode Terpilih Kiri & Kanan (Tanpa Menghapus Mode Sebelumnya) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['left', 'right'] as const).map((panel) => {
              const modesIds = panel === 'left' ? state.combo.leftModes : state.combo.rightModes;
              const isTarget = targetPanel === panel;
              return (
                <section
                  key={panel}
                  onClick={() => setTargetPanel(panel)}
                  className={`cursor-pointer rounded-2xl bg-[#111622] border p-3.5 space-y-2.5 transition-colors ${
                    isTarget ? 'border-cyan-400/60' : 'border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {panel === 'left' ? 'Panel Kiri' : 'Panel Kanan'} ({modesIds.length} Mode)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {panel === 'right' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateCombo({
                                ...state.combo,
                                leftModes: [...state.combo.rightModes],
                                rightModes: [...state.combo.leftModes],
                              });
                            }}
                            title="Tukar Kiri dan Kanan"
                            className="p-1.5 rounded-lg bg-[#0B0F17] text-slate-300 hover:text-cyan-300"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateCombo({
                                ...state.combo,
                                rightModes: [...state.combo.leftModes],
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-[#0B0F17] text-[11px] text-cyan-300 hover:text-white inline-flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Samakan</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {modesIds.map((id, idx) => {
                      const modeObj = allModes.find((m) => m.id === id);
                      return (
                        <div
                          key={`${panel}-${idx}-${id}`}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#0B0F17] border border-white/[0.06] text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-400 tabular-nums w-4">
                              #{idx + 1}
                            </span>
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${modeObj?.primaryColor || '#22D3EE'}, ${modeObj?.secondaryColor || '#3B82F6'})`,
                              }}
                            />
                            <span className="font-mono text-cyan-300 shrink-0 tabular-nums">
                              {modeObj?.moduleMeta?.codeLabel || String(id).padStart(3, '0')}
                            </span>
                            <span className="text-slate-200 truncate">
                              {modeObj?.name || `Mode ${id}`}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveComboSlot(panel, idx, -1)}
                              aria-label="Naikkan prioritas"
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === modesIds.length - 1}
                              onClick={() => moveComboSlot(panel, idx, 1)}
                              aria-label="Turunkan prioritas"
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={modesIds.length <= 1}
                              onClick={() => removeComboSlot(panel, idx)}
                              aria-label="Hapus mode dari kombinasi"
                              className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Tambah Banyak Mode ke Kombinasi Tanpa Menghapus Yang Lama */}
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-100">
                Tambah Mode ke <span className="text-cyan-300">{targetPanel === 'left' ? 'Panel Kiri' : 'Panel Kanan'}</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Mode baru ditambahkan tanpa menghapus daftar lama
              </span>
            </div>

            <form onSubmit={handleAddManualNumber} className="flex items-center gap-2">
              <input
                type="text"
                value={manualNumberInput}
                onChange={(e) => setManualNumberInput(e.target.value)}
                placeholder="Ketik nomor mode (cth: 1, 5, 8, 12)"
                aria-label="Nomor mode untuk digabung"
                className="flex-1 h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="px-3.5 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Nomor</span>
              </button>
            </form>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Meteor, Running, Strobo, Matrix..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'Semua' | ModeCategory)}
                aria-label="Filter kategori kombinasi"
                className="h-9 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
              >
                <option value="Semua">Semua Kategori</option>
                {ALL_MODE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
              {filteredModes.slice(0, 80).map((m) => {
                const countInPanel = currentList.filter((id) => id === m.id).length;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => appendModeToTarget(m.id)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors min-h-[42px] ${
                      countInPanel > 0
                        ? 'bg-cyan-500/10 border-cyan-400/40 text-slate-100'
                        : 'bg-[#0B0F17] border-white/[0.06] text-slate-200 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${m.primaryColor}, ${m.secondaryColor})`,
                        }}
                      />
                      <span className="font-mono text-[11px] text-cyan-300 shrink-0 tabular-nums">
                        {m.moduleMeta?.codeLabel || String(m.id).padStart(3, '0')}
                      </span>
                      <span className="text-xs truncate">{m.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-400 shrink-0">
                      {countInPanel > 0 ? `+ (×${countInPanel})` : '+ Tambah'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: WARNA KIRI & KANAN + CUSTOM WARNA MANUAL */}
      {subTab === 'colors' && (
        <div className="space-y-3.5">
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Custom Warna Manual Kiri &amp; Kanan
                </h3>
                <p className="text-[11px] text-slate-400">
                  Mengubah warna sisi kiri/kanan TIDAK menghapus kombinasi atau mengubah pola animasi aktif.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateManualSideColors({ ...sideColors, enabled: !sideColors.enabled })
                }
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] ${
                  sideColors.enabled
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-[#171F2E] text-slate-200 border border-white/[0.08]'
                }`}
              >
                {sideColors.enabled ? 'Override Warna: AKTIF' : 'Aktifkan Override L/R'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() =>
                  onUpdateManualSideColors({
                    ...sideColors,
                    enabled: true,
                    syncSides: !sideColors.syncSides,
                    rightColors: !sideColors.syncSides
                      ? [...sideColors.leftColors]
                      : sideColors.rightColors,
                    rightBrightness: !sideColors.syncSides
                      ? sideColors.leftBrightness
                      : sideColors.rightBrightness,
                  })
                }
                className={`px-3 py-2 rounded-xl text-xs font-medium min-h-[38px] border ${
                  sideColors.syncSides
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                    : 'bg-[#0B0F17] border-white/[0.08] text-slate-300'
                }`}
              >
                {sideColors.syncSides ? 'Warna Kiri & Kanan Sama' : 'Warna Kiri & Kanan Bebas'}
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateManualSideColors({
                    ...sideColors,
                    enabled: true,
                    syncSides: false,
                    rightColors: [...sideColors.leftColors],
                    rightBrightness: sideColors.leftBrightness,
                  })
                }
                className="px-3 py-2 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs font-medium text-slate-200 hover:border-cyan-400/40 min-h-[38px] inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Salin Kiri ke Kanan</span>
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Sisi Kiri */}
            <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Warna Sisi Kiri</h4>
                <span className="font-mono text-xs text-cyan-300 tabular-nums">
                  {sideColors.leftColors.length} warna
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sideColors.leftColors.map((hex, idx) => (
                  <div
                    key={`LC-${idx}-${hex}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0B0F17] border border-white/[0.08]"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-[11px] text-slate-200">{hex}</span>
                    {sideColors.leftColors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSideColor('left', idx)}
                        className="text-slate-400 hover:text-red-400"
                        aria-label="Hapus warna kiri"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={leftColorDraft}
                  onChange={(e) => setLeftColorDraft(e.target.value.toUpperCase())}
                  aria-label="Pemilih warna sisi kiri"
                  className="w-10 h-10 p-0.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={leftColorDraft}
                  onChange={(e) => setLeftColorDraft(e.target.value.toUpperCase())}
                  placeholder="#EF4444"
                  aria-label="Input hex warna kiri"
                  className="flex-1 h-10 px-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] font-mono text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => addSideColor('left', leftColorDraft)}
                  className="px-3 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 shrink-0"
                >
                  + Tambah
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_SWATCHES.map((hex) => (
                  <button
                    key={`QL-${hex}`}
                    type="button"
                    onClick={() =>
                      onUpdateManualSideColors({
                        ...sideColors,
                        enabled: true,
                        leftColors: [hex],
                      })
                    }
                    className="w-7 h-7 rounded-full border border-white/25 hover:scale-110 transition-transform"
                    style={{ backgroundColor: hex }}
                    aria-label={`Set warna kiri ${hex}`}
                  />
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Kecerahan Sisi Kiri</span>
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {sideColors.leftBrightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={sideColors.leftBrightness}
                  onChange={(e) =>
                    onUpdateManualSideColors({
                      ...sideColors,
                      enabled: true,
                      leftBrightness: Number(e.target.value),
                    })
                  }
                  className="rns-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${sideColors.leftBrightness}%, #1e293b ${sideColors.leftBrightness}%, #1e293b 100%)`,
                    height: '6px',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            </section>

            {/* Sisi Kanan */}
            <section
              className={`rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3 ${
                sideColors.syncSides ? 'opacity-55 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Warna Sisi Kanan</h4>
                <span className="font-mono text-xs text-cyan-300 tabular-nums">
                  {sideColors.rightColors.length} warna
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {sideColors.rightColors.map((hex, idx) => (
                  <div
                    key={`RC-${idx}-${hex}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0B0F17] border border-white/[0.08]"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-[11px] text-slate-200">{hex}</span>
                    {sideColors.rightColors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSideColor('right', idx)}
                        className="text-slate-400 hover:text-red-400"
                        aria-label="Hapus warna kanan"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rightColorDraft}
                  onChange={(e) => setRightColorDraft(e.target.value.toUpperCase())}
                  aria-label="Pemilih warna sisi kanan"
                  className="w-10 h-10 p-0.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={rightColorDraft}
                  onChange={(e) => setRightColorDraft(e.target.value.toUpperCase())}
                  placeholder="#3B82F6"
                  aria-label="Input hex warna kanan"
                  className="flex-1 h-10 px-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] font-mono text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => addSideColor('right', rightColorDraft)}
                  className="px-3 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 shrink-0"
                >
                  + Tambah
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_SWATCHES.map((hex) => (
                  <button
                    key={`QR-${hex}`}
                    type="button"
                    onClick={() =>
                      onUpdateManualSideColors({
                        ...sideColors,
                        enabled: true,
                        rightColors: [hex],
                      })
                    }
                    className="w-7 h-7 rounded-full border border-white/25 hover:scale-110 transition-transform"
                    style={{ backgroundColor: hex }}
                    aria-label={`Set warna kanan ${hex}`}
                  />
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Kecerahan Sisi Kanan</span>
                  <span className="font-mono text-cyan-300 tabular-nums">
                    {sideColors.rightBrightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={sideColors.rightBrightness}
                  onChange={(e) =>
                    onUpdateManualSideColors({
                      ...sideColors,
                      enabled: true,
                      rightBrightness: Number(e.target.value),
                    })
                  }
                  className="rns-slider w-full"
                  style={{
                    background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${sideColors.rightBrightness}%, #1e293b ${sideColors.rightBrightness}%, #1e293b 100%)`,
                    height: '6px',
                    borderRadius: '9999px',
                  }}
                />
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: MODE BELANG OTOMATIS */}
      {subTab === 'auto' && (
        <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Mode Belang Otomatis</h3>
              <p className="text-[11px] text-slate-400">
                Beberapa warna tampil bersamaan dengan pergantian &amp; gerakan belang otomatis.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateAutoBelang({ ...autoBelang, enabled: !autoBelang.enabled })
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[42px] ${
                autoBelang.enabled
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#171F2E] text-slate-200 border border-white/[0.08]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{autoBelang.enabled ? 'Belang Otomatis: AKTIF' : 'Aktifkan Belang Otomatis'}</span>
            </button>
          </div>

          {/* Palet Warna Belang */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Palet Warna Belang</span>
              <span className="font-mono text-cyan-300">{autoBelang.colors.length} warna</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {autoBelang.colors.map((hex, idx) => (
                <div
                  key={`AB-${idx}-${hex}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0B0F17] border border-white/[0.08]"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="font-mono text-[11px] text-slate-200">{hex}</span>
                  {autoBelang.colors.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAutoBelang({
                          ...autoBelang,
                          colors: autoBelang.colors.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs text-slate-200 cursor-pointer">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Warna</span>
                <input
                  type="color"
                  value={autoColorDraft}
                  onChange={(e) => {
                    const hex = e.target.value.toUpperCase();
                    setAutoColorDraft(hex);
                    onUpdateAutoBelang({
                      ...autoBelang,
                      colors: [...autoBelang.colors, hex].slice(0, 8),
                    });
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Sliders Jumlah Warna, Jumlah Belang, Kecepatan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Jumlah Warna</span>
                <span className="font-mono text-cyan-300 tabular-nums">{autoBelang.colorCount}</span>
              </div>
              <input
                type="range"
                min={2}
                max={8}
                value={autoBelang.colorCount}
                onChange={(e) =>
                  onUpdateAutoBelang({ ...autoBelang, colorCount: Number(e.target.value) })
                }
                className="rns-slider w-full"
                style={{
                  background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${((autoBelang.colorCount - 2) / 6) * 100}%, #1e293b ${((autoBelang.colorCount - 2) / 6) * 100}%, #1e293b 100%)`,
                  height: '6px',
                  borderRadius: '9999px',
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Jumlah Belang</span>
                <span className="font-mono text-cyan-300 tabular-nums">{autoBelang.stripeCount}</span>
              </div>
              <input
                type="range"
                min={2}
                max={16}
                value={autoBelang.stripeCount}
                onChange={(e) =>
                  onUpdateAutoBelang({ ...autoBelang, stripeCount: Number(e.target.value) })
                }
                className="rns-slider w-full"
                style={{
                  background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${((autoBelang.stripeCount - 2) / 14) * 100}%, #1e293b ${((autoBelang.stripeCount - 2) / 14) * 100}%, #1e293b 100%)`,
                  height: '6px',
                  borderRadius: '9999px',
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">Kecepatan Pergantian</span>
                <span className="font-mono text-cyan-300 tabular-nums">{autoBelang.colorChangeSpeed}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={autoBelang.colorChangeSpeed}
                onChange={(e) =>
                  onUpdateAutoBelang({ ...autoBelang, colorChangeSpeed: Number(e.target.value) })
                }
                className="rns-slider w-full"
                style={{
                  background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${autoBelang.colorChangeSpeed}%, #1e293b ${autoBelang.colorChangeSpeed}%, #1e293b 100%)`,
                  height: '6px',
                  borderRadius: '9999px',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Arah Gerakan</label>
              <select
                value={autoBelang.direction}
                onChange={(e) =>
                  onUpdateAutoBelang({
                    ...autoBelang,
                    direction: e.target.value as AutoBelangConfig['direction'],
                  })
                }
                className="w-full h-10 px-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
              >
                <option value="left-to-right">Kiri → Kanan</option>
                <option value="right-to-left">Kanan → Kiri</option>
                <option value="center-out">Tengah → Luar</option>
                <option value="bounce">Memantul (Bounce)</option>
                <option value="alternate">Bolak-Balik Simetris</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Pola Belang</label>
              <select
                value={autoBelang.pattern}
                onChange={(e) =>
                  onUpdateAutoBelang({
                    ...autoBelang,
                    pattern: e.target.value as AutoBelangConfig['pattern'],
                  })
                }
                className="w-full h-10 px-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
              >
                <option value="stripes">Belang Garis Tegas</option>
                <option value="wave">Belang Gelombang Halus</option>
                <option value="blocks">Belang Blok Catur</option>
                <option value="diagonal">Belang Diagonal</option>
                <option value="pulse-split">Belang Denyut Transisi</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Mode Gerak</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateAutoBelang({ ...autoBelang, moving: true })}
                  className={`h-10 rounded-xl text-xs font-semibold border ${
                    autoBelang.moving
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-[#0B0F17] border-white/[0.08] text-slate-400'
                  }`}
                >
                  Bergerak
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateAutoBelang({ ...autoBelang, moving: false })}
                  className={`h-10 rounded-xl text-xs font-semibold border ${
                    !autoBelang.moving
                      ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                      : 'bg-[#0B0F17] border-white/[0.08] text-slate-400'
                  }`}
                >
                  Statis
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: PRESET SISTEM */}
      {subTab === 'presets' && (
        <div className="space-y-3.5">
          <form
            onSubmit={handleSaveNewPreset}
            className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3.5 flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              required
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              placeholder="Nama preset baru (cth: Kontes Malam L-Merah R-Biru)"
              aria-label="Nama preset baru"
              className="flex-1 h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="px-4 h-10 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Pengaturan Ini</span>
            </button>
          </form>

          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  {editingPresetId === preset.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingPresetName}
                        onChange={(e) => setEditingPresetName(e.target.value)}
                        className="h-9 px-2.5 rounded-lg bg-[#0B0F17] border border-cyan-400/50 text-xs text-slate-100 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingPresetName.trim()) {
                            onRenamePreset(preset.id, editingPresetName.trim());
                          }
                          setEditingPresetId(null);
                        }}
                        className="px-2.5 h-9 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-100 truncate">
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {preset.description ||
                          `Kiri ${preset.combo.leftModes.length} mode · Kanan ${preset.combo.rightModes.length} mode · Speed ${preset.speed}%`}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onLoadPreset(preset)}
                    className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[38px]"
                  >
                    Pakai
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicatePreset(preset)}
                    title="Salin Preset"
                    aria-label={`Salin ${preset.name}`}
                    className="min-w-[38px] min-h-[38px] rounded-xl bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPresetId(preset.id);
                      setEditingPresetName(preset.name);
                    }}
                    title="Ubah Nama Preset"
                    aria-label={`Edit ${preset.name}`}
                    className="min-w-[38px] min-h-[38px] rounded-xl bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePreset(preset.id)}
                    title="Hapus Preset"
                    aria-label={`Hapus ${preset.name}`}
                    className="min-w-[38px] min-h-[38px] rounded-xl bg-[#171F2E] text-slate-400 hover:text-red-400 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
