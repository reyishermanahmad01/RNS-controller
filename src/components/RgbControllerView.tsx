import React, { useEffect, useState } from 'react';
import {
  Gauge,
  Hand,
  Mic,
  MicOff,
  Palette,
  Sun,
  Volume2,
} from 'lucide-react';
import {
  ControllerState,
  ModeCategory,
  RgbMode,
  SoundStyle,
  WelcomeStyle,
} from '../types/controller';
import { getLiveAudioFrame } from '../utils/audioReactive';
import { ModeView } from './ModeView';
import { RgbColorWheel } from './RgbColorWheel';

interface RgbControllerViewProps {
  state: ControllerState;
  allModes: RgbMode[];
  micActive: boolean;
  micError: string | null;
  isAdmin: boolean;
  onChangeSpeed: (val: number) => void;
  onChangeBrightness: (val: number) => void;
  onChangeSolidColor: (hex: string) => void;
  onToggleSolidStay: () => void;
  onApplyManualTintColor: (hex: string) => void;
  onToggleManualTint: () => void;
  onChangeWelcomeColor: (color: string) => void;
  onChangeWelcomeStyle: (style: WelcomeStyle) => void;
  onTriggerWelcome: () => void;
  onToggleSoundMode: () => void;
  onChangeSoundSensitivity: (val: number) => void;
  onChangeSoundStyle: (style: SoundStyle) => void;
  onSelectMode: (id: number) => void;
  onAddModeToCombo: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onPrevMode: () => void;
  onNextMode: () => void;
  onToggleAutoLoop: () => void;
  onChangeAutoLoopInterval: (sec: number) => void;
  onOpenComboEditor: () => void;
  onAddCustomMode: (mode: Omit<RgbMode, 'id' | 'code' | 'isCustom'>) => void;
  onOpenAdminCloud?: () => void;
}

const WELCOME_PRESETS = [
  { id: 'cyan', label: 'Cyan', hex: '#22D3EE' },
  { id: 'crimson', label: 'Merah', hex: '#EF4444' },
  { id: 'ice', label: 'Putih', hex: '#F8FAFC' },
  { id: '#3B82F6', label: 'Biru', hex: '#3B82F6' },
  { id: '#22C55E', label: 'Hijau', hex: '#22C55E' },
  { id: '#F59E0B', label: 'Amber', hex: '#F59E0B' },
  { id: '#EC4899', label: 'Magenta', hex: '#EC4899' },
  { id: 'rainbow', label: 'RGB', hex: 'rainbow' },
];

const WELCOME_STYLES: { id: WelcomeStyle; label: string }[] = [
  { id: 'sweep', label: 'Sapuan' },
  { id: 'center-out', label: 'Mekar' },
  { id: 'cyber-flash', label: 'Cyber' },
  { id: 'dual-meet', label: 'Temu Tengah' },
  { id: 'row-cascade', label: '8 Baris' },
  { id: 'pulse-bloom', label: 'Napas' },
];

const SOUND_STYLES: { id: SoundStyle; label: string }[] = [
  { id: 'vu-bars', label: 'VU Meter' },
  { id: 'bass-pulse', label: 'Bass Pulse' },
  { id: 'spectrum-wave', label: 'Spektrum' },
  { id: 'strobe-beat', label: 'Strobo Beat' },
];

function resolveWelcomeSwatch(val: string): string {
  if (val === 'cyan') return '#22D3EE';
  if (val === 'crimson') return '#EF4444';
  if (val === 'ice') return '#F8FAFC';
  if (val === 'rainbow') return '#22D3EE';
  return val.startsWith('#') ? val : '#22D3EE';
}

