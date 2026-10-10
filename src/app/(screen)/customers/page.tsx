import PageHeader from "@/components/common/PageHeader";
import CustomersTable from "./CustomersTable";

export default function CustomersScreen() {
  return (
    <>
      <PageHeader title="Customers" />
      <CustomersTable />
    </>
  );
}
