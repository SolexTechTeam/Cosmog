import PageHeader from "@/components/common/PageHeader";
import UsersTable from "./UsersTable";

export default function UsersScreen() {
  return (
    <>
      <PageHeader title="Users" />
      <UsersTable />
    </>
  );
}
