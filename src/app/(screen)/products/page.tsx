import PageHeader from "@/components/common/PageHeader";
import ProductsTable from "@/components/screens/products/ProductsTable";

export default function ProductsScreen() {
  return (
    <>
      <PageHeader title="Products" />
      <ProductsTable />
    </>
  );
}
