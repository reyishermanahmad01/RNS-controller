import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { ControllerState, RgbMode } from '../types/controller';
import {
  evaluateStoplampCell,
  MATRIX_CELLS,
  MATRIX_COLS,
  MATRIX_ROWS,
} from '../utils/patternColorEngine';

interface StoplampVisualizerProps {
  state: ControllerState;
  allModes: RgbMode[];
  onSelectLedTab?: () => void;
  canEditLed?: boolean;
}

function drawRoundedRectSafe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const maybeRoundRect = (
    ctx as CanvasRenderingContext2D & {
      roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
    }
  ).roundRect;
  if (typeof maybeRoundRect === 'function') {
    maybeRoundRect.call(ctx, x, y, w, h, r);
    return;
  }
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export const SidePanelPreviewCanvas: React.FC<{
  state: ControllerState;
  allModes: RgbMode[];
  side: 'left' | 'right' | 'both';
  className?: string;
}> = ({ state, allModes, side, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const modesRef = useRef(allModes);
  stateRef.current = state;
  modesRef.current = allModes;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const draw = (nowMs: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const s = stateRef.current;
      const modes = modesRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(180, Math.round(rect.width * dpr));
      const targetH = Math.max(64, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#070A0F';
      ctx.fillRect(0, 0, w, h);

      if (side === 'both') {
        const sidePad = w * 0.04;
        const centerGap = w * 0.04;
        const panelW = (w - sidePad * 2 - centerGap) / 2;
        const cellSize = Math.min(panelW / MATRIX_COLS, (h * 0.82) / MATRIX_ROWS);
        const gridW = cellSize * MATRIX_COLS;
        const gridH = cellSize * MATRIX_ROWS;
        const topY = (h - gridH) / 2;
        const leftOx = sidePad + (panelW - gridW) / 2;
        const rightOx = sidePad + panelW + centerGap + (panelW - gridW) / 2;
        const gap = Math.max(1, cellSize * 0.16);
        const box = cellSize - gap;

        const clockNowMs = Date.now();
        for (const cell of MATRIX_CELLS) {
          const ox = cell.side === 'left' ? leftOx : rightOx;
          const px = ox + cell.col * cellSize + gap / 2;
          const py = topY + cell.row * cellSize + gap / 2;
          const [r, g, b] = evaluateStoplampCell(s, modes, cell, nowMs, {
            ignoreOverrides: true,
            wallClockMs: clockNowMs,
          });
          ctx.fillStyle = `rgb(${Math.max(20, r)}, ${Math.max(24, g)}, ${Math.max(32, b)})`;
          ctx.beginPath();
          if (s.led.pixelShape === 'round') {
            ctx.arc(px + box / 2, py + box / 2, box / 2, 0, Math.PI * 2);
          } else {
            drawRoundedRectSafe(ctx, px, py, box, box, Math.max(1, box * 0.16));
          }
          ctx.fill();
        }
      } else {
        const padX = w * 0.06;
        const cellSize = Math.min((w - padX * 2) / MATRIX_COLS, (h * 0.84) / MATRIX_ROWS);
        const gridW = cellSize * MATRIX_COLS;
        const gridH = cellSize * MATRIX_ROWS;
        const ox = (w - gridW) / 2;
        const topY = (h - gridH) / 2;
        const gap = Math.max(1, cellSize * 0.16);
        const box = cellSize - gap;
        const clockNowMs = Date.now();

        for (const cell of MATRIX_CELLS) {
          if (cell.side !== side) continue;
          const px = ox + cell.col * cellSize + gap / 2;
          const py = topY + cell.row * cellSize + gap / 2;
          const [r, g, b] = evaluateStoplampCell(s, modes, cell, nowMs, {
            ignoreOverrides: true,
            wallClockMs: clockNowMs,
          });
          ctx.fillStyle = `rgb(${Math.max(20, r)}, ${Math.max(24, g)}, ${Math.max(32, b)})`;
          ctx.beginPath();
          if (s.led.pixelShape === 'round') {
            ctx.arc(px + box / 2, py + box / 2, box / 2, 0, Math.PI * 2);
          } else {
            drawRoundedRectSafe(ctx, px, py, box, box, Math.max(1, box * 0.16));
          }
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [side]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
      aria-label={
        side === 'left'
          ? 'Preview panel LED kiri'
          : side === 'right'
            ? 'Preview panel LED kanan'
            : 'Preview dua panel LED'
      }
    />
  );
};

export const StoplampVisualizer: React.FC<StoplampVisualizerProps> = ({
  state,
  allModes,
  onSelectLedTab,
  canEditLed = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const modesRef = useRef(allModes);
  const [expanded, setExpanded] = useState(false);

  stateRef.current = state;
  modesRef.current = allModes;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const render = (nowMs: number) => {
      if (typeof document !== 'undefined' && document.hidden) {
        rafId = requestAnimationFrame(render);
        return;
      }
      const s = stateRef.current;
      const modes = modesRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(320, Math.round(rect.width * dpr));
      const targetH = Math.max(160, Math.round(rect.height * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#070A0F';
      ctx.fillRect(0, 0, w, h);

      const sidePad = w * 0.045;
      const centerGap = w * 0.04;
      const panelW = (w - sidePad * 2 - centerGap) / 2;
      const cellSize = Math.min(panelW / MATRIX_COLS, (h * 0.76) / MATRIX_ROWS);
      const gridW = cellSize * MATRIX_COLS;
      const gridH = cellSize * MATRIX_ROWS;
      const topY = (h - gridH) / 2;

      const leftOriginX = sidePad + (panelW - gridW) / 2;
      const rightOriginX = sidePad + panelW + centerGap + (panelW - gridW) / 2;

      ctx.save();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = Math.max(3, cellSize * 0.45);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftOriginX + gridW - cellSize * 0.5, topY + gridH * 0.28);
      ctx.quadraticCurveTo(
        w * 0.5,
        topY + gridH * 0.42,
        rightOriginX + cellSize * 0.5,
        topY + gridH * 0.28
      );
      ctx.stroke();

      const drawPanelHousing = (ox: number, side: 'left' | 'right') => {
        const pad = cellSize * 0.85;
        ctx.fillStyle = '#141923';
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        if (side === 'left') {
          ctx.moveTo(ox - pad, topY + cellSize * 1.4);
          ctx.lineTo(ox + gridW * 0.14, topY - pad * 0.7);
          ctx.lineTo(ox + gridW + pad * 0.6, topY - pad * 0.5);
          ctx.lineTo(ox + gridW + pad * 0.7, topY + gridH * 0.42);
          ctx.lineTo(ox + gridW * 0.55, topY + gridH + pad * 0.7);
          ctx.lineTo(ox + gridW * 0.3, topY + gridH + pad * 0.5);
          ctx.closePath();
        } else {
          ctx.moveTo(ox - pad * 0.6, topY - pad * 0.5);
          ctx.lineTo(ox + gridW * 0.86, topY - pad * 0.7);
          ctx.lineTo(ox + gridW + pad, topY + cellSize * 1.4);
          ctx.lineTo(ox + gridW * 0.7, topY + gridH + pad * 0.5);
          ctx.lineTo(ox + gridW * 0.45, topY + gridH + pad * 0.7);
          ctx.lineTo(ox - pad * 0.7, topY + gridH * 0.42);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
      };

      drawPanelHousing(leftOriginX, 'left');
      drawPanelHousing(rightOriginX, 'right');
      ctx.restore();

      const activeMode = modes.find((m) => m.id === s.activeModeId) || modes[0];
      const speedFactor = s.speed / 100;
      const timeSec = nowMs / 1000;
      const clockNowMs = Date.now();
      const welcomeActive = s.welcomePlayingUntil > 0 && clockNowMs < s.welcomePlayingUntil;
      const welcomeProgress = welcomeActive
        ? Math.max(0, Math.min(1, 1 - (s.welcomePlayingUntil - clockNowMs) / 3000))
        : 0;

      const spd = 0.55 + speedFactor * 2.2;
      const gazePhase = timeSec * spd;
      let eyeCenterOffsetX = Math.sin(gazePhase * 1.2) * 4.5;
      let eyeCenterOffsetY = Math.cos(gazePhase * 2.4) * 0.9;
      let lidClose = 0;

      const blinkCycle = timeSec % 4.0;
      if (blinkCycle > 3.78) {
        lidClose = Math.sin(((blinkCycle - 3.78) / 0.22) * Math.PI);
      }

      if (welcomeActive) {
        eyeCenterOffsetX = Math.sin(welcomeProgress * Math.PI * 3) * 6;
        eyeCenterOffsetY = 0;
        lidClose = welcomeProgress < 0.2 ? 1 - welcomeProgress * 5 : 0;
      } else if (s.sein === 'left') {
        eyeCenterOffsetX = -5.5;
      } else if (s.sein === 'right') {
        eyeCenterOffsetX = 5.5;
      } else if (s.brakeActive || s.solidStayActive) {
        eyeCenterOffsetX = 0;
        eyeCenterOffsetY = 0;
      }

      const ledPowerOn = s.powerOn !== false;
      const eyeBehavior = activeMode.eyeBehavior || 'look-around';
      const showEyes =
        ledPowerOn &&
        s.led.showMovingEyes &&
        eyeBehavior !== 'off' &&
        !s.solidStayActive &&
        s.led.testOverride === 'none';

      const gap = Math.max(1.2, cellSize * 0.16);
      const box = cellSize - gap;

      for (const cell of MATRIX_CELLS) {
        const ox = cell.side === 'left' ? leftOriginX : rightOriginX;
        const px = ox + cell.col * cellSize + gap / 2;
        const py = topY + cell.row * cellSize + gap / 2;

        const configuredSideCount =
          cell.side === 'left' ? s.led.leftCount : s.led.rightCount;
        const isCellActiveInConfig = cell.hwIndex < configuredSideCount;

        if (!isCellActiveInConfig) {
          ctx.fillStyle = 'rgba(22, 28, 40, 0.55)';
          if (s.led.pixelShape === 'round') {
            ctx.beginPath();
            ctx.arc(px + box / 2, py + box / 2, box * 0.36, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const rad = Math.max(1, box * 0.16);
            ctx.beginPath();
            drawRoundedRectSafe(ctx, px + box * 0.14, py + box * 0.14, box * 0.72, box * 0.72, rad);
            ctx.fill();
          }
          continue;
        }

        const baseCol = cell.side === 'left' ? 16.5 : 14.5;
        const [r, g, b] = evaluateStoplampCell(s, modes, cell, nowMs, {
          wallClockMs: clockNowMs,
          eyeCinematics: showEyes
            ? {
                showEyes,
                eyeBehavior,
                pupilCol: baseCol + eyeCenterOffsetX,
                pupilRow: 2.8 + eyeCenterOffsetY,
                halfOpen: 3.5 * (1 - lidClose),
              }
            : undefined,
        });

        ctx.fillStyle = `rgb(${Math.max(24, r)}, ${Math.max(28, g)}, ${Math.max(36, b)})`;
        if (s.led.pixelShape === 'round') {
          ctx.beginPath();
          ctx.arc(px + box / 2, py + box / 2, box / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const rad = Math.max(1, box * 0.16);
          ctx.beginPath();
          drawRoundedRectSafe(ctx, px, py, box, box, rad);
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const activeMode = allModes.find((m) => m.id === state.activeModeId) || allModes[0];

  const statusText =
    state.led.testOverride !== 'none'
      ? `Uji LED · ${state.led.testOverride.toUpperCase()}`
      : state.powerOn === false
        ? 'LED Mati (OFF)'
        : Date.now() < state.welcomePlayingUntil
          ? 'Welcome aktif'
          : state.brakeActive
            ? 'Rem aktif'
            : state.reverseActive
              ? 'Mundur aktif (Putih)'
              : state.sein !== 'off'
                ? `Sein ${state.sein === 'left' ? 'kiri' : state.sein === 'right' ? 'kanan' : 'hazard'}`
                : state.soundReactive?.enabled
                  ? `Mode Suara · ${
                      state.soundReactive.style === 'vu-bars'
                        ? 'VU Meter'
                        : state.soundReactive.style === 'bass-pulse'
                          ? 'Bass Pulse'
                          : state.soundReactive.style === 'strobe-beat'
                            ? 'Strobo Beat'
                            : 'Spektrum Musik'
                    }`
                  : state.ledMatrix?.enabled
                    ? `LED Matrix · ${
                        state.ledMatrix.category === 'eyes'
                          ? `Eyes (${state.ledMatrix.eyeExpression})`
                          : state.ledMatrix.matrixEffect
                      }`
                    : state.autoBelang?.enabled
                      ? `Belang Otomatis · ${state.autoBelang.colorCount} Warna · ${state.autoBelang.stripeCount} Belang`
                      : state.solidStayActive
                        ? `Stay · ${state.manualSideColors?.enabled ? 'Custom L/R' : state.solidColor}`
                        : state.combinationEnabled
                          ? `Kombinasi (${state.combo.style}) · Kiri ${state.combo.leftModes.length} · Kanan ${state.combo.rightModes.length}`
                          : `${activeMode?.code || '001'} · ${activeMode?.name || 'Mode'}`;

  return (
    <section
      aria-label="Demo 2 Panel Full LED Matrix"
      className={
        expanded
          ? 'fixed inset-0 z-50 bg-[#070A0F] flex flex-col'
          : 'rounded-2xl bg-[#111622] border border-white/[0.08] overflow-hidden'
      }
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-display text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap">
            {(state.customization.visualizerTitle || '').trim() || 'Demo Matrix LED'}
          </h2>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-xs text-cyan-300 truncate">
            {(state.customization.visualizerSubtitle || '').trim() || statusText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[11px] text-slate-400 tabular-nums hidden sm:inline">
            {state.led.leftCount + state.led.rightCount} LED
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums">
            {state.brightness}%
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Kecilkan tampilan demo' : 'Perbesar demo full screen'}
            className="min-w-[34px] min-h-[34px] rounded-lg bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div
        className={
          expanded
            ? 'relative flex-1 w-full bg-[#070A0F]'
            : 'relative w-full aspect-[16/9] bg-[#070A0F]'
        }
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          aria-label="Simulasi 2 panel LED matrix mata bergerak"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-white/[0.06] bg-[#0E131D] text-xs shrink-0">
        {canEditLed && onSelectLedTab ? (
          <>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                onSelectLedTab();
              }}
              className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors min-h-[28px] whitespace-nowrap"
            >
              <span className="text-slate-400">Panel kiri</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono font-medium text-slate-100 tabular-nums">
                {state.led.leftCount} LED
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                onSelectLedTab();
              }}
              className="flex items-center gap-2 text-slate-300 hover:text-cyan-300 transition-colors min-h-[28px] whitespace-nowrap"
            >
              <span className="text-slate-400">Panel kanan</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono font-medium text-slate-100 tabular-nums">
                {state.led.rightCount} LED
              </span>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
              <span className="text-slate-400">Panel kiri</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono font-medium text-slate-100 tabular-nums">
                {state.led.leftCount} LED
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
              <span className="text-slate-400">Panel kanan</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono font-medium text-slate-100 tabular-nums">
                {state.led.rightCount} LED
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
