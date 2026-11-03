import type { Order, PrintOrder } from "@/lib/domain";

export function printSummary(print: PrintOrder) {
  if (print.status === "submitted" && print.prodigiOrderId) {
    return print.prodigiOrderId.startsWith("mock_") ? "Mock Prodigi" : "Sent to Prodigi";
  }
  if (print.status === "paid") return "Print paid";
  if (print.status === "pending_payment") return "Print pending";
  if (print.status === "failed") return "Print failed";
  return print.status;
}

export function orderPipelineStatus(order: Order, prints: PrintOrder[]) {
  if (order.status === "refunded") return "Refunded";
  if (order.status === "failed") return "Failed";
  if (order.status === "pending_payment") return order.failureReason ? "Payment failed" : "Awaiting payment";
  if (order.status === "paid") return "Paid";
  if (order.status === "generating" || order.status === "waiting_for_credit") return "Generating";
  if (order.status === "review") return "In review";
  if (order.status === "delivered") {
    const active = prints.filter((p) => p.status !== "failed");
    if (active.some((p) => p.status === "submitted")) {
      const mock = active.some((p) => p.prodigiOrderId?.startsWith("mock_"));
      return mock ? "Delivered · mock print" : "Delivered · sent to Prodigi";
    }
    if (active.some((p) => p.status === "paid")) return "Delivered · print paid";
    return "Delivered";
  }
  return order.status;
}
