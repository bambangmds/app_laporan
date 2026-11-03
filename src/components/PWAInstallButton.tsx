import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, Smartphone, X, CheckCircle2, ExternalLink, RefreshCw, Sparkles, Monitor } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showIframeNotice, setShowIframeNotice] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [installSuccessToast, setInstallSuccessToast] = useState(false);

  // If already running as an installed standalone PWA
  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 text-xs font-semibold shadow-xs ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        Aplikasi Terinstall (PWA)
      </span>
    );
  }

  // Handle click on the install button
  const handleInstallClick = async () => {
    setIsInstalling(true);

    // 1. If deferred prompt is ready, trigger native browser install prompt to the device immediately!
    if (isInstallable) {
      try {
        const result = await install();
        setIsInstalling(false);
        if (result.success) {
          setInstallSuccessToast(true);
          setTimeout(() => setInstallSuccessToast(false), 5000);
          return;
        }
        if (result.reason === 'dismissed') {
          // User closed browser dialog, do nothing
          return;
        }
      } catch (err) {
        console.warn('[PWA] Error running install:', err);
        setIsInstalling(false);
      }
    }
    setIsInstalling(false);

    // 2. If running inside an iframe (e.g. AI Studio preview), browser blocks installation in iframes
    if (isInIframe) {
      setShowIframeNotice(true);
      return;
    }

    // 3. If iOS Safari device
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // 4. Fallback for desktop Chrome/Edge or Android when prompt is ambient or in address bar
    setShowManualGuide(true);
  };

  return (
    <>
      {/* Main Install Button */}
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        type="button"
        className={`inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-75 ${className}`}
        title="Klik untuk menginstall aplikasi ini langsung ke HP atau Laptop Anda"
      >
        {isInstalling ? (
          <RefreshCw className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Download className="w-4 h-4 animate-bounce text-white" />
        )}
        <span>{isInstalling ? 'Membuka Instalasi...' : 'Install Aplikasi PWA'}</span>
      </button>

      {/* Success Toast */}
      {installSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-800 shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Aplikasi Laporan Penjualan JPU berhasil diinstall di perangkat Anda!</span>
        </div>
      )}

      {/* MODAL 1: Iframe Environment Notice (Direct top tab opener) */}
      {showIframeNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instalasi ke Perangkat Anda</h3>
                  <p className="text-xs text-slate-400">Keamanan browser melarang install dari dalam iframe</p>
                </div>
              </div>
              <button
                onClick={() => setShowIframeNotice(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <p className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 leading-relaxed">
                Browser (Chrome, Edge, Safari) mewajibkan instalasi aplikasi PWA dijalankan dari <strong>halaman tab browser utama</strong> agar ikon aplikasi dapat ditambahkan ke Layar Utama HP / Desktop Komputer Anda.
              </p>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-2">
                <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Langkah Cepat &amp; Mudah:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1 leading-relaxed">
                  <li>Klik tombol <strong>"Buka di Tab Baru &amp; Install"</strong> di bawah.</li>
                  <li>Di tab baru yang terbuka, klik tombol <strong>"Install Aplikasi PWA"</strong> atau ikon <strong>Install (+)</strong> di bilah browser.</li>
                  <li>Aplikasi langsung terpasang sebagai program mandiri di perangkat Anda!</li>
                </ol>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowIframeNotice(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white py-2.5 px-4 text-xs font-bold shadow-lg hover:shadow-rose-600/30 transition text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka di Tab Baru &amp; Install</span>
              </a>
              <button
                onClick={() => setShowIframeNotice(false)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: iOS Safari Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install di iPhone / iPad (iOS)</h3>
                  <p className="text-xs text-slate-400">Petunjuk instalasi browser Safari</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">1</span>
                <p className="pt-0.5 leading-relaxed">Buka tautan aplikasi ini menggunakan browser bawaan <strong>Safari</strong>.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">2</span>
                <p className="pt-0.5 leading-relaxed">Tekan tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas) di bagian bawah atau atas Safari.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">3</span>
                <p className="pt-0.5 leading-relaxed">Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong> lalu tekan <strong>Tambah (Add)</strong>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-xs font-bold text-white hover:from-red-500 hover:to-rose-500 transition shadow-md"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Chrome / Edge Desktop & Android Omnibox Guide */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install Laporan Penjualan JPU</h3>
                  <p className="text-xs text-slate-400">Instalasi aplikasi ke desktop / HP Anda</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                <p className="font-semibold text-rose-300">Cara Install &amp; Buat Shortcut di Laptop (Windows / Mac):</p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>Lihat di <strong>bilah alamat URL browser (kanan atas)</strong>, klik ikon <strong>Install (+)</strong> atau ikon monitor unduh.</li>
                  <li>Atau klik menu browser (titik tiga <strong>⋮</strong>) &gt; pilih <strong>"Simpan dan bagikan"</strong> &gt; <strong>"Install Laporan Penjualan JPU"</strong>.</li>
                  <li>Klik <strong>Install</strong> pada jendela konfirmasi yang muncul.</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 space-y-2">
                <p className="font-semibold text-amber-300">Cara Memunculkan Shortcut di Desktop Layar Laptop:</p>
                <div className="space-y-1 text-slate-300 leading-relaxed">
                  <p><strong>Metode 1:</strong> Di Chrome, klik menu titik tiga <strong>⋮</strong> &gt; pilih <strong>"Simpan dan bagikan" (Save and share)</strong> &gt; pilih <strong>"Buat pintasan..." (Create shortcut...)</strong> &gt; centang <strong>"Buka sebagai jendela" (Open as window)</strong> &gt; klik <strong>Buat</strong>. Ikon shortcut langsung muncul di Desktop Laptop Anda.</p>
                  <p className="pt-1"><strong>Metode 2:</strong> Buka tab baru di browser dan ketik <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">chrome://apps</code> &gt; klik kanan pada <strong>"Laporan Penjualan JPU"</strong> &gt; pilih <strong>"Buat pintasan..."</strong> &gt; centang <strong>"Desktop"</strong> &amp; <strong>"Menu Mulai"</strong>.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                onClick={async () => {
                  setShowManualGuide(false);
                  await handleInstallClick();
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-xs font-bold text-white hover:from-red-500 hover:to-rose-500 transition shadow-md"
              >
                Coba Pasang Otomatis Lagi
              </button>
              <button
                onClick={() => setShowManualGuide(false)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
