import Link from "next/link";
import { Star } from "lucide-react";

import { searchAdminReviews, PAGE_SIZE } from "@/lib/admin/data";
import { adminDeleteReview } from "@/app/(protected)/admin/actions";
import { AdminDeleteButton } from "@/components/admin/delete-button";
import { AdminSearchForm, AdminPagination } from "@/components/admin/list-controls";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const offset = Number(params.offset ?? 0) || 0;

  const { reviews, hasMore } = await searchAdminReviews({ query, offset });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">المراجعات</h1>
        <AdminSearchForm basePath="/admin/reviews" query={query} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-start text-sm">
          <thead className="bg-bg-elevated text-text-secondary">
            <tr>
              <th className="px-4 py-3 text-start font-medium">اللعبة</th>
              <th className="px-4 py-3 text-start font-medium">الكاتب</th>
              <th className="px-4 py-3 text-start font-medium">التقييم</th>
              <th className="px-4 py-3 text-start font-medium">المراجعة</th>
              <th className="px-4 py-3 text-start font-medium">بتاريخ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reviews.map((review) => (
              <tr key={review.id}>
                <td className="px-4 py-3">
                  {review.game ? (
                    <Link
                      href={`/games/${review.game.igdb_id}`}
                      className="font-medium text-text-primary hover:underline"
                    >
                      {review.game.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {review.author ? (
                    <Link href={`/profile/${review.author.username}`} className="hover:underline">
                      @{review.author.username}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3.5 fill-primary text-primary" />
                    {review.rating}
                  </span>
                </td>
                <td className="max-w-xs px-4 py-3 text-text-secondary">
                  <span className="line-clamp-2">{review.body || "—"}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                  {new Date(review.created_at).toLocaleDateString("ar")}
                </td>
                <td className="px-4 py-3 text-end">
                  <AdminDeleteButton
                    action={adminDeleteReview.bind(null, review.id, review.igdb_id)}
                    confirmMessage="هل تريد حذف هذا التقييم؟"
                  />
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  لا توجد مراجعات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/reviews"
        query={query}
        offset={offset}
        pageSize={PAGE_SIZE}
        hasMore={hasMore}
      />
    </div>
  );
}
