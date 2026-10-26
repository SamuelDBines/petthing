"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "@/config/brand";

export function SharePreview({ token }: { token: string }) {
  const [images, setImages] = useState<{ id: string; styleName: string; previewUrl: string | null }[]>([]);
  const [theme, setTheme] = useState("Seasonal");

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((response) => response.json())
      .then((body) => {
        if (body.images) {
          setImages(body.images);
          setTheme(body.themeName);
        }
      })
      .catch(() => undefined);
  }, [token]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl">{theme} preview</h1>
      <p className="mt-2 text-cream/70">A watermarked look from {APP_NAME}. The full files stay on the private link.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {images.map((image) => (image.previewUrl ? <img key={image.id} src={image.previewUrl} alt={image.styleName} className="rounded-3xl" /> : null))}
      </div>
    </main>
  );
}
