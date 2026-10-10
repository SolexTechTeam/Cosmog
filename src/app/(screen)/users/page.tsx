import PageHeader from "@/components/common/PageHeader";
import UsersTable from "@/components/screens/users/UsersTable";

export default function UsersScreen() {
  return (
    <>
      <PageHeader title="Users" />
      <UsersTable />
    </>
  );
}
