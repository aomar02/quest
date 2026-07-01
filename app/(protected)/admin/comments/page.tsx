import Link from "next/link";

import { searchAdminComments, PAGE_SIZE } from "@/lib/admin/data";
import { adminDeleteComment } from "@/app/(protected)/admin/actions";
import { AdminDeleteButton } from "@/components/admin/delete-button";
import { AdminSearchForm, AdminPagination } from "@/components/admin/list-controls";

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const offset = Number(params.offset ?? 0) || 0;

  const { comments, hasMore } = await searchAdminComments({ query, offset });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">التعليقات</h1>
        <AdminSearchForm basePath="/admin/comments" query={query} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-start text-sm">
          <thead className="bg-bg-elevated text-text-secondary">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الكاتب</th>
              <th className="px-4 py-3 text-start font-medium">التعليق</th>
              <th className="px-4 py-3 text-start font-medium">على</th>
              <th className="px-4 py-3 text-start font-medium">بتاريخ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {comments.map((comment) => {
              const isDeleted = comment.deleted_at !== null;
              const target = comment.review
                ? { href: `/games/${comment.review.igdb_id}`, label: "مراجعة" }
                : comment.collection
                  ? { href: `/collections/${comment.collection.id}`, label: comment.collection.name }
                  : null;
              return (
                <tr key={comment.id}>
                  <td className="px-4 py-3 text-text-secondary">
                    {comment.author ? (
                      <Link href={`/profile/${comment.author.username}`} className="hover:underline">
                        @{comment.author.username}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-text-secondary">
                    <span className={isDeleted ? "italic text-text-muted" : "line-clamp-2"}>
                      {isDeleted ? "(تم الحذف)" : comment.body}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                    {target ? (
                      <Link href={target.href} className="hover:underline">
                        {target.label}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                    {new Date(comment.created_at).toLocaleDateString("ar")}
                  </td>
                  <td className="px-4 py-3 text-end">
                    {!isDeleted && (
                      <AdminDeleteButton
                        action={adminDeleteComment.bind(null, comment.id)}
                        confirmMessage="هل تريد حذف هذا التعليق؟"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {comments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                  لا توجد تعليقات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/comments"
        query={query}
        offset={offset}
        pageSize={PAGE_SIZE}
        hasMore={hasMore}
      />
    </div>
  );
}
