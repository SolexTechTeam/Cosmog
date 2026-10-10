import PageHeader from "@/components/common/PageHeader";
import ProductsTable from "./ProductsTable";

export default function ProductsScreen() {
  return (
    <>
      <PageHeader title="Products" />
      <ProductsTable />
    </>
  );
}
