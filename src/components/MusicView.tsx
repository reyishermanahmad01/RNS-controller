import React, { useEffect, useRef, useState } from 'react';
import {
  AudioWaveform,
  FileAudio,
  Mic,
  MicOff,
  Music2,
  Pause,
  Play,
  Volume2,
} from 'lucide-react';
import { ControllerState, SoundStyle } from '../types/controller';
import {
  attachAudioElement,
  detachAudioElement,
  getLiveAudioFrame,
} from '../utils/audioReactive';

interface MusicViewProps {
  state: ControllerState;
  micActive: boolean;
  micError: string | null;
  onToggleSoundMode: () => void;
  onEnableSoundForPlayer: () => void;
  onChangeSoundSensitivity: (val: number) => void;
  onChangeSoundStyle: (style: SoundStyle) => void;
}

const SOUND_STYLES: { id: SoundStyle; label: string; desc: string }[] = [
  { id: 'vu-bars', label: 'VU Meter', desc: 'Bar naik turun mengikuti tinggi suara' },
  { id: 'bass-pulse', label: 'Bass Pulse', desc: 'Denyut kuat di ketukan bass drum' },
  { id: 'spectrum-wave', label: 'Spektrum', desc: 'Gelombang warna 8 pita frekuensi' },
  { id: 'strobe-beat', label: 'Strobo Beat', desc: 'Kilatan ritmis saat beat puncak' },
];

