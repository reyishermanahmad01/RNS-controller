import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Layers,
  Plus,
  Search,
  Shuffle,
  Sparkles,
  X,
} from 'lucide-react';
import { ALL_MODE_CATEGORIES } from '../data/modes';
import { ComboConfig, ModeCategory, RgbMode } from '../types/controller';

interface ComboEditorModalProps {
  open: boolean;
  combo: ComboConfig;
  combinationEnabled: boolean;
  activeModeId: number;
  allModes: RgbMode[];
  onClose: () => void;
  onToggleCombination: () => void;
  onUpdateCombo: (next: ComboConfig) => void;
  onOpenBelangPage?: () => void;
}

const MAX_COMBO_PER_PANEL = 24;

const QUICK_COMBO_PRESETS: {
  label: string;
  leftModes: number[];
  rightModes: number[];
  style: ComboConfig['style'];
}[] = [
  {
    label: 'Meteor + Running + Matrix (L=R)',
    leftModes: [1, 3, 34],
    rightModes: [1, 3, 34],
    style: 'layer-blend',
  },
  {
    label: 'Belang Sport (1,9,3,6,2,7)',
    leftModes: [1, 9, 3, 6, 2, 7],
    rightModes: [12, 4, 8, 2, 19, 1],
    style: 'zone-split',
  },
  {
    label: 'White Strobo + Matrix',
    leftModes: [381, 387, 393],
    rightModes: [381, 387, 393],
    style: 'layer-blend',
  },
  {
    label: 'Belang Pelangi & Chase',
    leftModes: [28, 13, 19],
    rightModes: [29, 14, 20],
    style: 'zone-split',
  },
];

