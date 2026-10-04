"use client";

export default function TopNavBar() {
  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-6">
      <span className="text-lg font-semibold text-foreground">Solex</span>
      <div className="text-sm text-muted-foreground">User Profile</div>
    </header>
  );
}