export const MusicView: React.FC<MusicViewProps> = ({
  state,
  micActive,
  micError,
  onToggleSoundMode,
  onEnableSoundForPlayer,
  onChangeSoundSensitivity,
  onChangeSoundStyle,
}) => {
  const soundEnabled = Boolean(state.soundReactive?.enabled);
  const sensitivity = state.soundReactive?.sensitivity ?? 70;
  const activeStyle = state.soundReactive?.style || 'vu-bars';

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [isPlayingTrack, setIsPlayingTrack] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [bands, setBands] = useState<number[]>([0.15, 0.25, 0.4, 0.55, 0.45, 0.3, 0.2, 0.15]);
  const [bassLevel, setBassLevel] = useState(0.2);

  useEffect(() => {
    const id = window.setInterval(() => {
      const frame = getLiveAudioFrame(sensitivity, performance.now());
      setBands(frame.bands);
      setBassLevel(frame.bass);
    }, 85);
    return () => window.clearInterval(id);
  }, [sensitivity]);

  useEffect(() => {
    return () => {
      detachAudioElement();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handlePickAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlayerError(null);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setTrackName(file.name);

    const el = audioRef.current;
    if (!el) return;
    el.src = url;
    el.load();

    try {
      await attachAudioElement(el);
      onEnableSoundForPlayer();
      await el.play();
      setIsPlayingTrack(true);
    } catch {
      setIsPlayingTrack(false);
      setPlayerError('Ketuk tombol Play di bawah untuk mulai memutar lagu.');
    }
  };

  const handleTogglePlayTrack = async () => {
    const el = audioRef.current;
    if (!el || !trackName) return;
    setPlayerError(null);
    if (el.paused) {
      try {
        await attachAudioElement(el);
        onEnableSoundForPlayer();
        await el.play();
        setIsPlayingTrack(true);
      } catch {
        setPlayerError('Browser membutuhkan ketukan ulang untuk memutar audio.');
      }
    } else {
      el.pause();
      setIsPlayingTrack(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
            Musik &amp; Reaktif Suara
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sinkronisasi lampu LEDLamp dengan mikrofon langsung atau file lagu MP3 dari HP.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleSoundMode}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[42px] whitespace-nowrap transition-colors ${
            soundEnabled
              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              : 'bg-[#171F2E] border border-white/[0.08] text-slate-200 hover:text-white'
          }`}
        >
          {soundEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-slate-400" />}
          <span>{soundEnabled ? 'Mode Suara ON' : 'Aktifkan Mic'}</span>
        </button>
      </div>

      {/* Live 8-Band LEDLamp Spectrum Visualizer */}
      <section
        aria-label="Spektrum Audio Langsung"
        className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3"
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <AudioWaveform className="w-4 h-4 text-cyan-400" />
            <span>
              {isPlayingTrack
                ? 'Mengikuti Lagu Pemutar'
                : micActive
                  ? 'Mikrofon Live Aktif'
                  : soundEnabled
                    ? 'Irama Otomatis Aktif'
                    : 'Pratinjau Spektrum'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
            BASS {Math.round(bassLevel * 100)}%
          </span>
        </div>

        <div className="h-28 rounded-2xl bg-[#0B0F17] border border-white/[0.06] px-3 py-3 flex items-end gap-2">
          {bands.map((val, idx) => {
            const pct = Math.max(10, Math.round(val * 100));
            const hue = 185 + idx * 18;
            return (
              <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                <div
                  className="w-full rounded-t-md transition-all duration-75"
                  style={{
                    height: `${pct}%`,
                    background: `linear-gradient(180deg, hsl(${hue}, 92%, 62%), hsl(${hue + 20}, 85%, 42%))`,
                  }}
                />
              </div>
            );
          })}
        </div>

        {micError && (
          <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
            {micError}
          </p>
        )}

        {/* Sensitivity Slider */}
        <div className="pt-1">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sensitivitas Suara / Bass</span>
            </span>
            <span className="font-mono font-semibold text-cyan-300 tabular-nums">{sensitivity}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={sensitivity}
            onChange={(e) => onChangeSoundSensitivity(Number(e.target.value))}
            aria-label="Sensitivitas mode musik"
            className="rns-slider w-full"
            style={{
              background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${sensitivity}%, #1e293b ${sensitivity}%, #1e293b 100%)`,
              height: '6px',
              borderRadius: '9999px',
            }}
          />
        </div>
      </section>

      {/* Local Music File Player (LEDLamp Music Player Feature) */}
      <section
        aria-label="Pemutar Lagu Lokal HP"
        className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                Pemutar Lagu HP (MP3 / WAV / M4A)
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {trackName ? trackName : 'Pilih file musik untuk menggerakkan LED sesuai lagu'}
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2E] border border-cyan-400/40 text-xs font-semibold text-cyan-200 hover:text-white cursor-pointer whitespace-nowrap min-h-[40px] shrink-0">
            <FileAudio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pilih Lagu</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handlePickAudioFile}
              className="sr-only"
            />
          </label>
        </div>

        <audio
          ref={audioRef}
          onPlay={() => setIsPlayingTrack(true)}
          onPause={() => setIsPlayingTrack(false)}
          onEnded={() => setIsPlayingTrack(false)}
          controls={Boolean(trackName)}
          className={trackName ? 'w-full h-10 rounded-xl' : 'hidden'}
        />

        {trackName && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleTogglePlayTrack()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors ${
                isPlayingTrack
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {isPlayingTrack ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlayingTrack ? 'Jeda Lagu' : 'Putar & Sinkron LED'}</span>
            </button>
            <span className="text-[11px] text-slate-400 truncate max-w-[55%]">
              {isPlayingTrack ? 'LED sedang sinkron dengan audio' : 'Audio siap diputar'}
            </span>
          </div>
        )}

        {playerError && (
          <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 rounded-xl px-3 py-2">
            {playerError}
          </p>
        )}
      </section>

      {/* 4 LEDLamp Music Effect Styles */}
      <section
        aria-label="Gaya Animasi Musik"
        className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3"
      >
        <h3 className="text-sm font-semibold text-slate-100">Gaya Reaktif Musik (4 Efek)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SOUND_STYLES.map((st) => {
            const active = activeStyle === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangeSoundStyle(st.id)}
                className={`text-left p-3 rounded-xl border transition-colors min-h-[56px] ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100'
                    : 'bg-[#0B0F17] border-white/[0.07] text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-semibold">{st.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{st.desc}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
