"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fbcFromFbclid } from "@/lib/meta/fbc";
import { marketingConsentGranted } from "@/lib/meta/client";

const MAX_AGE = 60 * 60 * 24 * 90;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax; Secure`;
}

export function MetaAttributionCapture() {
  const search = useSearchParams();

  useEffect(() => {
    const sync = () => {
      if (!marketingConsentGranted()) return;
      const fbclid = search.get("fbclid");
      if (fbclid) {
        const fbc = fbcFromFbclid(fbclid);
        if (fbc) setCookie("_fbc", fbc);
      }
    };
    sync();
    window.addEventListener("ps-consent-updated", sync);
    return () => window.removeEventListener("ps-consent-updated", sync);
  }, [search]);

  return null;
}
