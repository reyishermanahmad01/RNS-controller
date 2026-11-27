import React, { useState } from 'react';
import { Lock, ShieldCheck, User } from 'lucide-react';
import { LogoPresetId, UserRole } from '../types/controller';
import { AppBrandLogo } from './IconRegistry';

interface LoginScreenProps {
  expectedPin: string;
  appName?: string;
  logoPreset?: LogoPresetId;
  customLogoUrl?: string;
  accentHex?: string;
  onLogin: (role: UserRole) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  expectedPin,
  appName,
  logoPreset,
  customLogoUrl,
  accentHex,
  onLogin,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === expectedPin) {
      setError(null);
      onLogin('admin');
    } else {
      setError('PIN Admin salah. Gunakan PIN bawaan 1234 jika belum diubah.');
    }
  };

  return (
    <div className="min-h-screen bg-[#090C12] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-[#111622] border border-white/[0.08] p-6 space-y-6 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <AppBrandLogo
            logoPreset={logoPreset}
            customLogoUrl={customLogoUrl}
            accentHex={accentHex}
            className="w-14 h-14"
          />
          <h1 className="font-display text-xl font-bold tracking-tight text-slate-100">
            {appName || 'RNS RGB Controller'}
          </h1>
          <p className="text-xs text-slate-400">
            Pilih akses akun untuk mengontrol stoplamp.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0B0F17] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('customer');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold min-h-[44px] transition-colors ${
              selectedRole === 'customer'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold min-h-[44px] transition-colors ${
              selectedRole === 'admin'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>

        {/* Role Action Body */}
        {selectedRole === 'customer' ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#0D131F] border border-white/[0.06] p-4 text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-slate-100">Mode Customer (LEDLamp &amp; LED DMX)</div>
              <p className="text-slate-400">
                Akses lengkap MODUL DMX &amp; RNS: Warna, Mode++ (310+ efek &amp; mode tambahan Admin), Musik (Mic &amp; MP3), Jadwal, Password, Sein/Rem/Mundur/Hazard, Welcome, Belang &amp; IC LED.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onLogin('customer')}
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors min-h-[48px]"
            >
              Masuk sebagai Customer
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-pin-input" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>PIN Admin / Teknisi</span>
                <span className="font-mono text-[11px] text-slate-500">Default: 1234</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan PIN Admin"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#0B0F17] border border-white/[0.08] text-sm font-mono tracking-widest text-slate-100 placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 transition-colors min-h-[48px]"
            >
              Masuk sebagai Admin
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
