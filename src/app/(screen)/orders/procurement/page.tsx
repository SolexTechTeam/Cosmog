import PageHeader from "@/components/common/PageHeader";
import ProcurementOverviewCards from "@/components/screens/orders/ProcurementOverviewCards";
import ProcurementTable from "@/components/screens/orders/ProcurementTable";

export default function PurchaseOrdersScreen() {
  return (
    <>
      <PageHeader title="Purchase Orders" />
      <section className="rounded-lg border border-border bg-muted p-5 shadow-sm">
        <h2 className="text-header mb-4">Overview</h2>
        <ProcurementOverviewCards />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Orders</h2>
        <ProcurementTable />
      </section>
    </>
  );
}
