import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  Share2,
  PlusSquare,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  PackageCheck,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'phone' | 'apk'>('phone');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&color=ffffff&bgcolor=0f172a&data=${encodeURIComponent(currentUrl)}`;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Stranger Friends',
          text: 'Connect and chat with real strangers worldwide!',
          url: currentUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 my-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/25 shrink-0">
            <img
              src="/src/assets/images/stranger_friends_app_icon_1792326855270.jpg"
              alt="Stranger Friends"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Download Stranger Friends
            </h3>
            <p className="text-xs text-slate-400">
              Install directly on your Android phone as an APK / WebAPK
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab('phone')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'phone'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Install on Android Phone
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'apk'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Export .APK Package
          </button>
        </div>

        {activeTab === 'phone' ? (
          <div className="space-y-4">
            {installSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-emerald-200">Installation Started!</h4>
                <p className="text-xs text-emerald-300">
                  Stranger Friends is being installed to your app launcher with full-screen support.
                </p>
              </div>
            ) : (
              <>
                {/* 1-Tap browser install if prompt supported */}
                {isInstallable && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>1-Tap Install App on This Device</span>
                  </button>
                )}

                {isInstalled && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-2.5 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>App is already installed and running standalone!</span>
                  </div>
                )}

                {/* QR Code section for scanning from phone */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-28 h-28 rounded-lg bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="Scan QR code with phone camera"
                      className="w-full h-full rounded"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-white">
                      <QrCode className="w-4 h-4 text-indigo-400" />
                      <span>Scan with your Phone Camera</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Point your Android phone camera at this QR code to open the app instantly, or copy the link below.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        onClick={handleCopyLink}
                        className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      <button
                        onClick={handleShare}
                        className="py-1 px-2.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-medium flex items-center gap-1 transition"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step by step Android instructions */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span>Step-by-Step Android Installation (WebAPK)</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        1
                      </span>
                      <span>
                        Open this link in <strong className="text-white">Google Chrome</strong> on your Android phone.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        2
                      </span>
                      <span>
                        Tap the <strong className="text-white">3 vertical dots (⋮)</strong> at top-right corner of Chrome.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        3
                      </span>
                      <span>
                        Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        4
                      </span>
                      <span>
                        Android automatically builds a native WebAPK. The app icon appears on your home screen and drawer just like any Play Store app!
                      </span>
                    </div>
                  </div>
                </div>

                {/* iOS instructions */}
                {isIOS && (
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-cyan-300">iPhone / Safari Users:</div>
                    <p>
                      Tap <strong className="text-white">Share</strong> in Safari &gt; Tap <strong className="text-white">"Add to Home Screen"</strong> &gt; Tap <strong className="text-white">Add</strong>.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Tab: Export standalone .APK */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>Download Standalone Android .APK Package</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Because this app is fully PWA-compliant with manifest and service workers, you can generate a signed <strong className="text-white">.apk</strong> file in 1 minute using official tools:
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="font-semibold text-indigo-300 flex items-center justify-between">
                    <span>Option 1: PWABuilder (Recommended)</span>
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 flex items-center gap-1 hover:underline"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="text-slate-400 text-[11px] list-decimal pl-4 space-y-1">
                    <li>Go to <strong className="text-slate-200">pwabuilder.com</strong></li>
                    <li>Paste this app URL: <code className="text-indigo-300 text-[10px] break-all">{currentUrl}</code></li>
                    <li>Click <strong className="text-slate-200">"Build My PWA" &gt; "Android"</strong></li>
                    <li>Download the signed <strong className="text-slate-200">.apk / .aab</strong> package ready for installation or Google Play!</li>
                  </ol>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="font-semibold text-indigo-300">
                    Option 2: Direct Android Chrome WebAPK (Instant & Zero Setup)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    When you tap "Install app" inside Chrome on Android, Android's OS automatically compiles an internal APK file called a <strong className="text-slate-200">WebAPK</strong>, registered with Android Package Manager with its own process, splash screen, and full hardware permissions.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'App URL Copied to Clipboard!' : 'Copy App URL for PWABuilder'}</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% Real Users · Zero Bots
          </span>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
