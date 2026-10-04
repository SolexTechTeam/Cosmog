import PageHeader from "@/components/common/PageHeader";
import InventorySummaryWidget from "@/components/screens/home/InventorySummaryWidget";
import OrderMetricsWidget from "@/components/screens/home/OrderMetricsWidget";
import ActiveOrdersWidget from "@/components/screens/home/ActiveOrdersWidget";

export default function HomeScreen() {
  return (
    <>
      <PageHeader title="Home" />
      <section>
        <h2 className="text-header mb-3">Inventory Summary</h2>
        <InventorySummaryWidget />
      </section>
      <section>
        <h2 className="text-header mb-3">Order Metrics</h2>
        <OrderMetricsWidget />
      </section>
      <section>
        <h2 className="text-header mb-3">Active Orders</h2>
        <ActiveOrdersWidget />
      </section>
    </>
  );
}
