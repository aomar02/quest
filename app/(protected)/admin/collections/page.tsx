import Link from "next/link";

import { searchAdminCollections, PAGE_SIZE } from "@/lib/admin/data";
import { adminDeleteCollection } from "@/app/(protected)/admin/actions";
import { AdminDeleteButton } from "@/components/admin/delete-button";
import { AdminSearchForm, AdminPagination } from "@/components/admin/list-controls";

export default async function AdminCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const offset = Number(params.offset ?? 0) || 0;

  const { collections, hasMore } = await searchAdminCollections({ query, offset });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">المجموعات</h1>
        <AdminSearchForm basePath="/admin/collections" query={query} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-start text-sm">
          <thead className="bg-bg-elevated text-text-secondary">
            <tr>
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">المالك</th>
              <th className="px-4 py-3 text-start font-medium">الألعاب</th>
              <th className="px-4 py-3 text-start font-medium">الإعجابات</th>
              <th className="px-4 py-3 text-start font-medium">أُنشئت في</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {collections.map((collection) => (
              <tr key={collection.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/collections/${collection.id}`}
                    className="font-medium text-text-primary hover:underline"
                  >
                    {collection.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {collection.author ? (
                    <Link href={`/profile/${collection.author.username}`} className="hover:underline">
                      @{collection.author.username}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{collection.gameCount}</td>
                <td className="px-4 py-3 text-text-secondary">{collection.like_count}</td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                  {new Date(collection.created_at).toLocaleDateString("ar")}
                </td>
                <td className="px-4 py-3 text-end">
                  <AdminDeleteButton
                    action={adminDeleteCollection.bind(null, collection.id)}
                    confirmMessage={`هل تريد حذف المجموعة "${collection.name}"؟`}
                  />
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  لا توجد مجموعات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/collections"
        query={query}
        offset={offset}
        pageSize={PAGE_SIZE}
        hasMore={hasMore}
      />
    </div>
  );
}