export const RgbControllerView: React.FC<RgbControllerViewProps> = ({
  state,
  allModes,
  micActive,
  micError,
  isAdmin,
  onChangeSpeed,
  onChangeBrightness,
  onChangeSolidColor,
  onToggleSolidStay,
  onApplyManualTintColor,
  onToggleManualTint,
  onChangeWelcomeColor,
  onChangeWelcomeStyle,
  onTriggerWelcome,
  onToggleSoundMode,
  onChangeSoundSensitivity,
  onChangeSoundStyle,
  onSelectMode,
  onAddModeToCombo,
  onToggleFavorite,
  onPrevMode,
  onNextMode,
  onToggleAutoLoop,
  onChangeAutoLoopInterval,
  onOpenComboEditor,
  onAddCustomMode,
  onOpenAdminCloud,
}) => {
  const [sectionTab, setSectionTab] = useState<'modes' | 'color' | 'effects'>('modes');
  const [liveBands, setLiveBands] = useState<number[]>([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);

  const activeWelcome = state.special.welcomeColor || 'cyan';
  const activeWelcomeStyle = state.special.welcomeStyle || 'sweep';
  const resolvedHex = resolveWelcomeSwatch(activeWelcome);
  const soundEnabled = Boolean(state.soundReactive?.enabled);
  const soundSensitivity = state.soundReactive?.sensitivity ?? 65;
  const soundStyle = state.soundReactive?.style || 'vu-bars';
  const manualTintActive = Boolean(state.manualSideColors?.enabled);
  const manualTintHex = state.manualSideColors?.leftColors?.[0] || state.solidColor;

  useEffect(() => {
    if (!soundEnabled) return;
    const id = window.setInterval(() => {
      const frame = getLiveAudioFrame(soundSensitivity, performance.now());
      setLiveBands(frame.bands);
    }, 90);
    return () => window.clearInterval(id);
  }, [soundEnabled, soundSensitivity]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            RGB Controller
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pemilihan warna, kecerahan, kecepatan animasi, daftar mode, dan pengaturan efek.
          </p>
        </div>
      </div>

      {/* Sub-navigation inside RGB Controller */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#0B0F17] p-1 rounded-2xl border border-white/[0.08]">
        {(
          [
            { id: 'modes', label: 'Mode & Slider' },
            { id: 'color', label: 'Pemilih Warna' },
            { id: 'effects', label: 'Efek & Suara' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSectionTab(tab.id)}
            className={`py-2 px-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors ${
              sectionTab === tab.id
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Always handy Speed & Brightness sliders on Color/Effects view too */}
      {sectionTab !== 'modes' && (
        <section className="rounded-2xl bg-[#111622] border border-white/[0.08] divide-y divide-white/[0.06]">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="rgb-speed-slider"
                className="flex items-center gap-2 text-xs font-medium text-slate-200"
              >
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Kecepatan Animasi</span>
              </label>
              <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
                {state.speed}%
              </span>
            </div>
            <input
              id="rgb-speed-slider"
              type="range"
              min={5}
              max={100}
              value={state.speed}
              onChange={(e) => onChangeSpeed(Number(e.target.value))}
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${state.speed}%, #1e293b ${state.speed}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="rgb-bri-slider"
                className="flex items-center gap-2 text-xs font-medium text-slate-200"
              >
                <Sun className="w-4 h-4 text-cyan-400" />
                <span>Kecerahan</span>
              </label>
              <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
                {state.brightness}%
              </span>
            </div>
            <input
              id="rgb-bri-slider"
              type="range"
              min={5}
              max={100}
              value={state.brightness}
              onChange={(e) => onChangeBrightness(Number(e.target.value))}
              className="rns-slider w-full"
              style={{
                background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${state.brightness}%, #1e293b ${state.brightness}%, #1e293b 100%)`,
                height: '6px',
                borderRadius: '9999px',
              }}
            />
          </div>
        </section>
      )}

      {sectionTab === 'color' && (
        <div className="space-y-4">
          {/* Custom Warna Manual tanpa mematikan mode aktif */}
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100">
                  Custom Warna Manual (Pertahankan Mode Aktif)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ubah warna animasi/kombinasi yang sedang berjalan tanpa berpindah mode.
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleManualTint}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[38px] shrink-0 ${
                  manualTintActive
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-[#171F2E] text-slate-200 border border-white/[0.08]'
                }`}
              >
                {manualTintActive ? 'Aktif' : 'Aktifkan'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['#EF4444', '#22D3EE', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#A855F7', '#FFFFFF'].map(
                (hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onApplyManualTintColor(hex)}
                    aria-label={`Pilih warna manual ${hex}`}
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${
                      manualTintActive && manualTintHex.toUpperCase() === hex
                        ? 'border-white scale-110'
                        : 'border-white/25 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                )
              )}

              <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[#171F2E] border border-white/[0.1] text-xs font-medium text-slate-200 cursor-pointer">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pilih Bebas</span>
                <input
                  type="color"
                  value={manualTintHex}
                  onChange={(e) => onApplyManualTintColor(e.target.value.toUpperCase())}
                  className="sr-only"
                />
              </label>
            </div>
          </section>

          {/* Roda Warna Solid / Stay */}
          <RgbColorWheel
            color={state.solidColor}
            active={state.solidStayActive}
            onChangeColor={onChangeSolidColor}
            onToggleStay={onToggleSolidStay}
          />
        </div>
      )}

      {sectionTab === 'effects' && (
        <div className="space-y-4">
          {/* Welcome Card */}
          <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Hand className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100 truncate">
                    Efek LED Welcome
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Warna &amp; animasi sapuan saat kontak ON
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onTriggerWelcome}
                className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[38px] whitespace-nowrap"
              >
                {Date.now() < state.welcomePlayingUntil ? 'Hentikan Welcome' : 'Putar Welcome'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {WELCOME_PRESETS.map((item) => {
                const isCurr =
                  activeWelcome.toLowerCase() === item.id.toLowerCase() ||
                  (item.hex !== 'rainbow' && activeWelcome.toLowerCase() === item.hex.toLowerCase());
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeWelcomeColor(item.id)}
                    title={item.label}
                    aria-label={`Warna welcome ${item.label}`}
                    className={`w-8 h-8 rounded-full border-2 transition-transform shrink-0 ${
                      isCurr ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                    }`}
                    style={{
                      background:
                        item.hex === 'rainbow'
                          ? 'conic-gradient(#ef4444, #f59e0b, #22c55e, #22d3ee, #3b82f6, #ec4899, #ef4444)'
                          : item.hex,
                    }}
                  />
                );
              })}

              <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full bg-[#171F2E] border border-white/[0.12] text-[11px] font-medium text-slate-200 cursor-pointer">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Custom</span>
                <input
                  type="color"
                  value={resolvedHex}
                  onChange={(e) => onChangeWelcomeColor(e.target.value.toUpperCase())}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.06]">
              {WELCOME_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onChangeWelcomeStyle(style.id)}
                  className={`py-2 px-2 rounded-lg text-[11px] font-medium min-h-[36px] transition-colors ${
                    activeWelcomeStyle === style.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </section>

          {/* Sound Reactive Card */}
          <section
            className={`rounded-2xl border p-4 space-y-3 transition-colors ${
              soundEnabled
                ? 'bg-cyan-500/10 border-cyan-400/45'
                : 'bg-[#111622] border-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    soundEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-[#171F2E] text-cyan-400'
                  }`}
                >
                  {soundEnabled ? <Mic className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-100 truncate">
                    Mode Suara (Musik / Mic)
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    {soundEnabled
                      ? micActive
                        ? 'Mikrofon aktif mengikuti suara'
                        : 'Aktif mengikuti ketukan musik'
                      : 'LED bereaksi otomatis mengikuti musik'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleSoundMode}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] whitespace-nowrap ${
                  soundEnabled
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-[#171F2E] border border-white/[0.08] text-slate-200'
                }`}
              >
                {soundEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>{soundEnabled ? 'Suara ON' : 'Aktifkan'}</span>
              </button>
            </div>

            {soundEnabled && (
              <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                <div className="h-9 rounded-xl bg-[#0B0F17] border border-white/[0.06] px-2.5 py-1.5 flex items-end gap-1.5">
                  {liveBands.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-sm bg-cyan-400 transition-all duration-75"
                      style={{ height: `${Math.max(12, Math.round(val * 100))}%`, opacity: 0.45 + val * 0.55 }}
                    />
                  ))}
                </div>

                {micError && (
                  <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
                    {micError}
                  </p>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">Sensitivitas Suara</span>
                    <span className="font-mono text-cyan-300 tabular-nums">{soundSensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={soundSensitivity}
                    onChange={(e) => onChangeSoundSensitivity(Number(e.target.value))}
                    className="rns-slider w-full"
                    style={{
                      background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${soundSensitivity}%, #1e293b ${soundSensitivity}%, #1e293b 100%)`,
                      height: '6px',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SOUND_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onChangeSoundStyle(st.id)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-medium min-h-[38px] border ${
                        soundStyle === st.id
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                          : 'bg-[#0B0F17] border-white/[0.06] text-slate-300'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {sectionTab === 'modes' && (
        <ModeView
          allModes={allModes}
          activeModeId={state.activeModeId}
          favorites={state.favorites}
          speed={state.speed}
          brightness={state.brightness}
          autoLoopModes={Boolean(state.autoLoopModes)}
          autoLoopIntervalSec={state.autoLoopIntervalSec || 5}
          isAdmin={isAdmin}
          onSelectMode={onSelectMode}
          onAddModeToCombo={onAddModeToCombo}
          onToggleFavorite={onToggleFavorite}
          onChangeSpeed={onChangeSpeed}
          onChangeBrightness={onChangeBrightness}
          onPrevMode={onPrevMode}
          onNextMode={onNextMode}
          onToggleAutoLoop={onToggleAutoLoop}
          onChangeAutoLoopInterval={onChangeAutoLoopInterval}
          onOpenComboEditor={onOpenComboEditor}
          onAddCustomMode={onAddCustomMode}
          onOpenAdminCloud={onOpenAdminCloud}
        />
      )}
    </div>
  );
};
