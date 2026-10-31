import { AdminCustomerDetailClient } from "@/components/admin-customer-detail";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ personKey: string }>;
}) {
  const { personKey } = await params;
  return <AdminCustomerDetailClient personKey={decodeURIComponent(personKey)} />;
}
