import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import { isAdmin } from "@/lib/admin/auth";
import { AdminSidebarNav } from "@/components/admin/sidebar-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // notFound() (not redirect) so a non-admin gets no hint this route exists.
  const user = await currentUser();
  if (!isAdmin(user)) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col sm:flex-row">
      <AdminSidebarNav />
      <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}
