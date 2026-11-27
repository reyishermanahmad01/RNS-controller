import React from 'react';
import { ArrowLeftRight, Disc, Hand, Layers, Lightbulb } from 'lucide-react';
import { ControllerState, SeinState, SpecialSettings } from '../types/controller';

interface SpecialViewProps {
  state: ControllerState;
  onUpdateSpecial: <K extends keyof SpecialSettings>(key: K, value: SpecialSettings[K]) => void;
  onTriggerWelcome: () => void;
  onSetSein: (sein: SeinState) => void;
  onToggleBrake: () => void;
  onToggleReverse: () => void;
  onToggleCombination: () => void;
}

export const SpecialView: React.FC<SpecialViewProps> = ({
  state,
  onUpdateSpecial,
  onTriggerWelcome,
  onSetSein,
  onToggleBrake,
  onToggleReverse,
  onToggleCombination,
}) => {
  const { special } = state;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
          Kontrol Sinyal Kendaraan
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Sein Kiri, Sein Kanan, Hazard, Lampu Rem, Lampu Mundur, dan animasi Welcome.
        </p>
      </div>

      {/* Welcome Sequence */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Hand className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Animasi Welcome</h3>
              <p className="text-xs text-slate-400">Aktif saat kontak motor dinyalakan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onTriggerWelcome}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors min-h-[38px] whitespace-nowrap"
          >
            {Date.now() < state.welcomePlayingUntil ? 'Hentikan Welcome' : 'Uji Welcome'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Gaya Welcome (6 Mode)</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'sweep', label: 'Sapuan' },
                  { id: 'center-out', label: 'Mekar Tengah' },
                  { id: 'cyber-flash', label: 'Cyber Flash' },
                  { id: 'dual-meet', label: 'Temu Tengah' },
                  { id: 'row-cascade', label: 'Naik 8 Baris' },
                  { id: 'pulse-bloom', label: 'Napas Halus' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSpecial('welcomeStyle', item.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
                    special.welcomeStyle === item.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Warna Welcome</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'cyan', label: 'Cyan' },
                  { id: 'crimson', label: 'Merah' },
                  { id: 'ice', label: 'Putih' },
                  { id: 'rainbow', label: 'RGB' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSpecial('welcomeColor', item.id)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
                    special.welcomeColor === item.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <label className="py-2 px-2.5 rounded-lg text-xs font-medium min-h-[38px] bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white inline-flex items-center gap-1.5 cursor-pointer">
                <span
                  className="w-3 h-3 rounded-full border border-white/30"
                  style={{
                    backgroundColor: special.welcomeColor.startsWith('#')
                      ? special.welcomeColor
                      : '#22D3EE',
                  }}
                />
                <span>Bebas</span>
                <input
                  type="color"
                  value={
                    special.welcomeColor.startsWith('#') ? special.welcomeColor : '#22D3EE'
                  }
                  onChange={(e) => onUpdateSpecial('welcomeColor', e.target.value.toUpperCase())}
                  aria-label="Warna custom welcome"
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Sein / Turn Signal */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Sein & Hazard</h3>
              <p className="text-xs text-slate-400">Running sequential kuning amber</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'off', label: 'Mati' },
                { id: 'left', label: 'Kiri' },
                { id: 'right', label: 'Kanan' },
                { id: 'hazard', label: 'Hazard' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSetSein(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium min-h-[36px] transition-colors ${
                  state.sein === opt.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-[#171F2E] text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Pola Nyala Sein</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'sequential', label: 'Running' },
                  { id: 'full', label: 'Full Panel' },
                  { id: 'blink', label: 'Kedip' },
                  { id: 'pulse', label: 'Halus' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateSpecial('seinPattern', item.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
                    special.seinPattern === item.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="sein-speed" className="text-xs text-slate-400">
                Kecepatan Sein
              </label>
              <span className="font-mono text-xs text-slate-200 tabular-nums">
                {special.seinSpeed}%
              </span>
            </div>
            <input
              id="sein-speed"
              type="range"
              min={15}
              max={100}
              value={special.seinSpeed}
              onChange={(e) => onUpdateSpecial('seinSpeed', Number(e.target.value))}
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${special.seinSpeed}%, #1e293b ${special.seinSpeed}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>
        </div>
      </section>

      {/* Brake, Reverse & Combination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <Disc className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">Mode Rem</h3>
            </div>
            <button
              type="button"
              onClick={onToggleBrake}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] transition-colors ${
                state.brakeActive
                  ? 'bg-red-500 text-white'
                  : 'bg-[#171F2E] text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              {state.brakeActive ? 'Matikan Rem' : 'Uji Rem'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'f1-strobe', label: 'Strobo F1' },
                { id: 'solid', label: 'Merah Solid' },
                { id: 'pulse-hold', label: 'Denyut' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdateSpecial('brakePattern', item.id)}
                className={`py-2 px-2 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
                  special.brakePattern === item.id
                    ? 'bg-red-500/20 text-red-300 border border-red-400/50'
                    : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-slate-100/10 text-slate-100 flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Mode Mundur (LED DMX)</h3>
                <p className="text-[11px] text-slate-400">Putih terang 6000K saat gigi mundur</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleReverse}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] transition-colors ${
                state.reverseActive
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-[#171F2E] text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              {state.reverseActive ? 'Matikan Mundur' : 'Uji Mundur'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Lampu belakang menyala putih solid berdaya penuh sementara lampu depan tetap mempertahankan efek RGB pilihan Anda.
          </p>
        </section>

        <section className="sm:col-span-2 rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-slate-100">Kombinasi RGB / Mode Belang</h3>
            </div>
            <button
              type="button"
              onClick={onToggleCombination}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] transition-colors ${
                state.combinationEnabled
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-[#171F2E] text-slate-200 hover:bg-[#1E293B]'
              }`}
            >
              {state.combinationEnabled ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'signal-over-rgb', label: 'Prioritas Sinyal' },
                { id: 'blend', label: 'Campur Panel Dalam' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUpdateSpecial('comboPriority', item.id)}
                className={`py-2 px-2.5 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
                  special.comboPriority === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
