import { Tajawal } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["200", "400", "700", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        ...arSA,
        formFieldInputPlaceholder__emailAddress: "أدخل بريدك الإلكتروني",
        formFieldInputPlaceholder__password: "أدخل كلمة المرور",
        formFieldInputPlaceholder__signUpPassword: "أنشئ كلمة مرور",
      }}
      appearance={{
        variables: {
          colorPrimary: "#14d9a8",
          colorPrimaryForeground: "#06120f",
          colorBackground: "#1a212c",
          colorForeground: "#ffffff",
          colorInput: "#0a0d12",
          colorInputForeground: "#ffffff",
          colorMutedForeground: "#9ca3af",
          colorNeutral: "#ffffff",
          colorBorder: "#232a38",
          colorShadow: "#000000",
          fontFamily: "var(--font-tajawal)",
          borderRadius: "0.75rem",
          spacing: "0.9rem",
        },
        elements: {
          cardBox:
            "shadow-2xl shadow-black/50 ring-1 ring-border bg-gradient-to-b from-bg-elevated to-bg-secondary",
          card: "gap-5",
          lastAuthenticationStrategyBadge: "hidden",
          headerTitle: "font-bold",
          headerSubtitle: "text-text-secondary",
          socialButtons: "gap-3",
          socialButtonsBlockButton:
            "h-11 border-border bg-bg-primary/40 transition-colors hover:bg-bg-elevated active:translate-y-px",
          socialButtonsBlockButtonText: "font-medium",
          dividerLine: "bg-border",
          dividerText: "text-text-muted",
          formFieldLabel: "text-text-secondary",
          formFieldInput:
            "h-11 bg-bg-primary border-border transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30",
          formButtonPrimary:
            "h-11 font-bold shadow-lg shadow-primary/20 transition-all hover:brightness-110 hover:shadow-primary/30 active:translate-y-px",
          footer: "mt-2",
          footerActionLink: "font-medium text-primary hover:text-primary-hover",
        },
      }}
    >
      <html lang="ar" dir="rtl" className={tajawal.variable}>
        <body className="min-h-full flex flex-col" suppressHydrationWarning>
          <DirectionProvider direction="rtl">{children}</DirectionProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
