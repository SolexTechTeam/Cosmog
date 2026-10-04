import PageHeader from "@/components/common/PageHeader";
import HistoryTable from "@/components/screens/inventory/HistoryTable";

export default function InventoryHistoryScreen() {
  return (
    <>
      <PageHeader title="Inventory History" />
      <section>
        <h2 className="text-header mb-3 pl-[var(--radius)]">Ledger</h2>
        <HistoryTable />
      </section>
    </>
  );
}
