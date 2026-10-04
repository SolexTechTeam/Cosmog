import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";

export default function SalesOrdersScreen() {
  return (
    <>
      <PageHeader title="Sales Orders" />
      <MetricCardRow>
        <MetricCard label="Open Sales" value="—" />
        <MetricCard label="Total Sales" value="—" />
        <MetricCard label="Open Procurement" value="—" />
        <MetricCard label="Total Procurement" value="—" />
      </MetricCardRow>
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        Search + filter bar placeholder
      </div>
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        Sales orders AG Grid table placeholder
      </div>
    </>
  );
}
