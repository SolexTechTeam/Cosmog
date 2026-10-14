import SideNav from "@/components/layout/SideNav";
import PageBreadcrumb from "@/components/common/PageBreadcrumb";
import AntdProvider from "@/components/providers/AntdProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AntdProvider>
        <ToastProvider>
          <div className="flex h-screen">
            <SideNav />
            <main className="flex-1 overflow-y-auto px-6 py-5 bg-background lg:px-8">
              <div className="flex flex-col gap-5">
                <PageBreadcrumb />
                {children}
              </div>
            </main>
          </div>
        </ToastProvider>
      </AntdProvider>
    </QueryProvider>
  );
}
