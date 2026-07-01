"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useClerk, useUser } from "@clerk/nextjs"
import { Menu, X } from "lucide-react"
import { GameSearch } from "@/components/search/game-search"
import { NotificationBell } from "@/components/layout/notification-bell"
import { QuestLogo } from "@/components/layout/quest-logo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const links = [
  { href: "/discover", label: "اكتشف" },
  { href: "/libraries", label: "المكتبات" },
]

export function Nav() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur transition-[padding] duration-300",
        isScrolled ? "py-1.5" : "py-3",
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 justify-self-start text-xl font-bold text-white transition-all duration-300"
        >
          <QuestLogo className="size-6" />
          كويست
        </Link>

        <nav className="hidden items-center gap-1 justify-self-center rounded-full border border-border bg-bg-elevated/60 p-1.5 backdrop-blur transition-all duration-300 md:flex">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-[15px] font-medium transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                )}
              >
                {link.label}
              </Link>
            )
          })}
          <span className="mx-1 h-5 w-px bg-border" />
          <div className="rounded-full p-2 transition-colors duration-300 hover:bg-bg-elevated">
            <GameSearch />
          </div>
        </nav>

        <div className="flex items-center gap-2 justify-self-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="md:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={<Avatar size="lg" className="cursor-pointer" />}
            >
              <AvatarImage src={user?.imageUrl} alt="الملف الشخصي" />
              <AvatarFallback>{user?.firstName?.[0] ?? "ك"}</AvatarFallback>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" />}>
                  الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/profile/edit" />}>
                  الإعدادات
                </DropdownMenuItem>
                {user?.publicMetadata?.role === "admin" && (
                  <DropdownMenuItem render={<Link href="/admin" />}>
                    لوحة التحكم
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ redirectUrl: "/sign-in" })}
                >
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden px-4 transition-all duration-300 ease-out sm:px-6 md:hidden lg:px-8",
          mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <nav className="flex min-h-0 flex-col gap-1 border-t border-border pt-3 pb-1">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                )}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] font-medium text-text-secondary transition-colors duration-300 hover:bg-bg-elevated hover:text-text-primary">
            <GameSearch />
            بحث
          </div>
        </nav>
      </div>
    </header>
  )
}
