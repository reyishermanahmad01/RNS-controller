import React from 'react';
import { Eye, Minus, Plus, Zap } from 'lucide-react';
import { LedConfig } from '../types/controller';

interface LedViewProps {
  led: LedConfig;
  brightness: number;
  isAdmin?: boolean;
  onUpdateLed: <K extends keyof LedConfig>(key: K, value: LedConfig[K]) => void;
}

export const LedView: React.FC<LedViewProps> = ({
  led,
  brightness,
  onUpdateLed,
}) => {
  const [leftDraft, setLeftDraft] = React.useState(String(led.leftCount));
  const [rightDraft, setRightDraft] = React.useState(String(led.rightCount));

  React.useEffect(() => {
    setLeftDraft(String(led.leftCount));
  }, [led.leftCount]);

  React.useEffect(() => {
    setRightDraft(String(led.rightCount));
  }, [led.rightCount]);

  const totalLeds = led.leftCount + led.rightCount;
  const estimatedMa = Math.min(
    led.maxCurrentMa,
    Math.round(totalLeds * 32 * (brightness / 100))
  );
  const estimatedWatts = ((estimatedMa / 1000) * 5).toFixed(1);

  const adjustCount = (side: 'leftCount' | 'rightCount', delta: number) => {
    const next = Math.max(1, Math.min(1000, led[side] + delta));
    onUpdateLed(side, next);
  };

  const handleManualInput = (side: 'leftCount' | 'rightCount', raw: string) => {
    if (side === 'leftCount') setLeftDraft(raw);
    else setRightDraft(raw);

    if (raw.trim() === '') return;
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      onUpdateLed(side, Math.min(1000, parsed));
    }
  };

  const commitManualBlur = (side: 'leftCount' | 'rightCount') => {
    const draft = side === 'leftCount' ? leftDraft : rightDraft;
    const parsed = parseInt(draft, 10);
    const valid = Number.isNaN(parsed) ? led[side] : Math.max(1, Math.min(1000, parsed));
    onUpdateLed(side, valid);
    if (side === 'leftCount') setLeftDraft(String(valid));
    else setRightDraft(String(valid));
  };

  const applySymmetricPreset = (countPerSide: number) => {
    onUpdateLed('leftCount', countPerSide);
    onUpdateLed('rightCount', countPerSide);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            Pengaturan LED &amp; Matrix (LEDLamp)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Atur jumlah LED (1–1000/panel), tipe IC (WS2812B/WS2815/SK6812), urutan warna (GRB/RGB/BRG) &amp; kalibrasi.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono tabular-nums">{totalLeds} LED</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-400">~{estimatedWatts} W</span>
        </div>
      </div>

      {/* Left & Right Panel LED Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(
          [
            { key: 'leftCount', label: 'Panel kiri', draft: leftDraft },
            { key: 'rightCount', label: 'Panel kanan', draft: rightDraft },
          ] as const
        ).map((panel) => {
          const sliderVal = Math.min(500, Math.max(1, led[panel.key]));
          const pct = Math.round(((sliderVal - 1) / 499) * 100);
          return (
            <div
              key={panel.key}
              className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`led-input-${panel.key}`}
                  className="text-sm font-medium text-slate-200"
                >
                  {panel.label}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={`led-input-${panel.key}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    value={panel.draft}
                    onChange={(e) => handleManualInput(panel.key, e.target.value)}
                    onBlur={() => commitManualBlur(panel.key)}
                    aria-label={`Input angka jumlah LED ${panel.label}`}
                    className="w-20 h-9 px-2.5 rounded-xl bg-[#0B0F17] border border-cyan-400/40 text-right font-mono text-sm font-semibold text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-xs font-mono text-slate-400">LED</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustCount(panel.key, -1)}
                  aria-label={`Kurangi jumlah ${panel.label}`}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-[#171F2E] border border-white/[0.06] flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <input
                  type="range"
                  min={1}
                  max={500}
                  value={sliderVal}
                  onChange={(e) => onUpdateLed(panel.key, Number(e.target.value))}
                  aria-label={`Jumlah LED ${panel.label}`}
                  className="rns-slider flex-1"
                  style={{
                    background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${pct}%, #1e293b ${pct}%, #1e293b 100%)`,
                    height: '6px',
                    borderRadius: '9999px',
                  }}
                />

                <button
                  type="button"
                  onClick={() => adjustCount(panel.key, 1)}
                  aria-label={`Tambah jumlah ${panel.label}`}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-[#171F2E] border border-white/[0.06] flex items-center justify-center text-slate-300 hover:text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Presets & Symmetrical Sync */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-slate-400 mr-1">Preset cepat:</span>
        {[
          { label: 'NMAX Standar (187×2)', count: 187 },
          { label: '144×2', count: 144 },
          { label: '100×2', count: 100 },
          { label: '60×2', count: 60 },
        ].map((p) => (
          <button
            key={p.count}
            type="button"
            onClick={() => applySymmetricPreset(p.count)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-colors ${
              led.leftCount === p.count && led.rightCount === p.count
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                : 'bg-[#111622] border-white/[0.08] text-slate-300 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onUpdateLed('rightCount', led.leftCount)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#171F2E] border border-white/[0.08] text-slate-200 hover:text-white"
        >
          Samakan Kanan = Kiri ({led.leftCount})
        </button>
      </div>

      {/* Matrix Pixel Style & Moving Eye Overlay */}
      <div className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="text-xs text-slate-400 block mb-1.5">Bentuk Piksel Matrix</span>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: 'square', label: 'Kotak Matrix' },
                { id: 'round', label: 'Titik Bulat' },
              ] as const
            ).map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => onUpdateLed('pixelShape', shape.id)}
                className={`py-2 px-3 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
                  led.pixelShape === shape.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                }`}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-1.5">Animasi Mata Bergerak</span>
          <button
            type="button"
            onClick={() => onUpdateLed('showMovingEyes', !led.showMovingEyes)}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium min-h-[38px] transition-colors ${
              led.showMovingEyes
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                : 'bg-[#171F2E] text-slate-300 border border-white/[0.05]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{led.showMovingEyes ? 'Mata Aktif di Matrix' : 'Hanya Pola RGB'}</span>
            </span>
            <span>{led.showMovingEyes ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="sm:col-span-2 pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-slate-200">
              Posisi Data Panel Kiri ↔ Kanan (Hardware)
            </div>
            <div className="text-[11px] text-slate-400">
              Aktifkan jika kabel data ESP8266 masuk dari panel kanan dulu, sehingga sein kiri/kanan tertukar sisi.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateLed('swapPanels', !led.swapPanels)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[36px] transition-colors ${
              led.swapPanels
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-[#171F2E] text-slate-300 border border-white/[0.08] hover:text-white'
            }`}
          >
            {led.swapPanels ? 'Ditukar (Kanan = Index 0)' : 'Normal (Kiri = Index 0)'}
          </button>
        </div>
      </div>

      {/* Hardware Settings */}
      <div className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Tipe IC LED</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['WS2812B', 'WS2815', 'SK6812'] as const).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onUpdateLed('chipset', chip)}
                  className={`py-2 px-2 rounded-lg font-mono text-xs font-medium min-h-[38px] transition-colors ${
                    led.chipset === chip
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 block mb-1.5">Urutan Warna</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['GRB', 'RGB', 'BRG'] as const).map((order) => (
                <button
                  key={order}
                  type="button"
                  onClick={() => onUpdateLed('colorOrder', order)}
                  className={`py-2 px-2 rounded-lg font-mono text-xs font-medium min-h-[38px] transition-colors ${
                    led.colorOrder === order
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
                  }`}
                >
                  {order}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="current-limit" className="text-xs text-slate-300 font-medium">
              Batas Arus Maksimum (5V)
            </label>
            <span className="font-mono text-xs text-cyan-300 tabular-nums">
              {led.maxCurrentMa} mA
            </span>
          </div>
          <input
            id="current-limit"
            type="range"
            min={500}
            max={5000}
            step={100}
            value={led.maxCurrentMa}
            onChange={(e) => onUpdateLed('maxCurrentMa', Number(e.target.value))}
            className="rns-slider w-full"
            style={{
              background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${((led.maxCurrentMa - 500) / 4500) * 100}%, #1e293b ${((led.maxCurrentMa - 500) / 4500) * 100}%, #1e293b 100%)`,
              height: '6px',
              borderRadius: '9999px',
            }}
          />
        </div>
      </div>

      {/* Cable & Channel Test */}
      <div className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-200">Uji Warna Saluran LED</span>
          <span className="text-xs text-slate-400">Untuk kalibrasi RGB</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(
            [
              { id: 'none', label: 'Normal' },
              { id: 'red', label: 'Merah' },
              { id: 'green', label: 'Hijau' },
              { id: 'blue', label: 'Biru' },
              { id: 'white', label: 'Putih' },
              { id: 'off', label: 'Mati' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onUpdateLed('testOverride', item.id)}
              className={`py-2 px-2 rounded-xl text-xs font-medium min-h-[40px] transition-colors ${
                led.testOverride === item.id
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-[#171F2E] text-slate-300 border border-white/[0.05] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
