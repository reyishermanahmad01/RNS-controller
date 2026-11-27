import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FAMILY_SHORT_LABEL } from '../data/moduleFactoryModes';
import { RgbMode } from '../types/controller';

interface ModeCollectorProps {
  modes: RgbMode[];
  activeModeId: number;
  onSelectMode: (id: number) => void;
  onOpenAllModes?: () => void;
}

const ITEM_HEIGHT = 44;

export const ModeCollector: React.FC<ModeCollectorProps> = ({
  modes,
  activeModeId,
  onSelectMode,
  onOpenAllModes,
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  const activeIndex = Math.max(
    0,
    modes.findIndex((m) => m.id === activeModeId)
  );
  const activeMode = modes[activeIndex] || modes[0];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const targetTop = activeIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - targetTop) > 4) {
      isProgrammaticRef.current = true;
      el.scrollTo({ top: targetTop, behavior: 'smooth' });
      window.setTimeout(() => {
        isProgrammaticRef.current = false;
      }, 280);
    }
  }, [activeIndex]);

  const handleWheelScroll = () => {
    const el = scrollerRef.current;
    if (!el || isProgrammaticRef.current) return;

    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(modes.length - 1, idx));
      const targetMode = modes[clampedIdx];
      if (targetMode && targetMode.id !== activeModeId) {
        onSelectMode(targetMode.id);
      }
    }, 60);
  };

  const handleStep = (delta: number) => {
    const nextIdx = (activeIndex + delta + modes.length) % modes.length;
    onSelectMode(modes[nextIdx].id);
  };

  return (
    <section aria-labelledby="mode-collector-heading">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2
            id="mode-collector-heading"
            className="font-display text-sm font-semibold text-slate-200 tracking-tight whitespace-nowrap"
          >
            Mode Animasi
          </h2>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono text-xs text-cyan-300 font-semibold tabular-nums whitespace-nowrap">
            {activeMode?.moduleMeta
              ? `${activeMode.moduleMeta.codeLabel} · ${activeIndex + 1}/${modes.length}`
              : `${String(activeMode?.id ?? 1).padStart(3, '0')} / ${modes.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            aria-label="Geser mode ke atas"
            className="min-w-[34px] min-h-[34px] rounded-lg bg-[#111622] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleStep(1)}
            aria-label="Geser mode ke bawah"
            className="min-w-[34px] min-h-[34px] rounded-lg bg-[#111622] border border-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          {onOpenAllModes && (
            <button
              type="button"
              onClick={onOpenAllModes}
              className="text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors whitespace-nowrap px-2 min-h-[34px]"
            >
              Semua
            </button>
          )}
        </div>
      </div>

      {/* Vertical Wheel Slide Collector (Atas - Bawah) */}
      <div className="relative rounded-2xl bg-[#111622] border border-white/[0.08] overflow-hidden h-[156px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 right-2.5 top-1/2 -translate-y-1/2 h-[44px] rounded-xl bg-cyan-500/12 border border-cyan-400/45 z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#111622] to-transparent z-20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#111622] to-transparent z-20"
        />

        <div
          ref={scrollerRef}
          onScroll={handleWheelScroll}
          className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar px-3"
          role="listbox"
          aria-label="Slide kolektor mode animasi atas bawah"
        >
          <div className="h-[56px]" aria-hidden="true" />

          {modes.map((mode) => {
            const isSelected = mode.id === activeModeId;
            return (
              <button
                key={mode.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelectMode(mode.id)}
                className="w-full h-[44px] snap-center flex items-center justify-between gap-3 px-3 rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/15"
                    style={{
                      background: `linear-gradient(135deg, ${mode.primaryColor}, ${mode.secondaryColor})`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                      isSelected ? 'text-cyan-300' : 'text-slate-500'
                    }`}
                  >
                    {mode.moduleMeta ? mode.moduleMeta.codeLabel : String(mode.id).padStart(3, '0')}
                  </span>
                  <span
                    className={`text-sm truncate ${
                      isSelected ? 'font-semibold text-slate-100' : 'text-slate-400'
                    }`}
                  >
                    {mode.name}
                  </span>
                </div>
                <span
                  className={`text-[11px] shrink-0 ${
                    isSelected ? 'text-cyan-300 font-medium' : 'text-slate-600'
                  }`}
                >
                  {mode.moduleMeta
                    ? FAMILY_SHORT_LABEL[mode.moduleMeta.family]
                    : mode.isCustom
                      ? 'Custom'
                      : mode.category}
                </span>
              </button>
            );
          })}

          <div className="h-[56px]" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};
