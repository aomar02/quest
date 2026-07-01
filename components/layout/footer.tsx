import Link from "next/link"
import { QuestLogo } from "@/components/layout/quest-logo"

const links = [
  {
    heading: "التصفح",
    items: [
      { href: "/discover", label: "اكتشف" },
      { href: "/libraries", label: "المكتبات" },
    ],
  },
  {
    heading: "الحساب",
    items: [
      { href: "/profile", label: "ملفي الشخصي" },
      { href: "/profile/edit", label: "الإعدادات" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary/60 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl w-fit">
              <QuestLogo className="size-5" />
              كويست
            </Link>
            <p className="text-text-muted text-sm leading-relaxed max-w-[220px]">
              تتبّع ألعابك، اكتشف الجديد، وشارك تجربتك مع المجتمع.
            </p>
          </div>

          {/* Link groups */}
          {links.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {group.heading}
              </p>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} كويست. جميع الحقوق محفوظة.</span>
          <span>صُنع بشغف للاعبين العرب</span>
        </div>
      </div>
    </footer>
  )
}
