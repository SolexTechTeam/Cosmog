import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";

export default function PurchaseOrdersScreen() {
  return (
    <>
      <PageHeader title="Purchase Orders" />
      <MetricCardRow>
        <MetricCard label="Draft POs" value="—" />
        <MetricCard label="In-Transit" value="—" />
        <MetricCard label="Received This Month" value="—" />
        <MetricCard label="Total Spend" value="—" />
      </MetricCardRow>
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        Search + filter bar placeholder
      </div>
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        Purchase orders AG Grid table placeholder
      </div>
    </>
  );
}
