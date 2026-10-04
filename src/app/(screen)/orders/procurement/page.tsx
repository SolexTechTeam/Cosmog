import PageHeader from "@/components/common/PageHeader";
import ProcurementOverviewCards from "@/components/screens/orders/ProcurementOverviewCards";
import ProcurementTable from "@/components/screens/orders/ProcurementTable";

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
      <section className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Overview</h2>
        <ProcurementOverviewCards />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Orders</h2>
        <ProcurementTable detailsRowId={detailsRowId} />
      </section>
    </>
  );
}
