import PageHeader from "@/components/common/PageHeader";
import SalesOverviewCards from "@/components/screens/orders/SalesOverviewCards";
import SalesTable from "@/components/screens/orders/SalesTable";

export default function SalesOrdersScreen() {
  return (
    <>
      <PageHeader title="Sales Orders" />
      <section className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Overview</h2>
        <SalesOverviewCards />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Orders</h2>
        <SalesTable />
      </section>
    </>
  );
}
