"use client";

import { useEffect, useRef, useState } from "react";

export function Compare({ before, after, label }: { before: string; after: string; label: string }) {
  const [position, setPosition] = useState(54);
  const [width, setWidth] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const knobRadius = 20;
  const inset = width > 0 ? ((knobRadius + 2) / width) * 100 : 8;
  const knob = Math.min(100 - inset, Math.max(inset, position));
  const atEdge = position <= 0.5 || position >= 99.5;

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function setFromClientX(clientX: number) {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }

  return (
    <figure>
      <div className="relative">
        <div
          ref={frame}
          className="relative aspect-[4/5] cursor-ew-resize touch-none overflow-hidden rounded-2xl border border-line bg-bark select-none"
          onPointerDown={(event) => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!dragging.current) return;
            setFromClientX(event.clientX);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
        >
          <img src={after} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
          <img
            src={before}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          />
          {position > 8 ? <span className="pointer-events-none absolute top-3 left-3 bg-ink/90 px-2 py-1 text-[11px] tracking-[0.14em] text-cream uppercase">Before</span> : null}
          {position < 92 ? <span className="pointer-events-none absolute top-3 right-3 bg-ink/90 px-2 py-1 text-[11px] tracking-[0.14em] text-cream uppercase">After</span> : null}
          <input
            aria-label={`Compare ${label}`}
            className="sr-only"
            type="range"
            min={0}
            max={100}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 z-10 w-10 -translate-x-1/2" style={{ left: `${knob}%` }}>
          {atEdge ? null : <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cream" />}
          <span className="absolute top-1/2 left-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream shadow-sm">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-3.5 w-px bg-ink" />
              <span className="h-3.5 w-px bg-ink" />
            </span>
          </span>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-cream/70">{label}. Drag across the picture. An example, not a customer photo.</figcaption>
    </figure>
  );
}
