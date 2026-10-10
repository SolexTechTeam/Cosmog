import SideNav from "@/components/layout/SideNav";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="flex flex-col gap-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
