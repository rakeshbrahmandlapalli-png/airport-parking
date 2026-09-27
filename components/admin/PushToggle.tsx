"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

// New-booking notifications for this device (Admin menu). The server side is
// app/lib/push.ts; the service worker that shows them is public/admin-sw.js.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

type State = "loading" | "unsupported" | "install-first" | "not-configured" | "blocked" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function registration() {
  return navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
}

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (isIos() && !isStandalone()) next = "install-first";
      else if (!supported) next = "unsupported";
      else if (!VAPID_PUBLIC_KEY) next = "not-configured";
      else if (Notification.permission === "denied") next = "blocked";
      else {
        try {
          const sub = await (await registration()).pushManager.getSubscription();
          next = sub ? "on" : "off";
        } catch {
          next = "off";
        }
      }
      if (!cancelled) setState(next);
    })();
    return () => { cancelled = true; };
  }, []);

  const turnOn = async () => {
    setBusy(true); setNote("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await registration();
      const sub = (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error();
      setState("on");
      setNote("On. You'll be notified of new bookings on this device.");
    } catch {
      setNote("Couldn't turn notifications on. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true); setNote("");
    try {
      const sub = await (await registration()).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setNote("Couldn't turn notifications off. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true); setNote("");
    try {
      const res = await fetch("/api/admin/push/test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setNote(data.error || "The test couldn't be sent.");
      else setNote(data.sent > 0 ? "Test sent. It should arrive in a few seconds." : "No devices to send to. Try turning notifications off and on again.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading" || state === "unsupported") return null;

  const row = "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium";
  const hint = (text: string) => <p className="mx-3 mb-2 text-xs leading-relaxed text-slate-400">{text}</p>;

  return (
    <div>
      {state === "on" ? (
        <div className={`${row} text-slate-300`}>
          <Bell className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>Booking alerts on</span>
          <span className="ml-auto flex items-center gap-3">
            <button type="button" onClick={sendTest} disabled={busy} className="text-xs text-slate-400 hover:text-white underline underline-offset-4">Test</button>
            <button type="button" onClick={turnOff} disabled={busy} className="text-xs text-slate-400 hover:text-white underline underline-offset-4">Turn off</button>
          </span>
        </div>
      ) : state === "off" ? (
        <button type="button" onClick={turnOn} disabled={busy} className={`${row} text-slate-300 hover:bg-white/[0.04] hover:text-white`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" aria-hidden="true" /> : <Bell className="w-4 h-4 text-slate-500" aria-hidden="true" />}
          Turn on booking alerts
        </button>
      ) : (
        <div className={`${row} text-slate-400`}>
          <BellOff className="w-4 h-4 text-slate-500" aria-hidden="true" /> Booking alerts
        </div>
      )}

      {state === "install-first" && hint("On iPhone, add AP Admin to your home screen first (Install app), then open it from there to turn on alerts.")}
      {state === "not-configured" && hint("Not set up yet: the notification keys still need adding in Vercel.")}
      {state === "blocked" && hint("Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.")}
      {note && hint(note)}
    </div>
  );
}
