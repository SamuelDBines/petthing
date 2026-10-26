"use client";

import { useEffect, useState } from "react";

type PixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, data?: object) => void; load: (id: string) => void; page: () => void };
};

function allowed() {
  return localStorage.getItem("ps_consent") === "yes";
}

export function track(name: "ViewContent" | "InitiateCheckout" | "Purchase", value?: number) {
  if (typeof window === "undefined" || !allowed()) return;
  const payload = value == null ? undefined : { value, currency: "GBP" };
  (window as PixelWindow).fbq?.("track", name, payload);
  const tiktokName = name === "Purchase" ? "CompletePayment" : name;
  (window as PixelWindow).ttq?.track(tiktokName, payload);
}

function inject(id: string, code: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.text = code;
  document.head.appendChild(script);
}

function loadPixels() {
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  if (meta && /^[0-9]+$/.test(meta)) {
    inject(
      "meta-pixel",
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`,
    );
  }
  if (tiktok && /^[A-Za-z0-9]+$/.test(tiktok)) {
    inject(
      "tiktok-pixel",
      `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`,
    );
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("ps_consent")) setVisible(true);
    if (allowed()) loadPixels();
  }, []);

  function choose(value: "yes" | "no") {
    localStorage.setItem("ps_consent", value);
    setVisible(false);
    if (value === "yes") loadPixels();
  }

  if (!visible) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-3xl border border-line bg-bark p-4 shadow-2xl sm:inset-x-auto sm:right-4">
      <p className="text-sm leading-6">
        We use a Meta pixel and a TikTok pixel only if you agree. They record page views and purchases. The portraits themselves are never used for ads.
      </p>
      <div className="mt-3 flex gap-2">
        <button className="rounded-full bg-pumpkin px-4 py-2 text-sm font-semibold text-ink" onClick={() => choose("yes")}>
          Accept
        </button>
        <button className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => choose("no")}>
          Reject
        </button>
      </div>
    </div>
  );
}
