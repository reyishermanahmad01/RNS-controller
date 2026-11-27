export interface LiveAudioFrame {
  micActive: boolean;
  level: number; // 0..1
  bass: number; // 0..1
  bands: number[]; // 8 bands 0..1
  peakBeat: boolean;
}

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;
let mediaElementMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
let activeAudioEl: HTMLAudioElement | null = null;
let freqData: Uint8Array<ArrayBuffer> | null = null;
let smoothedLevel = 0;
let smoothedBass = 0;
const smoothedBands = new Array<number>(8).fill(0);
let lastError: string | null = null;

export function isMicrophoneSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')
  );
}

export function isMicrophoneActive(): boolean {
  return Boolean(
    mediaStream &&
      analyser &&
      mediaStream.getTracks().some((t) => t.readyState === 'live')
  );
}

export function isMusicElementActive(): boolean {
  return Boolean(activeAudioEl && !activeAudioEl.paused && analyser);
}

export function getMicrophoneError(): string | null {
  return lastError;
}

function ensureAudioContextAndAnalyser(): { ctx: AudioContext; node: AnalyserNode } | null {
  if (audioCtx && analyser) {
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {});
    }
    return { ctx: audioCtx, node: analyser };
  }
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const node = ctx.createAnalyser();
  node.fftSize = 128;
  node.smoothingTimeConstant = 0.72;
  audioCtx = ctx;
  analyser = node;
  freqData = new Uint8Array(new ArrayBuffer(node.frequencyBinCount));
  return { ctx, node };
}

export async function attachAudioElement(el: HTMLAudioElement): Promise<boolean> {
  try {
    const setup = ensureAudioContextAndAnalyser();
    if (!setup) return false;
    const { ctx, node } = setup;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    let src = mediaElementMap.get(el);
    if (!src) {
      src = ctx.createMediaElementSource(el);
      mediaElementMap.set(el, src);
    }
    try {
      src.disconnect();
    } catch {
      // ignore if not connected yet
    }
    src.connect(node);
    node.connect(ctx.destination);
    activeAudioEl = el;
    return true;
  } catch {
    return false;
  }
}

export function detachAudioElement(): void {
  activeAudioEl = null;
}

export async function startMicrophoneCapture(): Promise<{ ok: boolean; error: string | null }> {
  lastError = null;
  if (isMicrophoneActive()) {
    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    return { ok: true, error: null };
  }

  if (!isMicrophoneSupported()) {
    lastError = 'Mikrofon tidak didukung di browser ini. Gunakan pemutar musik atau mode demo irama.';
    return { ok: false, error: lastError };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });
    const setup = ensureAudioContextAndAnalyser();
    if (!setup) {
      stream.getTracks().forEach((t) => t.stop());
      lastError = 'AudioContext tidak tersedia pada perangkat ini.';
      return { ok: false, error: lastError };
    }

    const { ctx, node } = setup;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(node);
    mediaStream = stream;
    return { ok: true, error: null };
  } catch {
    lastError =
      'Izin mikrofon ditolak atau tidak tersedia. Mode suara tetap berjalan dengan detak musik otomatis; izinkan mic untuk respons suara asli.';
    return { ok: false, error: lastError };
  }
}

export function stopMicrophoneCapture(): void {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  if (!isMusicElementActive()) {
    if (audioCtx) {
      void audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    analyser = null;
    freqData = null;
    mediaElementMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
  }
  smoothedLevel = 0;
  smoothedBass = 0;
  for (let i = 0; i < smoothedBands.length; i++) smoothedBands[i] = 0;
}

export function getLiveAudioFrame(sensitivity: number, nowMs: number): LiveAudioFrame {
  const sensScale = Math.max(0.35, Math.min(2.6, sensitivity / 50));

  if (analyser && freqData && (isMicrophoneActive() || isMusicElementActive())) {
    analyser.getByteFrequencyData(freqData);
    const len = freqData.length;
    let sum = 0;
    let bassSum = 0;
    const bassBins = Math.max(2, Math.floor(len * 0.14));

    for (let i = 0; i < len; i++) {
      const v = freqData[i] / 255;
      sum += v;
      if (i < bassBins) bassSum += v;
    }

    const rawLevel = Math.min(1, (sum / len) * 2.1 * sensScale);
    const rawBass = Math.min(1, (bassSum / bassBins) * 1.65 * sensScale);

    smoothedLevel = smoothedLevel * 0.55 + rawLevel * 0.45;
    smoothedBass = smoothedBass * 0.45 + rawBass * 0.55;

    const bandStep = Math.max(1, Math.floor(len / 8));
    for (let b = 0; b < 8; b++) {
      let bandTotal = 0;
      const start = b * bandStep;
      const end = Math.min(len, start + bandStep);
      for (let k = start; k < end; k++) {
        bandTotal += freqData[k] / 255;
      }
      const avg = Math.min(1, (bandTotal / Math.max(1, end - start)) * 1.55 * sensScale);
      smoothedBands[b] = smoothedBands[b] * 0.5 + avg * 0.5;
    }

    return {
      micActive: true,
      level: smoothedLevel,
      bass: smoothedBass,
      bands: [...smoothedBands],
      peakBeat: smoothedBass > 0.62,
    };
  }

  // Fallback synthetic rhythmic beat pattern when mic isn't connected yet
  const t = nowMs / 1000;
  const beatCycle = (t * 2.1) % 1;
  const kick = Math.exp(-Math.pow(beatCycle * 5.2, 2));
  const sub = 0.25 + 0.55 * Math.abs(Math.sin(t * 3.4)) * kick;
  const synLevel = Math.min(1, (0.18 + kick * 0.72) * Math.min(1.4, sensScale * 0.85));
  const synBass = Math.min(1, kick * Math.min(1.4, sensScale * 0.9));
  const bands = Array.from({ length: 8 }, (_, idx) => {
    const wave = 0.5 + 0.5 * Math.sin(t * 6.5 - idx * 0.75);
    return Math.min(1, (0.15 + wave * 0.45 + (idx < 3 ? kick * 0.55 : sub * 0.35)) * Math.min(1.3, sensScale * 0.85));
  });

  return {
    micActive: false,
    level: synLevel,
    bass: synBass,
    bands,
    peakBeat: kick > 0.68,
  };
}
