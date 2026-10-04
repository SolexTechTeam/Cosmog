import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";

export default function InventoryScreen() {
  return (
    <>
      <PageHeader title="Inventory" />
      <MetricCardRow>
        <MetricCard label="Total SKUs" value="—" />
        <MetricCard label="On-Hand Units" value="—" />
        <MetricCard label="In-Transit" value="—" />
        <MetricCard label="Out of Stock" value="—" />
      </MetricCardRow>
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        Search + filter bar placeholder
      </div>
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        Inventory AG Grid table placeholder
      </div>
    </>
  );
}
