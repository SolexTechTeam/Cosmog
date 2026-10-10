"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import type { Profile } from "@/types";

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
  {
    label: "Data",
    children: [
      { label: "Customers", href: "/customers" },
      { label: "Suppliers", href: "/suppliers" },
      { label: "Products", href: "/products" },
      { label: "Users", href: "/users" },
    ],
  },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { data: profile } = useApi<Profile>(() => AetherClient.getMyProfile());

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } relative bg-sidebar flex flex-col transition-all duration-200`}
    >
      {/* Collapse toggle — vertical bar on right edge with centered arrow */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-0 right-0 w-[12px] h-full bg-sidebar-accent hover:bg-primary/40 transition-colors flex items-center justify-center group"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="text-[10px] text-gray-500 group-hover:text-white transition-colors select-none">
          {collapsed ? "›" : "‹"}
        </span>
      </button>

      {/* Title */}
      <div className={`px-5 pt-6 pb-6 ${collapsed ? "px-2 text-center" : ""}`}>
        {collapsed ? (
          <span className="text-xl font-bold text-primary">S</span>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-primary">Solext</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        {navItems.map((item) =>
          isGroup(item) ? (
            <div key={item.label} className="mt-2">
              {!collapsed && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary block">
                  {item.label}
                </span>
              )}
              <div className="flex flex-col gap-0.5">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    title={collapsed ? child.label : undefined}
                    className={`px-3 py-2 text-sm transition-all duration-200 ${
                      pathname === child.href
                        ? "bg-accent text-accent-foreground font-medium border-l-3 border-primary rounded-r-md"
                        : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent rounded-md"
                    } ${collapsed ? "text-center" : ""}`}
                  >
                    {collapsed ? child.label.charAt(0) : child.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`px-3 py-2 text-sm transition-all duration-200 ${
                pathname === item.href
                  ? "bg-accent text-accent-foreground font-medium border-l-3 border-primary rounded-r-md"
                  : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent rounded-md"
              } ${collapsed ? "text-center" : ""}`}
            >
              {collapsed ? item.label.charAt(0) : item.label}
            </Link>
          )
        )}
      </nav>

      {/* User info + sign out at bottom */}
      <div className={`border-t border-sidebar-border px-4 py-4 ${collapsed ? "px-2" : ""}`}>
        {!collapsed && profile && (
          <p className="text-xs text-gray-500 truncate mb-2">{profile.name}</p>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign Out" : undefined}
          className={`text-xs text-gray-500 hover:text-gray-300 transition-colors ${
            collapsed ? "w-full text-center" : ""
          }`}
        >
          {collapsed ? "x" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
