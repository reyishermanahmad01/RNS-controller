import React, { useMemo, useState } from 'react';
import { Gauge, Layers, Plus, Star, Sun } from 'lucide-react';
import { getWhiteModeSubgroup, WhiteSubGroup } from '../data/modes';
import { ControllerState, RgbMode } from '../types/controller';
import { SidePanelPreviewCanvas } from './StoplampVisualizer';

interface WhiteFullViewProps {
  state: ControllerState;
  allModes: RgbMode[];
  onSelectMode: (id: number) => void;
  onAddModeToCombo: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onChangeSpeed: (val: number) => void;
  onChangeBrightness: (val: number) => void;
  onOpenBelangPage: () => void;
}

type WhiteFilterTab = 'Semua' | WhiteSubGroup;

const WHITE_TABS: WhiteFilterTab[] = ['Semua', 'White Running', 'White Strobo', 'White Matrix'];

export const WhiteFullView: React.FC<WhiteFullViewProps> = ({
  state,
  allModes,
  onSelectMode,
  onAddModeToCombo,
  onToggleFavorite,
  onChangeSpeed,
  onChangeBrightness,
  onOpenBelangPage,
}) => {
  const [filterTab, setFilterTab] = useState<WhiteFilterTab>('Semua');

  const whiteModes = useMemo(() => {
    return allModes.filter(
      (m) => m.category === 'White Full' || m.pattern.startsWith('white-')
    );
  }, [allModes]);

  const counts = useMemo(() => {
    const res: Record<WhiteSubGroup, number> = {
      'White Running': 0,
      'White Strobo': 0,
      'White Matrix': 0,
    };
    for (const m of whiteModes) {
      res[getWhiteModeSubgroup(m)] += 1;
    }
    return res;
  }, [whiteModes]);

  const visibleModes = useMemo(() => {
    if (filterTab === 'Semua') return whiteModes;
    return whiteModes.filter((m) => getWhiteModeSubgroup(m) === filterTab);
  }, [whiteModes, filterTab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            White Full ({whiteModes.length} Mode)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kumpulan animasi putih penuh: White Running, White Strobo, dan White Matrix.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenBelangPage}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111622] border border-cyan-400/35 text-xs font-medium text-cyan-200 hover:border-cyan-400 min-h-[40px]"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gabung ke Mode Belang</span>
        </button>
      </div>

      {/* Live Preview Strip */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">Preview White Full 6000K</span>
          <span className="font-mono text-[11px] text-slate-300 tabular-nums">
            Mode {String(state.activeModeId).padStart(3, '0')}
          </span>
        </div>
        <div className="h-20 sm:h-24 rounded-xl bg-[#070A0F] border border-white/[0.08] overflow-hidden">
          <SidePanelPreviewCanvas state={state} allModes={allModes} side="both" />
        </div>
      </section>

      {/* Speed & Brightness */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
              <Gauge className="w-3.5 h-3.5 text-slate-100" />
              <span>Kecepatan White Full</span>
            </span>
            <span className="font-mono font-semibold text-slate-100 tabular-nums">{state.speed}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            value={state.speed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            className="rns-slider w-full"
            style={{
              background: `linear-gradient(to right, #f8fafc 0%, #f8fafc ${state.speed}%, #1e293b ${state.speed}%, #1e293b 100%)`,
              height: '6px',
              borderRadius: '9999px',
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-slate-200 font-medium">
              <Sun className="w-3.5 h-3.5 text-slate-100" />
              <span>Kecerahan White Full</span>
            </span>
            <span className="font-mono font-semibold text-slate-100 tabular-nums">{state.brightness}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            value={state.brightness}
            onChange={(e) => onChangeBrightness(Number(e.target.value))}
            className="rns-slider w-full"
            style={{
              background: `linear-gradient(to right, #f8fafc 0%, #f8fafc ${state.brightness}%, #1e293b ${state.brightness}%, #1e293b 100%)`,
              height: '6px',
              borderRadius: '9999px',
            }}
          />
        </div>
      </section>

      {/* Subgroup Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {WHITE_TABS.map((tab) => {
          const count = tab === 'Semua' ? whiteModes.length : counts[tab];
          const active = filterTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[40px] border transition-colors ${
                active
                  ? 'bg-slate-100 text-slate-950 border-white'
                  : 'bg-[#111622] text-slate-300 border-white/[0.08] hover:text-white'
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* White Full Modes List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {visibleModes.map((mode) => {
          const isActive = state.activeModeId === mode.id && !state.ledMatrix?.enabled && !state.autoBelang?.enabled;
          const isFav = state.favorites.includes(mode.id);
          const subgroup = getWhiteModeSubgroup(mode);

          return (
            <div
              key={mode.id}
              className={`rounded-2xl border p-3.5 transition-colors flex flex-col justify-between gap-2.5 ${
                isActive
                  ? 'bg-slate-100/10 border-white/60'
                  : 'bg-[#111622] border-white/[0.08] hover:border-white/25'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className="text-left space-y-1.5 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                    {mode.code}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {subgroup}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-100">{mode.name}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{mode.description}</p>
              </button>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onSelectMode(mode.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] ${
                    isActive
                      ? 'bg-slate-100 text-slate-950'
                      : 'bg-[#171F2E] text-slate-200 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  {isActive ? 'Sedang Aktif' : 'Jalankan'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAddModeToCombo(mode.id)}
                    title="Tambah ke Kombinasi / Mode Belang"
                    aria-label={`Tambahkan ${mode.name} ke Mode Belang`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#171F2E] border border-white/[0.08] text-[11px] font-medium text-cyan-300 hover:text-white min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Belang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFavorite(mode.id)}
                    aria-label={isFav ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                    className={`min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center border ${
                      isFav
                        ? 'bg-amber-500/15 border-amber-400/40 text-amber-400'
                        : 'bg-[#171F2E] border-white/[0.06] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
