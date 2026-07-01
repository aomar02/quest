import { AuthMarquee } from "@/components/layout/auth-marquee";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="ltr" className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:block">
        <AuthMarquee />
      </div>
      <div
        dir="rtl"
        className="relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-bg-secondary via-background to-background p-6"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(20,217,168,0.14),transparent_70%)]" />
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
