import React, { useEffect, useState } from 'react';
import {
  Clock,
  Lock,
  ShieldCheck,
  Smartphone,
  Timer,
  Unlock,
} from 'lucide-react';
import {
  ControllerState,
  CountdownTimerConfig,
  ScheduleConfig,
} from '../types/controller';

interface ScheduleViewProps {
  state: ControllerState;
  bleConnected: boolean;
  onStartCountdown: (minutes: number, action: CountdownTimerConfig['action']) => void;
  onCancelCountdown: () => void;
  onUpdateSchedule: (patch: Partial<ScheduleConfig>) => void;
  onToggleShake: () => void;
  onSaveModulePassword: (password: string, enabled: boolean) => void;
  onToggleModuleLock: (locked: boolean, pinAttempt?: string) => boolean;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  state,
  bleConnected,
  onStartCountdown,
  onCancelCountdown,
  onUpdateSchedule,
  onToggleShake,
  onSaveModulePassword,
  onToggleModuleLock,
}) => {
  const schedule: ScheduleConfig = state.schedule || {
    onEnabled: false,
    onTime: '18:00',
    offEnabled: false,
    offTime: '22:00',
    triggerWelcomeOnStart: true,
  };
  const timer = state.countdownTimer || { active: false, endsAt: 0, action: 'off' };

  const [customMinutes, setCustomMinutes] = useState('15');
  const [timerAction, setTimerAction] = useState<CountdownTimerConfig['action']>(timer.action || 'off');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pinDraft, setPinDraft] = useState(state.modulePassword || '');
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [shakeNotice, setShakeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!timer.active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer.active]);

  const remainingSec = timer.active ? Math.max(0, Math.ceil((timer.endsAt - nowMs) / 1000)) : 0;
  const remMin = Math.floor(remainingSec / 60);
  const remSec = remainingSec % 60;

  const handleToggleShakeClick = async () => {
    setShakeNotice(null);
    const dm = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (!state.shakeToChange && typeof dm?.requestPermission === 'function') {
      try {
        const res = await dm.requestPermission();
        if (res !== 'granted') {
          setShakeNotice('Izin sensor gerak ditolak oleh perangkat.');
          return;
        }
      } catch {
        setShakeNotice('Tidak bisa meminta izin sensor gerak pada perangkat ini.');
      }
    }
    onToggleShake();
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinDraft.trim();
    if (clean.length < 4) {
      setPinMsg('Gunakan minimal 4 angka/karakter untuk password modul.');
      return;
    }
    onSaveModulePassword(clean, true);
    setPinMsg(
      bleConnected
        ? 'Password modul disimpan & dikirim ke perangkat LED DMX Bluetooth.'
        : 'Password modul disimpan. Akan ikut disinkronkan saat modul terhubung.'
    );
  };

  const handleDisablePin = () => {
    onSaveModulePassword('', false);
    setPinDraft('');
    setPinMsg('Password modul dinonaktifkan.');
  };

  const handleLockAction = () => {
    if (state.moduleLocked) {
      const ok = onToggleModuleLock(false, pinDraft.trim());
      setPinMsg(
        ok
          ? 'Kunci modul dibuka.'
          : 'PIN tidak cocok dengan password modul yang tersimpan.'
      );
    } else {
      if (!state.modulePasswordEnabled || !state.modulePassword) {
        setPinMsg('Simpan password modul terlebih dahulu sebelum mengunci.');
        return;
      }
      onToggleModuleLock(true);
      setPinMsg('Modul dikunci. Buka kembali menggunakan PIN Anda.');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-100 tracking-tight">
          Jadwal, Timer &amp; Fitur Modul
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Timer hitung mundur, jadwal nyala/mati otomatis, kontrol goyang HP, dan password modul LED DMX.
        </p>
      </div>

      {/* 1. Timer Hitung Mundur */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <Timer className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Timer Hitung Mundur</h3>
              <p className="text-[11px] text-slate-400">Otomatis matikan, nyalakan, atau putar Welcome</p>
            </div>
          </div>

          {timer.active && (
            <span className="font-mono text-sm font-bold text-cyan-300 tabular-nums">
              {String(remMin).padStart(2, '0')}:{String(remSec).padStart(2, '0')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'off', label: 'Matikan LED' },
              { id: 'on', label: 'Nyalakan LED' },
              { id: 'welcome', label: 'Putar Welcome' },
            ] as const
          ).map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => setTimerAction(act.id)}
              className={`py-2 px-2 rounded-xl text-[11px] font-medium min-h-[38px] border transition-colors ${
                timerAction === act.id
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 font-semibold'
                  : 'bg-[#0B0F17] border-white/[0.06] text-slate-300 hover:text-white'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[5, 15, 30, 60].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onStartCountdown(m, timerAction)}
              className="px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs font-mono text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200 min-h-[40px]"
            >
              {m} Menit
            </button>
          ))}

          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="number"
              min={1}
              max={720}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              aria-label="Menit timer kustom"
              className="w-16 h-10 px-2 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs font-mono text-center text-slate-100"
            />
            <button
              type="button"
              onClick={() => {
                const mins = Math.max(1, Math.min(720, parseInt(customMinutes, 10) || 15));
                onStartCountdown(mins, timerAction);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[40px]"
            >
              Mulai
            </button>
          </div>
        </div>

        {timer.active && (
          <button
            type="button"
            onClick={onCancelCountdown}
            className="w-full py-2 rounded-xl bg-red-500/15 border border-red-400/35 text-xs font-semibold text-red-200 hover:bg-red-500/25 min-h-[38px]"
          >
            Batalkan Timer ({timer.action === 'off' ? 'Matikan LED' : timer.action === 'on' ? 'Nyalakan LED' : 'Putar Welcome'})
          </button>
        )}
      </section>

      {/* 2. Jadwal Otomatis Harian */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Jadwal Otomatis Harian</h3>
            <p className="text-[11px] text-slate-400">Atur jam nyala dan jam mati sesuai waktu HP</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-200">Jam Nyala (ON)</span>
              <button
                type="button"
                onClick={() => onUpdateSchedule({ onEnabled: !schedule.onEnabled })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                  schedule.onEnabled
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-[#171F2E] text-slate-400'
                }`}
              >
                {schedule.onEnabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
            <input
              type="time"
              value={schedule.onTime}
              onChange={(e) => onUpdateSchedule({ onTime: e.target.value })}
              aria-label="Jam nyala otomatis"
              className="w-full h-10 px-3 rounded-xl bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100"
            />
          </div>

          <div className="rounded-xl bg-[#0B0F17] border border-white/[0.06] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-200">Jam Mati (OFF)</span>
              <button
                type="button"
                onClick={() => onUpdateSchedule({ offEnabled: !schedule.offEnabled })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                  schedule.offEnabled
                    ? 'bg-red-500 text-white'
                    : 'bg-[#171F2E] text-slate-400'
                }`}
              >
                {schedule.offEnabled ? 'Aktif' : 'Nonaktif'}
              </button>
            </div>
            <input
              type="time"
              value={schedule.offTime}
              onChange={(e) => onUpdateSchedule({ offTime: e.target.value })}
              aria-label="Jam mati otomatis"
              className="w-full h-10 px-3 rounded-xl bg-[#111622] border border-white/[0.08] text-xs font-mono text-slate-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUpdateSchedule({ triggerWelcomeOnStart: !schedule.triggerWelcomeOnStart })}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-colors min-h-[42px] ${
            schedule.triggerWelcomeOnStart
              ? 'bg-cyan-500/10 border-cyan-400/40 text-cyan-200'
              : 'bg-[#0B0F17] border-white/[0.06] text-slate-400'
          }`}
        >
          <span>Putar animasi Welcome Light otomatis saat jadwal ON</span>
          <span className="font-semibold">{schedule.triggerWelcomeOnStart ? 'YA' : 'TIDAK'}</span>
        </button>
      </section>

      {/* 3. Kontrol Goyang HP (Shake-to-Change LEDLamp) */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100">Goyang HP Ganti Mode</h3>
            <p className="text-[11px] text-slate-400">
              {shakeNotice || 'Goyangkan ponsel untuk langsung pindah ke mode animasi berikutnya'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleToggleShakeClick()}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] whitespace-nowrap shrink-0 transition-colors ${
            state.shakeToChange
              ? 'bg-cyan-500 text-slate-950'
              : 'bg-[#171F2E] border border-white/[0.08] text-slate-300'
          }`}
        >
          {state.shakeToChange ? 'Aktif' : 'Nonaktif'}
        </button>
      </section>

      {/* 4. Bisa Password (Kunci Modul LED DMX) */}
      <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                state.moduleLocked
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-cyan-500/15 text-cyan-400'
              }`}
            >
              {state.moduleLocked ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100">
                Password Modul (Bisa Password LED DMX)
              </h3>
              <p className="text-[11px] text-slate-400">
                {state.moduleLocked
                  ? 'Status: Terkunci · Masukkan PIN untuk membuka'
                  : state.modulePasswordEnabled
                    ? 'Password aktif · Siap mengunci koneksi modul'
                    : 'Lindungi modul agar tidak tersambung HP lain'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLockAction}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[38px] whitespace-nowrap shrink-0 ${
              state.moduleLocked
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-[#171F2E] border border-white/[0.08] text-slate-200 hover:text-white'
            }`}
          >
            {state.moduleLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{state.moduleLocked ? 'Buka Kunci' : 'Kunci Modul'}</span>
          </button>
        </div>

        <form onSubmit={handleSavePin} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={12}
            value={pinDraft}
            onChange={(e) => setPinDraft(e.target.value)}
            placeholder="PIN Modul (4-8 digit)"
            aria-label="PIN Password Modul"
            className="flex-1 min-w-[140px] h-10 px-3 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-xs font-mono tracking-widest text-slate-100 placeholder:tracking-normal placeholder:font-sans"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 min-h-[40px] whitespace-nowrap"
          >
            Simpan PIN
          </button>
          {state.modulePasswordEnabled && (
            <button
              type="button"
              onClick={handleDisablePin}
              className="px-3 py-2 rounded-xl bg-[#171F2E] border border-white/[0.08] text-xs text-slate-300 hover:text-white min-h-[40px] whitespace-nowrap"
            >
              Hapus PIN
            </button>
          )}
        </form>

        {pinMsg && (
          <p className="text-[11px] text-cyan-200 bg-cyan-500/10 border border-cyan-400/25 rounded-xl px-3 py-2">
            {pinMsg}
          </p>
        )}
      </section>
    </div>
  );
};
