import SideNav from "@/components/layout/SideNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <SideNav />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <div className="flex flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
