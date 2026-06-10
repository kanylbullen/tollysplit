import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/next";
import { CookieNotice } from "@/components/CookieNotice";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tollysplit — split shared expenses",
  description:
    "Split expenses with friends without the fuss. Create a split, share the link and let everyone add what they paid.",
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getI18n();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dict={dict}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <CookieNotice />
            <Analytics />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