export const ComboEditorModal: React.FC<ComboEditorModalProps> = ({
  open,
  combo,
  combinationEnabled,
  activeModeId,
  allModes,
  onClose,
  onToggleCombination,
  onUpdateCombo,
  onOpenBelangPage,
}) => {
  const [targetPanel, setTargetPanel] = useState<'left' | 'right'>('left');
  const [modeInput, setModeInput] = useState(String(activeModeId));
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | ModeCategory>('Semua');

  const currentList = targetPanel === 'left' ? combo.leftModes : combo.rightModes;

  const filteredModes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allModes.filter((m) => {
      if (categoryFilter !== 'Semua' && m.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(m.id).includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    });
  }, [allModes, searchQuery, categoryFilter]);

  if (!open) return null;

  const addModeToPanel = (modeId: number) => {
    if (!allModes.some((m) => m.id === modeId)) return;
    if (currentList.length >= MAX_COMBO_PER_PANEL) return;
    const nextList = [...currentList, modeId];
    onUpdateCombo({
      ...combo,
      [targetPanel === 'left' ? 'leftModes' : 'rightModes']: nextList,
    });
  };

  const removeSlot = (panel: 'left' | 'right', idx: number) => {
    const list = panel === 'left' ? combo.leftModes : combo.rightModes;
    if (list.length <= 1) return;
    const next = list.filter((_, i) => i !== idx);
    onUpdateCombo({
      ...combo,
      [panel === 'left' ? 'leftModes' : 'rightModes']: next,
    });
  };

  const handleAddInput = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(modeInput, 10);
    if (!Number.isNaN(num)) {
      const exact = allModes.find((m) => m.id === num);
      if (exact) {
        addModeToPanel(exact.id);
      } else if (num >= 1 && num <= allModes.length) {
        addModeToPanel(allModes[num - 1].id);
      }
    }
  };

  const copyLeftToRight = () => {
    onUpdateCombo({
      ...combo,
      rightModes: [...combo.leftModes],
    });
  };

  const swapPanels = () => {
    onUpdateCombo({
      ...combo,
      leftModes: [...combo.rightModes],
      rightModes: [...combo.leftModes],
    });
  };

  const randomizeBoth = () => {
    if (allModes.length === 0) return;
    const pick = () => allModes[Math.floor(Math.random() * allModes.length)].id;
    onUpdateCombo({
      ...combo,
      leftModes: [pick(), pick(), pick(), pick()],
      rightModes: [pick(), pick(), pick(), pick()],
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="combo-modal-title"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#111622] border border-white/[0.1] p-4 sm:p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="combo-modal-title" className="font-display text-base font-semibold text-slate-100">
              Kombinasi Multi-Mode &amp; Belang
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tambahkan banyak mode sekaligus tanpa menghapus mode sebelumnya.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenBelangPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBelangPage();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-[#171F2E] border border-cyan-400/35 text-[11px] font-semibold text-cyan-300 hover:text-white inline-flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Halaman Penuh</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pengaturan kombinasi"
              className="min-w-[36px] min-h-[36px] rounded-xl bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Enable & Style */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onToggleCombination}
            className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold min-h-[42px] border transition-colors ${
              combinationEnabled
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-[#171F2E] text-slate-300 border-white/[0.08]'
            }`}
          >
            {combinationEnabled ? 'Kombinasi / Belang: AKTIF' : 'Aktifkan Kombinasi / Belang'}
          </button>

          <div className="grid grid-cols-3 gap-1.5 bg-[#0B0F17] p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => onUpdateCombo({ ...combo, style: 'layer-blend' })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                combo.style === 'layer-blend'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gabung Simultan
            </button>
            <button
              type="button"
              onClick={() => onUpdateCombo({ ...combo, style: 'zone-split' })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                combo.style === 'zone-split'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Belang Zona
            </button>
            <button
              type="button"
              onClick={() => onUpdateCombo({ ...combo, style: 'sequence' })}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                combo.style === 'sequence'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bergantian
            </button>
          </div>
        </div>

        {/* Preset Cepat 1-Tap */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Preset Cepat Belang
            </span>
            <button
              type="button"
              onClick={randomizeBoth}
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
            >
              <Shuffle className="w-3 h-3" />
              <span>Acak Otomatis</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMBO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onUpdateCombo({
                    ...combo,
                    leftModes: preset.leftModes,
                    rightModes: preset.rightModes,
                    style: preset.style,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg bg-[#171F2E] border border-white/[0.08] text-[11px] font-medium text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Kiri & Panel Kanan Active Target Switcher + Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Panel Kiri */}
          <div
            onClick={() => setTargetPanel('left')}
            className={`cursor-pointer rounded-2xl bg-[#0B0F17] border p-3 space-y-2 transition-colors ${
              targetPanel === 'left'
                ? 'border-cyan-400/60 ring-1 ring-cyan-400/20'
                : 'border-white/[0.07]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${targetPanel === 'left' ? 'text-cyan-300' : 'text-slate-300'}`}>
                Panel Kiri ({combo.leftModes.length} Mode)
              </span>
              {targetPanel === 'left' && (
                <span className="text-[10px] font-semibold text-cyan-400">TARGET ISI</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {combo.leftModes.map((id, idx) => {
                const modeObj = allModes.find((m) => m.id === id);
                return (
                  <button
                    key={`L-${idx}-${id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlot('left', idx);
                    }}
                    title={`${modeObj?.name || id} (Ketuk untuk hapus)`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#171F2E] border border-white/[0.08] text-[11px] font-mono text-slate-100 hover:border-red-400/50"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: modeObj?.primaryColor || '#22D3EE' }}
                    />
                    <span>{modeObj?.moduleMeta?.codeLabel || String(id).padStart(3, '0')}</span>
                    {combo.leftModes.length > 1 && <X className="w-3 h-3 text-slate-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel Kanan */}
          <div
            onClick={() => setTargetPanel('right')}
            className={`cursor-pointer rounded-2xl bg-[#0B0F17] border p-3 space-y-2 transition-colors ${
              targetPanel === 'right'
                ? 'border-cyan-400/60 ring-1 ring-cyan-400/20'
                : 'border-white/[0.07]'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={`text-xs font-semibold ${targetPanel === 'right' ? 'text-cyan-300' : 'text-slate-300'}`}>
                Panel Kanan ({combo.rightModes.length} Mode)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    swapPanels();
                  }}
                  title="Tukar Kiri ↔ Kanan"
                  className="text-[10px] text-slate-400 hover:text-cyan-300 inline-flex items-center gap-0.5"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLeftToRight();
                  }}
                  title="Samakan dengan Panel Kiri"
                  className="text-[10px] text-slate-400 hover:text-cyan-300 inline-flex items-center gap-0.5"
                >
                  <Copy className="w-3 h-3" />
                  <span>Samakan</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {combo.rightModes.map((id, idx) => {
                const modeObj = allModes.find((m) => m.id === id);
                return (
                  <button
                    key={`R-${idx}-${id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlot('right', idx);
                    }}
                    title={`${modeObj?.name || id} (Ketuk untuk hapus)`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#171F2E] border border-white/[0.08] text-[11px] font-mono text-slate-100 hover:border-red-400/50"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: modeObj?.primaryColor || '#EC4899' }}
                    />
                    <span>{modeObj?.moduleMeta?.codeLabel || String(id).padStart(3, '0')}</span>
                    {combo.rightModes.length > 1 && <X className="w-3 h-3 text-slate-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Mode Picker */}
        <div className="rounded-2xl bg-[#0B0F17] border border-white/[0.07] p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-200">
              Pilih Mode ke <strong className="text-cyan-300">{targetPanel === 'left' ? 'Panel Kiri' : 'Panel Kanan'}</strong>
            </span>
            <button
              type="button"
              disabled={currentList.length >= MAX_COMBO_PER_PANEL}
              onClick={() => addModeToPanel(activeModeId)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40 font-medium"
            >
              + Mode Aktif ({String(activeModeId).padStart(3, '0')})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Meteor, Running, Strobo, White Full..."
                aria-label="Cari mode untuk kombinasi"
                className="w-full h-9 pl-8 pr-2.5 rounded-xl bg-[#111622] border border-white/[0.08] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
              />
            </div>

            <form onSubmit={handleAddInput} className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                value={modeInput}
                onChange={(e) => setModeInput(e.target.value)}
                aria-label="Nomor mode cepat"
                className="w-16 h-9 px-2 rounded-xl bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100 text-center focus:outline-none focus:border-cyan-400/60"
              />
              <button
                type="submit"
                disabled={currentList.length >= MAX_COMBO_PER_PANEL}
                aria-label="Tambah nomor mode"
                className="h-9 px-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 disabled:opacity-40 inline-flex items-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {(['Semua', ...ALL_MODE_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'bg-[#111622] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
            {filteredModes.slice(0, 80).map((m) => {
              const countInPanel = currentList.filter((id) => id === m.id).length;
              const isFull = currentList.length >= MAX_COMBO_PER_PANEL;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isFull}
                  onClick={() => addModeToPanel(m.id)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-left transition-colors ${
                    countInPanel > 0
                      ? 'bg-cyan-500/10 border-cyan-400/40 text-slate-100'
                      : 'bg-[#111622] border-white/[0.06] text-slate-200 hover:border-white/20'
                  } disabled:opacity-40`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${m.primaryColor}, ${m.secondaryColor})`,
                      }}
                    />
                    <span className="font-mono text-[11px] text-cyan-300 shrink-0">
                      {m.moduleMeta?.codeLabel || String(m.id).padStart(3, '0')}
                    </span>
                    <span className="text-[11px] truncate">{m.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                    {countInPanel > 0 ? `×${countInPanel}` : '+'}
                  </span>
                </button>
              );
            })}
          </div>
          {filteredModes.length > 80 && (
            <p className="text-[10px] text-slate-500 text-center">
              Menampilkan 80 teratas dari {filteredModes.length} mode. Gunakan kolom pencarian untuk menyaring lebih spesifik.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
