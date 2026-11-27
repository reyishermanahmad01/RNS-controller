import React, { useEffect, useRef } from 'react';

interface RgbColorWheelProps {
  color: string;
  active: boolean;
  onChangeColor: (hex: string) => void;
  onToggleStay: () => void;
}

const QUICK_SOLIDS = [
  { hex: '#EF4444', label: 'Merah' },
  { hex: '#22D3EE', label: 'Cyan' },
  { hex: '#3B82F6', label: 'Biru' },
  { hex: '#10B981', label: 'Hijau' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EC4899', label: 'Magenta' },
  { hex: '#F8FAFC', label: 'Putih' },
];

const CCT_PRESETS = [
  { hex: '#FDBA74', label: 'Warm 2700K' },
  { hex: '#FEF3C7', label: 'Natural 4500K' },
  { hex: '#F8FAFC', label: 'Cool 6500K' },
];

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHsv(hex: string): { h: number; s: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return { h: 0, s: 1 };
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s };
}

export const RgbColorWheel: React.FC<RgbColorWheelProps> = ({
  color,
  active,
  onChangeColor,
  onToggleStay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);

  // Draw crisp HSV RGB color wheel once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 220;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;
    const img = ctx.createImageData(size, size);
    const data = img.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const idx = (y * size + x) * 4;
        if (dist <= radius) {
          let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (deg < 0) deg += 360;
          const sat = Math.min(1, dist / radius);
          const hex = hsvToHex(deg, sat, 1);
          const num = parseInt(hex.slice(1), 16);
          data[idx] = (num >> 16) & 255;
          data[idx + 1] = (num >> 8) & 255;
          data[idx + 2] = num & 255;
          data[idx + 3] = dist > radius - 1.5 ? Math.round((radius - dist + 1.5) * 170) : 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  }, []);

  const pickColorAtPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = rect.width / 2 - 4;
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;
    const dist = Math.min(radius, Math.hypot(dx, dy));
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const sat = Math.max(0, Math.min(1, dist / radius));
    onChangeColor(hsvToHex(deg, sat, 1));
  };

  const { h, s } = hexToHsv(color);
  const rad = (h * Math.PI) / 180;
  const markerLeft = 50 + Math.cos(rad) * s * 46;
  const markerTop = 50 + Math.sin(rad) * s * 46;

  return (
    <section
      aria-labelledby="rgb-wheel-heading"
      className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="rgb-wheel-heading"
            className="font-display text-sm font-semibold text-slate-100 tracking-tight"
          >
            Adjust Warna RGB &amp; Putih (Mode Stay)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Sentuh lingkaran RGB LEDLamp atau pilih suhu warna Warm / Cool
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleStay}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] whitespace-nowrap transition-colors ${
            active
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-[#171F2E] text-slate-300 border border-white/[0.08] hover:text-white'
          }`}
        >
          {active ? 'Stay Aktif' : 'Aktifkan Stay'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Interactive Circular RGB Wheel */}
        <div className="relative w-44 h-44 shrink-0 select-none touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={(e) => {
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              pickColorAtPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (draggingRef.current) {
                pickColorAtPointer(e.clientX, e.clientY);
              }
            }}
            onPointerUp={() => {
              draggingRef.current = false;
            }}
            className="w-full h-full rounded-full cursor-crosshair block"
            aria-label="Lingkaran pemilih warna RGB"
          />
          {/* Crosshair Marker */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white shadow-md"
            style={{
              left: `${markerLeft}%`,
              top: `${markerTop}%`,
              backgroundColor: color,
            }}
          />
        </div>

        {/* Selected Color Readout & Quick Solid Dots */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0B0F17] border border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-lg border border-white/20 shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-xs text-slate-300">Warna terpilih</span>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-100">{color}</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-2">Pilihan cepat warna solid</span>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_SOLIDS.map((preset) => {
                const isCurr = color.toUpperCase() === preset.hex;
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => onChangeColor(preset.hex)}
                    aria-label={`Pilih warna solid ${preset.label}`}
                    title={preset.label}
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${
                      isCurr ? 'border-white scale-110' : 'border-white/15 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5">Suhu Warna Putih (CCT)</span>
            <div className="grid grid-cols-3 gap-1.5">
              {CCT_PRESETS.map((cct) => {
                const isCurr = color.toUpperCase() === cct.hex;
                return (
                  <button
                    key={cct.hex}
                    type="button"
                    onClick={() => onChangeColor(cct.hex)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition-colors ${
                      isCurr
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                        : 'bg-[#0B0F17] border-white/[0.08] text-slate-300 hover:text-white'
                    }`}
                  >
                    {cct.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
