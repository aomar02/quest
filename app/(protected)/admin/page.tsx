import Link from "next/link";
import { Users, Library, Star, MessageSquare, Heart, UserPlus } from "lucide-react";

import { getAdminStats } from "@/lib/admin/data";
import { AdminStatCard } from "@/components/admin/stat-card";

/** A horizontal ranked-list row: label + count + a width-scaled bar (no chart library needed for 5 rows). */
function RankedRow({
  href,
  label,
  sublabel,
  value,
  max,
}: {
  href: string;
  label: string;
  sublabel: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;
  return (
    <Link href={href} className="flex flex-col gap-1.5 rounded-lg p-2 transition-colors hover:bg-bg-elevated">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium text-text-primary">{label}</span>
        <span className="shrink-0 text-text-secondary">{sublabel}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const maxGameReviews = Math.max(0, ...stats.topGames.map((game) => game.reviewCount));
  const maxUserActivity = Math.max(0, ...stats.activeUsers.map((user) => user.activityCount));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-text-primary">نظرة عامة</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <AdminStatCard icon={Users} label="المستخدمون" value={stats.counts.users} />
        <AdminStatCard icon={Library} label="المجموعات" value={stats.counts.collections} />
        <AdminStatCard icon={Star} label="المراجعات" value={stats.counts.reviews} />
        <AdminStatCard icon={MessageSquare} label="التعليقات" value={stats.counts.comments} />
        <AdminStatCard icon={Heart} label="الإعجابات" value={stats.counts.likes} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <AdminStatCard icon={UserPlus} label="مستخدمون جدد (٧ أيام)" value={stats.newUsers.last7Days} />
        <AdminStatCard icon={UserPlus} label="مستخدمون جدد (٣٠ يوم)" value={stats.newUsers.last30Days} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-elevated p-4">
          <h2 className="px-2 text-sm font-semibold text-text-primary">الألعاب الأكثر مراجعة</h2>
          {stats.topGames.length === 0 ? (
            <p className="px-2 py-4 text-sm text-text-muted">لا توجد بيانات بعد</p>
          ) : (
            stats.topGames.map((game) => (
              <RankedRow
                key={game.igdb_id}
                href={`/games/${game.igdb_id}`}
                label={game.title}
                sublabel={`${game.reviewCount} مراجعة`}
                value={game.reviewCount}
                max={maxGameReviews}
              />
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-elevated p-4">
          <h2 className="px-2 text-sm font-semibold text-text-primary">المستخدمون الأكثر نشاطاً</h2>
          {stats.activeUsers.length === 0 ? (
            <p className="px-2 py-4 text-sm text-text-muted">لا توجد بيانات بعد</p>
          ) : (
            stats.activeUsers.map((user) => (
              <RankedRow
                key={user.user_id}
                href={`/profile/${user.username}`}
                label={user.display_name}
                sublabel={`${user.activityCount} نشاط`}
                value={user.activityCount}
                max={maxUserActivity}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
