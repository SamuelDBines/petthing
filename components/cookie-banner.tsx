"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MARKETING_CONSENT_KEY,
  ANALYTICS_CONSENT_KEY,
  marketingConsentGranted,
  trackMetaPageView,
  trackMetaEvent,
} from "@/lib/meta/client";

type PixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, data?: object) => void; load: (id: string) => void; page: () => void };
  posthog?: { init: (key: string, opts?: object) => void; capture: (event: string, props?: object) => void };
};

function inject(id: string, code: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.text = code;
  document.head.appendChild(script);
}

function loadMetaPixel(pixelId: string) {
  if (!/^[0-9]+$/.test(pixelId)) return;
  inject(
    `meta-pixel-${pixelId}`,
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');`,
  );
  trackMetaPageView();
}

function loadOptionalScripts(storeId: string, pixelIdProp?: string | null) {
  const analyticsAllowed = localStorage.getItem(ANALYTICS_CONSENT_KEY) === "analytics";
  if (analyticsAllowed) {
    const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthog) {
      inject(
        "posthog",
        `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${posthog}',{api_host:'https://eu.i.posthog.com',person_profiles:'identified_only'});`,
      );
    }
  }
  if (!marketingConsentGranted()) return;
  const pixel = pixelIdProp?.trim();
  if (pixel) loadMetaPixel(pixel);
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  if (tiktok && /^[A-Za-z0-9]+$/.test(tiktok)) {
    inject(
      "tiktok-pixel",
      `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`,
    );
  }
}

export function CookieBanner({ storeId, pixelId }: { storeId: string; pixelId?: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ANALYTICS_CONSENT_KEY)) setVisible(true);
    loadOptionalScripts(storeId, pixelId);
  }, [storeId, pixelId]);

  function save(analytics: boolean, marketing: boolean) {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, analytics ? "analytics" : "aggregate");
    localStorage.setItem(MARKETING_CONSENT_KEY, marketing ? "yes" : "no");
    setVisible(false);
    loadOptionalScripts(storeId, pixelId);
    window.dispatchEvent(new Event("ps-consent-updated"));
  }

  if (!visible) return null;
  return (
    <div
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-3xl border border-line bg-bark p-4 shadow-2xl sm:inset-x-auto sm:right-4"
      role="dialog"
      aria-label="Cookie choices"
    >
      <p className="text-sm leading-6">
        We use essential cookies to run checkout. With your consent we use first-party analytics to improve the shop, and
        optional Meta (Facebook/Instagram) measurement cookies if you accept marketing. See our{" "}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>
        . Your portrait photos are never used for ads.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-full bg-pumpkin px-4 py-2 text-sm font-semibold text-ink"
          onClick={() => save(true, true)}
        >
          Accept all
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-full border border-line px-4 py-2 text-sm font-semibold"
          onClick={() => save(true, false)}
        >
          Reject marketing
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-full border border-line px-4 py-2 text-sm"
          onClick={() => save(false, false)}
        >
          Essential only
        </button>
      </div>
    </div>
  );
}

/** @deprecated use trackMetaEvent from @/lib/meta/client */
export function track(name: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Lead" | "Purchase", value?: number, eventId?: string) {
  if (typeof window === "undefined" || !marketingConsentGranted()) return;
  trackMetaEvent(name, value == null ? undefined : { value, currency: "GBP" }, eventId);
  const payload = value == null ? undefined : { value, currency: "GBP" };
  const tiktokName = name === "Purchase" ? "CompletePayment" : name;
  (window as PixelWindow).ttq?.track(tiktokName, payload);
}
