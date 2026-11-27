import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleAction}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0 min-h-[34px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instal ke HP</span>
        </button>
      ) : (
        <section className="rounded-2xl bg-[#111622] border border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100">
                Pasang di Layar Utama HP
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Buka aplikasi layar penuh langsung dari HP tanpa browser dan bisa dipakai offline.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors min-h-[40px] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstallable ? 'Instal Sekarang' : 'Cara Pasang di HP'}</span>
          </button>
        </section>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111622] border border-white/[0.1] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 id="pwa-guide-title" className="font-display text-base font-semibold text-slate-100">
                {isIOS ? 'Pasang di iPhone / iPad' : 'Pasang Aplikasi di HP'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan"
                className="min-w-[36px] min-h-[36px] rounded-lg bg-[#171F2E] text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
                <li>Buka tautan aplikasi ini langsung di browser <strong>Safari</strong>.</li>
                <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bagian bawah layar.</li>
                <li>Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-xs text-slate-300 leading-relaxed list-decimal list-inside">
                <li>Buka tautan aplikasi ini langsung di <strong>Google Chrome</strong> (bukan di dalam preview aplikasi lain).</li>
                <li>Ketuk ikon menu <strong>titik tiga (⋮)</strong> di pojok kanan atas Chrome.</li>
                <li>Pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition-colors min-h-[42px]"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
