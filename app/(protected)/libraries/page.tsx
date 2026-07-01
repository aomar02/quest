import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { searchCollections } from "@/lib/collections/data";
import { LibraryBrowser } from "@/components/collections/library-browser";

export const metadata: Metadata = { title: "المكتبات | كويست" };

export default async function LibrariesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { collections, hasMore } = await searchCollections(userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text-primary">المكتبات</h1>
      <p className="mt-1 text-text-secondary">
        تصفح مجموعات الألعاب التي أنشأها المستخدمون.
      </p>

      <LibraryBrowser initialCollections={collections} initialHasMore={hasMore} />
    </div>
  );
}
