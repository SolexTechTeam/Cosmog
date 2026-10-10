import PageHeader from "@/components/common/PageHeader";
import SalesTable from "@/components/screens/orders/SalesTable";

export default function SalesOrdersScreen() {
  return (
    <>
      <PageHeader title="Sales Orders" />
      <SalesTable />
    </>
  );
}
