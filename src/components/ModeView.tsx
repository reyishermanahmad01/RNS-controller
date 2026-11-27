import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Layers,
  Plus,
  Repeat,
  Search,
  Star,
  Sun,
} from 'lucide-react';
import { ALL_MODE_CATEGORIES } from '../data/modes';
import { FAMILY_SHORT_LABEL } from '../data/moduleFactoryModes';
import {
  AnimationPattern,
  ControllerFamily,
  ModeCategory,
  RgbMode,
} from '../types/controller';

interface ModeViewProps {
  allModes: RgbMode[];
  activeModeId: number;
  favorites: number[];
  speed: number;
  brightness: number;
  autoLoopModes: boolean;
  autoLoopIntervalSec: number;
  isAdmin: boolean;
  onSelectMode: (id: number) => void;
  onAddModeToCombo?: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onChangeSpeed: (val: number) => void;
  onChangeBrightness: (val: number) => void;
  onPrevMode: () => void;
  onNextMode: () => void;
  onToggleAutoLoop: () => void;
  onChangeAutoLoopInterval: (sec: number) => void;
  onOpenComboEditor: () => void;
  onAddCustomMode: (mode: Omit<RgbMode, 'id' | 'code' | 'isCustom'>) => void;
  onOpenAdminCloud?: () => void;
}

type FilterTab = 'Semua' | 'Favorit' | ModeCategory;
type SourceFilter = 'all' | 'rns' | ControllerFamily;

const FILTER_TABS: FilterTab[] = ['Semua', 'Favorit', ...ALL_MODE_CATEGORIES];

const SOURCE_LABELS: Record<ControllerFamily, string> = {
  esp8266: 'ESP8266',
  dmx: 'DMX512',
  wled: 'WLED',
  bluetooth: 'LED DMX / BLE',
  car: 'CAR',
  custom: 'Modul Lain',
};

const QUICK_PATTERNS: { id: AnimationPattern; label: string; category: ModeCategory }[] = [
  { id: 'meteor-rain', label: 'Hujan Meteor', category: 'Meteor' },
  { id: 'knight-sweep', label: 'Running Sapuan Knight', category: 'Running' },
  { id: 'cyber-wing', label: 'Running Sayap Cyber', category: 'Running' },
  { id: 'strobe-duo', label: 'Strobo Ganda L-R', category: 'Strobo' },
  { id: 'police-strobe', label: 'Strobo Patwal Double Blitz', category: 'Strobo' },
  { id: 'plasma-wave', label: 'Gelombang Plasma Drift', category: 'Wave' },
  { id: 'twister-wave', label: 'Gelombang Twister 2D', category: 'Wave' },
  { id: 'dual-comet', label: 'Chase Komet Ganda', category: 'Chase' },
  { id: 'crimson-pulse', label: 'Pulse Denyut Sport', category: 'Pulse' },
  { id: 'cyber-scan', label: 'Scanner Cyber Presisi', category: 'Scanner' },
  { id: 'neon-breathe', label: 'Breathing Napas Halus', category: 'Breathing' },
  { id: 'aurora-dual', label: 'Gradient Aurora Dual', category: 'Gradient' },
  { id: 'rainbow-flow', label: 'Rainbow Spektrum Flow', category: 'Rainbow' },
  { id: 'fireworks-burst', label: 'Pixel Kembang Api', category: 'Pixel' },
  { id: 'matrix-rain', label: 'Matrix Hujan 2D', category: 'Matrix' },
  { id: 'matrix-equalizer', label: 'Matrix Equalizer RGB', category: 'Matrix' },
  { id: 'galaxy-spiral', label: 'Kombinasi Spiral Galaksi', category: 'Kombinasi' },
  { id: 'white-strobe-flash', label: 'White Full Strobo', category: 'White Full' },
];

