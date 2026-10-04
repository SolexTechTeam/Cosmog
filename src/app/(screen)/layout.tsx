import TopNavBar from "@/components/layout/TopNavBar";
import SideNav from "@/components/layout/SideNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="flex flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
