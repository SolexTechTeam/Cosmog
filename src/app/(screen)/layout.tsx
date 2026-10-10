import SideNav from "@/components/layout/SideNav";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen">
        <SideNav />
        <main className="flex-1 overflow-y-auto px-6 py-5 bg-background">
          <div className="flex flex-col gap-5">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
