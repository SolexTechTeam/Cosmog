"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { label: string; href: string };
type NavGroup = { label: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/home" },
  {
    label: "Inventory",
    children: [
      { label: "Stock", href: "/inventory" },
      { label: "History", href: "/inventory/history" },
    ],
  },
  {
    label: "Orders",
    children: [
      { label: "Sales", href: "/orders/sales" },
      { label: "Procurement", href: "/orders/procurement" },
      { label: "Demand Priority", href: "/orders/cooking" },
    ],
  },
  { label: "Customers", href: "/customers" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Products", href: "/products" },
  { label: "Users", href: "/users" },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-border bg-[#FAFAFA] flex flex-col py-4">
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) =>
          isGroup(item) ? (
            <div key={item.label}>
              <span className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
              <div className="flex flex-col gap-0.5 mt-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      pathname === child.href
                        ? "bg-orange-50 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                pathname === item.href
                  ? "bg-orange-50 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}
