import PageHeader from "@/components/common/PageHeader";
import SalesTable from "@/components/common/orders/SalesTable";

export default function SalesOrdersScreen() {
  return (
    <>
      <PageHeader title="Sales Orders" />
      <SalesTable />
    </>
  );
}
