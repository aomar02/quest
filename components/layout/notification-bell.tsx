"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchNotifications,
  markNotificationsRead,
} from "@/app/(protected)/social/actions";
import type { NotificationType, NotificationView } from "@/lib/social/shared";

const POLL_MS = 60_000;

function buildMessage(notification: NotificationView): string {
  const actor = notification.actor?.display_name ?? "مستخدم";
  const name = notification.collection_name ?? "";
  const byType: Record<NotificationType, string> = {
    review_like: `${actor} أعجب بمراجعتك`,
    review_comment: `${actor} علّق على مراجعتك`,
    collection_like: `${actor} أعجب بمجموعتك ${name}`.trim(),
    collection_save: `${actor} حفظ مجموعتك ${name}`.trim(),
    collection_comment: `${actor} علّق على مجموعتك ${name}`.trim(),
    comment_reply: `${actor} ردّ على تعليقك`,
    comment_like: `${actor} أعجب بتعليقك`,
  };
  return byType[notification.type];
}

function formatRelative(value: string): string {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "الآن";
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/**
 * The notification bell shown next to the avatar. Polls the unread count in the
 * background; opening the panel loads the latest list and marks everything read
 * (clearing the badge). Each row deep-links to the review or collection it's
 * about.
 */
export function NotificationBell() {
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    () =>
      fetchNotifications().then(({ items, unread }) => {
        setItems(items);
        setUnread(unread);
      }),
    [],
  );

  // Initial fetch + background poll for the badge.
  useEffect(() => {
    let active = true;
    const tick = () =>
      fetchNotifications().then(({ items, unread }) => {
        if (!active) return;
        setItems(items);
        setUnread(unread);
      });
    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
      if (unread > 0) {
        setUnread(0);
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            read_at: item.read_at ?? new Date().toISOString(),
          })),
        );
        void markNotificationsRead();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="الإشعارات"
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute end-0 z-50 mt-2 max-h-[70vh] w-80 overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">الإشعارات</h3>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8 text-text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                لا توجد إشعارات بعد.
              </p>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => {
                  const initial = item.actor?.display_name?.[0] ?? "؟";
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-elevated",
                          !item.read_at && "bg-primary/5",
                        )}
                      >
                        <Avatar className="size-9 shrink-0">
                          <AvatarImage
                            src={item.actor?.avatar_url ?? undefined}
                            alt=""
                          />
                          <AvatarFallback>{initial}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="text-sm leading-snug text-text-primary">
                            {buildMessage(item)}
                          </p>
                          <span className="text-xs text-text-muted">
                            {formatRelative(item.created_at)}
                          </span>
                        </div>
                        {!item.read_at && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
