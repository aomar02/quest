import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user?.hasImage) {
    redirect("/onboarding/avatar");
  }

  if (!user.publicMetadata?.onboardingComplete) {
    redirect("/onboarding/profile");
  }

  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
