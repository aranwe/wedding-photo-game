import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ConfigProvider } from "@/lib/config";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

const minionPro = localFont({
  src: "./fonts/MinionPro-Medium.woff2",
  weight: "500",
  variable: "--font-heading",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const probaPro = localFont({
  src: "./fonts/ProbaPro-Light.woff2",
  weight: "300",
  variable: "--font-body",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Svatební foto hra",
  description: "Foto hra pro svatbu Báry a Matěje",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#a53627",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="cs"
      className={`${minionPro.variable} ${probaPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SpeedInsights/>
        <Analytics/>
        <I18nProvider>
          <ConfigProvider>{children}</ConfigProvider>
        </I18nProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
