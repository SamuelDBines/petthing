"use client";

import Image from "next/image";

export type PersonalisePreviewShape = "bauble" | "plaque" | "wood-disc" | "stocking" | "trio";

type Props = {
  shape: PersonalisePreviewShape;
  sampleMockupSrc: string;
  sampleWidth: number;
  sampleHeight: number;
  photoUrl?: string | null;
};

function PhotoLayer({ url, className }: { url: string; className: string }) {
  return (
    <div
      className={`absolute overflow-hidden bg-ink/20 ${className}`}
      style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
      role="img"
      aria-hidden
    />
  );
}

export function PersonalisePreview({ shape, sampleMockupSrc, sampleWidth, sampleHeight, photoUrl }: Props) {
  const hasPhoto = Boolean(photoUrl);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md" data-testid="personalise-preview">
      <Image
        src={sampleMockupSrc}
        alt=""
        width={sampleWidth}
        height={sampleHeight}
        className="h-full w-full object-contain"
        sizes="(max-width:768px) 100vw, 400px"
        priority
      />
      {hasPhoto && photoUrl ? (
        <>
          {shape === "bauble" || shape === "wood-disc" ? (
            <PhotoLayer
              url={photoUrl}
              className={`left-[26%] top-[22%] h-[46%] w-[48%] rounded-full shadow-inner ring-2 ring-white/40 ${shape === "wood-disc" ? "left-[28%] top-[24%] h-[42%] w-[44%]" : ""}`}
            />
          ) : null}
          {shape === "plaque" ? (
            <PhotoLayer url={photoUrl} className="left-[30%] top-[32%] h-[34%] w-[40%] rounded-xl shadow-md ring-1 ring-line/60" />
          ) : null}
          {shape === "stocking" ? (
            <PhotoLayer url={photoUrl} className="left-[41%] top-[38%] h-[22%] w-[18%] rounded-md shadow-sm" />
          ) : null}
          {shape === "trio" ? (
            <>
              <PhotoLayer url={photoUrl} className="left-[22%] top-[48%] h-[14%] w-[14%] rounded-full" />
              <PhotoLayer url={photoUrl} className="left-[43%] top-[42%] h-[14%] w-[14%] rounded-full" />
              <PhotoLayer url={photoUrl} className="left-[64%] top-[48%] h-[14%] w-[14%] rounded-full" />
            </>
          ) : null}
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              background:
                shape === "bauble" || shape === "trio"
                  ? "radial-gradient(circle at 32% 18%, rgba(255,255,255,0.35), transparent 45%)"
                  : "linear-gradient(145deg, rgba(255,255,255,0.2), transparent 50%)",
            }}
            aria-hidden
          />
        </>
      ) : (
        <p className="absolute bottom-4 left-4 right-4 rounded-xl bg-ink/80 px-3 py-2 text-center text-xs text-cream">
          Upload a photo to see it in the ornament
        </p>
      )}
    </div>
  );
}

export function previewShapeForProductId(productId: string): PersonalisePreviewShape {
  switch (productId) {
    case "jf_alum_sq":
    case "jf_glass_sq":
      return "plaque";
    case "jf_wood":
      return "wood-disc";
    case "jf_stocking":
      return "stocking";
    case "jf_plas_baub_3":
      return "trio";
    default:
      return "bauble";
  }
}
