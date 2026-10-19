import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // If already running as an installed PWA in standalone mode
  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        Aplikasi Terinstall (PWA)
      </span>
    );
  }

  // Chromium / Android / Desktop flow with automatic beforeinstallprompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        type="button"
        className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 ${className}`}
        title="Install Aplikasi PWA ke HP / Laptop Anda"
      >
        <Download className="w-4 h-4 animate-bounce" />
        Install Aplikasi
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          type="button"
          className={`inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md transition-all active:scale-95 ${className}`}
        >
          <Smartphone className="w-4 h-4 text-rose-400" />
          Install di iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Install di iPhone / iPad</h3>
                    <p className="text-xs text-slate-500">Petunjuk instalasi iOS Safari</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">1</span>
                  <p className="pt-0.5">Buka web ini menggunakan browser <strong>Safari</strong>.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">2</span>
                  <p className="pt-0.5">Tekan tombol <strong>Bagikan (Share)</strong> pada toolbar Safari (ikon kotak dengan panah ke atas).</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">3</span>
                  <p className="pt-0.5">Gulir ke bawah dan pilih <strong>"Tambah ke Utama" (Add to Home Screen)</strong>.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for Desktop Chrome/Edge or Mobile Android when prompt is ambient or ready
  return (
    <>
      <button
        onClick={() => setShowManualGuide(true)}
        type="button"
        className={`inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md transition-all active:scale-95 ${className}`}
      >
        <Download className="w-4 h-4 text-rose-400" />
        Install Aplikasi PWA
      </button>

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Install PWA Penjualan JPU</h3>
                  <p className="text-xs text-slate-500">Dapat diakses seperti aplikasi native</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="p-3 rounded-xl bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                Aplikasi ini mendukung teknologi <strong>Progressive Web App (PWA)</strong> dengan offline caching dan performa tinggi.
              </p>
              <div className="space-y-2 pt-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Cara Install di Chrome / Edge / Android:</p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Klik titik tiga (<strong>⋮</strong> atau <strong>...</strong>) di pojok kanan atas browser.</li>
                  <li>Pilih menu <strong>"Simpan & bagikan" &gt; "Install Laporan Penjualan JPU"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
                  <li>Konfirmasi tombol <strong>Install</strong>.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowManualGuide(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
