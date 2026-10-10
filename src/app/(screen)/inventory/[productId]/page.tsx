import InventoryProductDetail from "./InventoryProductDetail";

export default async function InventoryProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <InventoryProductDetail productId={productId} />;
}
