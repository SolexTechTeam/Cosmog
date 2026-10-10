import SaleOrderDetail from "./SaleOrderDetail";

export default async function SaleOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SaleOrderDetail saleOrderId={id} />;
}
