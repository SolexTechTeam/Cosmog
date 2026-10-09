import PageHeader from "@/components/common/PageHeader";
import InventoryTable from "@/components/screens/inventory/InventoryTable";

export default function InventoryScreen() {
  return (
    <>
      <PageHeader title="Inventory" />
      <InventoryTable />
    </>
  );
}
