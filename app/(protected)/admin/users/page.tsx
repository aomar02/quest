import Link from "next/link";

import { searchUsers, PAGE_SIZE } from "@/lib/admin/data";
import { adminDeleteUser } from "@/app/(protected)/admin/actions";
import { AdminDeleteButton } from "@/components/admin/delete-button";
import { AdminSearchForm, AdminPagination } from "@/components/admin/list-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const query = params.q ?? "";
  const offset = Number(params.offset ?? 0) || 0;

  const { users, hasMore } = await searchUsers({ query, offset });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">المستخدمون</h1>
        <AdminSearchForm basePath="/admin/users" query={query} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-start text-sm">
          <thead className="bg-bg-elevated text-text-secondary">
            <tr>
              <th className="px-4 py-3 text-start font-medium">المستخدم</th>
              <th className="px-4 py-3 text-start font-medium">انضم في</th>
              <th className="px-4 py-3 text-start font-medium">المراجعات</th>
              <th className="px-4 py-3 text-start font-medium">المجموعات</th>
              <th className="px-4 py-3 text-start font-medium">التعليقات</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.user_id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${user.username}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={user.avatar_url ?? undefined} alt="" />
                      <AvatarFallback>{user.display_name?.[0] ?? "؟"}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-text-primary">
                        {user.display_name}
                      </span>
                      <span className="truncate text-xs text-text-muted">@{user.username}</span>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                  {new Date(user.created_at).toLocaleDateString("ar")}
                </td>
                <td className="px-4 py-3 text-text-secondary">{user.reviewCount}</td>
                <td className="px-4 py-3 text-text-secondary">{user.collectionCount}</td>
                <td className="px-4 py-3 text-text-secondary">{user.commentCount}</td>
                <td className="px-4 py-3 text-end">
                  <AdminDeleteButton
                    action={adminDeleteUser.bind(null, user.user_id)}
                    confirmMessage={`هل تريد حذف المستخدم @${user.username} نهائياً؟ سيتم حذف كل بياناته ولن يتمكن من تسجيل الدخول مجدداً بهذا الحساب.`}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                  لا يوجد مستخدمون
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/users"
        query={query}
        offset={offset}
        pageSize={PAGE_SIZE}
        hasMore={hasMore}
      />
    </div>
  );
}
