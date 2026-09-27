"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

// The event Chrome/Edge fire when the page can be installed.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * "Install app" for the admin. Registers the admin service worker, offers the
 * browser's install prompt where there is one, explains Add to Home Screen on
 * iPhone, and shows nothing once the app is installed.
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => {});
    }
    if (isStandalone()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => { setDeferred(null); setMode("hidden"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // iPhone never fires beforeinstallprompt; it installs via Share.
    const t = isIos() ? window.setTimeout(() => setMode("ios"), 0) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) window.clearTimeout(t);
    };
  }, []);

  if (mode === "hidden") return null;

  if (mode === "ios") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setShowIosHelp((v) => !v)}
          aria-expanded={showIosHelp}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.04] hover:text-white"
        >
          <Download className="w-4 h-4 text-slate-500" aria-hidden="true" /> Install app
        </button>
        {showIosHelp && (
          <p className="mx-3 mt-1 mb-2 rounded-lg bg-white/[0.04] p-3 text-sm text-slate-300 leading-relaxed">
            In Safari, tap <Share className="inline w-4 h-4 -mt-0.5" aria-label="Share" /> Share, then{" "}
            <span className="font-medium text-white">Add to Home Screen</span>. AP Admin will open full screen from your
            home screen.
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        if (!deferred) return;
        await deferred.prompt();
        await deferred.userChoice.catch(() => null);
        setDeferred(null);
        setMode("hidden");
      }}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.04] hover:text-white ${className}`}
    >
      <Download className="w-4 h-4 text-slate-500" aria-hidden="true" /> Install app
    </button>
  );
}
