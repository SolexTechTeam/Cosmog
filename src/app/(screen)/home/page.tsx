import PageHeader from "@/components/common/PageHeader";
import InventorySummaryWidget from "@/components/screens/home/InventorySummaryWidget";
import OrderMetricsWidget from "@/components/screens/home/OrderMetricsWidget";
import ActiveOrdersWidget from "@/components/screens/home/ActiveOrdersWidget";

export default function HomeScreen() {
  return (
    <>
      <PageHeader title="Home" />
      <section className="w-[97.5%] mx-auto rounded-lg border border-border bg-muted px-8 py-5">
        <h2 className="text-header mb-4">Inventory Summary</h2>
        <InventorySummaryWidget />
      </section>
      <section className="w-[97.5%] mx-auto rounded-lg border border-border bg-muted px-8 py-5">
        <h2 className="text-header mb-4">Order Metrics</h2>
        <OrderMetricsWidget />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Active Orders</h2>
        <ActiveOrdersWidget />
      </section>
    </>
  );
}
