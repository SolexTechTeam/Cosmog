import PurchaseOrderDetail from "./PurchaseOrderDetail";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseOrderDetail purchaseOrderId={id} />;
}
