import CustomerDetail from "./CustomerDetail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  return <CustomerDetail customerId={customerId} />;
}
