import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { ConfigProvider } from "@/lib/config";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

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
    <html lang="cs" className="h-full antialiased">
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
