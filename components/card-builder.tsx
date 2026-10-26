"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MM = 72 / 25.4;
const BLEED = 3;
const TRIM_W = 105;
const TRIM_H = 148;

function wrap(text: string, max: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

async function drawCard(imageUrl: string, message: string, layout: "full" | "classic" | "storybook") {
  const response = await fetch(imageUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([(TRIM_W + BLEED * 2) * MM, (TRIM_H + BLEED * 2) * MM]);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const image = imageUrl.includes(".png") || bytes[0] === 0x89 ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const width = page.getWidth();
  const height = page.getHeight();
  const cream = rgb(0.96, 0.94, 0.89);
  const ink = rgb(0.11, 0.08, 0.06);
  page.drawRectangle({ x: 0, y: 0, width, height, color: cream });

  if (layout === "full") {
    page.drawImage(image, { x: 0, y: height * 0.28, width, height: height * 0.72 });
  } else if (layout === "classic") {
    page.drawImage(image, { x: BLEED * MM, y: height * 0.38, width: width - BLEED * 2 * MM, height: height * 0.55 });
  } else {
    const inset = 10 * MM;
    page.drawRectangle({ x: inset - 4, y: height * 0.34 - 4, width: width - inset * 2 + 8, height: height * 0.52 + 8, borderColor: ink, borderWidth: 1.2 });
    page.drawImage(image, { x: inset, y: height * 0.34, width: width - inset * 2, height: height * 0.52 });
  }

  const lines = wrap(message || "Happy Halloween", 28);
  lines.forEach((line, index) => {
    const size = layout === "storybook" ? 16 : 18;
    page.drawText(line, {
      x: 16 * MM,
      y: 22 * MM - index * (size + 4),
      size,
      font,
      color: ink,
    });
  });
  return pdf.save();
}

export function CardBuilder({ images, defaultMessage }: { images: { id: string; styleName: string; url: string }[]; defaultMessage: string }) {
  const [imageId, setImageId] = useState(images[0]?.id ?? "");
  const [layout, setLayout] = useState<"full" | "classic" | "storybook">("classic");
  const [message, setMessage] = useState(defaultMessage || "Happy Halloween");
  const [busy, setBusy] = useState(false);

  const image = images.find((item) => item.id === imageId) ?? images[0];
  if (!image) return null;

  async function downloadPdf() {
    setBusy(true);
    try {
      const bytes = await drawCard(image.url, message, layout);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "portrait-card-a6.pdf";
      link.click();
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng() {
    const canvas = document.createElement("canvas");
    canvas.width = 620;
    canvas.height = 874;
    const context = canvas.getContext("2d");
    if (!context) return;
    const picture = new Image();
    picture.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error("image"));
      picture.src = image.url;
    });
    context.fillStyle = "#f6f1e6";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (layout === "full") context.drawImage(picture, 0, 180, 620, 694);
    else if (layout === "classic") context.drawImage(picture, 36, 280, 548, 520);
    else context.drawImage(picture, 70, 250, 480, 460);
    context.fillStyle = "#1b140f";
    context.font = "28px Georgia";
    wrap(message, 28).forEach((line, index) => context.fillText(line, 48, 120 - index * 34));
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "portrait-card.png";
    link.click();
  }

  return (
    <section className="rounded-[2rem] border border-line p-5">
      <h2 className="text-3xl">Card builder</h2>
      <p className="mt-1 text-sm text-cream/70">A6 with 3mm bleed. The PDF is the print file. The PNG is for your phone.</p>
      <label className="mt-4 block text-sm">Portrait
        <select className="field mt-1" value={image.id} onChange={(event) => setImageId(event.target.value)}>
          {images.map((item) => <option key={item.id} value={item.id}>{item.styleName}</option>)}
        </select>
      </label>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {(["full", "classic", "storybook"] as const).map((item) => (
          <button key={item} type="button" className={`rounded-full border px-3 py-2 ${layout === item ? "border-pumpkin" : "border-line"}`} onClick={() => setLayout(item)}>{item}</button>
        ))}
      </div>
      <label className="mt-3 block text-sm">Message
        <textarea className="field mt-1" rows={3} maxLength={180} value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full bg-pumpkin px-4 py-3 font-semibold text-ink disabled:opacity-50" disabled={busy} onClick={downloadPdf}>Download print PDF</button>
        <button className="rounded-full border border-line px-4 py-3" onClick={downloadPng}>Download phone PNG</button>
      </div>
    </section>
  );
}
