"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

type Breadcrumb = {
  section: string;
  sectionHref: string;
  current: string;
};

function getBreadcrumb(pathname: string): Breadcrumb {
  if (pathname === "/home") return { section: "Home", sectionHref: "/home", current: "Home Dashboard" };
  if (pathname.startsWith("/inventory/history")) return { section: "Inventory", sectionHref: "/inventory", current: "History" };
  if (pathname.startsWith("/inventory/")) return { section: "Inventory", sectionHref: "/inventory", current: "Product Details" };
  if (pathname === "/inventory") return { section: "Inventory", sectionHref: "/inventory", current: "Inventory Stock" };
  if (pathname.startsWith("/orders/sales/")) return { section: "Orders", sectionHref: "/orders/sales", current: "Sale Order" };
  if (pathname.startsWith("/orders/sales")) return { section: "Orders", sectionHref: "/orders/sales", current: "Sales" };
  if (pathname.startsWith("/orders/procurement/")) return { section: "Orders", sectionHref: "/orders/procurement", current: "Purchase Order" };
  if (pathname.startsWith("/orders/procurement")) return { section: "Orders", sectionHref: "/orders/procurement", current: "Procurement" };
  if (pathname.startsWith("/orders/cooking")) return { section: "Orders", sectionHref: "/orders/cooking", current: "Demand Priority" };
  if (pathname.startsWith("/customers/")) return { section: "Data", sectionHref: "/customers", current: "Customer Details" };
  if (pathname.startsWith("/customers")) return { section: "Data", sectionHref: "/customers", current: "Customers" };
  if (pathname.startsWith("/suppliers/")) return { section: "Data", sectionHref: "/suppliers", current: "Supplier Details" };
  if (pathname.startsWith("/suppliers")) return { section: "Data", sectionHref: "/suppliers", current: "Suppliers" };
  if (pathname.startsWith("/products")) return { section: "Data", sectionHref: "/products", current: "Products" };
  if (pathname.startsWith("/users/")) return { section: "Data", sectionHref: "/users", current: "User Details" };
  if (pathname.startsWith("/users")) return { section: "Data", sectionHref: "/users", current: "Users" };
  if (pathname.startsWith("/settings/lookups")) return { section: "Settings", sectionHref: "/settings/lookups", current: "Lookup Values" };
  if (pathname.startsWith("/profile")) return { section: "Account", sectionHref: "/profile", current: "Profile" };
  if (pathname.startsWith("/help")) return { section: "Support", sectionHref: "/help", current: "Help & FAQ" };

  return { section: "Overview", sectionHref: "/home", current: "Workspace" };
}

export default function PageBreadcrumb() {
  const breadcrumb = getBreadcrumb(usePathname());

  return (
    <nav aria-label="Breadcrumb" className="font-heading flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em]">
      <Link href={breadcrumb.sectionHref} className="text-muted-foreground transition-colors hover:text-foreground">
        {breadcrumb.section}
      </Link>
      <ChevronRight aria-hidden="true" size={14} className="text-muted-foreground" />
      <span className="text-primary" aria-current="page">{breadcrumb.current}</span>
    </nav>
  );
}
