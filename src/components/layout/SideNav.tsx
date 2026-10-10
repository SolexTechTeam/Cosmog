"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import {
  Home,
  Package,
  History,
  ShoppingCart,
  Truck,
  Flame,
  Users,
  Building2,
  Box,
  UserCog,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
} from "lucide-react";
import type { Profile } from "@/types";

type NavLink = { label: string; href: string; icon: React.ReactNode };
type NavGroup = { label: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const iconSize = 18;

const navItems: NavItem[] = [
  { label: "Home", href: "/home", icon: <Home size={iconSize} /> },
  {
    label: "Inventory",
    children: [
      { label: "Stock", href: "/inventory", icon: <Package size={iconSize} /> },
      { label: "History", href: "/inventory/history", icon: <History size={iconSize} /> },
    ],
  },
  {
    label: "Orders",
    children: [
      { label: "Sales", href: "/orders/sales", icon: <ShoppingCart size={iconSize} /> },
      { label: "Procurement", href: "/orders/procurement", icon: <Truck size={iconSize} /> },
      { label: "Demand Priority", href: "/orders/cooking", icon: <Flame size={iconSize} /> },
    ],
  },
  {
    label: "Data",
    children: [
      { label: "Customers", href: "/customers", icon: <Users size={iconSize} /> },
      { label: "Suppliers", href: "/suppliers", icon: <Building2 size={iconSize} /> },
      { label: "Products", href: "/products", icon: <Box size={iconSize} /> },
      { label: "Users", href: "/users", icon: <UserCog size={iconSize} /> },
    ],
  },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { data: profile } = useApi<Profile>([...queryKeys.myProfile], () => AetherClient.getMyProfile());

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href;

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } relative bg-sidebar flex flex-col transition-all duration-200`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-3 right-0 translate-x-1/2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground hover:text-white hover:bg-sidebar-accent transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
      </button>

      <div className={`px-5 pt-6 pb-6 ${collapsed ? "px-2 text-center" : ""}`}>
        {collapsed ? (
          <span className="text-xl font-bold text-primary">S</span>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-primary">Solext</h1>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        {navItems.map((item) =>
          isGroup(item) ? (
            <div key={item.label} className="mt-2">
              {!collapsed && (
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary block">
                  {item.label}
                </span>
              )}
              {collapsed && <div className="mx-auto mb-1 h-px w-6 bg-sidebar-border" />}
              <div className="flex flex-col gap-0.5">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    title={collapsed ? child.label : undefined}
                    aria-label={collapsed ? child.label : undefined}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                      isActive(child.href)
                        ? "bg-primary/10 text-white font-medium"
                        : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    <span className={isActive(child.href) ? "text-primary" : ""}>{child.icon}</span>
                    {!collapsed && child.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                isActive(item.href)
                  ? "bg-primary/10 text-white font-medium"
                  : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <span className={isActive(item.href) ? "text-primary" : ""}>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          )
        )}
      </nav>

      <div className={`border-t border-sidebar-border px-4 py-4 ${collapsed ? "px-2" : ""}`}>
        {profile && (
          <Link
            href="/profile"
            title={collapsed ? profile.name : undefined}
            className={`flex items-center gap-2 rounded-md px-1 py-1 text-xs text-sidebar-foreground hover:text-white hover:bg-sidebar-accent transition-colors truncate mb-2 ${collapsed ? "justify-center" : ""}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
              {profile.name.charAt(0).toUpperCase()}
            </span>
            {!collapsed && <span className="truncate">{profile.name}</span>}
          </Link>
        )}
        <Link
          href="/help"
          title={collapsed ? "Help" : undefined}
          aria-label={collapsed ? "Help" : undefined}
          className={`flex items-center gap-2 text-xs text-sidebar-foreground hover:text-white hover:bg-sidebar-accent rounded-md px-1 py-1 transition-colors mb-1 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <HelpCircle size={14} />
          {!collapsed && "Help"}
        </Link>
        <button
          onClick={handleSignOut}
          title="Sign Out"
          aria-label="Sign Out"
          className={`flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors ${
            collapsed ? "w-full justify-center" : ""
          }`}
        >
          <LogOut size={14} />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
