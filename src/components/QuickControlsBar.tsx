import React from 'react';
import {
  ArrowLeftRight,
  Disc,
  Hand,
  Layers,
  Lightbulb,
  SlidersHorizontal,
} from 'lucide-react';
import { ControllerState, SeinState } from '../types/controller';
import { resolveCustomIconComponent } from './IconRegistry';

interface QuickControlsBarProps {
  state: ControllerState;
  onTriggerWelcome: () => void;
  onCycleSein: () => void;
  onToggleBrake: () => void;
  onToggleReverse: () => void;
  onToggleCombination: () => void;
  onOpenComboEditor: () => void;
}

const SEIN_LABELS: Record<SeinState, string> = {
  off: 'Mati',
  left: 'Kiri',
  right: 'Kanan',
  hazard: 'Hazard',
};

export const QuickControlsBar: React.FC<QuickControlsBarProps> = ({
  state,
  onTriggerWelcome,
  onCycleSein,
  onToggleBrake,
  onToggleReverse,
  onToggleCombination,
  onOpenComboEditor,
}) => {
  const { customization } = state;
  const isWelcomeActive = Date.now() < state.welcomePlayingUntil;
  const reverseActive = Boolean(state.reverseActive);

  const ql = customization.quickLabels || {};

  const items = [
    customization.showWelcomeBtn
      ? {
          id: 'welcome',
          label: (ql.welcome || '').trim() || 'Welcome',
          sub: isWelcomeActive ? 'Aktif · Stop' : 'Putar',
          active: isWelcomeActive,
          tone: 'cyan' as const,
          icon: resolveCustomIconComponent(customization.quickIcons?.welcome, Hand),
          onClick: onTriggerWelcome,
        }
      : null,
    customization.showSeinBtn
      ? {
          id: 'sein',
          label: (ql.sein || '').trim() || 'Sein / Hazard',
          sub: SEIN_LABELS[state.sein],
          active: state.sein !== 'off',
          tone: 'amber' as const,
          icon: resolveCustomIconComponent(customization.quickIcons?.sein, ArrowLeftRight),
          onClick: onCycleSein,
        }
      : null,
    customization.showBrakeBtn
      ? {
          id: 'brake',
          label: (ql.brake || '').trim() || 'Rem',
          sub: state.brakeActive ? 'Aktif' : 'Siap',
          active: state.brakeActive,
          tone: 'red' as const,
          icon: resolveCustomIconComponent(customization.quickIcons?.brake, Disc),
          onClick: onToggleBrake,
        }
      : null,
    {
      id: 'reverse',
      label: (ql.reverse || '').trim() || 'Mundur',
      sub: reverseActive ? 'Putih ON' : 'Siap',
      active: reverseActive,
      tone: 'white' as const,
      icon: Lightbulb,
      onClick: onToggleReverse,
    },
    customization.showComboBtn
      ? {
          id: 'combo',
          label: (ql.combo || '').trim() || 'Belang',
          sub: state.combinationEnabled
            ? `L${state.combo.leftModes.length}·R${state.combo.rightModes.length}`
            : 'Kombinasi',
          active: state.combinationEnabled,
          tone: 'cyan' as const,
          icon: resolveCustomIconComponent(customization.quickIcons?.combo, Layers),
          onClick: onToggleCombination,
        }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) return null;

  const gridCols =
    items.length === 1
      ? 'grid-cols-1'
      : items.length === 2
        ? 'grid-cols-2'
        : items.length === 3
          ? 'grid-cols-3'
          : items.length === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-3 sm:grid-cols-5';

  const toneClasses = {
    cyan: {
      active: 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100',
      icon: 'text-cyan-400',
      subActive: 'text-cyan-300',
    },
    amber: {
      active: 'bg-amber-500/15 border-amber-400/50 text-amber-100',
      icon: 'text-amber-400',
      subActive: 'text-amber-300',
    },
    red: {
      active: 'bg-red-500/15 border-red-400/50 text-red-100',
      icon: 'text-red-400',
      subActive: 'text-red-300',
    },
    white: {
      active: 'bg-slate-100/15 border-slate-200/60 text-white',
      icon: 'text-slate-100',
      subActive: 'text-slate-200',
    },
  };

  return (
    <section aria-label="Kontrol sinyal LED DMX" className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11px] font-medium text-slate-400 tracking-tight">
          Sinyal LED DMX (Sein · Rem · Mundur · Hazard · Belang)
        </span>
        {customization.showComboBtn && (
          <button
            type="button"
            onClick={onOpenComboEditor}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Atur Belang</span>
          </button>
        )}
      </div>

      <div className={`grid ${gridCols} gap-1.5`}>
        {items.map((item) => {
          const Icon = item.icon;
          const style = toneClasses[item.tone];
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-pressed={
                item.id === 'brake' || item.id === 'combo' || item.id === 'reverse'
                  ? item.active
                  : undefined
              }
              className={`flex flex-col items-center justify-center gap-1 px-1.5 py-2 rounded-xl border text-center transition-colors min-h-[52px] ${
                item.active
                  ? style.active
                  : 'bg-[#111622] border-white/[0.08] text-slate-200 hover:bg-[#161D2C]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${style.icon}`} />
              <div className="w-full min-w-0">
                <div className="text-[11px] font-semibold leading-tight truncate">
                  {item.label}
                </div>
                <div
                  className={`text-[10px] leading-tight mt-0.5 truncate ${
                    item.active ? `${style.subActive} font-medium` : 'text-slate-400'
                  }`}
                >
                  {item.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
