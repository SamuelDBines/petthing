"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_VISITOR = "ps_vid";
const STORAGE_SESSION = "ps_sid";
const STORAGE_CONSENT = "ps_analytics_consent";
const HEARTBEAT_MS = 15_000;

function consentLevel(): "aggregate" | "analytics" {
  const value = localStorage.getItem(STORAGE_CONSENT);
  if (value === "analytics") return "analytics";
  return "aggregate";
}

function deviceType() {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function clickIdsFromSearch(search: URLSearchParams) {
  return {
    gclid: search.get("gclid") ?? undefined,
    fbclid: search.get("fbclid") ?? undefined,
    ttclid: search.get("ttclid") ?? undefined,
  };
}

function pagePath(pathname: string, search: URLSearchParams) {
  return pathname + (search.toString() ? `?${search.toString()}` : "");
}

async function send(payload: Record<string, unknown>) {
  try {
    const response = await fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return await response.json().catch(() => null);
  } catch {
    return null;
  }
}

function sendBeacon(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/collect", new Blob([body], { type: "application/json" }));
      return;
    }
    void send(payload);
  } catch {
    /* ignore */
  }
}

export function VisitorTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const pageStarted = useRef(Date.now());
  const maxScroll = useRef(0);
  const sessionId = useRef<string | undefined>(undefined);
  const visitorId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (search.get("internal") === "1") {
      void fetch("/api/analytics/collect?internal=1");
    }
  }, [search]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const depth = doc.scrollHeight > 0 ? Math.round((window.scrollY / (doc.scrollHeight - window.innerHeight)) * 100) : 0;
      maxScroll.current = Math.max(maxScroll.current, Math.min(100, depth));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function basePayload() {
    const consent = consentLevel();
    if (consent === "analytics" && !visitorId.current) {
      const existing = localStorage.getItem(STORAGE_VISITOR);
      visitorId.current = existing || crypto.randomUUID();
      localStorage.setItem(STORAGE_VISITOR, visitorId.current);
    }
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid"]) {
      const value = search.get(key);
      if (value) utm[key] = value;
    }
    return {
      sessionId: sessionId.current || sessionStorage.getItem(STORAGE_SESSION) || undefined,
      visitorId: visitorId.current,
      consent,
      path: pagePath(pathname, search),
      referrer: document.referrer || undefined,
      utm,
      clickIds: clickIdsFromSearch(search),
      deviceType: deviceType(),
      userAgent: navigator.userAgent,
      durationMs: Date.now() - pageStarted.current,
      scrollDepth: maxScroll.current,
    };
  }

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    pageStarted.current = Date.now();
    maxScroll.current = 0;
    void send({ ...basePayload(), pageview: true }).then((body) => {
      if (body?.sessionId) {
        sessionId.current = body.sessionId;
        sessionStorage.setItem(STORAGE_SESSION, body.sessionId);
      }
    });
  }, [pathname, search]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void send({ ...basePayload(), heartbeat: true });
    };
    const interval = window.setInterval(tick, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, search]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const onPageHide = () => {
      sendBeacon({ ...basePayload(), leave: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [pathname, search]);

  return null;
}

export function trackFunnelEvent(type: string, metadata?: Record<string, unknown>) {
  void send({
    sessionId: sessionStorage.getItem(STORAGE_SESSION) || undefined,
    visitorId: localStorage.getItem(STORAGE_VISITOR) || undefined,
    consent: consentLevel(),
    path: window.location.pathname,
    deviceType: deviceType(),
    userAgent: navigator.userAgent,
    durationMs: 0,
    scrollDepth: 0,
    event: { type, metadata },
  });
}

export function analyticsSessionId() {
  return sessionStorage.getItem(STORAGE_SESSION) || undefined;
}
