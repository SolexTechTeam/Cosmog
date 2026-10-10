import PageHeader from "@/components/common/PageHeader";
import ProcurementTable from "./ProcurementTable";

export default async function PurchaseOrdersScreen({
  searchParams,
}: {
  searchParams: Promise<{ po?: string | string[] }>;
}) {
  const { po } = await searchParams;
  const detailsRowId = Array.isArray(po) ? po[0] : po;

  return (
    <>
      <PageHeader title="Purchase Orders" />
      <ProcurementTable detailsRowId={detailsRowId} />
    </>
  );
}
