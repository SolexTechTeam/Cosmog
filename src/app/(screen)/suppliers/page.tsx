import PageHeader from "@/components/common/PageHeader";
import SuppliersTable from "@/components/screens/suppliers/SuppliersTable";

export default function SuppliersScreen() {
  return (
    <>
      <PageHeader title="Suppliers" />
      <SuppliersTable />
    </>
  );
}
