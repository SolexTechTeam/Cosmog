import PageHeader from "@/components/common/PageHeader";
import InventoryOverviewCards from "@/components/screens/inventory/InventoryOverviewCards";
import InventoryTable from "@/components/screens/inventory/InventoryTable";

export default function InventoryScreen() {
  return (
    <>
      <PageHeader title="Inventory" />
      <section className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Overview</h2>
        <InventoryOverviewCards />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Stock</h2>
        <InventoryTable />
      </section>
    </>
  );
}
