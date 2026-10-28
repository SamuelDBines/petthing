import {
  alertStuckShopOrders,
  autoAdvanceShippedShopOrders,
  retryFailedPartnerSubmits,
} from "@/lib/ops/order-watchdog";
import { processPawtraitryBasketFulfilmentWatchdog } from "@/lib/pawtraitry/basket-fulfilment-runner";
import { syncOpenProdigiPrints } from "@/lib/ops/prodigi-print-sync";
import { assertCron } from "@/lib/runtime";
import { syncAllOpenPartnerOrders } from "@/lib/jinglefold/fulfillment";

export async function GET(request: Request) {
  try {
    assertCron(request);
  } catch {
    return new Response("Unauthorised", { status: 401 });
  }
  const stuck = await alertStuckShopOrders();
  const partnerSynced = await syncAllOpenPartnerOrders("jinglefold");
  const partnerRetried = await retryFailedPartnerSubmits("jinglefold");
  const printsSynced = await syncOpenProdigiPrints();
  const delivered = await autoAdvanceShippedShopOrders();
  const pawtraitryBasket = await processPawtraitryBasketFulfilmentWatchdog();
  return Response.json({
    ok: true,
    stuck,
    partnerSynced,
    partnerRetried,
    printsSynced,
    delivered,
    pawtraitryBasket,
  });
}

export const POST = GET;
