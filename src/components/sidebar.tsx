"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
  GraduationCap,
  Zap,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/courses", label: "Mes cours", icon: BookOpen },
  { href: "/study", label: "Étudier", icon: Sparkles },
  { href: "/quick", label: "5 minutes", icon: Zap },
  { href: "/stats", label: "Statistiques", icon: LineChart },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar({ user }: { user?: { name?: string | null; email?: string | null; image?: string | null } }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">Compta Companion</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                  {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="text-xs overflow-hidden">
                <div className="font-medium truncate">{user.name || user.email}</div>
                <div className="text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/" })}>
              Se déconnecter
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  return (
    <div className="md:hidden flex h-14 items-center gap-2 px-4 border-b bg-card">
      <GraduationCap className="h-5 w-5 text-primary" />
      <span className="font-bold">Compta Companion</span>
    </div>
  );
}

export function MobileBottomBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="grid grid-cols-5 h-16">
        {links.slice(0, 5).map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
