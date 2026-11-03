"use client";

import { useEffect } from "react";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "gclid", "fbclid", "ttclid"];

export function UtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 200);
    }
    if (!Object.keys(found).length) return;
    const previous = JSON.parse(sessionStorage.getItem("ps_utm") || "{}") as Record<string, string>;
    sessionStorage.setItem("ps_utm", JSON.stringify({ ...previous, ...found }));
  }, []);
  return null;
}

export function storedUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem("ps_utm") || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
