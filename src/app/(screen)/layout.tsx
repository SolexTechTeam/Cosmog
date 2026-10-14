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
          <div className="flex h-screen min-w-[320px]">
            <SideNav />
            <main className="min-w-0 flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-6 lg:px-8">
              <div className="flex min-w-0 flex-col gap-5">
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
