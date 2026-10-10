import PageHeader from "@/components/common/PageHeader";
import CustomersTable from "@/components/screens/customers/CustomersTable";

export default function CustomersScreen() {
  return (
    <>
      <PageHeader title="Customers" />
      <CustomersTable />
    </>
  );
}
