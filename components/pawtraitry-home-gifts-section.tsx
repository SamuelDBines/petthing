import Image from "next/image";
import Link from "next/link";
import { PAWTRAITRY_PRODUCT_MOCKUP_SIZE } from "@/config/pawtraitry-product-mockups";
import { pawtraitryHomeGiftPriceLabel, pawtraitryHomeGiftTiles } from "@/config/pawtraitry-home-gifts";

const tiles = pawtraitryHomeGiftTiles();

export function PawtraitryHomeGiftsSection() {
  return (
    <section id="gifts" className="mx-auto max-w-6xl px-4 pb-16" aria-labelledby="gifts-heading">
      <h2 id="gifts-heading" className="text-4xl">
        Turn your portrait into a gift
      </h2>
      <p className="mt-2 max-w-2xl text-muted">
        Mugs, cushions, framed prints, and more. Each one is printed from your best finished portrait when your order is ready.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.name} className="overflow-hidden rounded-2xl border border-line bg-bark">
            <Image
              src={tile.src}
              alt={tile.alt}
              width={PAWTRAITRY_PRODUCT_MOCKUP_SIZE.width}
              height={PAWTRAITRY_PRODUCT_MOCKUP_SIZE.height}
              className="aspect-square w-full object-cover"
              sizes="(max-width:640px) 50vw, 33vw"
              loading="lazy"
            />
            <div className="p-3 sm:p-4">
              <p className="text-sm font-medium leading-snug text-cream sm:text-base">{tile.name}</p>
              <p className="mt-1 text-sm text-muted">{pawtraitryHomeGiftPriceLabel(tile)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-2xl text-sm text-muted sm:text-base">
        Pick your gifts while you create your portrait. Add mugs, prints, and more in the create flow before you pay. UK delivery is
        included in each print price (no extra shipping at checkout).
      </p>
      <Link
        href="/create"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-pumpkin px-6 text-sm font-medium text-ink"
      >
        Create your portrait
      </Link>
    </section>
  );
}
