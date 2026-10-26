"use client";

import { useEffect, useState } from "react";

export function Countdown({ deadlineIso, label }: { deadlineIso: string; label: string }) {
  const [text, setText] = useState("Counting down");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadlineIso).getTime() - Date.now();
      if (diff <= 0) {
        setText("The deadline has passed");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      setText(`${days} days, ${hours} hours`);
    };
    tick();
    const timer = window.setInterval(tick, 60000);
    return () => window.clearInterval(timer);
  }, [deadlineIso]);

  return (
    <p className="text-sm tracking-wide text-cream/60">
      <span className="font-medium text-cream">{label}</span>
      <span className="px-2 text-cream/30">/</span>
      <span>{text}</span>
    </p>
  );
}
