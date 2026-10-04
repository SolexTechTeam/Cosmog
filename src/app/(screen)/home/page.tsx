import PageHeader from "@/components/common/PageHeader";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";

export default function HomeScreen() {
  return (
    <>
      <PageHeader title="Home" />
      <section>
        <h2 className="text-lg font-semibold mb-3">Inventory Summary</h2>
        <MetricCardRow>
          <MetricCard label="On-Hand" value="—" />
          <MetricCard label="Incoming" value="—" />
          <MetricCard label="Reserved" value="—" />
          <MetricCard label="Total Value" value="—" />
        </MetricCardRow>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-3">Metrics</h2>
        <MetricCardRow>
          <MetricCard label="Open Orders" value="—" />
          <MetricCard label="Awaiting Payment" value="—" />
          <MetricCard label="Outstanding $" value="—" />
        </MetricCardRow>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-3">Active Orders</h2>
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          Order table placeholder
        </div>
      </section>
    </>
  );
}
