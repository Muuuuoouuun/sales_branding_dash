import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

const headingFont = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "Sales Master Intelligence System",
  description: "Hyper-Growth Sales Strategy Engine (Top-C Edition)",
};

import { SettingsProvider } from "@/components/SettingsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SettingsProvider>
            <div className="appShell">
              <Sidebar />
              <main className="appMain">{children}</main>
            </div>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
