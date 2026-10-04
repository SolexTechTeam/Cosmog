import PageHeader from "@/components/common/PageHeader";
import HistoryTable from "@/components/screens/inventory/HistoryTable";

export default function InventoryHistoryScreen() {
  return (
    <>
      <PageHeader title="Inventory History" />
      <section>
        <HistoryTable />
      </section>
    </>
  );
}
