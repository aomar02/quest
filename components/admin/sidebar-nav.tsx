"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Library, Star, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/collections", label: "المجموعات", icon: Library },
  { href: "/admin/reviews", label: "المراجعات", icon: Star },
  { href: "/admin/comments", label: "التعليقات", icon: MessageSquare },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-e sm:px-3 sm:py-4">
      {links.map((link) => {
        const isActive =
          link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
            )}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
