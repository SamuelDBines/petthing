import { PRINTS, printName } from "@/config/prints";
import { CHRISTMAS_PREORDER_PENCE, EXTRA_STYLES_COUNT, EXTRA_STYLES_PENCE, getTier } from "@/config/pricing";
import { getTheme } from "@/config/themes";
import { signedBlobUrl } from "@/lib/blobs";
import { getStore } from "@/lib/store";

export async function galleryForToken(token: string, base?: string) {
  const store = getStore();
  const order = await store.getOrderByToken(token);
  if (!order) return null;
  if (order.resultsDeletedAt) {
    return { ready: false as const, status: "expired" as const };
  }
  if (order.status !== "delivered") {
    return { ready: false as const, status: order.status };
  }
  const theme = getTheme(order.themeId);
  const tier = getTier(order.tierId);
  const assets = await store.listAssets(order.id);
  const images = [];
  for (const asset of assets.filter((item) => item.kind === "result")) {
    const preview = assets.find((item) => item.kind === "preview" && item.storagePath.endsWith(`${asset.id}.jpg`));
    images.push({
      id: asset.id,
      styleId: asset.styleId,
      styleName: theme?.styles.find((style) => style.id === asset.styleId)?.name ?? "Portrait",
      url: await signedBlobUrl(asset.bucket, asset.storagePath, 60 * 60, true, base),
      previewUrl: preview ? await signedBlobUrl(preview.bucket, preview.storagePath, 60 * 60 * 24 * 7, false, base) : null,
    });
  }
  const owned = new Set(order.styleIds);
  const remaining = (theme?.styles ?? []).filter((style) => !owned.has(style.id)).map((style) => ({ id: style.id, name: style.name }));
  return {
    ready: true as const,
    order: {
      id: order.id,
      email: order.email,
      tierId: order.tierId,
      tierName: tier.name,
      includesCard: tier.includesCard,
      cardNames: order.cardNames,
      subjectType: order.subjectType,
      themeName: theme?.name ?? order.themeId,
      referralCode: order.ownReferralCode,
      priority: order.priority,
    },
    images,
    prints: (await store.listPrints(order.id)).map((print) => ({
      id: print.id,
      product: printName(print.productId),
      status: print.status,
      error: print.error,
    })),
    offers: {
      extra: {
        pricePence: EXTRA_STYLES_PENCE,
        count: EXTRA_STYLES_COUNT,
        remaining,
        bonusImages: remaining.length === 0,
      },
      prints: PRINTS.map((product) => ({
        id: product.id,
        name: product.name,
        detail: product.detail,
        pricePence: product.pricePence,
      })),
      christmasPence: CHRISTMAS_PREORDER_PENCE,
    },
  };
}

export async function shareForToken(token: string, base?: string) {
  const gallery = await galleryForToken(token, base);
  if (!gallery || !gallery.ready) return null;
  return {
    themeName: gallery.order.themeName,
    images: gallery.images.map((image) => ({
      id: image.id,
      styleName: image.styleName,
      previewUrl: image.previewUrl,
    })),
  };
}
