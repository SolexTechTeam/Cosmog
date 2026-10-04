import PageHeader from "@/components/common/PageHeader";
import InventoryOverviewCards from "@/components/screens/inventory/InventoryOverviewCards";
import InventoryTable from "@/components/screens/inventory/InventoryTable";

export default function InventoryScreen() {
  return (
    <>
      <PageHeader title="Inventory" />
      <section className="rounded-lg border border-border bg-muted p-5 shadow-sm">
        <h2 className="text-header mb-4">Overview</h2>
        <InventoryOverviewCards />
      </section>
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Stock</h2>
        <InventoryTable />
      </section>
    </>
  );
}
