import PageHeader from "@/components/common/PageHeader";
import HistoryTable from "./HistoryTable";

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