export const ModeView: React.FC<ModeViewProps> = ({
  allModes,
  activeModeId,
  favorites,
  speed,
  brightness,
  autoLoopModes,
  autoLoopIntervalSec,
  isAdmin,
  onSelectMode,
  onAddModeToCombo,
  onToggleFavorite,
  onChangeSpeed,
  onChangeBrightness,
  onPrevMode,
  onNextMode,
  onToggleAutoLoop,
  onChangeAutoLoopInterval,
  onOpenComboEditor,
  onAddCustomMode,
  onOpenAdminCloud,
}) => {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [filter, setFilter] = useState<FilterTab>('Semua');
  const [rangeIndex, setRangeIndex] = useState<number>(0);
  const [query, setQuery] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ModeCategory>('Custom');
  const [newPattern, setNewPattern] = useState<AnimationPattern>('dual-comet');
  const [newPrimary, setNewPrimary] = useState('#22D3EE');
  const [newSecondary, setNewSecondary] = useState('#EC4899');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const availableFamilies = useMemo(() => {
    const families: ControllerFamily[] = [];
    allModes.forEach((m) => {
      if (m.moduleMeta && !families.includes(m.moduleMeta.family)) {
        families.push(m.moduleMeta.family);
      }
    });
    return families;
  }, [allModes]);

  const sourceScopedModes = useMemo(() => {
    if (sourceFilter === 'all') return allModes;
    if (sourceFilter === 'rns') return allModes.filter((m) => !m.moduleMeta);
    return allModes.filter((m) => m.moduleMeta?.family === sourceFilter);
  }, [allModes, sourceFilter]);

  const categoryMatchedModes = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return sourceScopedModes.filter((mode) => {
      if (filter === 'Favorit' && !favorites.includes(mode.id)) return false;
      if (filter === 'Custom' && !mode.isCustom && mode.category !== 'Custom') return false;
      if (
        filter !== 'Semua' &&
        filter !== 'Favorit' &&
        filter !== 'Custom' &&
        mode.category !== filter
      ) {
        return false;
      }
      if (trimmed) {
        return (
          mode.name.toLowerCase().includes(trimmed) ||
          mode.code.toLowerCase().includes(trimmed) ||
          mode.category.toLowerCase().includes(trimmed) ||
          (mode.moduleMeta?.codeLabel.toLowerCase().includes(trimmed) ?? false) ||
          (mode.moduleMeta?.profileName.toLowerCase().includes(trimmed) ?? false) ||
          String(mode.id) === trimmed ||
          mode.description.toLowerCase().includes(trimmed)
        );
      }
      return true;
    });
  }, [sourceScopedModes, filter, favorites, query]);

  const rangeChunks = useMemo(() => {
    if (query.trim() || filter !== 'Semua') return [];
    const chunks: { label: string; startIdx: number; endIdx: number }[] = [];
    const step = 48;
    for (let i = 0; i < categoryMatchedModes.length; i += step) {
      const sliceEnd = Math.min(categoryMatchedModes.length, i + step);
      const first = categoryMatchedModes[i];
      const last = categoryMatchedModes[sliceEnd - 1];
      const startLabel = first.moduleMeta
        ? first.moduleMeta.codeLabel
        : String(first.id).padStart(3, '0');
      const endLabel = last.moduleMeta
        ? last.moduleMeta.codeLabel
        : String(last.id).padStart(3, '0');
      chunks.push({
        label: `${startLabel}–${endLabel}`,
        startIdx: i,
        endIdx: sliceEnd,
      });
    }
    return chunks;
  }, [categoryMatchedModes, query, filter]);

  const safeRangeIdx = rangeChunks.length > 0 ? Math.min(rangeIndex, rangeChunks.length - 1) : 0;

  const filteredModes = useMemo(() => {
    if (rangeChunks.length > 1 && rangeChunks[safeRangeIdx]) {
      const chunk = rangeChunks[safeRangeIdx];
      return categoryMatchedModes.slice(chunk.startIdx, chunk.endIdx);
    }
    return categoryMatchedModes;
  }, [categoryMatchedModes, rangeChunks, safeRangeIdx]);

  const activeMode = allModes.find((m) => m.id === activeModeId) || allModes[0];
  const activeCodeText = activeMode?.moduleMeta
    ? activeMode.moduleMeta.codeLabel
    : String(activeMode?.id || 1).padStart(3, '0');

  const handleSelectSource = (next: SourceFilter) => {
    setSourceFilter(next);
    setRangeIndex(0);
  };

  const handleCreateForCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;
    const patMeta = QUICK_PATTERNS.find((p) => p.id === newPattern);
    onAddCustomMode({
      name: clean,
      category: newCategory || patMeta?.category || 'Custom',
      description: 'Mode tambahan Admin untuk pelanggan',
      primaryColor: newPrimary,
      secondaryColor: newSecondary,
      pattern: newPattern,
      eyeBehavior: 'look-around',
    });
    setAddedFeedback(`Mode "${clean}" ditambahkan dan langsung tersedia untuk pelanggan.`);
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            Daftar {allModes.length} Mode Animasi
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tersedia kategori Meteor, Running, Strobo, Wave, Chase, Pulse, Scanner, Matrix, Gradient &amp; White Full.
          </p>
        </div>

        <div className="relative w-full sm:w-52">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor / kategori..."
            aria-label="Cari mode animasi"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#111622] border border-white/[0.08] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
          />
        </div>
      </div>

      {/* Mode++ Stepper + Sliders */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPrevMode}
            aria-label="Mode sebelumnya"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#171F2E] border border-white/[0.08] flex items-center justify-center text-slate-200 hover:text-white shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-[11px] font-mono text-cyan-400 tabular-nums">
              {activeCodeText} · {activeMode?.category}
            </div>
            <div className="text-sm font-semibold text-slate-100 truncate">
              {activeMode?.name || 'Mode 001'}
            </div>
          </div>

          <button
            type="button"
            onClick={onNextMode}
            aria-label="Mode berikutnya"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#171F2E] border border-white/[0.08] flex items-center justify-center text-slate-200 hover:text-white shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoLoop}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[40px] border transition-colors ${
              autoLoopModes
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-[#0B0F17] border-white/[0.08] text-slate-200 hover:text-white'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{autoLoopModes ? 'Auto Loop ON' : 'Auto Mode++'}</span>
          </button>

          {autoLoopModes && (
            <div className="flex items-center gap-1 bg-[#0B0F17] p-0.5 rounded-xl border border-white/[0.06]">
              {[3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onChangeAutoLoopInterval(sec)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono ${
                    autoLoopIntervalSec === sec
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenComboEditor}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171F2E] border border-cyan-400/40 text-xs font-semibold text-cyan-200 hover:text-white min-h-[40px]"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gabung Belang</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kecepatan</span>
              </span>
              <span className="font-mono text-cyan-300 tabular-nums">{speed}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={speed}
              onChange={(e) => onChangeSpeed(Number(e.target.value))}
              aria-label="Kecepatan animasi mode"
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${speed}%, #1e293b ${speed}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Sun className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kecerahan</span>
              </span>
              <span className="font-mono text-cyan-300 tabular-nums">{brightness}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={brightness}
              onChange={(e) => onChangeBrightness(Number(e.target.value))}
              aria-label="Kecerahan mode"
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${brightness}%, #1e293b ${brightness}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>
        </div>
      </section>

      {/* Admin Quick Add Mode for Customer */}
      {isAdmin && (
        <section className="rounded-2xl bg-[#111622] border border-cyan-400/30 p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-cyan-200">
                Tambah Mode Animasi ke Pelanggan
              </div>
              <div className="text-[11px] text-slate-400">
                Buat mode animasi baru per kategori untuk langsung tampil di daftar Customer.
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onOpenAdminCloud && (
                <button
                  type="button"
                  onClick={onOpenAdminCloud}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] text-[11px] text-slate-300 hover:text-white min-h-[36px]"
                >
                  Kirim OTA
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Tutup' : 'Tambah Mode'}</span>
              </button>
            </div>
          </div>

          {addedFeedback && (
            <p className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-xl px-3 py-2">
              {addedFeedback}
            </p>
          )}

          {showAddForm && (
            <form onSubmit={handleCreateForCustomer} className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama mode baru (cth: Meteor Belang Pro)"
                  aria-label="Nama mode baru untuk pelanggan"
                  className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500"
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ModeCategory)}
                  aria-label="Kategori mode baru"
                  className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                >
                  {ALL_MODE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={newPattern}
                  onChange={(e) => {
                    const pat = e.target.value as AnimationPattern;
                    setNewPattern(pat);
                    const found = QUICK_PATTERNS.find((q) => q.id === pat);
                    if (found) setNewCategory(found.category);
                  }}
                  aria-label="Pola animasi mode baru"
                  className="h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs text-slate-100"
                >
                  {QUICK_PATTERNS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Warna 1</span>
                  <input
                    type="color"
                    value={newPrimary}
                    onChange={(e) => setNewPrimary(e.target.value)}
                    className="w-9 h-8 p-0.5 rounded-lg bg-[#0B0F17] border border-white/[0.08]"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Warna 2</span>
                  <input
                    type="color"
                    value={newSecondary}
                    onChange={(e) => setNewSecondary(e.target.value)}
                    className="w-9 h-8 p-0.5 rounded-lg bg-[#0B0F17] border border-white/[0.08]"
                  />
                </label>
                <button
                  type="submit"
                  className="ml-auto px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[38px]"
                >
                  Simpan &amp; Terapkan ke Pelanggan
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Module Source Filter Tabs */}
      {availableFamilies.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => handleSelectSource('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px] transition-colors border ${
              sourceFilter === 'all'
                ? 'bg-[#172133] border-cyan-400/50 text-cyan-200'
                : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Modul ({allModes.length})
          </button>
          <button
            type="button"
            onClick={() => handleSelectSource('rns')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px] transition-colors border ${
              sourceFilter === 'rns'
                ? 'bg-[#172133] border-cyan-400/50 text-cyan-200'
                : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            RNS Stoplamp
          </button>
          {availableFamilies.map((fam) => (
            <button
              key={fam}
              type="button"
              onClick={() => handleSelectSource(fam)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[36px] transition-colors border ${
                sourceFilter === fam
                  ? 'bg-[#172133] border-cyan-400/50 text-cyan-200'
                  : 'bg-[#0B0F17] border-white/[0.06] text-slate-400 hover:text-slate-200'
              }`}
            >
              {SOURCE_LABELS[fam] || fam}
            </button>
          ))}
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setFilter(tab);
                setRangeIndex(0);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[38px] transition-colors ${
                active
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-[#111622] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Quick Range Bank Selector */}
      {rangeChunks.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {rangeChunks.map((chunk, idx) => {
            const active = safeRangeIdx === idx;
            return (
              <button
                key={`${chunk.label}-${idx}`}
                type="button"
                onClick={() => setRangeIndex(idx)}
                className={`py-2 px-3 rounded-xl font-mono text-xs font-medium tabular-nums min-h-[38px] whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#172133] text-cyan-300 border border-cyan-400/40'
                    : 'bg-[#111622] text-slate-400 border border-white/[0.06] hover:text-slate-200'
                }`}
              >
                {chunk.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode Grid */}
      {filteredModes.length === 0 ? (
        <div className="rounded-2xl bg-[#111622] border border-white/[0.08] p-8 text-center">
          <p className="text-sm text-slate-300 font-medium">Tidak ada mode yang cocok</p>
          <p className="text-xs text-slate-500 mt-1">
            Ubah kata kunci pencarian atau pilih sumber modul / kategori lain.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredModes.map((mode) => {
            const isSelected = mode.id === activeModeId;
            const isFav = favorites.includes(mode.id);
            const codeText = mode.moduleMeta
              ? mode.moduleMeta.codeLabel
              : String(mode.id).padStart(3, '0');
            const badgeText = mode.moduleMeta
              ? `${FAMILY_SHORT_LABEL[mode.moduleMeta.family]} · ${mode.category}`
              : mode.isCustom
                ? `Custom · ${mode.category}`
                : mode.category;

            return (
              <div
                key={mode.id}
                className={`flex items-center justify-between gap-2 p-3 rounded-2xl border transition-colors ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400/50'
                    : 'bg-[#111622] border-white/[0.08] hover:border-white/[0.16]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectMode(mode.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left focus-visible:outline-none"
                >
                  <span
                    className="w-9 h-9 rounded-xl shrink-0 border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${mode.primaryColor}, ${mode.secondaryColor})`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                        {codeText}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-slate-400 truncate">{badgeText}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-100 truncate mt-0.5">
                      {mode.name}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {onAddModeToCombo && (
                    <button
                      type="button"
                      onClick={() => onAddModeToCombo(mode.id)}
                      title={`Tambahkan Mode ${codeText} ke kombinasi belang tanpa menghapus mode lain`}
                      aria-label={`Tambah Mode ${codeText} ke kombinasi`}
                      className="min-w-[36px] min-h-[36px] rounded-xl bg-[#171F2E] border border-white/[0.08] flex items-center justify-center text-cyan-300 hover:border-cyan-400/50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(mode.id)}
                    aria-label={isFav ? `Hapus ${mode.name} dari favorit` : `Simpan ${mode.name} ke favorit`}
                    className={`min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-colors ${
                      isFav ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
