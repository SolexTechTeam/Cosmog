import PageHeader from "@/components/common/PageHeader";
import InventoryTable from "./InventoryTable";

export default function InventoryScreen() {
  return (
    <>
      <PageHeader title="Inventory" />
      <InventoryTable />
    </>
  );
}
